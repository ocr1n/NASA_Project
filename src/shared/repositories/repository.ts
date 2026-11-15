import {assertValid,failure,recordId,SCHEMA_VERSION,type CanonicalRecord,type CommandEnvelope,type EventEnvelope,type OperationReceipt,type RecordType,type ExportSnapshot} from '../contracts';
import {canonicalJSON,sha256,stableImportKey,importedObservationId} from '../contracts/identity';
import {systemClock,type Clock} from '../contracts/clock';
import {validateGraph} from './references';
import {storageKey,type StorageAdapter} from './storage';
import {prepareSnapshot,migrations,type MigrationRegistry} from './snapshot';
import {EXERCISE_MEDIA,EXERCISE_NOTES_MEDIA,exercisePayload,exercisePreviewToken,verifyExerciseEvidence} from '../contracts/exercise';
import {mapExerciseCSV,exerciseCSVMapping} from '../capture/exercise';
import {COLLECTION_MEDIA,collectionEvidence} from '../contracts/collection';
import {ECG_MEDIA,ecgEvidence,validateEcgCommand,verifyEcgEvidence} from '../contracts/ecg';
import {ECG_RESEARCH_MEDIA,verifyResearchEcgEvidence,validateResearchEcgCommand,researchEvidence,researchEvidenceId} from '../contracts/ecg-research';
import {BASELINE_MEDIA,baselineEvidence,verifyBaselineEvidence} from '../contracts/baselines';
import {ULTRASOUND_MEDIA,ultrasoundEvidence,ultrasoundCommandEvidence,verifyUltrasoundEvidence} from '../contracts/ultrasound';
import {verifyUltrasoundCommand} from '../capture/ultrasound';
const immutable=new Set<RecordType>(['Observation','EnvironmentalObservation','RawRecord','ValidationRun','SourceRecord','Report','ExerciseSession','ImportBatch','Baseline','ComparisonResult','AtlasRegionManifest']);
const baselineSnapshotJSON=(records:CanonicalRecord[])=>canonicalJSON([...records].sort((a,b)=>recordId(a).localeCompare(recordId(b))));
export class Repository {
 private listeners=new Set<(event:EventEnvelope)=>void>();
 constructor(readonly storage:StorageAdapter,readonly clock:Clock=systemClock){}
 subscribe(listener:(event:EventEnvelope)=>void){this.listeners.add(listener);return ()=>{this.listeners.delete(listener);};}
 private publish(event:EventEnvelope){for(const listener of this.listeners)try{listener(structuredClone(event));}catch{ /* Observer errors cannot turn a committed transaction into failure. */ }}
 async read<T extends RecordType>(namespace:string,type:T,id:string):Promise<Extract<CanonicalRecord,{recordType:T}>|null>{return (await this.storage.read(namespace)).records[storageKey(type,id)] as Extract<CanonicalRecord,{recordType:T}>??null;}
 async require<T extends RecordType>(namespace:string,type:T,id:string){const value=await this.read(namespace,type,id);if(!value)throw failure('STORAGE_EVICTED','An expected local record is missing; restore a trusted export.','/',true,'restore');return value;}
 async list<T extends RecordType>(namespace:string,type:T):Promise<Extract<CanonicalRecord,{recordType:T}>[]>{return Object.values((await this.storage.read(namespace)).records).filter(r=>r.recordType===type).sort((a,b)=>recordId(a).localeCompare(recordId(b))) as Extract<CanonicalRecord,{recordType:T}>[];}
 async export(namespace:string):Promise<ExportSnapshot>{
  const state=await this.storage.read(namespace);const body={schemaVersion:SCHEMA_VERSION,namespace,exportedAt:this.clock.now(),records:Object.values(state.records).sort((a,b)=>storageKey(a.recordType,recordId(a)).localeCompare(storageKey(b.recordType,recordId(b)))),operationLedger:state.operations,importLedger:state.imports};
  const result={...body,integrity:{algorithm:'sha256' as const,contentHash:await sha256(canonicalJSON(body)),recordCount:body.records.length}};assertValid<ExportSnapshot>('ExportSnapshot',result);return result;
 }
 async restore(input:unknown,registry:MigrationRegistry=migrations){
  const now=this.clock.now(),snapshot=await prepareSnapshot(input,now,registry);
  const sequence=await this.storage.transact(snapshot.namespace,draft=>{
   if(Object.keys(draft.records).length||draft.operations.length||draft.imports.length)throw failure('CONFLICT','Restore requires an empty namespace; existing work is preserved');
   draft.records=Object.fromEntries(snapshot.records.map(r=>[storageKey(r.recordType,recordId(r)),r]));draft.operations=snapshot.operationLedger;draft.imports=snapshot.importLedger;draft.sequence++;return draft.sequence;
  });this.publish({schemaVersion:SCHEMA_VERSION,eventId:`restore-${crypto.randomUUID()}`,operationId:`restore-${crypto.randomUUID()}`,namespace:snapshot.namespace,subject:{kind:'namespace',astronautId:null,missionId:null},sequence,cursor:String(sequence),eventTime:now,receivedAt:now,deliveryMode:'file_import',payload:{changedRecords:snapshot.records.map(r=>({recordType:r.recordType,recordId:recordId(r)}))}});
 }
 async execute(input:unknown,expectedBaselineSnapshot?:ExportSnapshot):Promise<OperationReceipt>{
  canonicalJSON(input);assertValid<CommandEnvelope>('CommandEnvelope',input);const c=structuredClone(input);const now=this.clock.now();
  if(c.subject.kind==='crew'?(!c.subject.astronautId||!c.subject.missionId):c.subject.kind==='mission'?(!c.subject.missionId||c.subject.astronautId!==null):(c.subject.astronautId!==null||c.subject.missionId!==null))throw failure('VALIDATION_FAILED','Command subject variant is incompatible');
  await verifyRawHashes(c.payload.records);
  await verifyExerciseEvidence(c.payload.records);
  await verifyUltrasoundEvidence(c.payload.records);
  const ultrasound=ultrasoundCommandEvidence(c);
  if(c.payload.records.some(r=>r.recordType==='Report'&&r.reportId.startsWith('ultrasound_'))&&!ultrasound)throw failure('VALIDATION_FAILED','Numerical ultrasound capture requires central retained evidence.');
  if(ultrasound)await verifyUltrasoundCommand(this,c,ultrasound);
  await verifyEcgEvidence(c.payload.records);
  const hasResearchEcg=c.payload.records.some(r=>r.recordType==='RawRecord'&&r.mediaType===ECG_RESEARCH_MEDIA);
  if(hasResearchEcg){validateResearchEcgCommand(c);await verifyResearchEcgEvidence(c.payload.records);}
  const research=hasResearchEcg?c.payload.records.filter((r):r is Extract<CanonicalRecord,{recordType:'RawRecord'}>=>r.recordType==='RawRecord'&&r.mediaType===ECG_RESEARCH_MEDIA).map(researchEvidence):[];
  const hasEcg=c.payload.records.some(r=>r.recordType==='RawRecord'&&r.mediaType===ECG_MEDIA);
  if(c.domain==='reports'&&c.payload.records.some(r=>r.recordType==='Report'&&r.type==='ecg')&&!hasEcg&&!hasResearchEcg)throw failure('VALIDATION_FAILED','ECG report capture requires retained central evidence.');
  const ecg=hasEcg?await validateEcgCommand(c,(await this.require(c.namespace,'SourceRecord',ecgEvidence(c.payload.records.find(r=>r.recordType==='RawRecord'&&r.mediaType===ECG_MEDIA) as Extract<CanonicalRecord,{recordType:'RawRecord'}>).sourceId)).version):null;

  const saved=c.payload.records.filter((r):r is Extract<CanonicalRecord,{recordType:'RawRecord'}>=>r.recordType==='RawRecord'&&r.mediaType===BASELINE_MEDIA);
  let expectedBaselineJSON:string|undefined;
  if(saved.length){
   if(saved.length!==1||!expectedBaselineSnapshot||c.domain!=='baselines'||c.operation!=='upsert'||c.subject.kind!=='crew'||c.payload.records.some(r=>!['RawRecord','Baseline'].includes(r.recordType))||c.payload.expectedRevisions.length||c.payload.importKeys.length||c.payload.previewToken!==null)throw failure('VALIDATION_FAILED','Baseline save requires its snapshot and one immutable calculation command.');
   expectedBaselineSnapshot=structuredClone(expectedBaselineSnapshot);
   assertValid<ExportSnapshot>('ExportSnapshot',expectedBaselineSnapshot);
   const e=baselineEvidence(saved[0]),r=e.computation.detail.request;
   if(expectedBaselineSnapshot.namespace!==c.namespace||expectedBaselineSnapshot.exportedAt!==e.savedAt||r.astronautId!==c.subject.astronautId||r.missionId!==c.subject.missionId||canonicalJSON(e.snapshotObservationIds)!==canonicalJSON(expectedBaselineSnapshot.records.filter(r=>r.recordType==='Observation').map(r=>r.observationId).sort()))throw failure('REFERENCE_INVALID','Baseline save differs from its snapshot or command owner.');
   await verifyBaselineEvidence([...expectedBaselineSnapshot.records,...c.payload.records]);
   expectedBaselineJSON=baselineSnapshotJSON(expectedBaselineSnapshot.records);
  }
  const attempts=c.payload.records.filter((r):r is Extract<CanonicalRecord,{recordType:'RawRecord'}>=>r.recordType==='RawRecord'&&r.mediaType===COLLECTION_MEDIA);
  if(attempts.length>1)throw failure('VALIDATION_FAILED','A collection command records one attempt.');
  if(attempts.length){const e=collectionEvidence(attempts[0]);
   if(c.domain!=='capture'||c.operation!=='capture'||c.subject.kind!=='crew'||c.subject.astronautId!==e.astronautId||c.subject.missionId!==e.missionId||c.payload.records.some(r=>!['RawRecord','Observation','ValidationRun'].includes(r.recordType)))throw failure('REFERENCE_INVALID','Collection command differs from its owner or allowed capture path.');
   const ids=c.payload.records.filter(r=>r.recordType==='Observation').map(r=>r.observationId).sort();
   if(canonicalJSON(ids)!==canonicalJSON([...e.observationIds].sort()))throw failure('REFERENCE_INVALID','Collection command measurements differ from attempt evidence.');
  }
  const exerciseRaw=c.payload.records.filter(r=>r.recordType==='RawRecord'&&r.mediaType===EXERCISE_MEDIA);
  if(exerciseRaw.length>1)throw failure('VALIDATION_FAILED','An exercise command captures one session.');
  const exercise=exerciseRaw[0]?.recordType==='RawRecord'?exercisePayload(exerciseRaw[0],'ExerciseCaptureEvidence'):null;
  if(exercise&&c.payload.records.some(r=>!['RawRecord','Observation','ValidationRun','ExerciseSession','ImportBatch'].includes(r.recordType)))throw failure('VALIDATION_FAILED','Exercise capture cannot create a task, baseline, assessment or highlight.');
  for(const raw of c.payload.records)if(raw.recordType==='RawRecord'&&[EXERCISE_MEDIA,EXERCISE_NOTES_MEDIA].includes(raw.mediaType)){
   const owner=raw.mediaType===EXERCISE_MEDIA?exercisePayload(raw,'ExerciseCaptureEvidence'):exercisePayload(raw,'ExerciseNoteAmendment');
   if(c.domain!=='sessions'||c.subject.kind!=='crew'||c.subject.astronautId!==owner.astronautId||c.subject.missionId!==owner.missionId)throw failure('REFERENCE_INVALID','Exercise command differs from payload owner/domain.');
  }
  if(c.domain==='sessions'&&c.payload.records.some(r=>r.recordType==='ExerciseSession')&&!exercise)throw failure('VALIDATION_FAILED','Session capture requires central retained evidence.');
  if(exercise&&c.operation==='import'){
   const batch=c.payload.records.find(r=>r.recordType==='ImportBatch');
   if(!batch||batch.recordType!=='ImportBatch'||batch.sourceId!==exercise.sourceId||c.payload.previewToken!==batch.previewToken||c.payload.previewToken!==await exercisePreviewToken(exercise,batch))throw failure('VALIDATION_FAILED','Exercise import preview differs from retained mapping/file/content.');
   const file=c.payload.records.find(r=>r.recordType==='RawRecord'&&r.mediaType==='text/csv'&&r.importBatchId===batch.importBatchId);
   if(!file||file.recordType!=='RawRecord'||file.contentHash!==batch.fileHash||canonicalJSON(batch.mapping)!==canonicalJSON(exerciseCSVMapping)||canonicalJSON(mapExerciseCSV(file.payload!,exercise.astronautId))!==canonicalJSON(exercise.content))throw failure('VALIDATION_FAILED','Exercise file/mapping differs from the previewed session content.');
  }
  const digest=await sha256(canonicalJSON({namespace:c.namespace,subject:c.subject,operation:c.operation,domain:c.domain,payload:c.payload}));
  const imported=new Map<string,{key:string;fingerprint:string;observationId:string}>();
  if(c.operation==='import'&&!c.payload.previewToken)throw failure('VALIDATION_FAILED','An import requires a preview token');
  if(c.operation!=='import'&&c.payload.importKeys.length)throw failure('VALIDATION_FAILED','Import identities are only accepted by import commands');
  for(const entry of c.payload.importKeys){const o=c.payload.records.find(r=>r.recordType==='Observation'&&r.observationId===entry.observationId);
   if(!o||o.recordType!=='Observation'||entry.key!==stableImportKey(c.namespace,o.source.sourceId,o.source.version,o.provenance.sourceRecordId)||o.observationId!==await importedObservationId(entry.key)||entry.fingerprint!==await sha256(canonicalJSON(o)))throw failure('VALIDATION_FAILED','Import identity/fingerprint does not match the observation');
   if(imported.has(entry.observationId))throw failure('CONFLICT','Duplicate import identity in command');imported.set(entry.observationId,entry);
  }
  if(c.operation==='import'&&c.payload.records.some(r=>r.recordType==='Observation'&&!imported.has(r.observationId)))throw failure('VALIDATION_FAILED','Imported observations require stable identities');
  let event:EventEnvelope|undefined;
  const receipt=await this.storage.transact(c.namespace,draft=>{
   if(ultrasound){
    const seen=new Set<string>();for(const r of c.payload.records){const key=storageKey(r.recordType,recordId(r));if(seen.has(key))throw failure('CONFLICT','Duplicate record IDs');seen.add(key);if(r.namespace!==c.namespace)throw failure('REFERENCE_INVALID','Command namespace differs from record');}
    validateGraph(Object.values({...draft.records,...Object.fromEntries(c.payload.records.map(r=>[storageKey(r.recordType,recordId(r)),r]))}),c.namespace,now);
    const candidate=c.payload.records.find(r=>r.recordType==='RawRecord'&&r.mediaType===ULTRASOUND_MEDIA)!;
    const old=draft.records[storageKey('RawRecord',recordId(candidate))];if(old){
     if(old.recordType!=='RawRecord'||old.mediaType!==ULTRASOUND_MEDIA||ultrasoundEvidence(old).contentFingerprint!==ultrasound.contentFingerprint)throw failure('CONFLICT','This report identity has different original evidence. Retained content is preserved.');
     const prior=draft.operations.find(r=>r.idempotencyKey===c.idempotencyKey||r.operationId===c.operationId);if(prior){if(prior.digest!==digest)throw failure('CONFLICT','Operation identity was reused with different content');return structuredClone(prior);}
     const noOp:OperationReceipt={operationId:c.operationId,idempotencyKey:c.idempotencyKey,digest,committedAt:now,recordIds:[]};draft.operations.push(noOp);return noOp;
    }
   }
   if(research.length){
    const keys=new Set<string>();
    for(const record of c.payload.records){const key=storageKey(record.recordType,recordId(record));
     if(keys.has(key))throw failure('CONFLICT','A command contains duplicate record IDs');keys.add(key);
     if(record.namespace!==c.namespace)throw failure('REFERENCE_INVALID','Command namespace differs from record');
    }
    validateGraph(Object.values({...draft.records,...Object.fromEntries(c.payload.records.map(r=>[storageKey(r.recordType,recordId(r)),r]))}),c.namespace,now);
    const retained=research.map(e=>draft.records[storageKey('RawRecord',researchEvidenceId(e.reportId))]);
    if(retained.some(Boolean)){
     if(!retained.every(Boolean))throw failure('CONFLICT','Some ECG reports were retained after preview. Clear the preview and inspect remaining records.','reports',true,'preview');
     if(retained.some((raw,i)=>raw.recordType!=='RawRecord'||raw.mediaType!==ECG_RESEARCH_MEDIA||researchEvidence(raw).contentFingerprint!==research[i].contentFingerprint))throw failure('CONFLICT','An ECG report identity has changed original content. Retained reports are preserved.');
     const previous=draft.operations.find(r=>r.operationId===c.operationId||r.idempotencyKey===c.idempotencyKey);if(previous)return structuredClone(previous);
     const noOp:OperationReceipt={operationId:c.operationId,idempotencyKey:c.idempotencyKey,digest,committedAt:now,recordIds:[]};draft.operations.push(noOp);return noOp;
    }
   }
   if(ecg){
    const candidate={...draft.records,...Object.fromEntries(c.payload.records.map(r=>[storageKey(r.recordType,recordId(r)),r]))};
    validateGraph(Object.values(candidate),c.namespace,now);
    const old=draft.records[storageKey('RawRecord',ecg.raw.rawRecordId)];
    if(old){
     if(old.recordType!=='RawRecord'||old.mediaType!==ECG_MEDIA||ecgEvidence(old).contentFingerprint!==ecg.evidence.contentFingerprint)throw failure('CONFLICT','This ECG report key has different content. The original report is preserved.');
     const prior=draft.operations.find(r=>r.idempotencyKey===c.idempotencyKey||r.operationId===c.operationId);
     if(prior){if(prior.digest!==digest)throw failure('CONFLICT','Operation identity was reused with different content');return structuredClone(prior);}
     const noOp:OperationReceipt={operationId:c.operationId,idempotencyKey:c.idempotencyKey,digest,committedAt:now,recordIds:[]};draft.operations.push(noOp);return noOp;
    }
   }
   // Logical duplicate detection runs under the same write lock as first capture.
   // Arrival metadata and later note amendments never change retained workout content.
   if(exercise){const old=draft.records[storageKey('RawRecord',recordId(exerciseRaw[0]))];if(old){
    if(old.recordType!=='RawRecord'||old.mediaType!==EXERCISE_MEDIA||exercisePayload(old,'ExerciseCaptureEvidence').contentFingerprint!==exercise.contentFingerprint)throw failure('CONFLICT','This workout identity has different content. Retained evidence was preserved.');
    const prior=draft.operations.find(r=>r.idempotencyKey===c.idempotencyKey||r.operationId===c.operationId);if(prior){if(prior.digest!==digest)throw failure('CONFLICT','Operation identity was reused with different content');return structuredClone(prior);}
    const noOp:OperationReceipt={operationId:c.operationId,idempotencyKey:c.idempotencyKey,digest,committedAt:now,recordIds:[]};draft.operations.push(noOp);return noOp;
   }}
   const prior=draft.operations.find(r=>r.idempotencyKey===c.idempotencyKey||r.operationId===c.operationId);if(prior){if(prior.digest!==digest)throw failure('CONFLICT','Operation identity was reused with different content');return structuredClone(prior);}
   if(expectedBaselineJSON!==undefined&&baselineSnapshotJSON(Object.values(draft.records))!==expectedBaselineJSON)throw failure('CONFLICT','Baseline snapshot changed; prepare again from committed inputs.','baselines',true,'retry');
   const seen=new Set<string>(),changed:CanonicalRecord[]=[];
   for(const r of c.payload.records){const key=storageKey(r.recordType,recordId(r));if(seen.has(key))throw failure('CONFLICT','A command contains duplicate record IDs');seen.add(key);
    if(r.namespace!==c.namespace)throw failure('REFERENCE_INVALID','Command namespace differs from record');
    if(c.subject.kind==='crew'&&'astronautId' in r&&r.astronautId&&r.astronautId!==c.subject.astronautId)throw failure('REFERENCE_INVALID','Record differs from command crew');
    if(c.subject.missionId&&'missionId' in r&&r.missionId&&r.missionId!==c.subject.missionId)throw failure('REFERENCE_INVALID','Record differs from command mission');
    const entry=r.recordType==='Observation'?imported.get(r.observationId):undefined;
    if(entry){const old=draft.imports.find(i=>i.key===entry.key);if(old){if(old.fingerprint!==entry.fingerprint||old.observationId!==entry.observationId)throw failure('CONFLICT','Source identity has conflicting imported content');continue;}}
    const existing=draft.records[key];const expected=c.payload.expectedRevisions.find(e=>e.recordType===r.recordType&&e.recordId===recordId(r));
    if(existing){
     if(c.operation==='import'&&canonicalJSON(existing)===canonicalJSON(r))continue;
     if(immutable.has(r.recordType))throw failure('CONFLICT','This record is append-only; use a new identity and correction link');
     if(!expected||expected.revision!==existing.revision||r.revision!==existing.revision+1)throw failure('CONFLICT','Expected revision differs from the committed record');
     for(const field of ['astronautId','missionId','namespace','profileOrigin','dataOrigin'])if(field in existing&&(r as any)[field]!== (existing as any)[field])throw failure('CONFLICT','An update cannot change record ownership or origin');
    }else if(r.revision!==1||(expected&&expected.revision!==0))throw failure('CONFLICT','New records begin at revision one');
    if(r.recordType==='Observation'&&r.supersedesObservationId&&c.operation!=='correct')throw failure('VALIDATION_FAILED','Corrections require the correct command');
    if(c.operation==='correct'&&r.recordType==='Observation'&&!r.supersedesObservationId)throw failure('VALIDATION_FAILED','Correction requires an original observation');
    draft.records[key]=r;changed.push(r);if(entry)draft.imports.push(entry);
   }
   if(c.payload.expectedRevisions.some(e=>!seen.has(storageKey(e.recordType,e.recordId))))throw failure('VALIDATION_FAILED','Revision expectation has no record change');
   validateGraph(Object.values(draft.records),c.namespace,now);
   const result:OperationReceipt={operationId:c.operationId,idempotencyKey:c.idempotencyKey,digest,committedAt:now,recordIds:changed.map(r=>({recordType:r.recordType,recordId:recordId(r)}))};draft.operations.push(result);
   if(changed.length){draft.sequence++;event={schemaVersion:SCHEMA_VERSION,eventId:`event-${c.operationId}`,namespace:c.namespace,operationId:c.operationId,subject:c.subject,sequence:draft.sequence,cursor:String(draft.sequence),eventTime:c.createdAt,receivedAt:now,deliveryMode:c.operation==='import'?'file_import':'manual',payload:{changedRecords:result.recordIds}};}
   return result;
  });if(event)this.publish(event);return structuredClone(receipt);
 }
}
export async function verifyRawHashes(records:CanonicalRecord[]){for(const r of records)if(r.recordType==='RawRecord'&&r.payload!==null&&await sha256(r.payload)!==r.contentHash)throw failure('VALIDATION_FAILED','Raw payload checksum differs from its retained hash');}
