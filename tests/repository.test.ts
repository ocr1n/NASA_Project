import 'fake-indexeddb/auto';
import {afterEach,describe,expect,test} from 'vitest';
import {Repository} from '../src/shared/repositories/repository';
import {MemoryStorage} from '../src/shared/repositories/memory';
import {IndexedDbStorage} from '../src/shared/repositories/indexeddb';
import {FixedClock} from '../src/shared/contracts/clock';
import {canonicalJSON,sha256,stableImportKey,importedObservationId} from '../src/shared/contracts/identity';
import {command,seedRecords,observation,task,at} from './helpers';
const stores:IndexedDbStorage[]=[];
afterEach(async()=>{for(const s of stores.splice(0))await s.db.delete();});
for(const adapter of ['memory','indexeddb'])describe(adapter,()=>{
 const make=async()=>{const s=adapter==='memory'?new MemoryStorage():new IndexedDbStorage(`test-${crypto.randomUUID()}`);if(s instanceof IndexedDbStorage)stores.push(s);const r=new Repository(s,new FixedClock(at));await r.execute(command(seedRecords(),'seed'));return {r,s};};
 test('capture commits reading and task once and publishes only committed changes',async()=>{
  const {r}=await make();const events:unknown[]=[];r.subscribe(e=>events.push(e));
  const c=command([observation(),task()],'capture',{operation:'capture',domain:'capture',subject:{kind:'crew',astronautId:'crew-a',missionId:'mission-demo'}});
  await r.execute(c);await r.execute(c);
  expect((await r.list('demo','Observation')).map(x=>x.observationId)).toEqual(['reading-1']);expect(await r.read('demo','FollowUpTask','task-1')).toMatchObject({state:'due'});expect(events).toHaveLength(1);
  await expect(r.execute({...c,payload:{...c.payload,records:[{...observation(),value:90},task()]}})).rejects.toMatchObject({detail:{code:'CONFLICT'}});
 });
 test('optimistic concurrent writes cannot lose an update',async()=>{
  const {r}=await make();const p=await r.read('demo','CrewProfile','crew-a');
  const a=command([{...p,revision:2,alias:'First'}],'first');a.payload.expectedRevisions=[{recordType:'CrewProfile',recordId:'crew-a',revision:1}] as never;
  const b={...a,operationId:'second',idempotencyKey:'second',payload:{...a.payload,records:[{...p,revision:2,alias:'Second'}]}};
  const results=await Promise.allSettled([r.execute(a),r.execute(b)]);expect(results.filter(x=>x.status==='fulfilled')).toHaveLength(1);expect((await r.read('demo','CrewProfile','crew-a'))?.revision).toBe(2);
 });
 test('cross crew references and wrong mission fail without writes',async()=>{
  const {r}=await make();await r.execute(command([observation()],'reading'));
  await expect(r.execute(command([task('bad','crew-b')],'bad'))).rejects.toMatchObject({detail:{code:'REFERENCE_INVALID'}});
  await expect(r.execute(command([{...observation('wrong'),missionId:'missing'}],'wrong'))).rejects.toMatchObject({detail:{code:'REFERENCE_INVALID'}});
  expect(await r.list('demo','FollowUpTask')).toHaveLength(0);
 });
 test('corrections append; original observations cannot be overwritten',async()=>{
  const {r}=await make();await r.execute(command([observation()],'reading'));
  const c=command([{...observation('correction'),value:63,supersedesObservationId:'reading-1'}],'correct',{operation:'correct'});await r.execute(c);
  await expect(r.execute(command([{...observation(),revision:2,value:64}],'overwrite'))).rejects.toMatchObject({detail:{code:'CONFLICT'}});
  expect((await r.read('demo','Observation','reading-1'))?.value).toBe(62);expect(await r.list('demo','Observation')).toHaveLength(2);
 });
 test('task completion requires matching crew, metric and new evidence',async()=>{
  const {r}=await make();await r.execute(command([observation(),task()],'initial'));
  const completed={...task(),revision:2,state:'completed',completionObservationIds:['reading-1']};const c=command([completed],'complete',{operation:'complete_task'});c.payload.expectedRevisions=[{recordType:'FollowUpTask',recordId:'task-1',revision:1}] as never;
  await expect(r.execute(c)).rejects.toMatchObject({detail:{code:'REFERENCE_INVALID'}});
  const follow=observation('follow');await r.execute(command([follow],'follow'));
  await r.execute({...c,payload:{...c.payload,records:[{...completed,completionObservationIds:['follow']}]}});expect(await r.read('demo','FollowUpTask','task-1')).toMatchObject({state:'completed'});
 });
 test('stable identical imports deduplicate; conflicting payloads reject',async()=>{
  const {r}=await make();const key=stableImportKey('demo','simulation','demo-1','external-row');const o=observation(await importedObservationId(key));o.deliveryMode='file_import';o.provenance.sourceRecordId='external-row';
  const fingerprint=await sha256(canonicalJSON(o));const c=command([o],'import-1',{operation:'import'});c.payload.importKeys=[{key,observationId:o.observationId,fingerprint}] as never;c.payload.previewToken='b'.repeat(64);
  await r.execute(c);await r.execute({...c,operationId:'import-2',idempotencyKey:'import-2'});expect(await r.list('demo','Observation')).toHaveLength(1);
  const changed={...o,value:90};await expect(r.execute({...c,operationId:'import-3',idempotencyKey:'import-3',payload:{...c.payload,records:[changed],importKeys:[{key,observationId:o.observationId,fingerprint:await sha256(canonicalJSON(changed))}]}})).rejects.toMatchObject({detail:{code:'CONFLICT'}});
 });
});
test('actual IndexedDB task-write exception rolls back observation, receipt and events',async()=>{
 const s=new IndexedDbStorage(`rollback-${crypto.randomUUID()}`);stores.push(s);const r=new Repository(s,new FixedClock(at));await r.execute(command(seedRecords(),'seed'));const events:unknown[]=[];r.subscribe(e=>events.push(e));
 const hook=(_key:unknown,row:{record:{recordType:string}})=>{if(row.record.recordType==='FollowUpTask')throw new DOMException('Forced task persistence failure','QuotaExceededError');};s.db.records.hook('creating',hook);
 const c=command([observation(),task()],'capture',{operation:'capture',domain:'capture'});
 await expect(r.execute(c)).rejects.toMatchObject({detail:{code:'STORAGE_QUOTA'}});expect(await r.list('demo','Observation')).toHaveLength(0);expect(await r.list('demo','FollowUpTask')).toHaveLength(0);expect(events).toHaveLength(0);
 s.db.records.hook('creating').unsubscribe(hook);await r.execute(c);expect(await r.list('demo','Observation')).toHaveLength(1);
});
