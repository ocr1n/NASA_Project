import {describe,it,expect} from 'vitest';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {Repository} from '../src/shared/repositories/repository';
import {MemoryStorage} from '../src/shared/repositories/memory';
import {FixedClock} from '../src/shared/contracts/clock';
import {sha256,canonicalJSON} from '../src/shared/contracts/identity';
import {validateRecord,type Observation} from '../src/shared/contracts';
import {fixtureArtifact,fixtureManifest} from '../src/shared/sources/catalogue';
import {retainArtifact,ArchiveAcquisition} from '../src/shared/sources/acquisition';
import {importPTBSample,importNASACatalogue,ptbFixtures} from '../src/shared/sources/pipeline';
import {importEvidenceLedger} from '../src/shared/sources/ledger';
import {validateEvidence} from '../src/shared/sources/validation';
import {readCSV} from '../src/shared/sources/csv';
import {assessmentEligibility,sourcePolicy} from '../src/shared/rules/policy';
const at='2026-11-15T10:00:00Z';
const repository=()=>new Repository(new MemoryStorage(),new FixedClock(at));
const csv=(rows:Record<string,string>[])=>{const headers=Object.keys(rows[0]);const quote=(v:string)=>/[",\r\n]/.test(v)?`"${v.replaceAll('"','""')}"`:v;return [headers.map(quote).join(','),...rows.map(row=>headers.map(h=>quote(row[h])).join(','))].join('\n')+'\n';};
const changeFeatures=(input:ReturnType<typeof ptbFixtures>,mutate:(rows:Record<string,string>[])=>void)=>{const rows=readCSV(input.features.payload);mutate(rows);input.features.payload=csv(rows);delete input.features.expectedHash;};

describe('module 01 evidence and source admission',()=>{
 it('reproduces byte hashes and canonical NASA/ECG chain without losing unknown columns or subject/method IDs',async()=>{
  for(const file of fixtureManifest.files){const bytes=await readFile(`src/shared/sources/fixtures/${file.file}`);expect(bytes.length).toBe(file.bytes);expect(await sha256(bytes.toString('utf8'))).toBe(file.sha256);}
  const repo=repository();const nasa=await importNASACatalogue(repo);expect(nasa.status).toBe('pending');
  const result=await importPTBSample(repo);expect(result.status).toBe('single_source');expect(result.batch.acceptedRows).toBe(2);expect(result.observations).toHaveLength(6);
  const first=result.observations.find(o=>o.acquisitionId==='PTB-ECG-1'&&o.metric==='ecg_pr')!;
  expect(first.publicSubjectId).toBe('PTB-patient-15709');expect(first.value).toBe(270);expect(first.unit).toBe('ms');expect(first.measurementContext).toMatchObject({lead:'Global',method:'ECGDeli'});
  expect(first.timestamp).toBeNull();expect(first.originalTime).toBe('1984-11-09 09:17:34');expect(first.synthetic).toBe(false);expect(first.astronautId).toBeNull();
  const raw=await repo.require(first.namespace,'RawRecord',first.provenance.rawRecordId);expect(raw.contentHash).toBe(await sha256(raw.payload!));expect(readCSV(raw.payload!)[0]).toHaveProperty('PR_Int_I_iqr');
  const run=await repo.require(first.namespace,'ValidationRun',first.validation.validationRunId);expect(run.independentEvidenceGroups).toHaveLength(1);expect(run.toleranceDefinition).toBeNull();expect(run.methodComparisons.some(s=>s.startsWith('1/PR_Int_Global:'))).toBe(true);
  expect(result.observations.every(o=>validateRecord('Observation',o).ok)).toBe(true);expect(await repo.list('demo','Observation')).toHaveLength(0);
  const ledger=await importEvidenceLedger(repo);expect(ledger).toHaveLength(6);expect(ledger.filter(r=>r.claim.startsWith('interpretation:')).every(r=>r.status==='pending'&&r.admission==='quarantined')).toBe(true);expect(sourcePolicy.productionRules).toEqual([]);
  const restored=repository();await restored.restore(await repo.export('research:ptb-xl-plus'));expect((await importPTBSample(restored)).status).toBe('unchanged');expect(await restored.list('research:ptb-xl-plus','Observation')).toHaveLength(6);
  await mkdir('.scratch/module01',{recursive:true});await writeFile('.scratch/module01/reproduced-chain.json',JSON.stringify({nasa:await repo.export('research:osd575'),ptb:await repo.export('research:ptb-xl-plus'),ledger:await repo.export('research:evidence')},null,2));
 });
 it('rejects unsupported units and retains the rejected raw payload/run',async()=>{
  const repo=repository(),input=ptbFixtures();input.description.payload=input.description.payload.replace('PR_Int_Global,Int_PR_Interval,PR_Interval,PRi_max,P-R Interval,3007794,ms','PR_Int_Global,Int_PR_Interval,PR_Interval,PRi_max,P-R Interval,3007794,kg');delete input.description.expectedHash;
  const result=await importPTBSample(repo,input);expect(result.status).toBe('rejected');expect(result.observations).toEqual([]);expect(result.batch.errors.some(e=>e.message.includes('unsupported unit kg'))).toBe(true);expect(await repo.list(input.features.source.namespace,'RawRecord')).toHaveLength(4);expect((await repo.list(input.features.source.namespace,'ValidationRun'))[0].admission).toBe('quarantined');
 });
 it('rejects missing provenance, access restrictions and corrupted hashes at acquisition',async()=>{
  for(const mutation of ['hash','rights','fallback','lineage']){const repo=repository(),artifact=fixtureArtifact('ptbecgdeli');if(mutation==='hash')artifact.payload+='x';if(mutation==='rights')artifact.source.accessRestrictions=['Controlled access'];if(mutation==='fallback')artifact.source.fallbackReason=null;if(mutation==='lineage')artifact.source.lineageIds=[];await expect(retainArtifact(repo,artifact)).rejects.toThrow();expect(await repo.list(artifact.source.namespace,'RawRecord')).toHaveLength(0);}
  const repo=repository(),artifact=fixtureArtifact('ptbecgdeli');await retainArtifact(repo,artifact);artifact.source.license='Changed rights';await expect(retainArtifact(repo,artifact)).rejects.toThrow('different rights');
 });
 it('quarantines conflicting duplicate rows and keeps their raw columns',async()=>{
  const repo=repository(),input=ptbFixtures();changeFeatures(input,rows=>rows.push({...rows[0],PR_Int_Global:'999'}));const result=await importPTBSample(repo,input);expect(result.status).toBe('conflict');expect(result.observations).toEqual([]);const runs=await repo.list(input.features.source.namespace,'ValidationRun');expect(runs[0].admission).toBe('quarantined');expect(runs[0].conflicts.join()).toContain('duplicate');
 });
 it('retains missing values as unknown and rejects nonpositive/nonfinite intervals and missing parent subjects',async()=>{
  const repo=repository(),missing=ptbFixtures();changeFeatures(missing,rows=>rows[0].PR_Int_Global='');const result=await importPTBSample(repo,missing);expect(result.observations.find(o=>o.acquisitionId==='PTB-ECG-1'&&o.metric==='ecg_pr')).toMatchObject({value:null,missingReason:'Feature absent in source'});
  for(const value of ['-1','Infinity']){const input=ptbFixtures();changeFeatures(input,rows=>rows[0].PR_Int_Global=value);expect((await importPTBSample(repository(),input)).status).toBe('rejected');}
  const input=ptbFixtures();input.parent.payload=csv(readCSV(input.parent.payload).slice(1));delete input.parent.expectedHash;expect((await importPTBSample(repository(),input)).status).toBe('rejected');
 });
 it('cannot promote a single-source public sample into assessment even with fabricated exact time and quality',async()=>{
  const result=await importPTBSample(repository());const o={...result.observations[0],timestamp:at,timePrecision:'exact',originalTime:null,timeReason:null,quality:{score:1,lowConfidence:false,method:'Test control',flags:[]}} as Observation;
  expect(assessmentEligibility(o)).toMatchObject({availability:'unsupported',reasons:['research_not_personal_assessment']});
 });
 it('counts parent/child/mirrors once, excludes irrelevant evidence, and preserves conflicting evidence',()=>{
  const source=fixtureArtifact('ptbecgdeli').source,second={...source,sourceId:'mirror'};
  const input={namespace:source.namespace,id:'test-evidence',kind:'sample_integrity' as const,claim:'Software evidence control',sources:[source,second],checks:[{sourceId:source.sourceId,lineageId:'ptb-xl-acquisition',location:'file/row 1',stance:'supports' as const,relevant:true},{sourceId:second.sourceId,lineageId:'ptb-xl-acquisition',location:'mirror/row 1',stance:'supports' as const,relevant:true}],at,reviewComplete:true};
  const single=validateEvidence(input);expect(single.independentEvidenceGroups).toHaveLength(1);expect(single.status).toBe('single_source');
  expect(validateEvidence({...input,checks:input.checks.map(c=>({...c,relevant:false}))}).status).toBe('pending');
  expect(validateEvidence({...input,checks:[{...input.checks[0],stance:'conflicts'}]})).toMatchObject({status:'conflict',admission:'quarantined'});
  expect(validateEvidence({...input,checks:[{...input.checks[0],lineageId:'invented'}]}).status).toBe('rejected');
  const independent={...second,lineageIds:['independent-software-control']};expect(validateEvidence({...input,sources:[source,independent],checks:[input.checks[0],{...input.checks[1],lineageId:'independent-software-control'}]})).toMatchObject({status:'verified',admission:'research_sandbox'});
 });
 it('imports idempotently, joins reordered method rows by ECG ID and retains history/conflicting refreshes',async()=>{
  const repo=repository();const first=await importPTBSample(repo),before=await repo.export('research:ptb-xl-plus');const repeated=await importPTBSample(repo);expect(repeated.status).toBe('unchanged');expect((await repo.export('research:ptb-xl-plus')).integrity.contentHash).toBe(before.integrity.contentHash);
  const conflict=ptbFixtures();changeFeatures(conflict,rows=>rows[0].PR_Int_Global='201');expect((await importPTBSample(repo,conflict)).status).toBe('conflict');expect((await repo.list('research:ptb-xl-plus','Observation')).find(o=>o.metric==='ecg_pr'&&o.acquisitionId==='PTB-ECG-1')?.value).toBe(270);
  const newer=ptbFixtures();newer.features.source={...newer.features.source,sourceId:'source-new-version',version:'test-new-version',name:'Explicit versioned software control'};const next=await importPTBSample(repo,newer);expect(next.status).toBe('single_source');expect(await repo.list('research:ptb-xl-plus','Observation')).toHaveLength(12);expect(first.observations.map(o=>o.observationId).every(id=>next.observations.every(o=>o.observationId!==id))).toBe(true);
  const reordered=ptbFixtures();reordered.comparison.payload=csv(readCSV(reordered.comparison.payload).reverse());delete reordered.comparison.expectedHash;const separate=repository();await importPTBSample(separate,reordered);expect((await separate.list('research:ptb-xl-plus','ValidationRun'))[0].methodComparisons.some(s=>s.startsWith('1/PR_Int_Global: ECGDeli 270 ms; Uni-G'))).toBe(true);
 });
 it('paces refreshes, obeys Retry-After, supports offline cache and keeps late historical raw revisions',async()=>{
  let now=Date.parse(at);const repo=new Repository(new MemoryStorage(),{now:()=>new Date(now).toISOString()}),artifact=fixtureArtifact('osd575');let calls=0,body=artifact.payload,status=200;
  const fetcher=(async()=>{calls++;return new Response(body,{status,headers:{'retry-after':'5'}});}) as typeof fetch;
  const acquire=new ArchiveAcquisition(repo,fetcher,1000);expect((await acquire.refresh(artifact.source,{offline:true,fixture:artifact,mediaType:'application/json'})).status).toBe('offline_fixture');
  expect((await acquire.refresh(artifact.source,{mediaType:'application/json'})).status).toBe('unchanged');expect(calls).toBe(1);
  expect((await acquire.refresh(artifact.source,{mediaType:'application/json'})).status).toBe('rate_limited');now+=2000;body='{"new":"archive revision"}';expect((await acquire.refresh(artifact.source,{mediaType:'application/json'})).status).toBe('refreshed');now+=2000;status=429;
  expect((await acquire.refresh(artifact.source,{mediaType:'application/json'})).status).toBe('rate_limited');now+=2000;expect((await acquire.refresh(artifact.source,{mediaType:'application/json'})).status).toBe('rate_limited');expect((await acquire.refresh(artifact.source,{offline:true,mediaType:'application/json'})).status).toBe('offline_cache');
  now+=6000;status=500;expect((await acquire.refresh(artifact.source,{mediaType:'application/json'})).status).toBe('error');expect(await repo.list(artifact.source.namespace,'RawRecord')).toHaveLength(2);
  await retainArtifact(repo,{...artifact,payload:'{"late":"historical"}',expectedHash:undefined,retrievedAt:'2020-01-01T00:00:00Z'});expect(await repo.list(artifact.source.namespace,'RawRecord')).toHaveLength(3);
 });
 it('strict CSV handling retains quoted commas/newlines and rejects malformed quotes/fields',()=>{
  expect(readCSV('id,unknown\r\n1,"a,b\nline"\r\n')).toEqual([{id:'1',unknown:'a,b\nline'}]);for(const text of ['id,id\n1,2\n','id,x\n1\n','id,x\n1,"x','id,x\n1,"x"z'])expect(()=>readCSV(text)).toThrow();
 });
});
