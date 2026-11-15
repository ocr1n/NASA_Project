import {assertValid,failure,SCHEMA_VERSION,type BaselineRequest,type BaselinePolicy,type CanonicalRecord,type Observation,type ExportSnapshot,type SavedBaselineCalculation,type CommandEnvelope,type RawRecord} from '../contracts';
import {canonicalJSON,sha256} from '../contracts/identity';
import {BASELINE_MEDIA,baselineEvidenceId,baselineHistory,baselineSeriesId} from '../contracts/baselines';
import type {Repository} from '../repositories/repository';
import {computeBaseline} from './compute';
import {demoBaselinePolicy} from './policy';

export interface PreparedBaselineSave {
 snapshot:ExportSnapshot;
 evidence:SavedBaselineCalculation;
 command:CommandEnvelope|null;
}

/** Prepare once from a committed snapshot; reason is an explicit human-readable recomputation rationale. */
export async function prepareBaselineSave(repo:Pick<Repository,'export'>,request:BaselineRequest,reason:string,policy:BaselinePolicy=structuredClone(demoBaselinePolicy)):Promise<PreparedBaselineSave>{
 assertValid('BaselineRequest',request);
 if(!reason.trim()||reason.length>4000)throw failure('VALIDATION_FAILED','A baseline save requires a reason of 1–4000 characters.');
 const snapshot=await repo.export(request.namespace);
 const crew=snapshot.records.find(r=>r.recordType==='CrewProfile'&&r.astronautId===request.astronautId);
 const mission=snapshot.records.find(r=>r.recordType==='MissionContext'&&r.missionId===request.missionId);
 const source=snapshot.records.find(r=>r.recordType==='SourceRecord'&&r.tier==='simulation');
 if(request.namespace!=='demo'||request.dataOrigin!=='synthetic'||!crew||crew.recordType!=='CrewProfile'||crew.profileOrigin!==request.dataOrigin||crew.missionId!==request.missionId||!mission||mission.recordType!=='MissionContext'||mission.dataOrigin!==request.dataOrigin||!source||source.recordType!=='SourceRecord')throw failure('REFERENCE_INVALID','Baseline persistence requires its committed fictional crew/mission/source.');
 const computation=await computeBaseline(snapshot.records.filter((r):r is Observation=>r.recordType==='Observation'),request,policy,snapshot.exportedAt);
 const seriesId=await baselineSeriesId(computation),history=baselineHistory(snapshot.records,seriesId),previous=history.at(-1);
 if(previous?.evidence.computation.detail.inputHash===computation.detail.inputHash)return {snapshot,evidence:previous.evidence,command:null};
 const existing=snapshot.records.find(r=>r.recordType==='Baseline'&&r.baselineId===computation.baseline.baselineId);
 if(existing){
  if(existing.recordType!=='Baseline'||canonicalJSON({...existing,calculatedAt:computation.baseline.calculatedAt})!==canonicalJSON(computation.baseline))throw failure('CONFLICT','Existing calculation identity has different content.');
  computation.baseline=existing;
 }
 const evidence:SavedBaselineCalculation={protocolVersion:'saved-baseline/1',seriesId,sequence:(previous?.evidence.sequence??0)+1,previousRawRecordId:previous?.raw.rawRecordId??null,sourceId:source.sourceId,reason,savedAt:snapshot.exportedAt,snapshotObservationIds:snapshot.records.filter(r=>r.recordType==='Observation').map(r=>r.observationId).sort(),computation};
 assertValid('SavedBaselineCalculation',evidence);
 const payload=canonicalJSON(evidence),rawRecordId=baselineEvidenceId(evidence);
 const raw:RawRecord={schemaVersion:SCHEMA_VERSION,namespace:request.namespace,recordType:'RawRecord',rawRecordId,revision:1,sourceId:source.sourceId,acquisitionId:rawRecordId,importBatchId:null,payload,fileReference:null,contentHash:await sha256(payload),mediaType:BASELINE_MEDIA,encoding:'utf-8',retrievedAt:evidence.savedAt,retentionPolicy:'Preserve every calculation and prior fixed reference.',accessPolicy:'Public fictional; demo only'};
 const records:CanonicalRecord[]=existing?[raw]:[computation.baseline,raw];
 const command:CommandEnvelope={schemaVersion:SCHEMA_VERSION,namespace:request.namespace,operationId:'save_'+rawRecordId,idempotencyKey:'save_'+rawRecordId,subject:{kind:'crew',astronautId:request.astronautId,missionId:request.missionId},createdAt:evidence.savedAt,operation:'upsert',domain:'baselines',payload:{records,expectedRevisions:[],importKeys:[],previewToken:null}};
 assertValid('CommandEnvelope',command);return {snapshot,evidence,command};
}

/** Atomic save. Retain a prepared command/snapshot to retry an interrupted acknowledgement exactly. */
export async function saveBaselineCalculation(repo:Repository,request:BaselineRequest,reason:string,policy:BaselinePolicy=structuredClone(demoBaselinePolicy)){
 const prepared=await prepareBaselineSave(repo,request,reason,policy);
 const receipt=prepared.command?await repo.execute(prepared.command,prepared.snapshot):null;
 return {evidence:prepared.evidence,receipt};
}

/** Read one series from one snapshot, with explicit owner/method/context identity and prior entries retained. */
export async function readBaselineHistory(repo:Pick<Repository,'export'>,namespace:string,seriesId:string){
 const snapshot=await repo.export(namespace);return baselineHistory(snapshot.records,seriesId);
}
