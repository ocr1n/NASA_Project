import {assertValid,failure,recordId,type CanonicalRecord,type RawRecord,type Observation,type SavedBaselineCalculation,type BaselineComputation} from './index';
import {canonicalJSON,sha256} from './identity';
import {computeBaseline,BASELINE_ALGORITHM} from '../baselines/compute';

export const BASELINE_MEDIA='application/vnd.astronaut.baseline-calculation+json';
export const baselineEvidenceId=(e:Pick<SavedBaselineCalculation,'seriesId'|'sequence'>)=>`baseline-history_${e.seriesId}_${e.sequence}`;
export function baselineEvidence(raw:RawRecord):SavedBaselineCalculation {
 if(raw.mediaType!==BASELINE_MEDIA||!raw.payload)throw failure('VALIDATION_FAILED','Baseline evidence payload is missing.');
 let value:unknown;try{value=JSON.parse(raw.payload);}catch{throw failure('VALIDATION_FAILED','Baseline evidence is invalid JSON.');}
 assertValid<SavedBaselineCalculation>('SavedBaselineCalculation',value);return value;
}
/** Stable acquisition/owner/method history; changing bounds or exclusions remains a new entry. */
export async function baselineSeriesId(c:BaselineComputation):Promise<string>{
 const r=c.detail.request;
 return sha256(canonicalJSON([r.namespace,r.astronautId,r.missionId,r.dataOrigin,r.metric,r.method,r.missionPhase,c.baseline.comparabilityKey??r.selectorObservationId]));
}
export function baselineHistory(records:CanonicalRecord[],seriesId:string){
 return records.filter((r):r is RawRecord=>r.recordType==='RawRecord'&&r.mediaType===BASELINE_MEDIA)
  .map(raw=>({raw,evidence:baselineEvidence(raw)})).filter(x=>x.evidence.seriesId===seriesId).sort((a,b)=>a.evidence.sequence-b.evidence.sequence);
}

/** Synchronous ownership, input linkage and chain gates run under the central write lock. */
export function validateBaselineGraph(records:CanonicalRecord[],namespace:string,now:string):void {
 const invalid=(message:string):never=>{throw failure('REFERENCE_INVALID',message,'baselines');};
 const byId=new Map(records.map(r=>[recordId(r),r]));
 const raws=records.filter((r):r is RawRecord=>r.recordType==='RawRecord'&&r.mediaType===BASELINE_MEDIA);
 const chains=new Map<string,{raw:RawRecord;e:SavedBaselineCalculation}[]>(),backed=new Set<string>();
 for(const raw of raws){
  const e=baselineEvidence(raw),c=e.computation,r=c.detail.request,b=c.baseline;
  const crew=records.find(x=>x.recordType==='CrewProfile'&&x.astronautId===r.astronautId);
  const mission=records.find(x=>x.recordType==='MissionContext'&&x.missionId===r.missionId);
  const source=records.find(x=>x.recordType==='SourceRecord'&&x.sourceId===e.sourceId);
  if(namespace!=='demo'||r.namespace!==namespace||r.dataOrigin!=='synthetic'||!crew||crew.recordType!=='CrewProfile'||crew.profileOrigin!=='synthetic'||crew.missionId!==r.missionId||!mission||mission.recordType!=='MissionContext'||mission.dataOrigin!=='synthetic'||!source||source.recordType!=='SourceRecord'||source.tier!=='simulation')invalid('Saved calculation requires its fictional crew, mission and source.');
  if(!e.reason.trim()||Date.parse(e.savedAt)>Date.parse(now)||Date.parse(b.calculatedAt)>Date.parse(e.savedAt)||raw.rawRecordId!==baselineEvidenceId(e)||raw.revision!==1||raw.namespace!==namespace||raw.acquisitionId!==raw.rawRecordId||raw.sourceId!==e.sourceId||raw.retrievedAt!==e.savedAt||raw.importBatchId!==null||raw.fileReference!==null||raw.encoding!=='utf-8'||raw.payload!==canonicalJSON(e))invalid('Saved calculation metadata differs from evidence.');
  const retained=byId.get(b.baselineId);
  if(!retained||retained.recordType!=='Baseline'||canonicalJSON(retained)!==canonicalJSON(b)||b.algorithmVersion!==BASELINE_ALGORITHM||b.revision!==1)invalid('Saved calculation differs from its immutable Baseline.');
  for(const id of e.snapshotObservationIds)if(byId.get(id)?.recordType!=='Observation')invalid('Historical snapshot observation is missing.');
  for(const input of c.detail.inputRecords){
   const o=byId.get(input.observationId),rawInput=byId.get(input.rawRecordId);
   if(!e.snapshotObservationIds.includes(input.observationId)||!o||o.recordType!=='Observation'||o.astronautId!==r.astronautId||o.missionId!==r.missionId||o.dataOrigin!==r.dataOrigin||!rawInput||rawInput.recordType!=='RawRecord'||rawInput.sourceId!==input.sourceId||rawInput.contentHash!==o.provenance.contentHash)invalid('Calculation input owner or raw evidence differs.');
  }
  backed.add(b.baselineId);if(!chains.has(e.seriesId))chains.set(e.seriesId,[]);chains.get(e.seriesId)!.push({raw,e});
 }
 for(const chain of chains.values()){
  chain.sort((a,b)=>a.e.sequence-b.e.sequence);
  for(let i=0;i<chain.length;i++){
   const {e}=chain[i],previous=chain[i-1];
   if(e.sequence!==i+1||e.previousRawRecordId!==(previous?.raw.rawRecordId??null)||previous?.e.computation.detail.inputHash===e.computation.detail.inputHash||previous&&Date.parse(e.savedAt)<Date.parse(previous.e.savedAt))invalid('Calculation history has a changed head, duplicate latest input or invalid order.');
  }
 }
 for(const b of records)if(b.recordType==='Baseline'&&(b.algorithmVersion===BASELINE_ALGORITHM||b.baselineId.startsWith('baseline_'))&&!backed.has(b.baselineId))invalid('Computed Baseline requires retained calculation evidence.');
 for(const id of backed){
  const first=raws.map(baselineEvidence).filter(e=>e.computation.baseline.baselineId===id).sort((a,b)=>Date.parse(a.savedAt)-Date.parse(b.savedAt)||a.sequence-b.sequence)[0];
  if(first.computation.baseline.calculatedAt!==first.savedAt)invalid('Original calculation time differs from its first saved evidence.');
 }
}

/** Audit saved mathematics against historical canonical inputs before write or restore; no crypto in a transaction. */
export async function verifyBaselineEvidence(records:CanonicalRecord[]):Promise<void>{
 for(const raw of records)if(raw.recordType==='RawRecord'&&raw.mediaType===BASELINE_MEDIA){
  const e=baselineEvidence(raw),c=e.computation;
  const inputs=e.snapshotObservationIds.map(id=>records.find((r):r is Observation=>r.recordType==='Observation'&&r.observationId===id));
  if(inputs.some(o=>!o))throw failure('REFERENCE_INVALID','Historical baseline input is missing.');
  const recomputed=await computeBaseline(inputs as Observation[],c.detail.request,c.detail.policy,e.savedAt);
  // Reverting to an old configuration reuses its original immutable Baseline time.
  recomputed.baseline.calculatedAt=c.baseline.calculatedAt;
  if(e.seriesId!==await baselineSeriesId(c)||canonicalJSON(recomputed)!==canonicalJSON(c))throw failure('VALIDATION_FAILED','Saved calculation differs from its canonical inputs or method.');
 }
}
