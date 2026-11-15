import {expect,test} from 'vitest';
import {SelectedCrewStore} from '../src/shared/view-models';
import {EcgStore} from '../src/shared/view-models/ecg';
import {Repository} from '../src/shared/repositories/repository';
import {MemoryStorage} from '../src/shared/repositories/memory';
import {FixedClock} from '../src/shared/contracts/clock';
import {createDemoRecords,DEMO_TIME} from '../src/shared/fixtures';
import {command} from './helpers';
const cache=()=>{const map=new Map<string,string>();return {getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);}};};
async function setup(){const repo=new Repository(new MemoryStorage(),new FixedClock(DEMO_TIME));await repo.execute(command(await createDemoRecords()));const crew=new SelectedCrewStore(repo,'demo');await crew.initialize();return {repo,crew};}
function fill(store:EcgStore){const content=store.getSnapshot().content;store.updateContent({reportKey:'fictional-manual',lead:'II',method:'fictional reported measurement',qualityNotes:'Original report context',values:content.values.map(v=>v.metric==='heart_rate'?{...v,input:'63',unit:'bpm',missingReason:null}:v)});}

test('unfinished drafts, immutable snapshot and retained reports isolate crew over switches/reload',async()=>{
 const {repo,crew}=await setup(),storage=cache(),store=new EcgStore(repo,crew,storage);await store.initialize();store.updateContent({reportKey:'',lead:'',method:'',qualityNotes:'Unfinished A'});const first=store.getSnapshot();expect(Object.isFrozen(first.content)).toBe(true);expect(store.getSnapshot()).toBe(first);
 await crew.selectCrew('crew-b');await store.refresh();expect(store.getSnapshot().reports).toHaveLength(0);store.updateContent({qualityNotes:'B draft'});await crew.selectCrew('crew-a');expect(store.getSnapshot().content.qualityNotes).toBe('Unfinished A');store.dispose();const reopened=new EcgStore(repo,crew,storage);await reopened.initialize();expect(reopened.getSnapshot().cacheError).toBeNull();expect(reopened.getSnapshot().content.reportKey).toBe('');fill(reopened);expect(await reopened.save()).toBe(true);await reopened.refresh();expect(reopened.getSnapshot().reports.some(r=>r.evidence?.content.reportKey==='fictional-manual')).toBe(true);
 await crew.selectCrew('crew-b');await reopened.refresh();expect(reopened.getSnapshot().content.qualityNotes).toBe('B draft');expect(reopened.getSnapshot().reports).toHaveLength(0);reopened.dispose();crew.dispose();
});

test.each(['failed commit','lost acknowledgement'])('%s preserves exact command over reload and retries once',async kind=>{
 const {repo,crew}=await setup(),storage=cache(),store=new EcgStore(repo,crew,storage);await store.initialize();fill(store);const execute=repo.execute.bind(repo);repo.execute=async c=>{if(kind==='lost acknowledgement')await execute(c);throw new Error(kind);};expect(await store.save()).toBe(false);const pending=store.getSnapshot().pending;expect(pending).not.toBeNull();store.updateContent({qualityNotes:'ignored while pending'});expect(store.getSnapshot().content.qualityNotes).toBe('Original report context');store.dispose();repo.execute=execute;
 const reopened=new EcgStore(repo,crew,storage);await reopened.initialize();expect(reopened.getSnapshot().pending).toEqual(pending);expect(await reopened.save()).toBe(true);await reopened.refresh();expect(reopened.getSnapshot().reports.filter(r=>r.evidence?.content.reportKey==='fictional-manual')).toHaveLength(1);expect(reopened.getSnapshot().reports.find(r=>r.evidence?.content.reportKey==='fictional-manual')?.evidence?.content.qualityNotes).toBe('Original report context');reopened.dispose();crew.dispose();
});

test('delayed save acknowledgement cannot replace another crew draft or report view',async()=>{
 const {repo,crew}=await setup(),store=new EcgStore(repo,crew);await store.initialize();fill(store);let release=()=>{},started=()=>{};const ready=new Promise<void>(r=>{started=r;}),execute=repo.execute.bind(repo);repo.execute=async c=>{await new Promise<void>(r=>{release=r;started();});return execute(c);};const saving=store.save();await ready;await crew.selectCrew('crew-b');store.updateContent({qualityNotes:'B while A saves'});release();expect(await saving).toBe(true);await store.refresh();expect(store.getSnapshot().crewId).toBe('crew-b');expect(store.getSnapshot().content.qualityNotes).toBe('B while A saves');expect(store.getSnapshot().reports).toHaveLength(0);store.dispose();crew.dispose();
});

test('conflicting content stays reviewable/editable across reload and original remains unchanged',async()=>{
 const {repo,crew}=await setup(),storage=cache(),store=new EcgStore(repo,crew,storage);await store.initialize();fill(store);expect(await store.save()).toBe(true);fill(store);store.updateContent({qualityNotes:'Changed candidate'});expect(await store.save()).toBe(false);expect(store.getSnapshot().error?.code).toBe('CONFLICT');expect(store.getSnapshot().pending).toBeNull();expect(store.getSnapshot().content.qualityNotes).toBe('Changed candidate');store.dispose();const reopened=new EcgStore(repo,crew,storage);await reopened.initialize();expect(reopened.getSnapshot().content.qualityNotes).toBe('Changed candidate');expect(reopened.getSnapshot().reports.find(r=>r.evidence?.content.reportKey==='fictional-manual')?.evidence?.content.qualityNotes).toBe('Original report context');reopened.updateContent({reportKey:'new-report'});expect(await reopened.save()).toBe(true);reopened.dispose();crew.dispose();
});

test('incompatible cache is preserved until reset; quota errors keep in-memory draft',async()=>{
 const {repo,crew}=await setup(),storage=cache();storage.setItem('astronaut-ecg-ui-v1','{"version":"future"}');const store=new EcgStore(repo,crew,storage);await store.initialize();store.updateContent({qualityNotes:'Memory draft'});expect(storage.getItem('astronaut-ecg-ui-v1')).toBe('{"version":"future"}');expect(store.getSnapshot().cacheError).not.toBeNull();store.resetDraft();expect(store.getSnapshot().cacheError).toBeNull();const set=storage.setItem;storage.setItem=()=>{throw {name:'QuotaExceededError'};};store.updateContent({qualityNotes:'Retain me'});expect(store.getSnapshot().content.qualityNotes).toBe('Retain me');expect(store.getSnapshot().cacheError?.code).toBe('STORAGE_QUOTA');storage.setItem=set;store.resetCache();expect(store.getSnapshot().cacheError).toBeNull();store.dispose();crew.dispose();
});

test('cached pending commands cannot be moved into another crew or database cache',async()=>{
 const {repo,crew}=await setup(),storage=cache(),store=new EcgStore(repo,crew,storage,'copy-a');await store.initialize();fill(store);repo.execute=async()=>{throw new Error('unavailable');};await store.save();const serialized=JSON.parse(storage.getItem('copy-a')!);serialized.views['crew-b']=serialized.views['crew-a'];serialized.views['crew-b'].content.crewId='crew-b';delete serialized.views['crew-a'];storage.setItem('copy-a',JSON.stringify(serialized));store.dispose();const reopened=new EcgStore(repo,crew,storage,'copy-a');await reopened.initialize();expect(reopened.getSnapshot().cacheError?.code).toBe('REFERENCE_INVALID');const other=new EcgStore(repo,crew,storage,'copy-b');await other.initialize();expect(other.getSnapshot().pending).toBeNull();expect(other.getSnapshot().content.qualityNotes).toBe('');reopened.dispose();other.dispose();crew.dispose();
});
