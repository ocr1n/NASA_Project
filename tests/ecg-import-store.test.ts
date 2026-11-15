import {afterEach,expect,test,vi} from 'vitest';
import {Repository} from '../src/shared/repositories/repository';
import {MemoryStorage} from '../src/shared/repositories/memory';
import {FixedClock} from '../src/shared/contracts/clock';
import {EcgImportStore} from '../src/shared/view-models/ecg-import';
import {at} from './helpers';
import {fixtureArtifact} from '../src/shared/sources/catalogue';
const stores:EcgImportStore[]=[];afterEach(()=>{stores.splice(0).forEach(s=>s.dispose());vi.restoreAllMocks();});
async function setup(){const repo=new Repository(new MemoryStorage(),new FixedClock(at)),store=new EcgImportStore(repo);stores.push(store);await store.initialize();return {repo,store};}

test('research preview/selection stays read-only and only selected reports are retained',async()=>{
 const {repo,store}=await setup();await store.preview();expect(store.getSnapshot().preview?.rows).toHaveLength(2);
 expect((await repo.export('research:ptb-xl-plus')).records).toEqual([]);const selection=store.selectRows(['1']);expect(store.getSnapshot().selectedEcgIds).toEqual(['1']);await selection;expect(await store.save()).toBe(true);
 expect(store.getSnapshot().reports).toHaveLength(1);expect(store.getSnapshot().reports[0].report.publicSubjectId).toBe('PTB-patient-15709');
 expect(store.getSnapshot().preview?.rows.find(r=>r.ecgId==='1')?.action).toBe('duplicate');
 expect((await repo.export('demo')).records).toEqual([]);expect(Object.isFrozen(store.getSnapshot())).toBe(true);
});

test('uncertain acknowledgement retains exact pending command and retry creates no duplicate',async()=>{
 const {repo,store}=await setup();await store.preview();const execute=repo.execute.bind(repo);let fail=true;
 vi.spyOn(repo,'execute').mockImplementation(async(...args)=>{const result=await execute(...args);if(fail){fail=false;throw Error('Lost acknowledgement');}return result;});
 expect(await store.save()).toBe(false);expect(store.getSnapshot().pending).toBe(true);expect(store.getSnapshot().error).not.toBeNull();
 expect(await store.save()).toBe(true);expect(store.getSnapshot().reports).toHaveLength(2);expect(store.getSnapshot().pending).toBe(false);
});

test('new store reads retained reports and fresh preview marks identical records as duplicates',async()=>{
 const {repo,store}=await setup();await store.preview();await store.save();const other=new EcgImportStore(repo);stores.push(other);await other.initialize();
 expect(other.getSnapshot().reports).toHaveLength(2);await other.preview();expect(other.getSnapshot().preview?.rows.every(r=>r.action==='duplicate')).toBe(true);
});

test('method change invalidates old preview and invalid UTF-8 files do not become source text',async()=>{
 const {store}=await setup();await store.preview();store.setMethod('Uni-G');expect(store.getSnapshot().preview).toBeNull();
 await store.loadFile('features',new File([new Uint8Array([0xc3,0x28])],'invalid.csv'));expect(store.getSnapshot().error).not.toBeNull();
 expect(store.getSnapshot().preview).toBeNull();
});

test('export read failure stays visible instead of becoming an unhandled UI rejection',async()=>{
 const {repo,store}=await setup();vi.spyOn(repo,'export').mockRejectedValueOnce(Error('Read unavailable'));
 expect(await store.exportRecords()).toBeNull();expect(store.getSnapshot().error).not.toBeNull();
});

test('a valid CSV upload unlocks preview and can be imported',async()=>{
 const {store}=await setup();await store.loadFile('features',new File([fixtureArtifact('ptbecgdeli').payload!],'features.csv'));
 expect(store.getSnapshot().busy).toBe(false);expect(store.getSnapshot().error).toBeNull();
 await store.preview();expect(store.getSnapshot().preview?.rows).toHaveLength(2);
 expect(await store.save()).toBe(true);expect(store.getSnapshot().reports).toHaveLength(2);
});
