import {afterEach,beforeAll,expect,test,vi} from 'vitest';
import type {CanonicalRecord,Observation,Observation1} from '../src/shared/contracts';
import {FixedClock} from '../src/shared/contracts/clock';
import {Repository} from '../src/shared/repositories/repository';
import {MemoryStorage} from '../src/shared/repositories/memory';
import {createBaselineFixtureRecords} from '../src/shared/baselines/fixtures';
import {SelectedCrewStore} from '../src/shared/view-models';
import * as baselineViews from '../src/shared/view-models/baselines';
import {at,command} from './helpers';

let fixtures:CanonicalRecord[];
const disposers:(()=>void)[]=[];
beforeAll(async()=>{fixtures=await createBaselineFixtureRecords();});
afterEach(()=>{disposers.splice(0).forEach(dispose=>dispose());vi.restoreAllMocks();});
async function setup(){
 const repo=new Repository(new MemoryStorage(),new FixedClock(at));await repo.execute(command(fixtures));
 const crew=new SelectedCrewStore(repo,'demo');await crew.initialize();
 const store=new baselineViews.BaselineStore(repo,crew);disposers.push(()=>{store.dispose();crew.dispose();});await store.initialize();
 return {repo,crew,store};
}

test('computed fixed references expose dates, sources, n, unknown coverage and immutable stable snapshots',async()=>{
 const {store}=await setup(),s=store.getSnapshot();
 expect(s.calculation?.baseline).toMatchObject({method:'preflight_median',center:62,spread:2,sampleCount:3,status:'available'});
 expect(s.calculation?.detail.coverage).toBeNull();
 expect(s.inputs.filter(i=>i.included).map(i=>i.observation.observationId).sort()).toEqual(['preflight-1','preflight-2','preflight-3']);
 expect(s.inputs.find(i=>i.included)?.observation.source.sourceId).toBe('simulation');
 expect(s.calculation?.baseline.window.from).toBe('2025-12-20T12:00:00Z');
 expect(store.getSnapshot()).toBe(s);expect(Object.isFrozen(s.calculation?.baseline)).toBe(true);
});

test('rolling remains separate and current reading cannot enter its own reference',async()=>{
 const {store}=await setup();await store.configure({method:'mission_rolling'});
 const s=store.getSnapshot();expect(s.calculation?.baseline).toMatchObject({center:68,method:'mission_rolling',sampleCount:3});
 expect(s.calculation?.baseline.observationIds).not.toContain(s.config?.selectorObservationId);
 expect(s.comparison?.absoluteDelta).toBe(-6);
});

test('date-only exam anchor keeps calendar precision, null spread and percentage-point comparison',async()=>{
 const {store}=await setup();await store.configure({metric:'lvef',method:'preflight_anchor'});
 const s=store.getSnapshot();expect(s.calculation?.baseline).toMatchObject({sampleCount:1,spread:null,center:60,window:{from:null,to:null,precision:'date'}});
 expect(s.inputs.find(i=>i.included)?.observation).toMatchObject({timestamp:null,originalTime:'2025-12-18',timePrecision:'date'});
 expect(s.comparison?.percentagePointDelta).toBe(0);
 expect(s.comparison?.relativeDelta).toBeNull();
});

test('explicit exclusions recompute a reasoned unavailable result without mutating records',async()=>{
 const {repo,store}=await setup(),before=await repo.export('demo');
 await store.configure({exclusions:[{observationId:'preflight-1',reason:'Review original report'}]});
 expect(store.getSnapshot().calculation?.baseline).toMatchObject({center:null,status:'insufficient_data',sampleCount:2});
 expect(store.getSnapshot().inputs.find(i=>i.observation.observationId==='preflight-1')?.reason).toContain('Review original report');
 expect(await repo.export('demo')).toEqual(before);
});

test('save keeps immutable history and reload reads evidence; identical save adds no version',async()=>{
 const {repo,crew,store}=await setup();
 expect(await store.save('Initial reviewed reference')).toBe(true);
 expect(store.getSnapshot().history).toHaveLength(1);
 expect(await store.save('Unchanged recheck')).toBe(true);expect(store.getSnapshot().history).toHaveLength(1);
 const reopened=new baselineViews.BaselineStore(repo,crew);disposers.push(()=>reopened.dispose());await reopened.initialize();
 expect(reopened.getSnapshot().history[0].evidence.reason).toBe('Initial reviewed reference');
 const copy=new Repository(new MemoryStorage(),new FixedClock(at));await copy.restore(await repo.export('demo'));
 const otherCrew=new SelectedCrewStore(copy,'demo');await otherCrew.initialize();
 const other=new baselineViews.BaselineStore(copy,otherCrew);disposers.push(()=>{other.dispose();otherCrew.dispose();});await other.initialize();
 expect(other.getSnapshot().history[0].evidence.computation.baseline.center).toBe(62);
});

test('crew switching clears calculation/history immediately and restores only its own configuration',async()=>{
 const {crew,store}=await setup();await store.configure({method:'mission_rolling'});await store.save('Aster rolling');
 const switching=crew.selectCrew('crew-b');
 expect(store.getSnapshot().crewId).toBe('crew-b');expect(store.getSnapshot().calculation).toBeNull();expect(store.getSnapshot().history).toEqual([]);
 await switching;await store.refresh();
 expect(store.getSnapshot().calculation).toBeNull();expect(store.getSnapshot().unavailableReason).toContain('Baseline unavailable');expect(store.getSnapshot().history).toEqual([]);
 await crew.selectCrew('crew-a');await store.refresh();expect(store.getSnapshot().config?.method).toBe('mission_rolling');expect(store.getSnapshot().history).toHaveLength(1);
});

test('delayed old-crew export cannot publish a calculation into the new crew view',async()=>{
 const {repo,crew,store}=await setup(),snapshot=await repo.export('demo');
 let release!:(value:typeof snapshot)=>void;
 vi.spyOn(repo,'export').mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
 const old=store.refresh();await crew.selectCrew('crew-b');await store.refresh();release(snapshot);await old;
 expect(store.getSnapshot().crewId).toBe('crew-b');expect(store.getSnapshot().calculation).toBeNull();expect(store.getSnapshot().observations.every(o=>o.astronautId==='crew-b')).toBe(true);
});

test('committed late data recomputes rolling preview and preserves saved fixed history',async()=>{
 const {repo,store}=await setup();await store.save('Preserved fixed reference');await store.configure({method:'mission_rolling'});
 const sample=fixtures.find((r):r is Observation=>r.recordType==='Observation'&&r.observationId==='rolling-3')! as Observation1;
 const late:Observation1={...structuredClone(sample),observationId:'late-view',acquisitionId:'late-view',value:80,timestamp:'2026-01-09T20:00:00Z',provenance:{...sample.provenance,sourceRecordId:'late-view'}};
 await repo.execute(command([late],'late-view'));await store.refresh();
 expect(store.getSnapshot().calculation?.baseline.center).toBe(68.5);
 expect(store.getSnapshot().history[0].evidence.computation.baseline.center).toBe(62);
});

test('failed acknowledgement retries the exact guarded save and emits no duplicate history',async()=>{
 const {repo,store}=await setup(),execute=repo.execute.bind(repo);let first=true;
 vi.spyOn(repo,'execute').mockImplementation(async(...args)=>{const result=await execute(...args);if(first){first=false;throw new Error('Acknowledgement interrupted');}return result;});
 expect(await store.save('Retain exact pending save')).toBe(false);
 expect(store.getSnapshot().pending).toBe(true);
 expect(await store.save('Retain exact pending save')).toBe(true);
 expect(store.getSnapshot().history).toHaveLength(1);expect(store.getSnapshot().pending).toBe(false);
});

test('invalid edited windows show an error and cannot silently save the prior calculation',async()=>{
 const {repo,store}=await setup();await store.configure({from:'not a date'});
 expect(store.getSnapshot().calculation).toBeNull();expect(store.getSnapshot().error).not.toBeNull();
 expect(await store.save('Invalid window')).toBe(false);
 expect((await repo.list('demo','RawRecord')).filter(r=>r.mediaType.includes('baseline-calculation'))).toHaveLength(0);
});

test('refresh invalidates a prior preview immediately while a committed snapshot is loading',async()=>{
 const {repo,store}=await setup(),snapshot=await repo.export('demo');let release!:(value:typeof snapshot)=>void;
 vi.spyOn(repo,'export').mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
 const pending=store.refresh();expect(store.getSnapshot().loading).toBe(true);expect(store.getSnapshot().calculation).toBeNull();
 release(snapshot);await pending;expect(store.getSnapshot().calculation?.baseline.center).toBe(62);
});

test('prepare-stage storage failure remains visible after save refresh and retry succeeds',async()=>{
 const {repo,store}=await setup();
 vi.spyOn(repo,'export').mockRejectedValueOnce(new Error('Read interrupted'));
 expect(await store.save('Review before save')).toBe(false);expect(store.getSnapshot().error).not.toBeNull();
 expect(await store.save('Review before save')).toBe(true);expect(store.getSnapshot().history).toHaveLength(1);
});

test('failed refresh retains reference controls while removing the stale result, then retries',async()=>{
 const {repo,store}=await setup(),config=store.getSnapshot().config;
 vi.spyOn(repo,'export').mockRejectedValueOnce(new Error('Read interrupted'));
 await store.refresh();expect(store.getSnapshot().config).toEqual(config);expect(store.getSnapshot().calculation).toBeNull();
 expect(store.getSnapshot().error).not.toBeNull();await store.recompute();expect(store.getSnapshot().calculation?.baseline.center).toBe(62);
});
