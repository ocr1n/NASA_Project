import {assertValid,failure,type Observation,type SourceRecord,type RawRecord,type ImportBatch,type CommandEnvelope} from '../contracts';
import {canonicalJSON,sha256,stableImportKey,importedObservationId} from '../contracts/identity';
import {normalizeUnit} from '../metrics';
import type {Repository} from '../repositories/repository';
import {retainArtifact,type Artifact} from './acquisition';
import {readCSV} from './csv';
import {validateEvidence,PIPELINE_VERSION,PROCEDURE_VERSION} from './validation';
import {fixtureArtifact} from './catalogue';

export const intervalMapping=[{column:'PR_Int_Global',metric:'ecg_pr'},{column:'QRS_Dur_Global',metric:'ecg_qrs'},{column:'QT_Int_Global',metric:'ecg_qt'}] as const;
type InputSet={features:Artifact;parent:Artifact;description:Artifact;comparison:Artifact};
export const ptbFixtures=():InputSet=>({features:fixtureArtifact('ptbecgdeli'),parent:fixtureArtifact('ptbparent'),description:fixtureArtifact('ptbdescription'),comparison:fixtureArtifact('ptbunig')});

function indexRows(rows:Record<string,string>[],errors:string[],conflicts:string[]){
 const map=new Map<string,Record<string,string>>();
 for(const row of rows){if(!/^[1-9]\d*$/.test(row.ecg_id??'')){errors.push('Missing/invalid ecg_id');continue;}const prior=map.get(row.ecg_id);if(prior&&canonicalJSON(prior)!==canonicalJSON(row))conflicts.push(`Conflicting duplicate ECG ${row.ecg_id}`);else map.set(row.ecg_id,row);}
 return map;
}

/** Public numerical ECG chain. Interval values use source ms; quality and actual shifted event times remain unknown. */
export async function importPTBSample(repo:Repository,input:InputSet=ptbFixtures()){
 const namespace=input.features.source.namespace;if(!namespace.startsWith('research:')||Object.values(input).some(a=>a.source.namespace!==namespace))throw failure('VALIDATION_FAILED','PTB input must share a research namespace');
 const raw:Record<keyof InputSet,RawRecord>={} as Record<keyof InputSet,RawRecord>;
 for(const key of Object.keys(input) as (keyof InputSet)[])raw[key]=await retainArtifact(repo,input[key]);
 const sources:SourceRecord[]=[];for(const a of Object.values(input))sources.push((await repo.require(namespace,'SourceRecord',a.source.sourceId)));
 const hash=await sha256(canonicalJSON({pipelineVersion:PIPELINE_VERSION,procedureVersion:PROCEDURE_VERSION,assets:Object.fromEntries((Object.keys(raw) as (keyof InputSet)[]).map(key=>[key,{sourceId:raw[key].sourceId,version:input[key].source.version,hash:raw[key].contentHash}]))}));
 const batchId=`batch-${hash}`,runId=`validation-${hash}`,at=raw.features.retrievedAt;
 if(await repo.read(namespace,'ImportBatch',batchId))return {status:'unchanged' as const,batch:await repo.require(namespace,'ImportBatch',batchId),observations:await repo.list(namespace,'Observation')};
 const errors:string[]=[],conflicts:string[]=[],methods:string[]=[];
 let rows=new Map<string,Record<string,string>>(),parents=new Map<string,Record<string,string>>(),comparisons=new Map<string,Record<string,string>>(),definitions:Record<string,string>[]=[];
 try{rows=indexRows(readCSV(raw.features.payload!),errors,conflicts);parents=indexRows(readCSV(raw.parent.payload!),errors,conflicts);comparisons=indexRows(readCSV(raw.comparison.payload!),errors,conflicts);definitions=readCSV(raw.description.payload!);}catch(e){errors.push(e instanceof Error?e.message:'Invalid CSV');}
 const observations:Observation[]=[];const existing=await repo.list(namespace,'Observation');const source=sources.find(s=>s.sourceId===input.features.source.sourceId)!;
 for(const [ecgId,row] of rows){
  const subject=parents.get(ecgId),compare=comparisons.get(ecgId);
  if(!subject||!/^\d+(\.0)?$/.test(subject.patient_id??'')||Number(subject.patient_id)<=0){errors.push(`ECG ${ecgId}: missing parent patient identity`);continue;}
  for(const {column,metric} of intervalMapping){
   const unit=definitions.find(d=>d.id===column)?.unit;
   const text=row[column];if(text===undefined||unit===undefined){errors.push(`${ecgId}/${column}: required feature/unit absent`);continue;}
   const missing=text==='',value=missing?null:Number(text);
   const normalized=normalizeUnit(metric,value??0,unit);
   if(!normalized.ok||(!missing&&(!Number.isFinite(value)||value!<=0))){errors.push(`${ecgId}/${column}: invalid value or unsupported unit ${unit}`);continue;}
   const sourceRecordId=`ecg:${ecgId}:${column}:ECGDeli:Global`,key=stableImportKey(namespace,source.sourceId,source.version,sourceRecordId),id=await importedObservationId(key);
   const count=row[`${column}_count`];if(!/^\d+$/.test(count??'')){errors.push(`${ecgId}/${column}: invalid beat count`);continue;}
   const comparisonText=compare?.[column];if(comparisonText!==undefined&&comparisonText!==''&&value!==null&&Number.isFinite(Number(comparisonText)))methods.push(`${ecgId}/${column}: ECGDeli ${value} ${unit}; Uni-G ${Number(comparisonText)} ${unit}; difference ${value-Number(comparisonText)} ${unit}. Different algorithms, one acquisition; agreement tolerance unestablished.`);else methods.push(`${ecgId}/${column}: comparable Uni-G output unavailable`);
   const o:Observation={schemaVersion:'0.1.0',namespace,recordType:'Observation',observationId:id,revision:1,astronautId:null,missionId:null,publicSubjectId:`PTB-patient-${Number(subject.patient_id)}`,datasetId:namespace.slice(9),timestamp:null,timePrecision:'unknown',originalTime:subject.recording_date||null,timeReason:'PTB dates are patient-shifted; actual UTC event time and time zone unavailable',missionAnchor:null,receivedAt:at,metric,valueKind:'number',value:missing?null:normalized.value,unit:normalized.unit as 'ms',missingReason:missing?'Feature absent in source':null,context:'unknown',measurementContext:{modality:'ecg',deviceId:subject.device||null,protocolId:'PTB-XL/10-second/12-lead',method:'ECGDeli',lead:'Global',statistic:'median across beats',windowSeconds:10,posture:'unknown',missionPhase:'unknown',qtcCorrection:null},source:{schemaVersion:'0.1.0',sourceId:source.sourceId,name:source.name,tier:source.tier,canonicalURL:source.canonicalURL,version:source.version,license:source.license,attribution:source.attribution,retrievedAt:source.retrievedAt},quality:{score:null,method:'Published features; waveform signal quality not assessed',flags:['actual_event_time_unknown'],lowConfidence:true},validation:{status:'single_source',validationRunId:runId,evidenceIds:[],procedureVersion:PROCEDURE_VERSION,issues:['One public acquisition lineage; no personal assessment'],admission:'research_sandbox'},dataOrigin:'public_research',deliveryMode:'file_import',synthetic:false,era:'historical_clinical_date_shifted',provenance:{rawRecordId:raw.features.rawRecordId,contentHash:raw.features.contentHash,sourceRecordId,importBatchId:batchId,pipelineVersion:PIPELINE_VERSION,algorithm:'ECGDeli',parameters:{ecgId,lead:'Global',beatCount:Number(count),featureColumn:column,parentRawRecordId:raw.parent.rawRecordId,descriptionRawRecordId:raw.description.rawRecordId,comparisonRawRecordId:raw.comparison.rawRecordId},originalUnit:unit,originalValue:text,evidenceObservationIds:[],windowIds:[],originalSamplingHz:null,outputSamplingHz:null},reportId:null,sessionId:null,acquisitionId:`PTB-ECG-${ecgId}`,regionKey:null,laterality:null,supersedesObservationId:null};
   const prior=existing.find(r=>r.observationId===id);
   if(prior&&canonicalJSON({...o,validation:prior.validation,provenance:{...o.provenance,importBatchId:prior.provenance.importBatchId}})!==canonicalJSON(prior))conflicts.push(`${ecgId}/${column}: stable source identity has changed content`);
   observations.push(prior??o);
  }
 }
 const run=validateEvidence({namespace,id:runId,kind:'sample_integrity',claim:'PTB public numerical features: integrity, identifiers and units; no clinical interpretation',sources,checks:sources.map(s=>({sourceId:s.sourceId,lineageId:'ptb-xl-acquisition',location:`${s.canonicalURL} # ECG 1/2 or file description`,stance:'supports' as const,relevant:true})),at,errors,conflicts,reviewComplete:true,normalization:'Shared registry only; ms identity conversion; unmapped columns retained in RawRecord',subjectRecordIds:errors.length||conflicts.length?[]:observations.map(o=>o.observationId),methodComparisons:methods,limitations:['Parent/derived/method variants count once','Unknown original event time, context and signal quality','No method agreement tolerance established','Papers cannot validate an individual sample; no independent acquisition']});
 const accepted=errors.length||conflicts.length?[]:observations;
 const newObservations=accepted.filter(o=>!existing.some(p=>p.observationId===o.observationId));
 const batch:ImportBatch={schemaVersion:'0.1.0',namespace,recordType:'ImportBatch',importBatchId:batchId,revision:1,sourceId:source.sourceId,sourceVersion:source.version,fileHash:raw.features.contentHash,parser:'PTB named-column CSV',parserVersion:PIPELINE_VERSION,mapping:intervalMapping.map(m=>({sourceColumn:m.column,canonicalField:m.metric})),previewToken:hash,previewState:'committed',acceptedRows:new Set(accepted.map(o=>o.acquisitionId)).size,rejectedRows:errors.length?rows.size:0,quarantinedRows:conflicts.length?rows.size:0,errors:[...errors,...conflicts].map(message=>({row:0,field:'file',code:errors.length?'VALIDATION_FAILED':'CONFLICT',message})),stableSourceRecordKeys:accepted.map(o=>stableImportKey(namespace,source.sourceId,source.version,o.provenance.sourceRecordId)),importedAt:at};
 const keys=[];for(const o of newObservations)keys.push({key:stableImportKey(namespace,source.sourceId,source.version,o.provenance.sourceRecordId),observationId:o.observationId,fingerprint:await sha256(canonicalJSON(o))});
 for(const o of newObservations)assertValid<Observation>('Observation',o);
 const command:CommandEnvelope={schemaVersion:'0.1.0',namespace,operationId:`import-${hash}`,idempotencyKey:`import-${hash}`,subject:{kind:'namespace',astronautId:null,missionId:null},createdAt:at,operation:'import',domain:'capture',payload:{records:[run,batch,...newObservations],expectedRevisions:[],importKeys:keys,previewToken:hash}};
 await repo.execute(command);return {status:run.status,batch,observations:accepted};
}

/** NASA factual metadata normalization; assay rights and numerical admission remain pending. */
export async function importNASACatalogue(repo:Repository){
 const meta=fixtureArtifact('osd575'),files=fixtureArtifact('osd575files');const raw=await retainArtifact(repo,meta),rawFiles=await retainArtifact(repo,files);
 const body=JSON.parse(raw.payload!)['OSD-575'],listing=JSON.parse(rawFiles.payload!)['OSD-575'].files;
 const errors=body?.metadata?.accession==='OSD-575'&&body.metadata.organism==='Homo sapiens'&&body.metadata['material type']==='Serum'&&Object.keys(listing??{}).length===9?[]:['Unexpected OSD-575 metadata/file coverage'];
 const id=`nasa-validation-${await sha256(canonicalJSON([raw.contentHash,rawFiles.contentHash]))}`;
 const run=validateEvidence({namespace:meta.source.namespace,id,kind:'protocol',claim:'OSD-575 serum accession/file catalogue; not wearable telemetry',sources:[meta.source,files.source],checks:[{sourceId:meta.source.sourceId,lineageId:'inspiration4-2021',location:`${meta.source.canonicalURL} metadata/material type, study protocols`,stance:'supports',relevant:true}],at:raw.retrievedAt,errors,limitations:['API dataset revision/license unconfirmed; factual metadata only','Submitted and transformed files are one study lineage','No numeric laboratory values admitted'],subjectRecordIds:[raw.rawRecordId,rawFiles.rawRecordId]});
 const command:CommandEnvelope={schemaVersion:'0.1.0',namespace:meta.source.namespace,operationId:id,idempotencyKey:id,subject:{kind:'namespace',astronautId:null,missionId:null},createdAt:raw.retrievedAt,operation:'import',domain:'configuration',payload:{records:[run],expectedRevisions:[],importKeys:[],previewToken:await sha256(id)}};
 await repo.execute(command);return run;
}
