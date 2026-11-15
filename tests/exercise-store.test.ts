import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {SelectedCrewStore} from '../src/shared/view-models';
import {ExerciseStore} from '../src/shared/view-models/exercise';
import {Repository} from '../src/shared/repositories/repository';
import {MemoryStorage} from '../src/shared/repositories/memory';
import {FixedClock} from '../src/shared/contracts/clock';
import {createDemoRecords,DEMO_TIME} from '../src/shared/fixtures';
import {command} from './helpers';
const csv=readFileSync(new URL('../src/shared/capture/fixtures/fictional-exercise-v1.csv',import.meta.url),'utf8');
const cache=()=>{const map=new Map<string,string>();return {getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);}};};
async function setup(){const repo=new Repository(new MemoryStorage(),new FixedClock(DEMO_TIME));await repo.execute(command(await createDemoRecords()));const crew=new SelectedCrewStore(repo,'demo');await crew.initialize();return {repo,crew};}
test('crew-scoped prefill, manual notes and unfinished drafts survive switches/reload',async()=>{
 const {repo,crew}=await setup(),storage=cache(),store=new ExerciseStore(repo,crew,storage);await store.initialize();await store.preview(csv);store.updateNotes('Crew A context');
 await crew.selectCrew('crew-b');expect(store.getSnapshot().notes).toBe('');expect(store.getSnapshot().csv).toBe('');store.updateContent({activity:'walking'});store.updateNotes('Crew B draft');
 await crew.selectCrew('crew-a');expect(store.getSnapshot().notes).toBe('Crew A context');expect(store.getSnapshot().preview?.content.values.find(v=>v.metric==='exercise_duration')?.input).toBe('1200');store.dispose();
 const reopened=new ExerciseStore(repo,crew,storage);await reopened.initialize();expect(reopened.getSnapshot().notes).toBe('Crew A context');expect(reopened.getSnapshot().preview).toBeNull();expect(await reopened.save()).toBe(false);await reopened.preview(reopened.getSnapshot().csv);expect(await reopened.save()).toBe(true);await reopened.refresh();expect(reopened.getSnapshot().sessions.find(s=>s.session.sourceSessionId==='fictional-cycle-001')?.notes.text).toBe('Crew A context');await crew.selectCrew('crew-b');expect(reopened.getSnapshot().content.activity).toBe('walking');expect(reopened.getSnapshot().notes).toBe('Crew B draft');reopened.dispose();crew.dispose();
});
test.each(['failed commit','lost acknowledgement'])('%s retains exact command over reload and retries once',async kind=>{
 const {repo,crew}=await setup(),storage=cache(),store=new ExerciseStore(repo,crew,storage);await store.initialize();await store.preview(csv);store.updateNotes('Retry notes');const execute=repo.execute.bind(repo);repo.execute=async c=>{if(kind==='lost acknowledgement')await execute(c);throw new Error(kind);};expect(await store.save()).toBe(false);const pending=store.getSnapshot().pending;expect(pending).not.toBeNull();expect(store.getSnapshot().notes).toBe('Retry notes');store.dispose();repo.execute=execute;
 const reopened=new ExerciseStore(repo,crew,storage);await reopened.initialize();expect(reopened.getSnapshot().pending).toEqual(pending);expect(await reopened.save()).toBe(true);await reopened.refresh();expect(reopened.getSnapshot().sessions.filter(s=>s.session.sourceSessionId==='fictional-cycle-001')).toHaveLength(1);expect(reopened.getSnapshot().sessions.find(s=>s.session.sourceSessionId==='fictional-cycle-001')?.notes.text).toBe('Retry notes');reopened.dispose();crew.dispose();
});
test('delayed exercise acknowledgement cannot replace another crew’s draft or view',async()=>{
 const {repo,crew}=await setup(),store=new ExerciseStore(repo,crew);await store.initialize();await store.preview(csv);let release=()=>{},started=()=>{};const ready=new Promise<void>(r=>{started=r;}),execute=repo.execute.bind(repo);repo.execute=async c=>{await new Promise<void>(r=>{release=r;started();});return execute(c);};const saving=store.save();await ready;await crew.selectCrew('crew-b');store.updateNotes('Other crew');release();expect(await saving).toBe(true);expect(store.getSnapshot().crewId).toBe('crew-b');expect(store.getSnapshot().notes).toBe('Other crew');expect(store.getSnapshot().sessions.every(s=>s.session.astronautId==='crew-b')).toBe(true);store.dispose();crew.dispose();
});
test('conflict candidate remains persisted and note edits use the displayed session head',async()=>{
 const {repo,crew}=await setup(),storage=cache(),store=new ExerciseStore(repo,crew,storage);await store.initialize();await store.preview(csv);store.updateNotes('Initial');expect(await store.save()).toBe(true);await store.refresh();const retained=store.getSnapshot().sessions.find(s=>s.session.sourceSessionId==='fictional-cycle-001')!;store.beginNotes(retained.session.sessionId);store.editNotes('Amended');expect(await store.save('note')).toBe(true);await store.refresh();expect(store.getSnapshot().sessions.find(s=>s.session.sessionId===retained.session.sessionId)?.notes.history.map(n=>n.text)).toEqual(['Initial','Amended']);
 const candidate=csv.replace('exercise_mean_hr,120','exercise_mean_hr,121');await store.preview(candidate);expect(store.getSnapshot().preview?.action).toBe('conflict');expect(await store.save()).toBe(false);expect(store.getSnapshot().csv).toBe(candidate);store.dispose();const reopened=new ExerciseStore(repo,crew,storage);await reopened.initialize();expect(reopened.getSnapshot().csv).toBe(candidate);reopened.dispose();crew.dispose();
});
test('invalid cache is preserved until explicit reset and cache quota errors keep in-memory drafts',async()=>{
 const {repo,crew}=await setup(),storage=cache();storage.setItem('astronaut-exercise-ui-v1','{"version":"future"}');const store=new ExerciseStore(repo,crew,storage);await store.initialize();store.updateNotes('Preserved');expect(storage.getItem('astronaut-exercise-ui-v1')).toBe('{"version":"future"}');expect(store.getSnapshot().cacheError).not.toBeNull();store.resetDraft();expect(store.getSnapshot().cacheError).toBeNull();const set=storage.setItem;storage.setItem=()=>{throw {name:'QuotaExceededError'};};store.updateNotes('Memory notes');expect(store.getSnapshot().notes).toBe('Memory notes');expect(store.getSnapshot().cacheError?.code).toBe('STORAGE_QUOTA');storage.setItem=set;store.retryCache();expect(store.getSnapshot().cacheError).toBeNull();store.dispose();crew.dispose();
});
