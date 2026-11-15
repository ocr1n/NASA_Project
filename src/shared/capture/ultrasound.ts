import {assertValid,failure,SCHEMA_VERSION,type ReportCaptureContent,type ReportCaptureEvidence,type Observation,type RawRecord,type Report,type CommandEnvelope,type ImportBatch,type MissionContext,type CanonicalRecord} from '../contracts';
import {canonicalJSON,sha256} from '../contracts/identity';
import {ULTRASOUND_MEDIA,ULTRASOUND_PIPELINE,ULTRASOUND_CONTEXT,validateReportContent,reportNumber,reportMeasurementContext,reportIdentities,ultrasoundEvidence,ultrasoundPreviewToken,validateUltrasoundGraph} from '../contracts/ultrasound';
import {captureTime} from './index';
import {metricRegistry} from '../metrics';
import {readCSV} from '../sources/csv';
import {validateEvidence,PROCEDURE_VERSION} from '../sources/validation';
import type {Repository} from '../repositories/repository';

export type ReportSubject=Pick<ReportCaptureContent,'namespace'|'dataOrigin'|'astronautId'|'missionId'|'publicSubjectId'|'datasetId'>;
export const ultrasoundCSVFormat='numerical-ultrasound/1';
export const ultrasoundCSVColumns=['format','namespace','data_origin','astronaut_id','mission_id','public_subject_id','dataset_id','source_id','report_key','type','time_precision','reported_time','time_reason','context','mission_phase','method','view','device_id','probe_id','posture','protocol_id','muscle','site','laterality','quality_score','quality_low_confidence','quality_method','quality_flags','limitations','original_report','metric','value','unit','missing_reason','indexing'] as const;
const fields:Record<string,string>={format:'protocolVersion',namespace:'namespace',data_origin:'dataOrigin',astronaut_id:'astronautId',mission_id:'missionId',public_subject_id:'publicSubjectId',dataset_id:'datasetId',source_id:'sourceId',report_key:'reportKey',type:'type',time_precision:'time.precision',reported_time:'time.text',time_reason:'time.reason',context:'context',mission_phase:'missionPhase',method:'method',view:'view',device_id:'deviceId',probe_id:'probeId',posture:'posture',protocol_id:'protocolId',muscle:'muscle',site:'site',laterality:'laterality',quality_score:'quality.score',quality_low_confidence:'quality.lowConfidence',quality_method:'quality.method',quality_flags:'quality.flags',limitations:'limitations',original_report:'originalReport',metric:'values.metric',value:'values.input',unit:'values.unit',missing_reason:'values.missingReason',indexing:'values.indexing'};
export const ultrasoundCSVMapping=ultrasoundCSVColumns.map(sourceColumn=>({sourceColumn,canonicalField:fields[sourceColumn]}));
const optional=(s:string)=>s===''?null:s;
const subjectOf=(c:ReportCaptureContent):ReportSubject=>({namespace:c.namespace,dataOrigin:c.dataOrigin,astronautId:c.astronautId,missionId:c.missionId,publicSubjectId:c.publicSubjectId,datasetId:c.datasetId});
function checkedObservation(value:unknown):Observation {assertValid<Observation>('Observation',value);return value;}
function checkedReport(value:unknown):Report {assertValid<Report>('Report',value);return value;}

/** Strict one-acquisition CSV; preserve file text, original numbers and unknown columns. */
export function mapUltrasoundCSV(payload:string,subject:ReportSubject):ReportCaptureContent {
 if(new TextEncoder().encode(payload).byteLength>262144)throw failure('VALIDATION_FAILED','One numerical report CSV is limited to 256 KiB.');
 const rows=readCSV(payload),first=rows[0];if(!first||rows.length>5)throw failure('VALIDATION_FAILED','CSV must contain one report with one to five measurement rows.');
 if(ultrasoundCSVColumns.some(k=>!(k in first))||first.format!==ultrasoundCSVFormat)throw failure('VALIDATION_FAILED','Required numerical-ultrasound/1 columns/format are missing.');
 const common=ultrasoundCSVColumns.filter(k=>!['metric','value','unit','missing_reason','indexing'].includes(k));
 if(rows.some(r=>common.some(k=>r[k]!==first[k])))throw failure('VALIDATION_FAILED','CSV rows must share report, subject, time and acquisition metadata.');
 let flags:unknown,limitations:unknown;try{flags=JSON.parse(first.quality_flags);limitations=JSON.parse(first.limitations);}catch{throw failure('VALIDATION_FAILED','Quality flags and limitations must be JSON string arrays.');}
 if(first.quality_score!==''&&!/^(?:0(?:\.\d+)?|1(?:\.0+)?)$/.test(first.quality_score))throw failure('VALIDATION_FAILED','Quality score is 0–1 or empty for unknown.');
 const score=first.quality_score===''?null:Number(first.quality_score);
 if(!['true','false'].includes(first.quality_low_confidence))throw failure('VALIDATION_FAILED','Quality low confidence must be explicit true or false.');
 const value:unknown={namespace:first.namespace,dataOrigin:first.data_origin,astronautId:optional(first.astronaut_id),missionId:optional(first.mission_id),publicSubjectId:optional(first.public_subject_id),datasetId:optional(first.dataset_id),sourceId:first.source_id,reportKey:first.report_key,type:first.type,time:{precision:first.time_precision,text:first.reported_time,reason:first.time_reason},context:first.context,missionPhase:optional(first.mission_phase),method:first.method,view:optional(first.view),deviceId:optional(first.device_id),probeId:optional(first.probe_id),posture:optional(first.posture),protocolId:optional(first.protocol_id),muscle:optional(first.muscle),site:optional(first.site),laterality:optional(first.laterality),quality:{score,method:first.quality_method,flags,lowConfidence:first.quality_low_confidence==='true'},limitations,originalReport:first.original_report,values:rows.map(r=>({metric:r.metric,input:r.value,unit:r.unit,missingReason:optional(r.missing_reason),indexing:optional(r.indexing)})),extraColumns:canonicalJSON(rows.map(r=>({metric:r.metric,columns:Object.fromEntries(Object.entries(r).filter(([k])=>!ultrasoundCSVColumns.includes(k as never)))})).filter(r=>Object.keys(r.columns).length))};
 assertValid<ReportCaptureContent>('ReportCaptureContent',value);const c=validateReportContent(value);
 if(canonicalJSON(subjectOf(c))!==canonicalJSON(subject))throw failure('REFERENCE_INVALID','CSV subject/origin differs from the selected report context.');return c;
}
async function prerequisites(repo:Repository,c:ReportCaptureContent){
 const source=await repo.require(c.namespace,'SourceRecord',c.sourceId);
 let mission:MissionContext|undefined;
 if(c.astronautId){const crew=await repo.require(c.namespace,'CrewProfile',c.astronautId);mission=await repo.require(c.namespace,'MissionContext',c.missionId!);if(crew.missionId!==c.missionId||crew.profileOrigin!==c.dataOrigin||mission.dataOrigin!==c.dataOrigin)throw failure('REFERENCE_INVALID','Report crew/mission origin differs.');}
 if((source.tier==='simulation')!==(c.dataOrigin==='synthetic')||c.values.some(v=>!source.supportedMetrics.includes(v.metric)))throw failure('REFERENCE_INVALID','Report source/origin or supported quantities differ.');
 return {source,mission};
}
async function rawRecord(c:ReportCaptureContent,id:string,reportId:string,payload:string,at:string,mediaType:string,importBatchId:string|null):Promise<RawRecord>{return {schemaVersion:SCHEMA_VERSION,namespace:c.namespace,recordType:'RawRecord',rawRecordId:id,revision:1,sourceId:c.sourceId,acquisitionId:reportId,importBatchId,payload,fileReference:null,contentHash:await sha256(payload),mediaType,encoding:'utf-8',retrievedAt:at,retentionPolicy:'Retain original report evidence under its source rights',accessPolicy:c.namespace==='demo'?'Fictional demo only':'Local source restrictions apply; no redistribution authorization'};}

/** Prepare manual and CSV reports using the same central number/time/unit/source validators. */
export async function prepareUltrasoundReport(repo:Repository,input:ReportCaptureContent,options:{csv?:string;receivedAt?:string}={}):Promise<CommandEnvelope>{
 const c=validateReportContent(input),{source,mission}=await prerequisites(repo,c),at=options.receivedAt??repo.clock.now();
 if(options.csv!==undefined&&canonicalJSON(mapUltrasoundCSV(options.csv,subjectOf(c)))!==canonicalJSON(c))throw failure('VALIDATION_FAILED','CSV differs from the supplied report content.');
 const ids=await reportIdentities(c,source.version),time=captureTime(c.time,mission),operationId=`ultrasound-${crypto.randomUUID()}`,validationId=`validation-${operationId}`;
 const fileHash=options.csv===undefined?null:await sha256(options.csv),importBatchId=fileHash?`ultrasound-import-${await sha256(canonicalJSON([ids.reportId,fileHash]))}`:null,fileId=fileHash?`ultrasound-file-${await sha256(canonicalJSON([ids.reportId,fileHash]))}`:null;
 const evidence:ReportCaptureEvidence={protocolVersion:'ultrasound-report/1',reportId:ids.reportId,content:c,contentFingerprint:await sha256(canonicalJSON(c)),receivedAt:at,deliveryMode:options.csv===undefined?'manual':'file_import',originalFileRawRecordId:fileId,originalFileHash:fileHash};
 const raw=await rawRecord(c,ids.evidenceId,ids.reportId,canonicalJSON(evidence),at,ULTRASOUND_MEDIA,importBatchId);
 const snapshot={schemaVersion:SCHEMA_VERSION,sourceId:source.sourceId,name:source.name,tier:source.tier,canonicalURL:source.canonicalURL,version:source.version,license:source.license,attribution:source.attribution,retrievedAt:source.retrievedAt};
 const observations:Observation[]=c.values.map(row=>{const id=ids.rows.find(x=>x.metric===row.metric)!,n=reportNumber(c,row);return checkedObservation({schemaVersion:SCHEMA_VERSION,namespace:c.namespace,recordType:'Observation',observationId:id.observationId,revision:1,astronautId:c.astronautId,missionId:c.missionId,publicSubjectId:c.publicSubjectId,datasetId:c.datasetId,...time,receivedAt:at,metric:row.metric,valueKind:'number',value:n.number,unit:metricRegistry[row.metric].canonicalUnit,missingReason:row.missingReason,context:c.context,measurementContext:reportMeasurementContext(c,row),source:snapshot,quality:structuredClone(c.quality),validation:{status:'pending',validationRunId:validationId,evidenceIds:[],procedureVersion:PROCEDURE_VERSION,issues:['Numerical transcription; independent scientific/acquisition validation pending'],admission:c.namespace==='demo'?'demo_only':'quarantined'},dataOrigin:c.dataOrigin,deliveryMode:evidence.deliveryMode,synthetic:c.dataOrigin==='synthetic',era:c.namespace==='demo'?'fictional scenario':'reported acquisition; era not supplied',provenance:{rawRecordId:raw.rawRecordId,contentHash:raw.contentHash,sourceRecordId:id.sourceRecordId,importBatchId,pipelineVersion:ULTRASOUND_PIPELINE,algorithm:null,parameters:{reportContextVersion:ULTRASOUND_CONTEXT,muscle:c.muscle,probeId:c.probeId},originalUnit:row.unit,originalValue:n.original,evidenceObservationIds:[],windowIds:[],originalSamplingHz:null,outputSamplingHz:null},reportId:ids.reportId,sessionId:null,acquisitionId:ids.reportId,regionKey:null,laterality:c.laterality,supersedesObservationId:null});});
 const report=checkedReport({schemaVersion:SCHEMA_VERSION,namespace:c.namespace,recordType:'Report',reportId:ids.reportId,revision:1,astronautId:c.astronautId,missionId:c.missionId,publicSubjectId:c.publicSubjectId,type:c.type,...time,sourceId:source.sourceId,observationIds:observations.map(o=>o.observationId),method:c.method,deviceId:c.deviceId,lead:null,view:c.view,site:c.site,laterality:c.laterality,originalReportRawRecordId:raw.rawRecordId,dataOrigin:c.dataOrigin});
 const run=validateEvidence({namespace:c.namespace,id:validationId,kind:'sample_integrity',claim:'Numerical report transcription and original evidence; no scientific interpretation',sources:[source],checks:[],at,subjectRecordIds:[report.reportId,...report.observationIds],limitations:[...c.limitations,'No independent sample corroboration or clinical/image validation'],normalization:'Central registered dimensional conversions only',reviewComplete:false});
 const command:CommandEnvelope={schemaVersion:SCHEMA_VERSION,namespace:c.namespace,operationId,idempotencyKey:operationId,subject:{kind:c.dataOrigin==='public_research'?'namespace':'crew',astronautId:c.astronautId,missionId:c.missionId},createdAt:at,operation:evidence.deliveryMode==='manual'?'capture':'import',domain:'reports',payload:{records:[raw,...observations,report,run],expectedRevisions:[],importKeys:[],previewToken:null}};
 if(fileId&&fileHash&&importBatchId){
  const token=await ultrasoundPreviewToken(evidence,{fileHash,mapping:ultrasoundCSVMapping});
  const batch:ImportBatch={schemaVersion:SCHEMA_VERSION,namespace:c.namespace,recordType:'ImportBatch',importBatchId,revision:1,sourceId:source.sourceId,sourceVersion:source.version,fileHash,parser:'shared strict CSV / numerical-ultrasound',parserVersion:'1',mapping:ultrasoundCSVMapping,previewToken:token,previewState:'committed',acceptedRows:c.values.length,rejectedRows:0,quarantinedRows:0,errors:[],stableSourceRecordKeys:ids.rows.map(x=>x.key),importedAt:at};
  command.payload.records.push(batch,await rawRecord(c,fileId,ids.reportId,options.csv!,at,'text/csv',importBatchId));command.payload.previewToken=token;
  command.payload.importKeys=await Promise.all(observations.map(async o=>({key:ids.rows.find(x=>x.observationId===o.observationId)!.key,observationId:o.observationId,fingerprint:await sha256(canonicalJSON(o))})));
 }
 command.payload.records.forEach(r=>assertValid(r.recordType,r));assertValid('CommandEnvelope',command);validateUltrasoundGraph([...command.payload.records,source,...mission?[mission]:[]],c.namespace,repo.clock.now());return command;
}
export interface UltrasoundPreview {version:'ultrasound-preview/1';content:ReportCaptureContent;command:CommandEnvelope;action:'create'|'duplicate'|'conflict';message:string;integrity:string}
/** Read-only preview binds the exact prepared command and reports retained identity conflicts. */
export async function previewUltrasoundCSV(repo:Repository,csv:string,subject:ReportSubject):Promise<UltrasoundPreview>{
 const content=mapUltrasoundCSV(csv,subject),command=await prepareUltrasoundReport(repo,content,{csv}),raw=command.payload.records.find((r):r is RawRecord=>r.recordType==='RawRecord'&&r.mediaType===ULTRASOUND_MEDIA)!,current=await repo.read(content.namespace,'RawRecord',raw.rawRecordId);
 const action:UltrasoundPreview['action']=!current?'create':ultrasoundEvidence(current).contentFingerprint===ultrasoundEvidence(raw).contentFingerprint?'duplicate':'conflict';
 const body={version:'ultrasound-preview/1' as const,content,command,action,message:action==='create'?'Preview ready: one numerical report acquisition.':action==='duplicate'?'Identical report retained; no additional domain records.':'Same report identity has different original evidence; retained content is preserved.'};return {...body,integrity:await sha256(canonicalJSON(body))};
}
/** Return the exact validated pending command for atomic commit/retry. */
export async function commandFromUltrasoundPreview(p:UltrasoundPreview):Promise<CommandEnvelope>{const {integrity,...body}=p;if(await sha256(canonicalJSON(body))!==integrity)throw failure('VALIDATION_FAILED','Preview changed; preview the file again.');if(p.action==='conflict')throw failure('CONFLICT',p.message);return structuredClone(p.command);}

/** Validate source/context/content/file binding before the synchronous duplicate/write lock. */
export async function verifyUltrasoundCommand(repo:Repository,command:CommandEnvelope,e:ReportCaptureEvidence){
 const {source,mission}=await prerequisites(repo,e.content);validateUltrasoundGraph([...command.payload.records,source,...mission?[mission]:[]],command.namespace,repo.clock.now());
 await verifyUltrasoundFile([...command.payload.records,source],e);
 const batches=command.payload.records.filter((r):r is ImportBatch=>r.recordType==='ImportBatch');
 if(e.deliveryMode==='manual'){if(batches.length||command.payload.previewToken!==null||command.payload.importKeys.length||command.payload.records.filter(r=>r.recordType==='RawRecord').length!==1)throw failure('VALIDATION_FAILED','Manual report cannot carry import artifacts.');return;}
 const batch=batches[0],file=command.payload.records.find((r):r is RawRecord=>r.recordType==='RawRecord'&&r.rawRecordId===e.originalFileRawRecordId);
 if(batches.length!==1||!batch||!file||batch.importBatchId!==file.importBatchId||batch.sourceId!==source.sourceId||batch.sourceVersion!==source.version||batch.previewState!=='committed'||batch.acceptedRows!==e.content.values.length||batch.rejectedRows||batch.quarantinedRows||batch.errors.length||batch.parser!=='shared strict CSV / numerical-ultrasound'||batch.parserVersion!=='1'||batch.fileHash!==e.originalFileHash||batch.previewToken!==command.payload.previewToken||batch.previewToken!==await ultrasoundPreviewToken(e,batch)||canonicalJSON(batch.mapping)!==canonicalJSON(ultrasoundCSVMapping)||canonicalJSON(mapUltrasoundCSV(file.payload!,subjectOf(e.content)))!==canonicalJSON(e.content)||canonicalJSON(batch.stableSourceRecordKeys)!==canonicalJSON(command.payload.importKeys.map(x=>x.key))||command.payload.records.filter(r=>r.recordType==='RawRecord').length!==2)throw failure('VALIDATION_FAILED','Report import differs from its previewed file/mapping/content.');
}

/** File/mapping binding is also checked on exports, independent of their outer checksum. */
export async function verifyUltrasoundFile(records:CanonicalRecord[],e:ReportCaptureEvidence){
 const source=records.find(r=>r.recordType==='SourceRecord'&&r.sourceId===e.content.sourceId);
 if(!source||source.recordType!=='SourceRecord')throw failure('REFERENCE_INVALID','Report source is absent.');
 const observations=records.filter((r):r is Observation=>r.recordType==='Observation'&&r.reportId===e.reportId);
 const raw=records.find((r):r is RawRecord=>r.recordType==='RawRecord'&&r.mediaType===ULTRASOUND_MEDIA&&ultrasoundEvidence(r).reportId===e.reportId)!;
 if(observations.some(o=>o.provenance.importBatchId!==raw.importBatchId))throw failure('REFERENCE_INVALID','Report observation import linkage differs.');
 if(e.deliveryMode==='manual')return;
 const batch=records.find((r):r is ImportBatch=>r.recordType==='ImportBatch'&&r.importBatchId===raw.importBatchId),file=records.find((r):r is RawRecord=>r.recordType==='RawRecord'&&r.rawRecordId===e.originalFileRawRecordId),ids=await reportIdentities(e.content,source.version);
 const transportId=await sha256(canonicalJSON([e.reportId,e.originalFileHash]));
 if(e.originalFileRawRecordId!==`ultrasound-file-${transportId}`||raw.importBatchId!==`ultrasound-import-${transportId}`)throw failure('VALIDATION_FAILED','Report file/batch identity differs from report and file hash.');
 if(!batch||!file||batch.sourceId!==source.sourceId||batch.sourceVersion!==source.version||batch.fileHash!==e.originalFileHash||batch.previewToken!==await ultrasoundPreviewToken(e,batch)||canonicalJSON(batch.mapping)!==canonicalJSON(ultrasoundCSVMapping)||batch.acceptedRows!==e.content.values.length||batch.rejectedRows||batch.quarantinedRows||batch.errors.length||batch.previewState!=='committed'||batch.parser!=='shared strict CSV / numerical-ultrasound'||batch.parserVersion!=='1'||canonicalJSON(batch.stableSourceRecordKeys)!==canonicalJSON(ids.rows.map(x=>x.key))||canonicalJSON(mapUltrasoundCSV(file.payload!,subjectOf(e.content)))!==canonicalJSON(e.content))throw failure('VALIDATION_FAILED','Report file/mapping/content binding is invalid.');
}
