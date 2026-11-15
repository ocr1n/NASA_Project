import {assertValid,failure,type SourceRecord,type RawRecord,type CommandEnvelope} from '../contracts';
import {sha256,canonicalJSON} from '../contracts/identity';
import type {Repository} from '../repositories/repository';

export type Artifact={source:SourceRecord;payload:string;expectedHash?:string;mediaType:string;retrievedAt:string};
export type RefreshResult={status:'refreshed'|'unchanged'|'offline_cache'|'offline_fixture'|'rate_limited'|'error';raw:RawRecord|null;checkedAt:string;message:string};

/** Prepare immutable UTF-8 source evidence without writes, including for cancellable import previews. */
export async function prepareArtifact(repo:Pick<Repository,'read'>,artifact:Artifact):Promise<{source:SourceRecord;raw:RawRecord}>{
 assertValid<SourceRecord>('SourceRecord',artifact.source);
 if(!artifact.source.canonicalURL||!artifact.source.license.trim()||artifact.source.accessRestrictions.length||!artifact.source.lineageIds.length||(artifact.source.tier!=='nasa'&&artifact.source.tier!=='simulation'&&(!artifact.source.fallbackReason||!artifact.source.nasaSearchEvidence.length)))throw failure('VALIDATION_FAILED','Source rights/access/lineage or NASA search provenance is incomplete');
 const hash=await sha256(artifact.payload);if(artifact.expectedHash&&hash!==artifact.expectedHash)throw failure('VALIDATION_FAILED','Retained payload differs from pinned source hash');
 const rawRecordId=`raw-${artifact.source.sourceId}-${hash}`;
 const source=await repo.read(artifact.source.namespace,'SourceRecord',artifact.source.sourceId)??artifact.source;
 // Source revision is immutable. A changed definition/rights/version needs a new source identity.
 if(canonicalJSON({...source,retrievedAt:artifact.source.retrievedAt})!==canonicalJSON(artifact.source))throw failure('CONFLICT','Source identity has different rights, lineage or version');
 const prior=await repo.read(artifact.source.namespace,'RawRecord',rawRecordId);if(prior)return {source,raw:prior};
 const raw:RawRecord={schemaVersion:'0.1.0',namespace:source.namespace,recordType:'RawRecord',rawRecordId,revision:1,sourceId:source.sourceId,acquisitionId:null,importBatchId:null,payload:artifact.payload,fileReference:null,contentHash:hash,mediaType:artifact.mediaType,encoding:'utf-8',retrievedAt:artifact.retrievedAt,retentionPolicy:'Append-only public research; retain historical revisions',accessPolicy:source.license};
 return {source,raw};
}

/** Retain unchanged public source evidence through the canonical atomic command. */
export async function retainArtifact(repo:Repository,artifact:Artifact):Promise<RawRecord>{
 const {source,raw}=await prepareArtifact(repo,artifact);
 if(await repo.read(source.namespace,'RawRecord',raw.rawRecordId))return raw;
 const command:CommandEnvelope={schemaVersion:'0.1.0',namespace:source.namespace,operationId:`retain-${raw.rawRecordId}`,idempotencyKey:`retain-${raw.rawRecordId}`,subject:{kind:'namespace',astronautId:null,missionId:null},createdAt:artifact.retrievedAt,operation:'import',domain:'capture',payload:{records:[source,raw],expectedRevisions:[],importKeys:[],previewToken:raw.contentHash}};
 await repo.execute(command);return raw;
}

/** Paced archive acquisition; a refresh is never a live crew feed. Minimum interval is milliseconds. */
export class ArchiveAcquisition {
 private retryUntil=new Map<string,number>();
 constructor(private repo:Repository,private fetcher:typeof fetch=fetch,private minimumIntervalMs=1000){}
 async refresh(source:SourceRecord,options:{offline?:boolean;fixture?:Artifact;mediaType:string}):Promise<RefreshResult>{
  const checkedAt=this.repo.clock.now(),now=Date.parse(checkedAt);
  const prior=(await this.repo.list(source.namespace,'RawRecord')).filter(r=>r.sourceId===source.sourceId).sort((a,b)=>b.retrievedAt.localeCompare(a.retrievedAt))[0]??null;
  const result=(status:RefreshResult['status'],raw:RawRecord|null,message:string)=>({status,raw,checkedAt,message});
  if(options.offline){if(prior)return result('offline_cache',prior,'Retained archive; offline');if(options.fixture){if(options.fixture.source.sourceId!==source.sourceId||options.fixture.source.namespace!==source.namespace)throw failure('VALIDATION_FAILED','Offline fixture identity differs');return result('offline_fixture',await retainArtifact(this.repo,options.fixture),'Pinned offline fixture');}return result('error',null,'No retained archive or fixture; connect and retry');}
  if(now<(this.retryUntil.get(source.sourceId)??0)||(prior&&now-Date.parse(prior.retrievedAt)<this.minimumIntervalMs))return result('rate_limited',prior,'Refresh deferred by pacing; retained content remains available');
  this.retryUntil.set(source.sourceId,now+this.minimumIntervalMs);
  try{
   const response=await this.fetcher(source.canonicalURL!,{signal:AbortSignal.timeout(30000)});
   if(response.status===429||response.status===503){const value=response.headers.get('retry-after');const delay=value&&/^\d+$/.test(value)?Number(value)*1000:value?Date.parse(value)-now:this.minimumIntervalMs;this.retryUntil.set(source.sourceId,now+Math.max(this.minimumIntervalMs,Number.isFinite(delay)?delay:this.minimumIntervalMs));return result('rate_limited',prior,'Archive requested retry later; retained history preserved');}
   if(!response.ok)throw Error(`HTTP ${response.status}`);
   const bytes=new Uint8Array(await response.arrayBuffer());const payload=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
   const encoded=new TextEncoder().encode(payload);if(encoded.length!==bytes.length||encoded.some((v,i)=>v!==bytes[i]))throw Error('Unsupported byte encoding');
   const hash=await sha256(payload),existing=(await this.repo.list(source.namespace,'RawRecord')).find(r=>r.sourceId===source.sourceId&&r.contentHash===hash);
   if(existing)return result('unchanged',existing,'Archive unchanged; original retrieval retained');
   const raw=await retainArtifact(this.repo,{source,payload,mediaType:options.mediaType,retrievedAt:checkedAt});return result('refreshed',raw,'New archive revision retained; scientific admission pending');
  }catch(error){return result('error',prior,`${error instanceof Error?error.message:'Acquisition failed'}; retained history preserved`);}
 }
}
