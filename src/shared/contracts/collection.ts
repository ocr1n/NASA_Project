import {assertValid,failure,type CanonicalRecord,type CollectionAttemptEvidence,type RawRecord,type Observation} from './index';
import {canonicalJSON} from './identity';
import {collectionGroups,collectionSlot} from '../metrics/collection';
import {captureTime,captureNumber} from '../capture';

export const COLLECTION_MEDIA='application/vnd.astronaut.collection-attempt+json';
export const collectionId=(e:Pick<CollectionAttemptEvidence,'astronautId'|'missionId'|'schedule'|'slotIndex'|'sequence'>)=>`collection-${e.astronautId}-${e.missionId}-${e.schedule.scheduleId}-${e.slotIndex}-${e.sequence}`;
export function collectionEvidence(raw:RawRecord):CollectionAttemptEvidence {
 if(raw.mediaType!==COLLECTION_MEDIA||!raw.payload)throw failure('VALIDATION_FAILED','Collection evidence payload is missing.');
 let e:unknown;try{e=JSON.parse(raw.payload);}catch{throw failure('VALIDATION_FAILED','Collection evidence is invalid JSON.');}
 assertValid<CollectionAttemptEvidence>('CollectionAttemptEvidence',e);return e;
}
export const selectCollectionAttempts=(raws:RawRecord[],crewId:string,scheduleId:string,index:number)=>raws.filter(r=>r.mediaType===COLLECTION_MEDIA).map(raw=>({raw,evidence:collectionEvidence(raw)})).filter(x=>x.evidence.astronautId===crewId&&x.evidence.schedule.scheduleId===scheduleId&&x.evidence.slotIndex===index).sort((a,b)=>a.evidence.sequence-b.evidence.sequence);

/** Validate immutable slot chains and referenced acquisition evidence on write and restore. */
export function validateCollectionGraph(records:CanonicalRecord[],namespace:string):void {
 const raws=records.filter((r):r is RawRecord=>r.recordType==='RawRecord'&&r.mediaType===COLLECTION_MEDIA),chains=new Map<string,{raw:RawRecord;e:CollectionAttemptEvidence}[]>();
 const invalid=(message:string):never=>{throw failure('REFERENCE_INVALID',message,'collection');};
 const numerical=new Set(Object.values(collectionGroups).flat());
 for(const raw of raws){
  const e=collectionEvidence(raw),crew=records.find(r=>r.recordType==='CrewProfile'&&r.astronautId===e.astronautId),mission=records.find(r=>r.recordType==='MissionContext'&&r.missionId===e.missionId),source=records.find(r=>r.recordType==='SourceRecord'&&r.sourceId===e.sourceId);
  if(namespace!=='demo'||!crew||crew.recordType!=='CrewProfile'||crew.profileOrigin!=='synthetic'||crew.missionId!==e.missionId||!mission||mission.recordType!=='MissionContext'||mission.dataOrigin!=='synthetic'||!source||source.recordType!=='SourceRecord'||source.tier!=='simulation')throw failure('REFERENCE_INVALID','Collection requires the retained fictional owner, mission and source.');
  const slot=collectionSlot(mission,e.schedule.scheduleId,e.slotIndex);
  if(!slot||slot.dueAt!==e.dueAt||canonicalJSON(slot.schedule)!==canonicalJSON(e.schedule)||raw.rawRecordId!==collectionId(e)||raw.acquisitionId!==raw.rawRecordId||raw.sourceId!==e.sourceId||raw.retrievedAt!==e.recordedAt||raw.importBatchId!==null||raw.payload!==canonicalJSON(e))invalid('Collection identity, schedule or retained metadata differs.');
  const time=captureTime(e.time,mission);
  if(new Set(e.observationIds).size!==e.observationIds.length||new Set(e.reportIds).size!==e.reportIds.length)invalid('Collection has duplicate evidence references.');
  const observations=e.observationIds.map(id=>records.find(r=>r.recordType==='Observation'&&r.observationId===id));
  const isContext=e.schedule.scheduleId==='fictional-context-7d';
  if(isContext&&e.reportIds.length||!isContext&&e.observationIds.length)invalid('Collection evidence differs from the configured acquisition path.');
  for(const o of observations){
   if(!o||o.recordType!=='Observation'||o.astronautId!==e.astronautId||o.missionId!==e.missionId||o.source.sourceId!==e.sourceId||o.dataOrigin!=='synthetic'||!numerical.has(o.metric)||o.sessionId||o.reportId||o.context!==e.schedule.context||o.receivedAt!==e.recordedAt||o.provenance.pipelineVersion!=='measurement-capture/03.1'||o.timePrecision!==time.timePrecision||o.timestamp!==time.timestamp||o.originalTime!==time.originalTime||o.timeReason!==time.timeReason)throw failure('REFERENCE_INVALID','Collection measurement owner, path or reported time differs.');
   const input=records.find(r=>r.recordType==='RawRecord'&&r.rawRecordId===o.provenance.rawRecordId);
   if(!input||input.recordType!=='RawRecord'||!input.payload)throw failure('REFERENCE_INVALID','Collection measurement needs retained numerical input.');
   const parsed=JSON.parse(input.payload);
   if(parsed.astronautId!==e.astronautId||parsed.receivedAt!==e.recordedAt||canonicalJSON(parsed.time)!==canonicalJSON(e.time))invalid('Collection numerical input differs from the attempt.');
   const number=captureNumber(parsed.input);
   if(parsed.input.metric!==o.metric||parsed.input.unit!==o.provenance.originalUnit||number.number!==o.value||number.original!==o.provenance.originalValue||parsed.input.missingReason!==o.missingReason||canonicalJSON(parsed.input.measurementContext)!==canonicalJSON(o.measurementContext)||canonicalJSON(parsed.input.quality)!==canonicalJSON(o.quality)||parsed.input.context!==o.context||Object.entries(parsed.input.measurementParameters??{}).some(([k,v])=>o.provenance.parameters[k]!==v))invalid('Collection normalized value or context differs from retained original input.');
  }
  if(observations.length&&!Object.values(collectionGroups).some(metrics=>canonicalJSON([...metrics].sort())===canonicalJSON(observations.map(o=>(o as Observation).metric).sort())))invalid('Collection captures exactly one available acquisition group.');
  for(const id of e.reportIds){const report=records.find(r=>r.recordType==='Report'&&r.reportId===id);
   if(!report||report.recordType!=='Report'||report.astronautId!==e.astronautId||report.missionId!==e.missionId||report.dataOrigin!=='synthetic'||report.sourceId!==e.sourceId||report.type!==(e.schedule.scheduleId==='fictional-ecg-30d'?'ecg':'echo')||report.timePrecision!==time.timePrecision||(report.timestamp?new Date(report.timestamp).toISOString():null)!==time.timestamp||(report.originalTime??report.timestamp??'')!==e.time.text)invalid('Collection report owner, type or reported time differs.');
  }
  if(e.outcome==='recorded'){
   if(isContext?observations.length===0||observations.some(o=>(o as Observation).value===null):e.reportIds.length!==1)invalid('Recorded collection requires the intended retained acquisition.');
  }else{
   if(!e.reason.trim())invalid('Missing, skipped and device-failed collection needs a reason.');
   if(e.outcome==='missing'){if(e.reportIds.length||isContext&&(observations.length===0||observations.some(o=>(o as Observation).value!==null)))invalid('Missing collection must preserve null measurements or an absent report.');}
   else if(e.observationIds.length||e.reportIds.length)invalid('Skipped or device-failed collection cannot contain measurements.');
  }
  const key=canonicalJSON([e.astronautId,e.missionId,e.schedule.scheduleId,e.slotIndex]);if(!chains.has(key))chains.set(key,[]);chains.get(key)!.push({raw,e});
 }
 for(const chain of chains.values()){chain.sort((a,b)=>a.e.sequence-b.e.sequence);for(let i=0;i<chain.length;i++){
  const {e}=chain[i],previous=chain[i-1];if(e.sequence!==i+1||e.previousRawRecordId!==(previous?.raw.rawRecordId??null)||previous?.e.outcome==='recorded')invalid('Collection attempt head changed or a recorded slot is already closed.');
 }}
}
