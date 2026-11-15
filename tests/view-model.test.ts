import {test,expect} from 'vitest';
import {SelectedCrewStore} from '../src/shared/view-models';
import {Repository} from '../src/shared/repositories/repository';
import {MemoryStorage} from '../src/shared/repositories/memory';
import {FixedClock} from '../src/shared/contracts/clock';
import {createDemoRecords,DEMO_TIME} from '../src/shared/fixtures';
import {command} from './helpers';
test('switching crew immediately clears panels, region and camera intent with immutable snapshots',async()=>{
 const repo=new Repository(new MemoryStorage(),new FixedClock(DEMO_TIME));await repo.execute(command(await createDemoRecords()));const store=new SelectedCrewStore(repo,'demo');await store.selectCrew('crew-a');store.selectRegion('muscle_left');
 const before=store.getSnapshot();expect(store.getSnapshot()).toBe(before);expect(Object.isFrozen(before.observations)).toBe(true);
 const switching=store.selectCrew('crew-b');expect(store.getSnapshot().observations).toHaveLength(0);expect(store.getSnapshot().selectedRegion).toBeNull();expect(store.getSnapshot().cameraFocus).toBeNull();await switching;
 expect(store.getSnapshot().observations.every(o=>o.astronautId==='crew-b')).toBe(true);expect(store.getSnapshot().tasks.every(t=>t.astronautId==='crew-b')).toBe(true);store.dispose();
});
test('late refresh cannot replace a newer selected crew',async()=>{
 const repo=new Repository(new MemoryStorage(),new FixedClock(DEMO_TIME));await repo.execute(command(await createDemoRecords()));let release:()=>void=()=>{};
 const original=repo.list.bind(repo);repo.list=async (...args:any[])=>{if(args[1]==='Observation'){const result=await original(args[0],args[1]);if(result.some((x:any)=>x.astronautId==='crew-a'))await new Promise<void>(r=>{release=r;});return result as never;}return original(args[0],args[1]) as never;};
 const store=new SelectedCrewStore(repo,'demo');const first=store.selectCrew('crew-a');await new Promise(r=>setTimeout(r,10));repo.list=original;await store.selectCrew('crew-b');release();await first;
 expect(store.getSnapshot().crew?.astronautId).toBe('crew-b');expect(store.getSnapshot().observations.every(o=>o.astronautId==='crew-b')).toBe(true);store.dispose();
});
