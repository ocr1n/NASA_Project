import {assertValid,failure,SCHEMA_VERSION,type CanonicalRecord,type RawRecord,type SourceRecord,type Observation,type Report,type ImportBatch,type EcgResearchEvidence,type EcgResearchRow,type EcgResearchField,type CommandEnvelope,type ValidationRun} from './index';
import {canonicalJSON,sha256,stableImportKey,importedObservationId} from './identity';
import {readCSV} from '../sources/csv';
import {captureNumber} from '../capture';
import {metricRegistry} from '../metrics';
import {ecgMetrics} from './ecg';
import {validateEvidence,PROCEDURE_VERSION} from '../sources/validation';

export const ECG_RESEARCH_MEDIA='application/vnd.nasa-project.ptb-ecg-report+json';
export const ECG_RESEARCH_PIPELINE='ecg-research-reports/1';
export type EcgResearchMethod=EcgResearchEvidence['method'];
export const reportSourceId=(method:EcgResearchMethod)=>`source-${method==='ECGDeli'?'ptbecgdeli':'ptbunig'}-reports-v1`;
export const researchMapping=(method:EcgResearchMethod)=>[...(method==='Uni-G'?[{sourceColumn:'HR__Global',canonicalField:'heart_rate'}]:[]),{sourceColumn:'PR_Int_Global',canonicalField:'ecg_pr'},{sourceColumn:'QRS_Dur_Global',canonicalField:'ecg_qrs'},{sourceColumn:'QT_Int_Global',canonicalField:'ecg_qt'}];
export const researchEvidenceId=(reportId:string)=>'ptb-evidence_'+reportId.slice(8);
const rawById=(records:ReadonlyArray<CanonicalRecord>,id:string)=>{const r=records.find(r=>r.recordType==='RawRecord'&&r.rawRecordId===id);if(!r||r.recordType!=='RawRecord'||r.payload===null)throw failure('REFERENCE_INVALID','Original PTB file is missing.');return r;};
const sourceById=(records:ReadonlyArray<CanonicalRecord>,id:string)=>{const s=records.find(r=>r.recordType==='SourceRecord'&&r.sourceId===id);if(!s||s.recordType!=='SourceRecord')throw failure('REFERENCE_INVALID','PTB source descriptor is missing.');return s;};

function indexed(rows:Record<string,string>[],key:string){
 const map=new Map<string,Record<string,string>>(),conflicts=new Set<string>();
 for(const row of rows){const id=row[key]??'',prior=map.get(id);if(prior&&canonicalJSON(prior)!==canonicalJSON(row))conflicts.add(id);else map.set(id,row);}
 return {map,conflicts};
}

/** Named published columns only. Unknown fields remain in the complete raw file, never inferred as HRV. */
export async function analyzeResearchFile(method:EcgResearchMethod,features:RawRecord,parent:RawRecord,description:RawRecord,source:SourceRecord):Promise<{rows:EcgResearchRow[];unmappedColumns:string[]}>{
 const featureRows=readCSV(features.payload!),parents=indexed(readCSV(parent.payload!),'ecg_id'),definitions=indexed(readCSV(description.payload!),'id'),featureIndex=indexed(featureRows,'ecg_id');
 if(featureRows.length>250)throw failure('VALIDATION_FAILED','Preview at most 250 ECG records in a small licensed excerpt.');
 const mapping=researchMapping(method),rows:EcgResearchRow[]=[];
 for(const [index,[id,row]] of [...featureIndex.map].sort(([a],[b])=>Number(a)-Number(b)).entries()){
  const errors:string[]=[],validId=/^[1-9]\d*$/.test(id)&&Number.isSafeInteger(Number(id)),ecgId=validId?id:`invalid-row-${index+2}`,subject=parents.map.get(id);
  if(!validId)errors.push('Missing or invalid ecg_id.');
  if(featureIndex.conflicts.has(id))errors.push('Conflicting duplicate ecg_id in feature file.');
  if(parents.conflicts.has(id))errors.push('Conflicting public patient join.');
  const patient=subject?.patient_id??'';
  const publicSubjectId=/^[1-9]\d*(?:\.0+)?$/.test(patient)&&Number.isSafeInteger(Number(patient))?`PTB-patient-${Number(patient)}`:null;
  if(!publicSubjectId)errors.push('Parent row has no matching public patient identity.');
  const fields:EcgResearchField[]=ecgMetrics.map(metric=>{
   const column=mapping.find(m=>m.canonicalField===metric)?.sourceColumn??null,unit=metricRegistry[metric].canonicalUnit;
   if(column===null)return {metric,column,status:'missing',value:null,unit,originalUnit:null,originalValue:null,reason:`Not supplied by the named ${method} mapping; no value derived.`};
   const definition=definitions.map.get(column),originalUnit=definition?.unit??null,originalValue=row[column]??null;
   if(originalValue===null||!originalUnit||definitions.conflicts.has(column))return {metric,column,status:'rejected',value:null,unit,originalUnit,originalValue,reason:'Required column or unambiguous documented unit is missing.'};
   try{
    if(!metricRegistry[metric].allowedInputUnits.includes(originalUnit))throw failure('UNSUPPORTED_UNIT','Documentation unit is incompatible with this ECG quantity.');
    if(method==='ECGDeli'&&(!/^\d+$/.test(row[column+'_count']??'')||!Number.isSafeInteger(Number(row[column+'_count']))||originalValue!==''&&Number(row[column+'_count'])===0))throw failure('VALIDATION_FAILED','ECGDeli requires its published beat-count columns and support for a reported value.');
    const parsed=captureNumber({metric,input:originalValue,unit:originalUnit,missingReason:originalValue===''?'Feature absent in source':null,context:'unknown',measurementContext:{},quality:{score:null,method:'Not assessed',flags:[],lowConfidence:true}});
    return {metric,column,status:parsed.number===null?'missing':'accepted',value:parsed.number,unit,originalUnit,originalValue,reason:parsed.number===null?'Feature absent in source':null};
   }catch(error){return {metric,column,status:'rejected',value:null,unit,originalUnit,originalValue,reason:error instanceof Error?error.message:'Invalid numeric feature.'};}
  });
  for(const field of fields)if(field.status==='rejected')errors.push(`${field.column}: ${field.reason}`);
  const reportId=publicSubjectId&&validId?'ptb_ecg_'+await sha256(canonicalJSON(['research:ptb-xl-plus',source.sourceId,source.version,method,id])):null;
  const contentFingerprint=publicSubjectId&&validId?await sha256(canonicalJSON([method,id,publicSubjectId,features.contentHash,parent.contentHash,description.contentHash])):null;
  rows.push({ecgId,publicSubjectId,reportId,contentFingerprint,action:errors.length?'rejected':'create',fields,errors});
 }
 const headers=Object.keys(featureRows[0]??{}),mapped=new Set(['ecg_id',...mapping.map(m=>m.sourceColumn)]);
 return {rows,unmappedColumns:headers.filter(h=>!mapped.has(h))};
}

export function researchEvidence(raw:RawRecord):EcgResearchEvidence{
 let value:unknown;try{value=JSON.parse(raw.payload!);}catch{throw failure('VALIDATION_FAILED','PTB report evidence is invalid JSON.');}
 assertValid<EcgResearchEvidence>('EcgResearchEvidence',value);return value;
}

/** Deterministic canonical records, reconstructed from original source files on write/restore. */
export async function buildResearchReport(e:EcgResearchEvidence,records:ReadonlyArray<CanonicalRecord>){
 const feature=rawById(records,e.featureRawRecordId),parent=rawById(records,e.parentRawRecordId),description=rawById(records,e.descriptionRawRecordId),source=sourceById(records,feature.sourceId);
 if(source.sourceId!==reportSourceId(e.method)||[feature,parent,description,source].some(r=>r.namespace!=='research:ptb-xl-plus'))throw failure('REFERENCE_INVALID','PTB method/source/namespace differs.');
 const analyzed=await analyzeResearchFile(e.method,feature,parent,description,source),row=analyzed.rows.find(r=>r.ecgId===e.ecgId);
 if(!row||row.action!=='create'||row.reportId!==e.reportId||row.publicSubjectId!==e.publicSubjectId||row.contentFingerprint!==e.contentFingerprint)throw failure('REFERENCE_INVALID','PTB report differs from original feature/parent/unit evidence.');
 const original=readCSV(parent.payload!).find(r=>r.ecg_id===e.ecgId)!,observations:Observation[]=[];
 for(const field of row.fields){
  const sourceRecordId=`ptb-report:${e.method}:${e.ecgId}:${field.metric}`,observationId=await importedObservationId(stableImportKey(source.namespace,source.sourceId,source.version,sourceRecordId));
  const o:unknown={schemaVersion:SCHEMA_VERSION,namespace:source.namespace,recordType:'Observation',observationId,revision:1,astronautId:null,missionId:null,publicSubjectId:e.publicSubjectId,datasetId:'ptb-xl-plus',timestamp:null,timePrecision:'unknown',originalTime:original.recording_date||null,timeReason:'PTB dates are patient-shifted; actual UTC event time and time zone unavailable',missionAnchor:null,receivedAt:e.receivedAt,metric:field.metric,valueKind:'number',value:field.value,unit:field.unit,missingReason:field.value===null?field.reason:null,context:'unknown',measurementContext:{modality:'ecg',deviceId:original.device||null,protocolId:'PTB-XL/10-second/12-lead',method:e.method,lead:'Global',statistic:e.method==='ECGDeli'?'median across beats':'median beat',windowSeconds:10,posture:'unknown',missionPhase:'unknown',qtcCorrection:null,artifactHandling:null},source:{schemaVersion:SCHEMA_VERSION,sourceId:source.sourceId,name:source.name,tier:source.tier,canonicalURL:source.canonicalURL,version:source.version,license:source.license,attribution:source.attribution,retrievedAt:source.retrievedAt},quality:{score:null,method:'Published numerical report; waveform quality not assessed',flags:['actual_event_time_unknown','signal_quality_unassessed'],lowConfidence:true},validation:{status:'single_source',validationRunId:e.validationRunId,evidenceIds:[],procedureVersion:PROCEDURE_VERSION,issues:['One public acquisition lineage; no personal assessment'],admission:'research_sandbox'},dataOrigin:'public_research',deliveryMode:'file_import',synthetic:false,era:'historical_clinical_date_shifted',provenance:{rawRecordId:feature.rawRecordId,contentHash:feature.contentHash,sourceRecordId,importBatchId:e.importBatchId,pipelineVersion:ECG_RESEARCH_PIPELINE,algorithm:e.method,parameters:{ecgId:e.ecgId,lead:'Global',featureColumn:field.column,ecgResearchEvidenceId:researchEvidenceId(e.reportId),parentRawRecordId:parent.rawRecordId,descriptionRawRecordId:description.rawRecordId},originalUnit:field.originalUnit,originalValue:field.originalValue,evidenceObservationIds:[],windowIds:[],originalSamplingHz:null,outputSamplingHz:null},reportId:e.reportId,sessionId:null,acquisitionId:`PTB-ECG-${e.ecgId}`,regionKey:null,laterality:null,supersedesObservationId:null};
  assertValid<Observation>('Observation',o);observations.push(o);
 }
 const report:Report={schemaVersion:SCHEMA_VERSION,namespace:source.namespace,recordType:'Report',reportId:e.reportId,revision:1,astronautId:null,missionId:null,publicSubjectId:e.publicSubjectId,type:'ecg',timestamp:null,timePrecision:'unknown',originalTime:original.recording_date||null,timeReason:'PTB dates are patient-shifted; actual UTC event time and time zone unavailable',missionAnchor:null,sourceId:source.sourceId,observationIds:observations.map(o=>o.observationId),method:e.method,deviceId:original.device||null,lead:'Global',view:null,site:null,laterality:null,originalReportRawRecordId:feature.rawRecordId,dataOrigin:'public_research'};
 const payload=canonicalJSON(e),raw:RawRecord={schemaVersion:SCHEMA_VERSION,namespace:source.namespace,recordType:'RawRecord',rawRecordId:researchEvidenceId(e.reportId),revision:1,sourceId:source.sourceId,acquisitionId:e.reportId,importBatchId:e.importBatchId,payload,fileReference:null,contentHash:await sha256(payload),mediaType:ECG_RESEARCH_MEDIA,encoding:'utf-8',retrievedAt:e.receivedAt,retentionPolicy:'Retain original public report mapping and source files.',accessPolicy:source.license};
 assertValid('Report',report);return {report,observations,raw,analysis:analyzed};
}

export async function researchBatchIdentity(method:EcgResearchMethod,raws:RawRecord[],ecgIds:string[]){return sha256(canonicalJSON([ECG_RESEARCH_PIPELINE,method,raws.map(r=>[r.sourceId,r.contentHash]),[...ecgIds].sort((a,b)=>Number(a)-Number(b))]));}

export function buildResearchRun(e:EcgResearchEvidence,sources:SourceRecord[],observationIds:string[]):ValidationRun{
 const run=validateEvidence({namespace:'research:ptb-xl-plus',id:e.validationRunId,kind:'sample_integrity',claim:'Named numerical ECG report mapping; no signal or clinical assessment',sources,checks:sources.map(s=>({sourceId:s.sourceId,lineageId:'ptb-xl-acquisition',location:s.canonicalURL!+' # named ECG feature/parent/unit mapping',stance:'supports',relevant:true})),at:e.receivedAt,subjectRecordIds:[...observationIds].sort(),reviewComplete:true,normalization:'Shared captureNumber and registry; original file/columns/units retained.',limitations:['Method variants and parent/description are one acquisition lineage.','Shifted dates, posture and signal quality remain unknown.','No HR derived from RR and no short-window HRV.']});
 run.pipelineVersion=ECG_RESEARCH_PIPELINE;run.reviewer='Module 04 named report mapping; no clinical admission';return run;
}

/** Expensive original-file reconstruction outside storage transactions, including before duplicate no-ops. */
export async function verifyResearchEcgEvidence(records:CanonicalRecord[]){
 const evidences=records.filter((r):r is RawRecord=>r.recordType==='RawRecord'&&r.mediaType===ECG_RESEARCH_MEDIA).map(raw=>({raw,e:researchEvidence(raw)}));
 for(const {raw,e} of evidences){
  const built=await buildResearchReport(e,records);
  for(const expected of [built.raw,built.report,...built.observations]){const actual=records.find(r=>r.recordType===expected.recordType&&(r.recordType==='RawRecord'?r.rawRecordId:r.recordType==='Report'?r.reportId:r.recordType==='Observation'?r.observationId:'')===(expected.recordType==='RawRecord'?expected.rawRecordId:expected.recordType==='Report'?expected.reportId:expected.observationId));if(!actual||canonicalJSON(actual)!==canonicalJSON(expected))throw failure('REFERENCE_INVALID','PTB canonical report/value evidence differs from original files.');}
  if(raw.rawRecordId!==built.raw.rawRecordId)throw failure('REFERENCE_INVALID','PTB report evidence identity differs.');
 }
 for(const batchId of new Set(evidences.map(x=>x.e.importBatchId))){
  const group=evidences.filter(x=>x.e.importBatchId===batchId),e=group[0].e,raws=[rawById(records,e.featureRawRecordId),rawById(records,e.parentRawRecordId),rawById(records,e.descriptionRawRecordId)],hash=await researchBatchIdentity(e.method,raws,group.map(x=>x.e.ecgId));
  if(batchId!==`ptb-batch_${hash}`||group.some(x=>x.e.validationRunId!==`ptb-run_${hash}`||x.e.receivedAt!==e.receivedAt||x.e.method!==e.method||x.e.featureRawRecordId!==e.featureRawRecordId||x.e.parentRawRecordId!==e.parentRawRecordId||x.e.descriptionRawRecordId!==e.descriptionRawRecordId))throw failure('REFERENCE_INVALID','PTB batch selection/evidence differs.');
  const ids=records.filter((r):r is Observation=>r.recordType==='Observation'&&r.provenance.importBatchId===batchId).map(o=>o.observationId),expected=buildResearchRun(e,raws.map(r=>sourceById(records,r.sourceId)),ids),run=records.find(r=>r.recordType==='ValidationRun'&&r.validationRunId===e.validationRunId);
  if(!run||canonicalJSON(run)!==canonicalJSON(expected))throw failure('REFERENCE_INVALID','PTB validation decision differs from retained mapping.');
  const batch=records.find(r=>r.recordType==='ImportBatch'&&r.importBatchId===batchId);
  if(!batch||batch.recordType!=='ImportBatch'||batch.acceptedRows!==group.length||batch.fileHash!==raws[0].contentHash||batch.previewToken!==hash||canonicalJSON(batch.mapping)!==canonicalJSON(researchMapping(e.method)))throw failure('REFERENCE_INVALID','PTB import batch differs from report evidence.');
 }
}

export function validateResearchEcgGraph(records:CanonicalRecord[],namespace:string){
 for(const r of records)if(r.recordType==='Report'&&r.reportId.startsWith('ptb_ecg_')){
  const raw=records.find(x=>x.recordType==='RawRecord'&&x.rawRecordId===researchEvidenceId(r.reportId)&&x.mediaType===ECG_RESEARCH_MEDIA);
  if(namespace!=='research:ptb-xl-plus'||!raw||raw.recordType!=='RawRecord')throw failure('REFERENCE_INVALID','Public ECG report requires its own research evidence.');
  const e=researchEvidence(raw);if(e.reportId!==r.reportId||e.publicSubjectId!==r.publicSubjectId||e.method!==r.method||r.sourceId!==reportSourceId(e.method)||r.observationIds.length!==7||r.astronautId!==null||r.missionId!==null||r.lead!=='Global')throw failure('REFERENCE_INVALID','Public ECG report owner/method/lead differs.');
 }
 for(const o of records)if(o.recordType==='Observation'&&o.provenance.pipelineVersion===ECG_RESEARCH_PIPELINE&&!records.some(r=>r.recordType==='RawRecord'&&r.rawRecordId===o.provenance.parameters.ecgResearchEvidenceId&&r.mediaType===ECG_RESEARCH_MEDIA))throw failure('REFERENCE_INVALID','Public ECG observation requires retained report evidence.');
}

export function validateResearchEcgCommand(command:CommandEnvelope){
 if(command.namespace!=='research:ptb-xl-plus'||command.domain!=='reports'||command.operation!=='import'||command.subject.kind!=='namespace'||command.subject.astronautId!==null||command.subject.missionId!==null||command.payload.expectedRevisions.length||command.payload.records.some(r=>!['SourceRecord','RawRecord','Observation','Report','ImportBatch','ValidationRun'].includes(r.recordType)))throw failure('REFERENCE_INVALID','PTB import cannot change crew, baseline, task, assessment or atlas state.');
 const batches=command.payload.records.filter((r):r is ImportBatch=>r.recordType==='ImportBatch');
 if(batches.length!==1||command.payload.previewToken!==batches[0].previewToken||command.createdAt!==batches[0].importedAt||command.operationId!==`ptb-import_${batches[0].previewToken}`||command.idempotencyKey!==command.operationId)throw failure('REFERENCE_INVALID','PTB command differs from its previewed batch identity.');
 const allowed=new Set<string>(['ImportBatch:'+batches[0].importBatchId]);
 for(const raw of command.payload.records)if(raw.recordType==='RawRecord'&&raw.mediaType===ECG_RESEARCH_MEDIA){
  const e=researchEvidence(raw);if(e.importBatchId!==batches[0].importBatchId||e.receivedAt!==command.createdAt)throw failure('REFERENCE_INVALID','PTB command mixes report batches.');
  allowed.add('RawRecord:'+raw.rawRecordId);allowed.add('Report:'+e.reportId);allowed.add('ValidationRun:'+e.validationRunId);
  for(const id of [e.featureRawRecordId,e.parentRawRecordId,e.descriptionRawRecordId]){const file=rawById(command.payload.records,id);allowed.add('RawRecord:'+id);allowed.add('SourceRecord:'+file.sourceId);}
  const report=command.payload.records.find(r=>r.recordType==='Report'&&r.reportId===e.reportId);if(report?.recordType==='Report')for(const id of report.observationIds)allowed.add('Observation:'+id);
 }
 for(const record of command.payload.records){const id=record.recordType==='SourceRecord'?record.sourceId:record.recordType==='RawRecord'?record.rawRecordId:record.recordType==='Observation'?record.observationId:record.recordType==='Report'?record.reportId:record.recordType==='ImportBatch'?record.importBatchId:record.recordType==='ValidationRun'?record.validationRunId:'';if(!allowed.has(record.recordType+':'+id))throw failure('REFERENCE_INVALID','Unrelated record is outside the previewed PTB reports.');}
}
