import {assertValid,failure,type ExportSnapshot,SCHEMA_VERSION} from '../contracts';
import {canonicalJSON,sha256,stableImportKey,importedObservationId} from '../contracts/identity';
import {validateGraph} from './references';
import {verifyRawHashes,type Repository} from './repository';
import {verifyExerciseEvidence} from '../contracts/exercise';
import {verifyEcgEvidence} from '../contracts/ecg';
import {verifyResearchEcgEvidence} from '../contracts/ecg-research';
import {verifyBaselineEvidence} from '../contracts/baselines';
import {verifyUltrasoundEvidence,ULTRASOUND_MEDIA,ultrasoundEvidence} from '../contracts/ultrasound';
import {verifyUltrasoundFile} from '../capture/ultrasound';
export class MigrationRegistry {
 private migrations=new Map<string,(input:unknown)=>unknown>();
 register(fromVersion:string,migrateValidatedSource:(input:unknown)=>unknown){if(fromVersion===SCHEMA_VERSION||this.migrations.has(fromVersion))throw failure('CONFLICT','Migration source version is already registered');this.migrations.set(fromVersion,migrateValidatedSource);}
 migrate(input:unknown):unknown{
  let current=input;const seen=new Set<string>();
  for(let i=0;i<16;i++){const version=(current as {schemaVersion?:string})?.schemaVersion;if(version===SCHEMA_VERSION)return current;
   if(!version||seen.has(version)||!this.migrations.has(version))throw failure('UNSUPPORTED_VERSION','No supported migration exists for this snapshot version');seen.add(version);
   try{current=this.migrations.get(version)!(current);}catch(e){throw failure('VALIDATION_FAILED','The migration source is invalid');}
  }throw failure('UNSUPPORTED_VERSION','Migration chain exceeds the supported limit');
 }
}
export const migrations=new MigrationRegistry();
export async function prepareSnapshot(input:unknown,now:string,registry=migrations):Promise<ExportSnapshot>{
 canonicalJSON(input);const candidate=registry.migrate(structuredClone(input));assertValid<ExportSnapshot>('ExportSnapshot',candidate);
 const {integrity,...body}=candidate;
 if(integrity.recordCount!==body.records.length||await sha256(canonicalJSON(body))!==integrity.contentHash)throw failure('VALIDATION_FAILED','Snapshot integrity check failed');
  await verifyRawHashes(candidate.records);await verifyExerciseEvidence(candidate.records);await verifyEcgEvidence(candidate.records);await verifyResearchEcgEvidence(candidate.records);await verifyBaselineEvidence(candidate.records);validateGraph(candidate.records,candidate.namespace,now);
 const operationIds=new Set<string>(),operationKeys=new Set<string>(),importKeys=new Set<string>();
 await verifyUltrasoundEvidence(candidate.records);
 for(const r of candidate.records)if(r.recordType==='RawRecord'&&r.mediaType===ULTRASOUND_MEDIA)await verifyUltrasoundFile(candidate.records,ultrasoundEvidence(r));
 for(const o of candidate.operationLedger){if(operationIds.has(o.operationId)||operationKeys.has(o.idempotencyKey))throw failure('CONFLICT','Snapshot contains duplicate operation identities');operationIds.add(o.operationId);operationKeys.add(o.idempotencyKey);for(const ref of o.recordIds)if(!candidate.records.some(r=>r.recordType===ref.recordType&&recordIdentity(r)===ref.recordId))throw failure('REFERENCE_INVALID','Receipt references a missing record');}
 for(const i of candidate.importLedger){if(importKeys.has(i.key))throw failure('CONFLICT','Snapshot contains duplicate import identities');importKeys.add(i.key);const o=candidate.records.find(r=>r.recordType==='Observation'&&r.observationId===i.observationId);if(!o||o.recordType!=='Observation'||i.key!==stableImportKey(candidate.namespace,o.source.sourceId,o.source.version,o.provenance.sourceRecordId)||o.observationId!==await importedObservationId(i.key)||await sha256(canonicalJSON(o))!==i.fingerprint)throw failure('REFERENCE_INVALID','Import ledger identity/content differs from retained observation');}
 return candidate;
}
import {recordId as recordIdentity} from '../contracts';
export const exportSnapshot=(repository:Repository,namespace:string)=>repository.export(namespace);
export const restoreSnapshot=(repository:Repository,input:unknown,registry=migrations)=>repository.restore(input,registry);
