import 'fake-indexeddb/auto';
import {afterEach,expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {Repository} from '../src/shared/repositories/repository';
import {MemoryStorage} from '../src/shared/repositories/memory';
import {IndexedDbStorage} from '../src/shared/repositories/indexeddb';
import {FixedClock} from '../src/shared/contracts/clock';
import {canonicalJSON,sha256} from '../src/shared/contracts/identity';
import {EXERCISE_MEDIA,EXERCISE_NOTES_MEDIA,exercisePayload,selectExerciseNotes} from '../src/shared/contracts/exercise';
import {emptyExerciseContent,mapExerciseCSV,prepareExercise,previewExerciseCSV,commandFromExercisePreview,prepareExerciseNote} from '../src/shared/capture/exercise';
import {createDemoRecords,DEMO_TIME} from '../src/shared/fixtures';
import {buildComparisonKey} from '../src/shared/metrics';
import type {CommandEnvelope,RawRecord,ExerciseSession,Observation} from '../src/shared/contracts';
import {command} from './helpers';
export const csv=readFileSync(new URL('../src/shared/capture/fixtures/fictional-exercise-v1.csv',import.meta.url),'utf8');
const dbs:IndexedDbStorage[]=[];
afterEach(async()=>{const stores=dbs.splice(0);for(const s of stores)s.close();for(const s of stores)await s.db.delete();});
async function setup(indexed=false){const storage=indexed?new IndexedDbStorage(`exercise-${crypto.randomUUID()}`):new MemoryStorage();if(storage instanceof IndexedDbStorage)dbs.push(storage);const repo=new Repository(storage,new FixedClock(DEMO_TIME));await repo.execute(command(await createDemoRecords()));return repo;}
const session=(c:CommandEnvelope)=>c.payload.records.find(r=>r.recordType==='ExerciseSession')! as ExerciseSession;
const values=(c:CommandEnvelope)=>c.payload.records.filter(r=>r.recordType==='Observation');

test.each([false,true])('manual/import parity and original units/time/file/notes (%s IndexedDB)',async indexed=>{
 const repo=await setup(indexed),content=mapExerciseCSV(csv,'crew-a'),manual=await prepareExercise(repo,content,{notes:'Manual context'}),p=await previewExerciseCSV(repo,csv,'crew-a'),imported=await commandFromExercisePreview(p,'Imported workout; manual context');
 expect((await repo.list('demo','ExerciseSession'))).toHaveLength(1); // preview has no writes
 expect(session(manual)).toEqual(session(imported));
 const comparable=(o:Observation)=>({id:o.observationId,metric:o.metric,value:o.value,unit:o.unit,context:o.context,mc:o.measurementContext,time:o.originalTime,source:o.source,quality:o.quality});
 expect(values(manual).map(comparable)).toEqual(values(imported).map(comparable));
 await repo.execute(imported);const retained=await repo.require('demo','ExerciseSession',session(imported).sessionId),raws=await repo.list('demo','RawRecord');
 expect(selectExerciseNotes(retained,raws).text).toBe('Imported workout; manual context');expect(retained.notes).toBeNull();
 expect(raws.find(r=>r.mediaType==='text/csv')?.payload).toBe(csv);
 const duration=values(imported).find(o=>o.metric==='exercise_duration')!;expect(duration.value).toBe(20);expect(duration.provenance.originalValue).toBe(1200);expect(duration.provenance.originalUnit).toBe('s');expect(duration.timestamp).toBe('2026-01-10T05:00:00.000Z');
 expect(values(imported).every(o=>o.quality.score===null&&o.validation.admission==='demo_only'&&o.sessionId===retained.sessionId)).toBe(true);
 expect((await repo.require('demo','FollowUpTask','task-crew-a')).state).toBe('due');
});
test.each([false,true])('duplicate, stale concurrent preview and amended notes create no extra records/tasks (%s IndexedDB)',async indexed=>{
 const repo=await setup(indexed),p1=await previewExerciseCSV(repo,csv,'crew-a'),p2=await previewExerciseCSV(repo,csv,'crew-a');
 const c1=await commandFromExercisePreview(p1,'First notes'),c2=await commandFromExercisePreview(p2,'Stale preview notes');const receipts=await Promise.all([repo.execute(c1),repo.execute(c2)]);expect(receipts.filter(r=>r.recordIds.length===0)).toHaveLength(1);
 const s=await repo.require('demo','ExerciseSession',session(c1).sessionId),raws=await repo.list('demo','RawRecord'),head=selectExerciseNotes(s,raws).history.at(-1)!.rawRecordId;
 await repo.execute(await prepareExerciseNote(repo,'crew-a',s.sessionId,'Later notes',head));const before=(await repo.export('demo')).records;
 const again=await previewExerciseCSV(repo,csv,'crew-a');expect(again.action).toBe('duplicate');expect((await repo.execute(await commandFromExercisePreview(again,'Reimport note'))).recordIds).toHaveLength(0);
 expect((await repo.export('demo')).records).toEqual(before);expect(selectExerciseNotes(s,await repo.list('demo','RawRecord')).text).toBe('Later notes');
});
test.each([false,true])('conflict preserves retained evidence and candidate remains reviewable (%s IndexedDB)',async indexed=>{
 const repo=await setup(indexed),c=await commandFromExercisePreview(await previewExerciseCSV(repo,csv,'crew-a'));await repo.execute(c);const before=(await repo.export('demo')).records,changed=csv.replace('exercise_mean_hr,120','exercise_mean_hr,121');
 const p=await previewExerciseCSV(repo,changed,'crew-a');expect(p.action).toBe('conflict');expect(p.content.values.find(v=>v.metric==='exercise_mean_hr')?.input).toBe('121');await expect(commandFromExercisePreview(p)).rejects.toMatchObject({detail:{code:'CONFLICT'}});
 const direct=await prepareExercise(repo,mapExerciseCSV(changed,'crew-a'),{csv:changed});await expect(repo.execute(direct)).rejects.toMatchObject({detail:{code:'CONFLICT'}});expect((await repo.export('demo')).records).toEqual(before);
});
test.each([false,true])('atomic failure after writes, exact retry, persistence and export restore (%s IndexedDB)',async indexed=>{
 let repo=await setup(indexed);const c=await commandFromExercisePreview(await previewExerciseCSV(repo,csv,'crew-a'),'Retry context'),before=await repo.export('demo');
 if(repo.storage instanceof IndexedDbStorage){const table=repo.storage.db.metadata,put=table.put.bind(table);table.put=(()=>{throw {name:'QuotaExceededError'};}) as typeof table.put;await expect(repo.execute(c)).rejects.toMatchObject({detail:{code:'STORAGE_QUOTA'}});table.put=put;}
 else {const transact=repo.storage.transact.bind(repo.storage);repo.storage.transact=(ns,work)=>transact(ns,draft=>{work(draft);throw new Error('failure after candidate writes');});await expect(repo.execute(c)).rejects.toThrow();repo.storage.transact=transact;}
 expect(await repo.export('demo')).toEqual(before);const receipt=await repo.execute(c);expect(await repo.execute(c)).toEqual(receipt);
 if(repo.storage instanceof IndexedDbStorage){const name=repo.storage.db.name;repo.storage.close();const reopened=new IndexedDbStorage(name);dbs.push(reopened);repo=new Repository(reopened,new FixedClock(DEMO_TIME));expect(await repo.require('demo','ExerciseSession',session(c).sessionId)).toEqual(session(c));}
 const snapshot=await repo.export('demo'),copy=new Repository(new MemoryStorage(),new FixedClock(DEMO_TIME));await copy.restore(snapshot);expect((await copy.export('demo')).records).toEqual(snapshot.records);
 expect((await copy.execute(await commandFromExercisePreview(await previewExerciseCSV(copy,csv,'crew-a')))).recordIds).toHaveLength(0);
});
test('notes retain history, permit explicit clearing, reject stale heads/forks/cross-crew and unsupported payload versions',async()=>{
 const repo=await setup(),c=await prepareExercise(repo,mapExerciseCSV(csv,'crew-a'));await repo.execute(c);const s=session(c);
 const first=await prepareExerciseNote(repo,'crew-a',s.sessionId,'First',null),fork=await prepareExerciseNote(repo,'crew-a',s.sessionId,'Fork',null);await repo.execute(first);await expect(repo.execute(fork)).rejects.toThrow();
 await expect(prepareExerciseNote(repo,'crew-b',s.sessionId,'Cross crew',null)).rejects.toThrow();await expect(prepareExerciseNote(repo,'crew-a',s.sessionId,'Stale',null)).rejects.toThrow();
 const head=selectExerciseNotes(s,await repo.list('demo','RawRecord')).history.at(-1)!.rawRecordId;await repo.execute(await prepareExerciseNote(repo,'crew-a',s.sessionId,'',head));const selected=selectExerciseNotes(s,await repo.list('demo','RawRecord'));expect(selected.text).toBe('');expect(selected.history.map(n=>n.text)).toEqual(['First','']);expect(await repo.require('demo','ExerciseSession',s.sessionId)).toEqual(s);
 const bad=await prepareExerciseNote(repo,'crew-a',s.sessionId,'x',selected.history.at(-1)!.rawRecordId),raw=bad.payload.records[0] as RawRecord;const payload=JSON.parse(raw.payload!);payload.protocolVersion='exercise-notes/999';raw.payload=canonicalJSON(payload);raw.contentHash=await sha256(raw.payload);await expect(repo.execute(bad)).rejects.toThrow();
});
test('preview tampering and raw checksum/owner/mapping/context bypass are rejected before persistence',async()=>{
 const repo=await setup(),p=await previewExerciseCSV(repo,csv,'crew-a');p.content.activity='running';await expect(commandFromExercisePreview(p)).rejects.toThrow();
 for(const change of ['preview','raw','crew','activity','workload','time','duration','rest','scale','original value']){
  const c=await commandFromExercisePreview(await previewExerciseCSV(repo,csv,'crew-a'));
  if(change==='preview')c.payload.previewToken='0'.repeat(64);
  else if(change==='raw')(c.payload.records.find(r=>r.recordType==='RawRecord'&&r.mediaType==='text/csv') as RawRecord).payload+='changed';
  else if(change==='crew')c.subject.astronautId='crew-b';
  else if(change==='duration')session(c).durationMinutes=999;
  else {c.operation='capture';c.payload.importKeys=[];const o=values(c)[0];if(change==='rest')o.context='rest';else if(change==='time')o.originalTime='2026-01-09';else if(change==='original value')o.provenance.originalValue=999;else if(change==='scale')values(c).find(o=>o.metric==='perceived_exertion')!.measurementContext.scale=null;else o.measurementContext[change as 'activity'|'workload']='other';}
  await expect(repo.execute(c)).rejects.toThrow();
 }
 expect((await repo.list('demo','ExerciseSession'))).toHaveLength(1);
});
test.each(['date','unknown'] as const)('%s time and missing workload/device/power remain truthful and incomparable',async precision=>{
 const repo=await setup(),content=mapExerciseCSV(csv,'crew-a');content.time={precision,text:precision==='date'?'2026-01-10':'',reason:'Exact time unavailable'};content.workload=null;content.deviceId=null;content.values.find(v=>v.metric==='cycling_power')!.input='';content.values.find(v=>v.metric==='cycling_power')!.missingReason='device unavailable';
 const c=await prepareExercise(repo,content);await repo.execute(c);expect(session(c).startAt).toBeNull();expect(values(c).every(o=>o.timestamp===null&&o.timePrecision===precision)).toBe(true);
 const power=values(c).find(o=>o.metric==='cycling_power')!;expect(power.value).toBeNull();expect(power.missingReason).toBe('device unavailable');expect(buildComparisonKey(values(c).find(o=>o.metric==='exercise_mean_hr')!).availability).toBe('incomparable');
});
test('session/measurement identities isolate crew and comparisons separate activity, workload, protocol and rest',async()=>{
 const repo=await setup(),a=await prepareExercise(repo,mapExerciseCSV(csv,'crew-a')),b=await prepareExercise(repo,mapExerciseCSV(csv.replaceAll('crew-a','crew-b'),'crew-b'));await repo.execute(a);await repo.execute(b);expect(session(a).sessionId).not.toBe(session(b).sessionId);expect(values(a).map(o=>o.observationId).some(id=>values(b).some(o=>o.observationId===id))).toBe(false);
 const hr=values(a).find(o=>o.metric==='exercise_mean_hr')!,key=buildComparisonKey(hr).key;for(const mc of [{activity:'running'},{workload:'different'},{protocolId:'other'}])expect(buildComparisonKey({...hr,measurementContext:{...hr.measurementContext,...mc}}).key).not.toBe(key);expect(buildComparisonKey({...hr,context:'rest'}).key).not.toBe(key);
 expect((await repo.list('demo','Baseline')).some(b=>b.observationIds.some(id=>values(a).some(o=>o.observationId===id)))).toBe(false);
});
test('a duplicate workout cannot reuse an unrelated operation identity',async()=>{
 const repo=await setup();await repo.execute(await prepareExercise(repo,mapExerciseCSV(csv,'crew-a')));const c=await prepareExercise(repo,mapExerciseCSV(csv,'crew-a'));c.operationId='operation-1';c.idempotencyKey='operation-1';await expect(repo.execute(c)).rejects.toMatchObject({detail:{code:'CONFLICT'}});
});
test('independently entered manual content and matching CSV share one retained workout',async()=>{
 const repo=await setup(),content=emptyExerciseContent('crew-a');Object.assign(content,{sessionKey:'fictional-cycle-001',activity:'cycling',workload:'steady 160 W',protocolId:'fictional-session-v1',deviceId:'fictional-cycle',posture:'seated',time:{precision:'exact',text:'2026-01-10T10:00:00+05:00',reason:''}});
 const reports={exercise_duration:['1200','s'],perceived_exertion:['6','1'],exercise_mean_hr:['120','/min'],exercise_peak_hr:['140','/min'],cycling_power:['160','W']};content.values=content.values.map(v=>({...v,input:reports[v.metric][0],unit:reports[v.metric][1],missingReason:null}));await repo.execute(await prepareExercise(repo,content,{notes:'Manual note'}));const before=(await repo.export('demo')).records,p=await previewExerciseCSV(repo,csv,'crew-a');expect(p.action).toBe('duplicate');await repo.execute(await commandFromExercisePreview(p));expect((await repo.export('demo')).records).toEqual(before);
});
test.each(['bad format','wrong crew','two sessions','duplicate metric','missing row','bad number','missing duration','bad unit','unknown column change'])('CSV %s is explicitly handled',async kind=>{
 const repo=await setup();let text=csv;
 if(kind==='bad format')text=text.replaceAll('fictional-exercise/1','real-fit');if(kind==='wrong crew')text=text.replaceAll('crew-a','crew-b');if(kind==='two sessions')text=text.replace('fictional-cycle-001','another');if(kind==='duplicate metric')text=text.replace('exercise_peak_hr','exercise_mean_hr');if(kind==='missing row')text=text.trimEnd().split('\n').slice(0,-1).join('\n');if(kind==='bad number')text=text.replace('exercise_mean_hr,120','exercise_mean_hr,120abc');if(kind==='missing duration')text=text.replace('exercise_duration,1200,s,','exercise_duration,,s,not reported');if(kind==='bad unit')text=text.replace('exercise_duration,1200,s,','exercise_duration,1200,kg,');
 if(kind==='unknown column change'){const withExtra=csv.trimEnd().split('\n').map((line,i)=>line+','+(i?'alpha':'extra')).join('\n');await repo.execute(await commandFromExercisePreview(await previewExerciseCSV(repo,withExtra,'crew-a')));expect((await previewExerciseCSV(repo,withExtra.replace('alpha','beta'),'crew-a')).action).toBe('conflict');}
 else await expect(previewExerciseCSV(repo,text,'crew-a')).rejects.toThrow();
});
