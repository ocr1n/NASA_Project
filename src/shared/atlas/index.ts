import {assertValid,type AtlasRegionManifest,type CanonicalRecord,type AtlasHighlight,type Observation} from '../contracts';
import manifestJSON from './manifest.json';
import {highlightEligibility} from '../rules/policy';
import type {Repository} from '../repositories/repository';
export const atlasManifest:AtlasRegionManifest=manifestJSON as AtlasRegionManifest;
assertValid('AtlasRegionManifest',atlasManifest);
export interface AtlasPart {id:string;name:string;system:string;chunk:number;positions:number;normals:number;indices:number;vertexCount:number;indexCount:number;bounds:[number[],number[]]}
export interface AtlasData {parts:AtlasPart[];chunks:{url:string;bytes:number;gzip:string;gzipBytes:number}[];triangles:number}
export async function ensureAtlasManifest(repo:Repository){if(await repo.read('demo','AtlasRegionManifest',atlasManifest.manifestId))return;await repo.execute({schemaVersion:'0.1.0',namespace:'demo',operationId:'install-atlas-manifest-v1',idempotencyKey:'install-atlas-manifest-v1',subject:{kind:'namespace',astronautId:null,missionId:null},createdAt:repo.clock.now(),operation:'upsert',domain:'configuration',payload:{records:[atlasManifest],expectedRevisions:[],importKeys:[],previewToken:null}});}
export function selectAtlasFindings(records:CanonicalRecord[],crewId:string,now:string){
 return records.filter((r):r is AtlasHighlight=>r.recordType==='AtlasHighlight'&&r.astronautId===crewId).map(highlight=>{
  const observations=records.filter((r):r is Observation=>r.recordType==='Observation'&&highlight.observationIds.includes(r.observationId));
  const assessment=records.find(r=>r.recordType==='Assessment'&&r.assessmentId===highlight.assessmentId),rule=records.find(r=>r.recordType==='ThresholdRule'&&r.ruleId===highlight.ruleId);
  const eligible=highlight.manifestId===atlasManifest.manifestId&&highlight.manifestVersion===atlasManifest.manifestVersion?highlightEligibility(highlight,assessment?.recordType==='Assessment'?assessment:null,rule?.recordType==='ThresholdRule'?rule:null,observations,atlasManifest):{visible:false,reason:'unmapped'};
  if(highlight.expires&&Date.parse(highlight.expires)<=Date.parse(now))return {highlight,visible:false,reason:'expired'};
  return {highlight,...eligible};
 });
}
