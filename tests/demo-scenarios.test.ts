import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {compileDemoScenario,readDemoScenario,prepareScenarioStep} from '../src/shared/scenarios';
import {Repository} from '../src/shared/repositories/repository';
import {MemoryStorage} from '../src/shared/repositories/memory';
import {FixedClock} from '../src/shared/contracts/clock';
import {selectAtlasFindings} from '../src/shared/atlas';
import 'fake-indexeddb/auto';
import {IndexedDbStorage} from '../src/shared/repositories/indexeddb';
const input=(name:string)=>JSON.parse(readFileSync(`public/demos/${name}.json`,'utf8'));
const clock='2026-01-12T12:00:00Z',response={site:'confirmed' as const,acquisition:'confirmed' as const,notes:'Fictional repeat: site and acquisition checked.'};
async function setup(name:string){const repo=new Repository(new MemoryStorage(),new FixedClock(clock));await repo.restore(await compileDemoScenario(input(name)));return repo;}
test.each([['bone-change','femur_left'],['muscle-change','biceps_brachii_left']])('input-derived %s localizes only its verified reported region',async(name,region)=>{
 const repo=await setup(name),view=(await readDemoScenario(repo,'crew-a'))!;expect(view.assessment,JSON.stringify(view.assessment)).toMatchObject({severity:'warning',sustained:true,localizationSupported:true});expect(view.tasks.some(t=>t.state==='due')).toBe(true);
 const findings=selectAtlasFindings((await repo.export('demo')).records,'crew-a',clock).filter(f=>f.visible);expect(findings.map(f=>f.highlight.regionKey)).toEqual([region]);expect(await readDemoScenario(repo,'crew-b')).toBeNull();
});
test.each(['bone-uncertain','bone-single-reading','systemic-change'])('%s does not paint arbitrary anatomy',async name=>{
 const repo=await setup(name),view=(await readDemoScenario(repo,'crew-a'))!;expect(selectAtlasFindings((await repo.export('demo')).records,'crew-a',clock).filter(f=>f.visible)).toEqual([]);
 expect(view.assessment?.severity).toBe(name==='bone-uncertain'?null:name==='bone-single-reading'?'watch':'warning');
});
test('changing numeric inputs changes the computed finding; output injection is rejected',async()=>{
 const changed=input('bone-change');changed.readings[0].value=1.11;changed.readings[1].value=1.1;const repo=new Repository(new MemoryStorage(),new FixedClock(clock));await repo.restore(await compileDemoScenario(changed));expect((await readDemoScenario(repo,'crew-a'))?.assessment?.severity).toBe('info');
 changed.highlights=[{severity:'critical'}];await expect(compileDemoScenario(changed)).rejects.toHaveProperty('detail.code');
});
test('wrong-site and duplicate-time inputs cannot supply a localized warning',async()=>{
 const wrong=input('bone-change');wrong.readings[1].site='femur_right';const repo=new Repository(new MemoryStorage(),new FixedClock(clock));await repo.restore(await compileDemoScenario(wrong));expect(selectAtlasFindings((await repo.export('demo')).records,'crew-a',clock).some(f=>f.visible)).toBe(false);
 const duplicate=input('bone-change');duplicate.readings[1].timestamp=duplicate.readings[0].timestamp;await expect(compileDemoScenario(duplicate)).rejects.toHaveProperty('detail.code');
 const beforeBase=input('bone-change');beforeBase.readings[0].timestamp='2026-01-09T10:00:00Z';await expect(compileDemoScenario(beforeBase)).rejects.toHaveProperty('detail.code');
});
test('answers alone do not recover; compatible repeat completes task before two-reading recovery',async()=>{
 const repo=await setup('bone-change');const startClock=(await repo.require('demo','MissionContext','mission-demo')).scenarioClock;expect(startClock).toBe(input('bone-change').readings[1].timestamp);await repo.execute(await prepareScenarioStep(repo,'crew-a',response,false));let view=(await readDemoScenario(repo,'crew-a'))!;expect(view.assessment?.severity).toBe('warning');expect(view.state.appliedCount).toBe(2);expect((await repo.require('demo','MissionContext','mission-demo')).scenarioClock).toBe(startClock);
 const command=await prepareScenarioStep(repo,'crew-a',response,true);await repo.execute(command);await repo.execute(command);view=(await readDemoScenario(repo,'crew-a'))!;expect(view.state.appliedCount).toBe(3);expect(view.assessment).toMatchObject({severity:'warning',lifecycle:'recovering'});expect(view.tasks.some(t=>t.state==='completed')).toBe(true);
 await repo.execute(await prepareScenarioStep(repo,'crew-a',response,true));view=(await readDemoScenario(repo,'crew-a'))!;expect(view.assessment).toMatchObject({severity:'info',lifecycle:'cleared'});expect(selectAtlasFindings((await repo.export('demo')).records,'crew-a',clock).filter(f=>f.visible)).toEqual([]);
 const copy=new Repository(new MemoryStorage(),new FixedClock(clock));await copy.restore(await repo.export('demo'));expect((await readDemoScenario(copy,'crew-a'))?.state.appliedCount).toBe(4);
});

test('a report-write failure rolls back input, response, assessment and scenario clock together',async()=>{
 const storage=new IndexedDbStorage('demo-step-'+crypto.randomUUID()),repo=new Repository(storage,new FixedClock(clock));
 try{await repo.restore(await compileDemoScenario(input('bone-change')));const before=await repo.export('demo'),command=await prepareScenarioStep(repo,'crew-a',response,true);
  const fail=(_key:unknown,row:{record:{recordType:string;observationId?:string}})=>{if(row.record.recordType==='Observation')throw new DOMException('Injected report-write failure','QuotaExceededError');};
  storage.db.records.hook('creating',fail);await expect(repo.execute(command)).rejects.toHaveProperty('detail.code');expect((await repo.export('demo')).records).toEqual(before.records);
  storage.db.records.hook('creating').unsubscribe(fail);await repo.execute(command);expect((await readDemoScenario(repo,'crew-a'))?.state.appliedCount).toBe(3);expect((await repo.require('demo','MissionContext','mission-demo')).scenarioClock).toBe(input('bone-change').readings[2].timestamp);
 }finally{storage.close();await storage.db.delete();}
});

test('completed-recovery fixture retains prior warning history and a cleared atlas finding',async()=>{
 const repo=await setup('bone-recovery'),view=(await readDemoScenario(repo,'crew-a'))!;expect(view.state.appliedCount).toBe(4);expect(view.assessment?.lifecycle).toBe('cleared');expect(view.records.some(r=>r.recordType==='Assessment'&&r.ruleId==='demo-atlas-bone-v1'&&r.severity==='warning')).toBe(true);expect(view.records.some(r=>r.recordType==='AtlasHighlight'&&r.regionKey==='femur_left'&&r.status==='cleared')).toBe(true);
});
test('uncertain follow-up answers cannot upgrade measurement quality or establish recovery',async()=>{
 const repo=await setup('bone-change');await repo.execute(await prepareScenarioStep(repo,'crew-a',{site:'uncertain',acquisition:'confirmed',notes:'Site not confirmed'},true));const view=(await readDemoScenario(repo,'crew-a'))!;expect(view.assessment?.availability).toBe('insufficient_data');expect(view.assessment?.lifecycle).not.toBe('cleared');expect(view.tasks.some(t=>t.state==='completed')).toBe(false);
});
