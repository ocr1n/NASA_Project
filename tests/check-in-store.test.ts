import {test,expect} from 'vitest';
import {SelectedCrewStore} from '../src/shared/view-models';
import {decodeCrewCache,emptyDraft} from '../src/shared/view-models/check-in-draft';
import {Repository} from '../src/shared/repositories/repository';
import {MemoryStorage} from '../src/shared/repositories/memory';
import {FixedClock} from '../src/shared/contracts/clock';
import {createDemoRecords,DEMO_TIME} from '../src/shared/fixtures';
import {command} from './helpers';
async function setup(){const repo=new Repository(new MemoryStorage(),new FixedClock(DEMO_TIME));await repo.execute(command(await createDemoRecords()));return repo;}
const cache=()=>{const values=new Map<string,string>();return {getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};};
const good={heartRate:'63',sleepDuration:'7',hrContext:'rest',device:'fictional cuff',posture:'seated',confidence:'fictional_passed',timePrecision:'exact',measuredTime:DEMO_TIME};
test('drafts, baseline context and region selections stay per crew through repeated switches and reload',async()=>{
 const repo=await setup(),storage=cache(),store=new SelectedCrewStore(repo,'demo',storage);await store.initialize();store.updateDraft({heartRate:'unfinished'});store.selectRegion('muscle_left');
 await store.selectCrew('crew-b');expect(store.getSnapshot().draft.heartRate).toBe('');expect(store.getSnapshot().baselines).toHaveLength(0);expect(store.getSnapshot().selectedRegion).toBeNull();store.updateDraft({sleepDuration:'6'});
 for(let i=0;i<3;i++){await store.selectCrew('crew-a');expect(store.getSnapshot().draft.heartRate).toBe('unfinished');expect(store.getSnapshot().selectedRegion).toBe('muscle_left');expect(store.getSnapshot().baselines.length).toBeGreaterThan(0);await store.selectCrew('crew-b');expect(store.getSnapshot().draft.sleepDuration).toBe('6');expect(store.getSnapshot().observations.every(o=>o.astronautId==='crew-b')).toBe(true);}
 store.dispose();const reopened=new SelectedCrewStore(repo,'demo',storage);await reopened.initialize();expect(reopened.getSnapshot().crew?.alias).toBe('Vega');expect(reopened.getSnapshot().draft.sleepDuration).toBe('6');await reopened.selectCrew('crew-a');expect(reopened.getSnapshot().draft.heartRate).toBe('unfinished');reopened.dispose();
});
test('failed commit retains draft and exact pending command across reload, retry commits once',async()=>{
 const repo=await setup(),storage=cache(),store=new SelectedCrewStore(repo,'demo',storage);await store.initialize();store.updateDraft(good);const original=repo.storage.transact.bind(repo.storage);repo.storage.transact=async()=>{throw new Error('injected commit failure');};expect(await store.saveCheckIn()).toBe(false);expect(store.getSnapshot().dirty).toBe(true);expect(store.getSnapshot().captureNotice).toBe('');expect(store.getSnapshot().captureError).not.toBeNull();repo.storage.transact=original;store.dispose();
 const reopened=new SelectedCrewStore(repo,'demo',storage);await reopened.initialize();expect(await reopened.saveCheckIn()).toBe(true);expect(reopened.getSnapshot().dirty).toBe(false);expect(reopened.getSnapshot().tasks[0].state).toBe('completed');expect(reopened.getSnapshot().observations.filter(o=>o.observationId.startsWith('checkin-'))).toHaveLength(2);reopened.dispose();
});
test('invalid input returns a field error and never creates records or clears draft',async()=>{
 const repo=await setup(),store=new SelectedCrewStore(repo,'demo');await store.initialize();store.updateDraft({heartRate:'bad'});expect(await store.saveCheckIn()).toBe(false);expect(store.getSnapshot().captureError?.path).toBe('heart_rate');expect(store.getSnapshot().draft.heartRate).toBe('bad');expect(store.getSnapshot().observations.filter(o=>o.observationId.startsWith('checkin-'))).toHaveLength(0);store.dispose();
});
test('unknown and skipped input is saved pending without completing a task',async()=>{
 const repo=await setup(),store=new SelectedCrewStore(repo,'demo');await store.initialize();store.updateDraft({heartRateStatus:'device_issue',sleepStatus:'skipped'});expect(await store.saveCheckIn()).toBe(true);const values=store.getSnapshot().observations.filter(o=>o.observationId.startsWith('checkin-'));expect(values.every(o=>o.value===null&&o.timestamp===null)).toBe(true);expect(store.getSnapshot().tasks[0].state).toBe('due');store.dispose();
});
test('cache failure keeps in-memory edits and recovers; incompatible cache is not overwritten implicitly',async()=>{
 const repo=await setup(),storage=cache(),store=new SelectedCrewStore(repo,'demo',storage);await store.initialize();const original=storage.setItem;storage.setItem=()=>{throw {name:'QuotaExceededError'};};store.updateDraft({heartRate:'65'});expect(store.getSnapshot().cacheError?.code).toBe('STORAGE_QUOTA');expect(store.getSnapshot().draft.heartRate).toBe('65');storage.setItem=original;store.retryDraftCache();expect(store.getSnapshot().cacheError).toBeNull();store.dispose();
 storage.setItem('astronaut-health-ui-v1','{"cacheVersion":999}');const broken=new SelectedCrewStore(repo,'demo',storage);await broken.initialize();broken.updateDraft({heartRate:'66'});expect(storage.getItem('astronaut-health-ui-v1')).toBe('{"cacheVersion":999}');broken.resetDraft();expect(()=>decodeCrewCache(storage.getItem('astronaut-health-ui-v1')!,'demo')).not.toThrow();broken.dispose();
});
test('UI cache rejects cross-crew pending commands and invalid drafts',()=>{
 const value={cacheVersion:1,schemaVersion:'0.1.0',namespace:'demo',selectedCrewId:'crew-a',views:{'crew-a':{draft:emptyDraft(),dirty:true,selectedRegion:null,pending:command([], 'x')}}};expect(()=>decodeCrewCache(JSON.stringify(value),'demo')).toThrow();value.views['crew-a'].pending=null as never;value.views['crew-a'].draft.confidence='pretend_verified';expect(()=>decodeCrewCache(JSON.stringify(value),'demo')).toThrow();
});
test('an uncertain acknowledgement is safely retried after the domain commit already succeeded',async()=>{
 const repo=await setup(),storage=cache(),store=new SelectedCrewStore(repo,'demo',storage);await store.initialize();store.updateDraft(good);const execute=repo.execute.bind(repo);repo.execute=async input=>{await execute(input);throw new Error('lost acknowledgement');};expect(await store.saveCheckIn()).toBe(false);repo.execute=execute;store.dispose();const reopened=new SelectedCrewStore(repo,'demo',storage);await reopened.initialize();expect(await reopened.saveCheckIn()).toBe(true);expect(reopened.getSnapshot().observations.filter(o=>o.observationId.startsWith('checkin-'))).toHaveLength(2);reopened.dispose();
});
test('a delayed capture acknowledgement cannot replace the other crew’s view or draft',async()=>{
 const repo=await setup(),store=new SelectedCrewStore(repo,'demo');await store.initialize();store.updateDraft(good);let release=()=>{},started=()=>{};const ready=new Promise<void>(r=>{started=r;}),original=repo.execute.bind(repo);repo.execute=async input=>{await new Promise<void>(r=>{release=r;started();});return original(input);};const saving=store.saveCheckIn();await ready;await store.selectCrew('crew-b');store.updateDraft({heartRate:'74'});release();expect(await saving).toBe(true);expect(store.getSnapshot().crew?.alias).toBe('Vega');expect(store.getSnapshot().draft.heartRate).toBe('74');expect(store.getSnapshot().observations.every(o=>o.astronautId==='crew-b')).toBe(true);store.dispose();
});
