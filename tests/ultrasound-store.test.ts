import {expect,test,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {UltrasoundStore} from '../src/shared/view-models/ultrasound';
import {Repository} from '../src/shared/repositories/repository';
import {MemoryStorage} from '../src/shared/repositories/memory';
import {FixedClock} from '../src/shared/contracts/clock';
import {createDemoRecords,DEMO_TIME} from '../src/shared/fixtures';
import {command} from './helpers';
const csv=readFileSync(new URL('../src/shared/capture/fixtures/fictional-echo-v1.csv',import.meta.url),'utf8');
test('ultrasound preview is read-only, save retains evidence and crew histories stay separate',async()=>{
 const repo=new Repository(new MemoryStorage(),new FixedClock(DEMO_TIME));await repo.execute(command(await createDemoRecords()));
 const a=new UltrasoundStore(repo,'crew-a','mission-demo'),b=new UltrasoundStore(repo,'crew-b','mission-demo');
 try{const before=(await repo.export('demo')).records.length;await a.previewCSV(csv);expect(a.getSnapshot().preview?.action).toBe('create');expect((await repo.export('demo')).records).toHaveLength(before);
 expect(await a.save()).toBe(true);await b.refresh();expect(b.getSnapshot().reports.every(r=>r.report.astronautId==='crew-b')).toBe(true);expect(a.getSnapshot().reports.some(r=>r.content?.reportKey==='fictional-echo-001')).toBe(true);
 await b.previewCSV(csv);expect(b.getSnapshot().error).toContain('subject');expect(b.getSnapshot().preview).toBeNull();
 }finally{a.dispose();b.dispose();}
});
test('ultrasound save retries its exact pending command after uncertain acknowledgement',async()=>{
 const repo=new Repository(new MemoryStorage(),new FixedClock(DEMO_TIME));await repo.execute(command(await createDemoRecords()));const store=new UltrasoundStore(repo,'crew-a','mission-demo');
 try{await store.previewCSV(csv);const execute=repo.execute.bind(repo);let first=true;vi.spyOn(repo,'execute').mockImplementation(async c=>{const receipt=await execute(c);if(first){first=false;throw Error('Lost acknowledgement');}return receipt;});expect(await store.save()).toBe(false);const pending=store.getSnapshot().pending;expect(pending).not.toBeNull();expect(await store.save()).toBe(true);expect(store.getSnapshot().pending).toBeNull();expect(store.getSnapshot().reports.filter(r=>r.content?.reportKey==='fictional-echo-001')).toHaveLength(1);
 }finally{store.dispose();vi.restoreAllMocks();}
});

test('CSV preview survives remount with original file and import delivery preserved',async()=>{
 const repo=new Repository(new MemoryStorage(),new FixedClock(DEMO_TIME));await repo.execute(command(await createDemoRecords()));
 const memory=new Map<string,string>(),cache={getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v);}} as Storage;
 const first=new UltrasoundStore(repo,'crew-a','mission-demo',cache);await first.previewCSV(csv);first.dispose();
 const next=new UltrasoundStore(repo,'crew-a','mission-demo',cache);try{expect(next.getSnapshot().preview).not.toBeNull();expect(await next.save()).toBe(true);const snapshot=await repo.export('demo');expect(snapshot.records.some(r=>r.recordType==='RawRecord'&&r.mediaType==='text/csv'&&r.payload===csv)).toBe(true);expect(next.getSnapshot().reports.find(r=>r.content?.reportKey==='fictional-echo-001')?.observations.every(o=>o.deliveryMode==='file_import')).toBe(true);}finally{next.dispose();}
});
