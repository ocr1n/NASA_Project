import {assertValid,failure,type CanonicalRecord,type RawRecord,type ExerciseCaptureEvidence,type ExerciseNoteAmendment,type ExerciseSession,type ImportBatch} from './index';
import {canonicalJSON,sha256} from './identity';
import {normalizeUnit} from '../metrics';
import {measurementScales} from '../metrics/bundles';
export const EXERCISE_MEDIA='application/vnd.nasa-project.exercise-session+json';
export const EXERCISE_NOTES_MEDIA='application/vnd.nasa-project.exercise-notes+json';
export const exerciseMetrics=['exercise_duration','perceived_exertion','exercise_mean_hr','exercise_peak_hr','cycling_power'] as const;
export const exercisePreviewToken=(e:ExerciseCaptureEvidence,b:Pick<ImportBatch,'fileHash'|'mapping'>)=>sha256(canonicalJSON({version:'exercise-preview/1',namespace:'demo',astronautId:e.astronautId,missionId:e.missionId,sessionId:e.sessionId,contentFingerprint:e.contentFingerprint,fileHash:b.fileHash,mapping:b.mapping}));
/** Decode only the declared central payload protocol, without guessing legacy metadata. */
export function exercisePayload<T extends 'ExerciseCaptureEvidence'|'ExerciseNoteAmendment'>(raw:RawRecord,type:T):T extends 'ExerciseCaptureEvidence'?ExerciseCaptureEvidence:ExerciseNoteAmendment {
 let payload:unknown;try{payload=JSON.parse(raw.payload!);}catch{throw failure('VALIDATION_FAILED','Exercise evidence payload is invalid.');}
 assertValid(type,payload);return payload as never;
}
/** Async integrity work stays outside IndexedDB write transactions. */
export async function verifyExerciseEvidence(records:CanonicalRecord[]){
 for(const r of records)if(r.recordType==='RawRecord'&&r.mediaType===EXERCISE_MEDIA){const e=exercisePayload(r,'ExerciseCaptureEvidence');if(await sha256(canonicalJSON(e.content))!==e.contentFingerprint)throw failure('VALIDATION_FAILED','Exercise content fingerprint differs from retained input.');}
}
/** Synchronous graph guards also run for direct commands and snapshot restore. */
export function validateExerciseGraph(records:CanonicalRecord[],namespace:string,now:string){
 const sessions=new Map(records.filter(r=>r.recordType==='ExerciseSession').map(s=>[s.sessionId,s]));
 const observations=new Map(records.filter(r=>r.recordType==='Observation').map(o=>[o.observationId,o]));
 const evidence=new Set<string>(),notes=new Map<string,{raw:RawRecord;note:ExerciseNoteAmendment}[]>();
 const bad=(message:string):never=>{throw failure('REFERENCE_INVALID',message);};
 for(const r of records)if(r.recordType==='RawRecord'&&[EXERCISE_MEDIA,EXERCISE_NOTES_MEDIA].includes(r.mediaType)){
  const p=r.mediaType===EXERCISE_MEDIA?exercisePayload(r,'ExerciseCaptureEvidence'):exercisePayload(r,'ExerciseNoteAmendment');
  const s=sessions.get(p.sessionId);if(!s||namespace!=='demo'||s.dataOrigin!=='synthetic'||s.astronautId!==p.astronautId||s.missionId!==p.missionId||s.sourceId!==r.sourceId||r.acquisitionId!==s.sessionId)bad('Exercise evidence/note differs from its session owner/source.');
  if(r.mediaType===EXERCISE_NOTES_MEDIA){const n=p as ExerciseNoteAmendment;if(Date.parse(n.recordedAt)>Date.parse(now))bad('Note entry time is after the supplied clock.');const chain=notes.get(n.sessionId)??[];chain.push({raw:r,note:n});notes.set(n.sessionId,chain);continue;}
  const e=p as ExerciseCaptureEvidence,c=e.content,session=s!;
  if(evidence.has(session.sessionId))bad('A session has duplicate capture evidence.');evidence.add(session.sessionId);
  if(e.sourceId!==session.sourceId||c.crewId!==session.astronautId||c.sessionKey!==session.sourceSessionId||c.activity!==session.activity||c.workload!==session.workload||c.protocolId!==session.protocolId)bad('Session content differs from retained capture evidence.');
  if(new Set(c.values.map(v=>v.metric)).size!==5||!exerciseMetrics.every(m=>c.values.some(v=>v.metric===m))||session.observationIds.length!==5)bad('Exercise capture needs five distinct value/missing rows.');
  const linked=session.observationIds.map(id=>observations.get(id)??bad('Exercise observation is missing.'));
  if(new Set(linked.map(o=>o.metric)).size!==5)bad('Session measurements must be distinct.');
  for(const value of c.values){const o=linked.find(o=>o.metric===value.metric)??bad('Session metric differs from capture input.');const normalized=value.missingReason?null:normalizeUnit(value.metric,Number(value.input),value.unit);
   if(normalized&&!normalized.ok)bad('Exercise input units are incompatible.');
   if(o.sessionId!==session.sessionId||o.astronautId!==session.astronautId||o.missionId!==session.missionId||o.context!=='exercise'||o.source.sourceId!==session.sourceId||o.measurementContext.activity!==session.activity||o.measurementContext.workload!==session.workload||o.measurementContext.protocolId!==session.protocolId||o.measurementContext.deviceId!==c.deviceId||o.measurementContext.posture!==c.posture||o.provenance.parameters.exerciseEvidenceId!==r.rawRecordId)bad('Exercise measurement context differs from its session.');
   if(o.timePrecision!==c.time.precision||o.originalTime!==(c.time.text||null)||o.provenance.originalUnit!==value.unit||o.provenance.originalValue!==(value.missingReason?null:Number(value.input))||o.value!==(normalized?.ok?normalized.value:null)||o.missingReason!==value.missingReason)bad('Exercise measurement differs from original value/time/missing input.');
   if(value.metric==='perceived_exertion'&&canonicalJSON(o.measurementContext.scale??null)!==canonicalJSON(measurementScales.perceived_exertion))bad('Exercise effort differs from the declared fictional scale.');
   if(value.metric==='exercise_duration'&&o.value!==session.durationMinutes)bad('Session duration differs from its observation.');
   if(c.time.precision==='exact'&&o.timestamp!==session.startAt)bad('Session start differs from reported measurement time.');
  }
  if(c.time.precision!=='exact'&&session.startAt!==null)bad('Partial session time cannot become exact.');
  if(session.endAt!==null)bad('This capture protocol does not report an end timestamp.');
  const mean=linked.find(o=>o.metric==='exercise_mean_hr')!,peak=linked.find(o=>o.metric==='exercise_peak_hr')!;
  if(typeof mean.value==='number'&&typeof peak.value==='number'&&mean.value>peak.value)bad('Mean heart rate exceeds the reported peak.');
  if(c.activity!=='cycling'&&linked.some(o=>o.metric==='cycling_power'&&o.value!==null))bad('Cycling power requires a cycling session.');
 }
 for(const chain of notes.values()){chain.sort((a,b)=>a.note.sequence-b.note.sequence);let previous:string|null=null,lastTime=-Infinity;for(let i=0;i<chain.length;i++){const {note,raw}=chain[i];if(note.sequence!==i+1||note.previousRawRecordId!==previous||Date.parse(note.recordedAt)<lastTime)bad('Exercise notes require one contiguous amendment chain; refresh before editing.');previous=raw.rawRecordId;lastTime=Date.parse(note.recordedAt);}}
}
/** Project current notes while retaining the original immutable session and full history. */
export function selectExerciseNotes(session:ExerciseSession,raws:RawRecord[]){
 const history=raws.filter(r=>r.mediaType===EXERCISE_NOTES_MEDIA).map(raw=>({rawRecordId:raw.rawRecordId,...exercisePayload(raw,'ExerciseNoteAmendment')})).filter(n=>n.sessionId===session.sessionId&&n.astronautId===session.astronautId&&n.missionId===session.missionId).sort((a,b)=>a.sequence-b.sequence);
 return {text:history.at(-1)?.text??session.notes??'',history};
}
