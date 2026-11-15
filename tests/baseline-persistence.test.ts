import 'fake-indexeddb/auto';
import {afterEach,beforeAll,describe,expect,test} from 'vitest';
import {type CanonicalRecord,type Observation,type Observation1,type RawRecord,type ExportSnapshot} from '../src/shared/contracts';
import {canonicalJSON,sha256} from '../src/shared/contracts/identity';
import {FixedClock} from '../src/shared/contracts/clock';
import {Repository} from '../src/shared/repositories/repository';
import {MemoryStorage} from '../src/shared/repositories/memory';
import {IndexedDbStorage} from '../src/shared/repositories/indexeddb';
import {createBaselineFixtureRecords,baselineFixtureRequest} from '../src/shared/baselines/fixtures';
import {prepareBaselineSave,saveBaselineCalculation,readBaselineHistory,demoBaselinePolicy} from '../src/shared/baselines';
import {BASELINE_MEDIA,baselineEvidence} from '../src/shared/contracts/baselines';
import {at,command} from './helpers';

let fixtures:CanonicalRecord[];
const stores:IndexedDbStorage[]=[];
beforeAll(async()=>{fixtures=await createBaselineFixtureRecords();});
afterEach(async()=>{for(const s of stores.splice(0))await s.db.delete();});
const policy=()=>({...structuredClone(demoBaselinePolicy),cadenceSeconds:86400});
const fixed=()=>baselineFixtureRequest('preflight_median');
const rolling=()=>baselineFixtureRequest('mission_rolling');
const rawEvidence=(s:ExportSnapshot)=>s.records.filter((r):r is RawRecord=>r.recordType==='RawRecord'&&r.mediaType===BASELINE_MEDIA);
const reseal=async(s:ExportSnapshot)=>{const {integrity,...body}=s;s.integrity={algorithm:'sha256',recordCount:body.records.length,contentHash:await sha256(canonicalJSON(body))};return s;};
const seed=async(storage:MemoryStorage|IndexedDbStorage)=>{const repo=new Repository(storage,new FixedClock(at));await repo.execute(command(fixtures,'seed-baselines'));return repo;};

for(const adapter of ['memory','indexeddb'])describe(adapter,()=>{
 const make=async()=>{const s=adapter==='memory'?new MemoryStorage():new IndexedDbStorage(`baseline-${crypto.randomUUID()}`);if(s instanceof IndexedDbStorage)stores.push(s);return seed(s);};
 test('fixed and rolling save atomically, preserving all frozen records and null coverage',async()=>{
  const repo=await make(),before=await repo.export('demo'),events:unknown[]=[];repo.subscribe(e=>events.push(e));
  const a=await saveBaselineCalculation(repo,fixed(),'Initial preflight reference');
  const b=await saveBaselineCalculation(repo,rolling(),'Initial mission window',policy());
  expect(a.evidence.computation.baseline).toMatchObject({center:62,spread:2,sampleCount:3});
  expect(a.evidence.computation.detail.coverage).toBeNull();
  expect(b.evidence.computation.baseline).toMatchObject({center:68,method:'mission_rolling'});
  expect(a.evidence.seriesId).not.toBe(b.evidence.seriesId);expect(events).toHaveLength(2);
  const after=await repo.export('demo');for(const original of before.records)expect(after.records).toContainEqual(original);
  expect(rawEvidence(after)).toHaveLength(2);expect(a.receipt?.recordIds.map(r=>r.recordType).sort()).toEqual(['Baseline','RawRecord']);
 });
 test('all six single-exam types retain dated or exact anchors without spread',async()=>{
  const repo=await make();
  for(const metric of ['lvef','lv_edv','lv_esv','ecg_qtc','muscle_thickness','bone_mineral_density'] as const){
   const saved=await saveBaselineCalculation(repo,baselineFixtureRequest('preflight_anchor',metric),'Dated exam reference');
   expect(saved.evidence.computation.baseline).toMatchObject({status:'available',sampleCount:1,spread:null});
   if(metric==='lvef')expect(saved.evidence.computation.baseline.window).toEqual({from:null,to:null,precision:'date'});
  }
  const restored=await makeEmpty();await restored.restore(await repo.export('demo'));expect(rawEvidence(await restored.export('demo'))).toHaveLength(6);
 });
 const makeEmpty=async()=>{const s=adapter==='memory'?new MemoryStorage():new IndexedDbStorage(`baseline-empty-${crypto.randomUUID()}`);if(s instanceof IndexedDbStorage)stores.push(s);return new Repository(s,new FixedClock(at));};
 test('unchanged latest input is a no-op and exact prepared retry returns the receipt once',async()=>{
  const repo=await make(),prepared=await prepareBaselineSave(repo,fixed(),'Initial');
  const events:unknown[]=[];repo.subscribe(e=>events.push(e));
  const first=await repo.execute(prepared.command,prepared.snapshot);
  expect(await repo.execute(prepared.command,prepared.snapshot)).toEqual(first);
  const again=await saveBaselineCalculation(repo,fixed(),'Rechecked without changed inputs');
  expect(again.receipt).toBeNull();expect(again.evidence).toEqual(prepared.evidence);expect(events).toHaveLength(1);
 });
 test('late arrival and correction append versions; restore audits every historical calculation',async()=>{
  const repo=await make(),original=await saveBaselineCalculation(repo,rolling(),'Original window',policy());
  const sample=fixtures.find((r):r is Observation=>r.recordType==='Observation'&&r.observationId==='rolling-3')! as Observation1;
  const late:Observation1={...structuredClone(sample),observationId:'late-reading',acquisitionId:'late-reading',value:80,timestamp:'2026-01-09T20:00:00Z',provenance:{...sample.provenance,sourceRecordId:'late-reading'}};
  await repo.execute(command([late],'late'));
  const second=await saveBaselineCalculation(repo,rolling(),'Late recorded sample',policy());
  const corrected:Observation1={...structuredClone(late),observationId:'corrected-late',value:60,supersedesObservationId:late.observationId,provenance:{...late.provenance,sourceRecordId:'corrected-late'}};
  await repo.execute(command([corrected],'correction',{operation:'correct'}));
  const third=await saveBaselineCalculation(repo,rolling(),'Corrected recorded sample',policy());
  const history=await readBaselineHistory(repo,'demo',original.evidence.seriesId);
  expect(history.map(h=>h.evidence.sequence)).toEqual([1,2,3]);expect(history[0].evidence).toEqual(original.evidence);
  expect(third.evidence.previousRawRecordId).toBe(history[1].raw.rawRecordId);
  expect(third.evidence.computation.baseline.baselineId).not.toBe(second.evidence.computation.baseline.baselineId);
  const snapshot=await repo.export('demo'),restored=await makeEmpty();await restored.restore(snapshot);
  expect((await restored.export('demo')).records).toEqual(snapshot.records);
  expect((await saveBaselineCalculation(restored,rolling(),'No change after restore',policy())).receipt).toBeNull();
 });
 test('excluded period and later cleared policy retain unavailable and original calculations',async()=>{
  const repo=await make(),a=await saveBaselineCalculation(repo,rolling(),'Original',policy());
  const req=rolling();req.excludedPeriods=[{window:req.window,reason:'Unresolved fictional review period'}];
  const b=await saveBaselineCalculation(repo,req,'Quarantine unresolved period',policy());
  expect(b.evidence.computation.baseline).toMatchObject({status:'baseline_unavailable',center:null,spread:null});
  const later=new Repository(repo.storage,new FixedClock('2026-01-10T13:00:00Z'));
  const c=await saveBaselineCalculation(later,rolling(),'Review cleared original policy',policy());
  expect(c.evidence.sequence).toBe(3);expect(c.evidence.computation.baseline).toEqual(a.evidence.computation.baseline);
  expect(c.receipt?.recordIds.map(r=>r.recordType)).toEqual(['RawRecord']);
  const empty=await makeEmpty(),restored=new Repository(empty.storage,new FixedClock('2026-01-10T13:00:00Z'));await restored.restore(await later.export('demo'));
 });
 test('changed source snapshot is rejected with no evidence, then re-preparation succeeds',async()=>{
  const repo=await make(),prepared=await prepareBaselineSave(repo,fixed(),'Prepared');
  const p=await repo.read('demo','CrewProfile','crew-b');
  const change=command([{...p,revision:2,alias:'Updated Vega'}],'parallel-profile');change.payload.expectedRevisions=[{recordType:'CrewProfile',recordId:'crew-b',revision:1}] as never;await repo.execute(change);
  await expect(repo.execute(prepared.command,prepared.snapshot)).rejects.toMatchObject({detail:{code:'CONFLICT',recoverable:true,retryContext:'retry'}});
  expect(rawEvidence(await repo.export('demo'))).toHaveLength(0);
  expect((await saveBaselineCalculation(repo,fixed(),'Fresh snapshot')).evidence.sequence).toBe(1);
 });
 test('two different concurrent computations cannot branch the same history head',async()=>{
  const repo=await make();await saveBaselineCalculation(repo,rolling(),'Initial',policy());
  const a=rolling();a.exclusions=[{observationId:'rolling-1',reason:'Review A'}];
  const b=rolling();b.exclusions=[{observationId:'rolling-2',reason:'Review B'}];
  const [pa,pb]=await Promise.all([prepareBaselineSave(repo,a,'Review A',policy()),prepareBaselineSave(repo,b,'Review B',policy())]);
  const results=await Promise.allSettled([repo.execute(pa.command,pa.snapshot),repo.execute(pb.command,pb.snapshot)]);
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(rawEvidence(await repo.export('demo'))).toHaveLength(2);
 });
 test('frozen and computed references cannot be revised or saved without evidence/snapshot',async()=>{
  const repo=await make(),saved=await saveBaselineCalculation(repo,fixed(),'Initial');
  for(const id of ['baseline-fixed',saved.evidence.computation.baseline.baselineId]){
   const b=await repo.read('demo','Baseline',id),c=command([{...b,revision:2,center:100}],'overwrite-'+id);
   c.payload.expectedRevisions=[{recordType:'Baseline',recordId:id,revision:1}] as never;
   await expect(repo.execute(c)).rejects.toMatchObject({detail:{code:'CONFLICT'}});
  }
  const prepared=await prepareBaselineSave(repo,rolling(),'New');
  await expect(repo.execute(prepared.command)).rejects.toMatchObject({detail:{code:'VALIDATION_FAILED'}});
  await expect(repo.execute(command([prepared.evidence.computation.baseline],'bare'))).rejects.toMatchObject({detail:{code:'REFERENCE_INVALID'}});
 });
 test('hash-valid mathematical tampering is rejected on restore without writes',async()=>{
  const repo=await make();await saveBaselineCalculation(repo,fixed(),'Initial');
  const snapshot=await repo.export('demo'),raw=rawEvidence(snapshot)[0],e=baselineEvidence(raw);
  e.computation.baseline.center=999;
  snapshot.records=snapshot.records.map(r=>r.recordType==='Baseline'&&r.baselineId===e.computation.baseline.baselineId?e.computation.baseline:r);
  raw.payload=canonicalJSON(e);raw.contentHash=await sha256(raw.payload);await reseal(snapshot);
  const restored=await makeEmpty();await expect(restored.restore(snapshot)).rejects.toMatchObject({detail:{code:'VALIDATION_FAILED'}});
  expect((await restored.export('demo')).records).toHaveLength(0);
 });
 test('missing prior evidence, raw support and cross-owner calculation refuse restore',async()=>{
  const repo=await make();const first=await saveBaselineCalculation(repo,rolling(),'Original',policy());
  const req=rolling();req.exclusions=[{observationId:'rolling-1',reason:'Review'}];await saveBaselineCalculation(repo,req,'Review',policy());
  for(const target of ['prior','raw','owner']){
   const snapshot=await repo.export('demo');
   if(target==='prior')snapshot.records=snapshot.records.filter(r=>r.recordType!=='RawRecord'||r.mediaType!==BASELINE_MEDIA||baselineEvidence(r).sequence!==1);
   if(target==='raw')snapshot.records=snapshot.records.filter(r=>r.recordType!=='RawRecord'||r.rawRecordId!=='raw-preflight-1');
   if(target==='owner'){
    const raw=rawEvidence(snapshot)[0],e=baselineEvidence(raw);e.computation.detail.request.astronautId='crew-b';raw.payload=canonicalJSON(e);raw.contentHash=await sha256(raw.payload);
   }
   const restored=await makeEmpty();await expect(restored.restore(await reseal(snapshot))).rejects.toHaveProperty('detail.code');expect((await restored.export('demo')).records).toHaveLength(0);
  }
  expect(first.evidence.sequence).toBe(1);
 });
});

test('actual IndexedDB RawRecord-write failure rolls back Baseline, receipt and event; exact retry succeeds',async()=>{
 const storage=new IndexedDbStorage(`baseline-rollback-${crypto.randomUUID()}`);stores.push(storage);const repo=await seed(storage);
 const prepared=await prepareBaselineSave(repo,fixed(),'Initial'),before=await repo.export('demo'),events:unknown[]=[];repo.subscribe(e=>events.push(e));
 const hook=(_key:unknown,row:{record:{recordType:string;mediaType?:string}})=>{if(row.record.mediaType===BASELINE_MEDIA)throw new DOMException('Forced baseline persistence failure','QuotaExceededError');};
 storage.db.records.hook('creating',hook);
 await expect(repo.execute(prepared.command,prepared.snapshot)).rejects.toMatchObject({detail:{code:'STORAGE_QUOTA'}});
 expect(await repo.export('demo')).toEqual(before);expect(events).toHaveLength(0);
 storage.db.records.hook('creating').unsubscribe(hook);await repo.execute(prepared.command,prepared.snapshot);expect(events).toHaveLength(1);
 const name=storage.db.name;storage.close();const reopened=new IndexedDbStorage(name),reader=new Repository(reopened,new FixedClock(at));
 expect(rawEvidence(await reader.export('demo'))).toHaveLength(1);reopened.close();
});
