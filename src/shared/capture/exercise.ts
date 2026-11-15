import {assertValid,failure,SCHEMA_VERSION,type ExerciseCaptureContent,type ExerciseCaptureEvidence,type ExerciseNoteAmendment,type ExerciseSession,type CommandEnvelope,type RawRecord,type ImportBatch} from '../contracts';
import {canonicalJSON,sha256,stableImportKey,importedObservationId} from '../contracts/identity';
import {EXERCISE_MEDIA,EXERCISE_NOTES_MEDIA,exerciseMetrics,exercisePayload,exercisePreviewToken,selectExerciseNotes} from '../contracts/exercise';
import {prepareCapture,captureTime,type NumericCaptureValue} from './index';
import {measurementScales} from '../metrics/bundles';
import {readCSV} from '../sources/csv';
import type {Repository} from '../repositories/repository';

export const exerciseCSVFormat='fictional-exercise/1';
export const exerciseCSVColumns=['format','session_key','crew_id','activity','workload','protocol_id','time_precision','reported_time','time_reason','device_id','posture','metric','value','unit','missing_reason'] as const;
export const exerciseCSVMapping=exerciseCSVColumns.map(sourceColumn=>({sourceColumn,canonicalField:({format:'protocolVersion',session_key:'ExerciseSession.sourceSessionId',crew_id:'astronautId',activity:'measurementContext.activity',workload:'measurementContext.workload',protocol_id:'measurementContext.protocolId',time_precision:'timePrecision',reported_time:'originalTime',time_reason:'timeReason',device_id:'measurementContext.deviceId',posture:'measurementContext.posture',metric:'metric',value:'provenance.originalValue',unit:'provenance.originalUnit',missing_reason:'missingReason'})[sourceColumn]}));
export interface ExercisePreview {version:'exercise-preview/1';content:ExerciseCaptureContent;command:CommandEnvelope;action:'create'|'duplicate'|'conflict';message:string;integrity:string}
const optional=(s:string)=>s||null;
/** One retained manual identity; all optional quantities start explicitly missing. */
export function emptyExerciseContent(crewId:string):ExerciseCaptureContent {
 return {sessionKey:`manual-${crypto.randomUUID()}`,crewId,activity:'cycling',workload:null,protocolId:'fictional-session-v1',time:{precision:'unknown',text:'',reason:'Not reported'},deviceId:null,posture:null,values:exerciseMetrics.map(metric=>({metric,input:'',unit:metric==='exercise_duration'?'min':metric==='perceived_exertion'?'1':metric==='cycling_power'?'W':'/min',missingReason:metric==='exercise_duration'?null:'not reported'})),extraColumns:'[]'};
}
/** Strict named one-session mapping. Unknown columns are retained, never silently discarded. */
export function mapExerciseCSV(payload:string,crewId:string):ExerciseCaptureContent {
 if(new TextEncoder().encode(payload).byteLength>262144)throw failure('VALIDATION_FAILED','This single-session CSV is limited to 256 KiB.');
 const rows=readCSV(payload),first=rows[0];
 if(rows.length!==5||!first)throw failure('VALIDATION_FAILED','Use exactly five distinct measurement/missing rows for one session.');
 if(exerciseCSVColumns.some(k=>!(k in first)))throw failure('VALIDATION_FAILED','CSV is missing a required fictional-exercise/1 column.');
 if(first.format!==exerciseCSVFormat||first.crew_id!==crewId)throw failure('REFERENCE_INVALID','CSV format or crew does not match the selected fictional crew.');
 const sessionColumns=exerciseCSVColumns.filter(k=>!['metric','value','unit','missing_reason'].includes(k));
 if(rows.some(r=>sessionColumns.some(k=>r[k]!==first[k])))throw failure('VALIDATION_FAILED','CSV rows must describe the same session, crew and context.');
 const content:unknown={sessionKey:first.session_key,crewId:first.crew_id,activity:first.activity,workload:optional(first.workload),protocolId:first.protocol_id,time:{precision:first.time_precision,text:first.reported_time,reason:first.time_reason},deviceId:optional(first.device_id),posture:optional(first.posture),values:rows.map(r=>({metric:r.metric,input:r.value,unit:r.unit,missingReason:optional(r.missing_reason)})).sort((a,b)=>exerciseMetrics.indexOf(a.metric as never)-exerciseMetrics.indexOf(b.metric as never)),extraColumns:canonicalJSON(rows.map(r=>({metric:r.metric,columns:Object.fromEntries(Object.entries(r).filter(([k])=>!exerciseCSVColumns.includes(k as never)))})).filter(r=>Object.keys(r.columns).length>0).sort((a,b)=>a.metric.localeCompare(b.metric)))};
 assertValid<ExerciseCaptureContent>('ExerciseCaptureContent',content);return content;
}
async function rawRecord(id:string,sourceId:string,sessionId:string,payload:string,at:string,mediaType:string,importBatchId:string|null=null):Promise<RawRecord>{
 return {schemaVersion:SCHEMA_VERSION,namespace:'demo',recordType:'RawRecord',rawRecordId:id,revision:1,sourceId,acquisitionId:sessionId,importBatchId,payload,fileReference:null,contentHash:await sha256(payload),mediaType,encoding:'utf-8',retrievedAt:at,retentionPolicy:'Retain original fictional exercise evidence',accessPolicy:'Fictional demo only'};
}
async function initialNote(session:ExerciseSession,text:string,at:string,previousRawRecordId:string|null,sequence:number):Promise<RawRecord>{
 const payload:ExerciseNoteAmendment={protocolVersion:'exercise-notes/1',sessionId:session.sessionId,astronautId:session.astronautId,missionId:session.missionId,sequence,previousRawRecordId,text,recordedAt:at};assertValid('ExerciseNoteAmendment',payload);
 return rawRecord(`exercise-note-${await sha256(canonicalJSON([session.sessionId,sequence]))}`,session.sourceId,session.sessionId,canonicalJSON(payload),at,EXERCISE_NOTES_MEDIA);
}
/** Prepare both manual and imported sessions through the shared numerical capture path. */
export async function prepareExercise(repo:Repository,content:ExerciseCaptureContent,options:{csv?:string;notes?:string;receivedAt?:string}={}):Promise<CommandEnvelope>{
 assertValid('ExerciseCaptureContent',content);
 if(new Set(content.values.map(v=>v.metric)).size!==5||!exerciseMetrics.every(m=>content.values.some(v=>v.metric===m)))throw failure('VALIDATION_FAILED','Exercise needs five distinct value/missing rows.');
 const duration=content.values.find(v=>v.metric==='exercise_duration')!;if(duration.missingReason)throw failure('VALIDATION_FAILED','This session format requires a reported duration.','exercise_duration');
 const crew=await repo.require('demo','CrewProfile',content.crewId),source=await repo.require('demo','SourceRecord','simulation'),mission=await repo.require('demo','MissionContext',crew.missionId);
 const receivedAt=options.receivedAt??repo.clock.now(),deliveryMode=options.csv===undefined?'manual':'file_import';
 const identity=stableImportKey('demo',source.sourceId,source.version,await sha256(canonicalJSON([crew.astronautId,crew.missionId,content.sessionKey]))),suffix=await sha256(identity),sessionId=`session_${suffix}`,evidenceId=`exercise-raw-${suffix}`;
 const normalizedContent=structuredClone(content);normalizedContent.values.sort((a,b)=>exerciseMetrics.indexOf(a.metric)-exerciseMetrics.indexOf(b.metric));
 const evidence:ExerciseCaptureEvidence={protocolVersion:'exercise-capture/1',sessionId,astronautId:crew.astronautId,missionId:crew.missionId,sourceId:source.sourceId,content:normalizedContent,contentFingerprint:await sha256(canonicalJSON(normalizedContent)),receivedAt,deliveryMode};
 const keys=new Map<string,string>(),sourceIds=new Map<string,string>();
 const values:NumericCaptureValue[]=await Promise.all(normalizedContent.values.map(async value=>{
  const sourceRecordId=`exercise_${await sha256(canonicalJSON([crew.astronautId,crew.missionId,content.sessionKey,value.metric]))}`,key=stableImportKey('demo',source.sourceId,source.version,sourceRecordId),observationId=await importedObservationId(key);keys.set(observationId,key);sourceIds.set(observationId,sourceRecordId);
  return {...value,observationId,acquisitionId:sessionId,context:'exercise',measurementContext:{modality:'reported exercise summary',method:'fictional session summary',activity:content.activity,workload:content.workload,protocolId:content.protocolId,deviceId:content.deviceId,posture:content.posture,missionPhase:mission.missionPhase,statistic:value.metric==='exercise_peak_hr'?'peak':value.metric==='exercise_mean_hr'||value.metric==='cycling_power'?'mean':null,...(value.metric==='perceived_exertion'?{scale:measurementScales.perceived_exertion}:{})},quality:{score:null,method:'Not independently assessed',flags:['fictional input'],lowConfidence:true}};
 }));
 const c=await prepareCapture(repo,{namespace:'demo',astronautId:crew.astronautId,operationId:`exercise-${crypto.randomUUID()}`,sourceId:source.sourceId,receivedAt,deliveryMode,time:content.time,values,notes:''});
 c.domain='sessions';const observations=c.payload.records.filter(r=>r.recordType==='Observation');
 for(const o of observations){o.sessionId=sessionId;o.provenance.sourceRecordId=sourceIds.get(o.observationId)!;o.provenance.parameters.exerciseEvidenceId=evidenceId;}
 const session:ExerciseSession={schemaVersion:SCHEMA_VERSION,namespace:'demo',recordType:'ExerciseSession',sessionId,revision:1,astronautId:crew.astronautId,missionId:crew.missionId,activity:content.activity,startAt:captureTime(content.time,mission).timestamp,endAt:null,durationMinutes:observations.find(o=>o.metric==='exercise_duration')!.value as number,workload:content.workload,protocolId:content.protocolId,observationIds:observations.map(o=>o.observationId),sourceId:source.sourceId,sourceSessionId:content.sessionKey,notes:null,dataOrigin:'synthetic'};
 c.payload.records.push(session,await rawRecord(evidenceId,source.sourceId,sessionId,canonicalJSON(evidence),receivedAt,EXERCISE_MEDIA));
 if(options.csv!==undefined){
  const fileHash=await sha256(options.csv),importBatchId=`exercise-import-${await sha256(canonicalJSON([sessionId,fileHash]))}`,previewToken=await exercisePreviewToken(evidence,{fileHash,mapping:exerciseCSVMapping});
  c.operation='import';c.payload.previewToken=previewToken;
  const batch:ImportBatch={schemaVersion:SCHEMA_VERSION,namespace:'demo',recordType:'ImportBatch',importBatchId,revision:1,sourceId:source.sourceId,sourceVersion:source.version,fileHash,parser:'shared strict CSV / fictional-exercise',parserVersion:'1',mapping:exerciseCSVMapping,previewToken,previewState:'committed',acceptedRows:5,rejectedRows:0,quarantinedRows:0,errors:[],stableSourceRecordKeys:[...keys.values()],importedAt:receivedAt};
  for(const o of observations){o.provenance.importBatchId=importBatchId;const raw=c.payload.records.find(r=>r.recordType==='RawRecord'&&r.rawRecordId===o.provenance.rawRecordId)! as RawRecord;raw.importBatchId=importBatchId;}
  c.payload.records.push(batch,await rawRecord(`exercise-file-${await sha256(canonicalJSON([sessionId,fileHash]))}`,source.sourceId,sessionId,options.csv,receivedAt,'text/csv',importBatchId));
  c.payload.importKeys=await Promise.all(observations.map(async o=>({key:keys.get(o.observationId)!,observationId:o.observationId,fingerprint:await sha256(canonicalJSON(o))})));
 }
 if(options.notes?.trim())c.payload.records.push(await initialNote(session,options.notes,receivedAt,null,1));
 assertValid('CommandEnvelope',c);return c;
}
/** Preview never writes. It retains a reviewable command and detects retained conflicts. */
export async function previewExerciseCSV(repo:Repository,csv:string,crewId:string):Promise<ExercisePreview>{
 const content=mapExerciseCSV(csv,crewId),command=await prepareExercise(repo,content,{csv});
 const raw=command.payload.records.find(r=>r.recordType==='RawRecord'&&r.mediaType===EXERCISE_MEDIA)! as RawRecord;
 const current=await repo.read('demo','RawRecord',raw.rawRecordId),incoming=exercisePayload(raw,'ExerciseCaptureEvidence');
 const action:ExercisePreview['action']=!current?'create':exercisePayload(current,'ExerciseCaptureEvidence').contentFingerprint===incoming.contentFingerprint?'duplicate':'conflict';
 const body={version:'exercise-preview/1' as const,content,command,action,message:action==='create'?'Preview ready: one session and five value/missing rows.':action==='duplicate'?'Already retained: no session, measurement or task will be added.':'Conflicting workout content: retained evidence is preserved. Review the candidate file.'};
 return {...body,integrity:await sha256(canonicalJSON(body))};
}
/** Reject changed previews; optional notes attach atomically to a first capture only. */
export async function commandFromExercisePreview(preview:ExercisePreview,notes=''):Promise<CommandEnvelope>{
 const {integrity,...body}=preview;if(await sha256(canonicalJSON(body))!==integrity)throw failure('VALIDATION_FAILED','Preview changed. Preview the file again.');
 if(preview.action==='conflict')throw failure('CONFLICT',preview.message);
 const command=structuredClone(preview.command),session=command.payload.records.find(r=>r.recordType==='ExerciseSession')! as ExerciseSession;
 if(notes.trim()&&preview.action==='create')command.payload.records.push(await initialNote(session,notes,command.createdAt,null,1));return command;
}
/** Note edits append immutable evidence; callers supply the displayed head to prevent lost edits. */
export async function prepareExerciseNote(repo:Repository,crewId:string,sessionId:string,text:string,expectedHead:string|null):Promise<CommandEnvelope>{
 const session=await repo.require('demo','ExerciseSession',sessionId);if(session.astronautId!==crewId)throw failure('REFERENCE_INVALID','Select the session’s own fictional crew.');
 const {history}=selectExerciseNotes(session,await repo.list('demo','RawRecord')),head=history.at(-1)?.rawRecordId??null;
 if(head!==expectedHead)throw failure('CONFLICT','Notes changed. Refresh before editing.');
 const at=repo.clock.now(),raw=await initialNote(session,text,at,head,history.length+1),id=`exercise-note-${crypto.randomUUID()}`;
 return {schemaVersion:SCHEMA_VERSION,namespace:'demo',operationId:id,idempotencyKey:id,subject:{kind:'crew',astronautId:crewId,missionId:session.missionId},createdAt:at,operation:'capture',domain:'sessions',payload:{records:[raw],expectedRevisions:[],importKeys:[],previewToken:null}};
}
