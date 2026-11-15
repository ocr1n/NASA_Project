import {test,expect} from 'vitest';
import {createDemoRecords,createResearchRecords,failureCases,captureDemoReading,DEMO_TIME} from '../src/shared/fixtures';
import {MemoryStorage} from '../src/shared/repositories/memory';
import {Repository} from '../src/shared/repositories/repository';
import {FixedClock} from '../src/shared/contracts/clock';
import {recordTypes,validateRecord} from '../src/shared/contracts';
import {metricRegistry} from '../src/shared/metrics';
import {assessmentEligibility} from '../src/shared/rules/policy';
import {command} from './helpers';
test('full deterministic catalogue validates all records and references across all bundles',async()=>{
 const records=await createDemoRecords();expect(await createDemoRecords()).toEqual(records);
 for(const type of recordTypes)expect(records.some(r=>r.recordType===type),type).toBe(true);
 for(const r of records)expect(validateRecord(r.recordType,r).ok,r.recordType).toBe(true);
 const metrics=new Set<string>(records.filter(r=>r.recordType==='Observation'||r.recordType==='EnvironmentalObservation').map(r=>r.metric));for(const key of Object.keys(metricRegistry))expect(metrics.has(key),key).toBe(true);
 const repo=new Repository(new MemoryStorage(),new FixedClock(DEMO_TIME));await repo.execute(command(records,'fixtures'));expect(await repo.list('demo','CrewProfile')).toHaveLength(2);
 expect((await repo.list('demo','Baseline')).map(b=>b.method)).toEqual(expect.arrayContaining(['preflight_median','preflight_anchor','mission_rolling']));
 expect((await repo.list('demo','Report')).map(r=>r.type)).toEqual(expect.arrayContaining(['ecg','echo','muscle','dxa']));
});
test('separate synthetic research fixture cannot attach to personal timeline',async()=>{
 const records=await createResearchRecords();const repo=new Repository(new MemoryStorage(),new FixedClock(DEMO_TIME));await repo.execute({...command(records,'research'),namespace:'research:test-fixtures'});
 const o=records.find(r=>r.recordType==='Observation')!;expect(assessmentEligibility(o as never).availability).toBe('unsupported');
 await expect(repo.execute({...command([{...o,astronautId:'crew-a'}],'bad-research'),namespace:'research:test-fixtures'})).rejects.toMatchObject({detail:{code:'VALIDATION_FAILED'}});
});
test('failure fixtures return independently specified validation and availability outcomes',()=>{
 for(const fixture of failureCases){expect(validateRecord('Observation',fixture.observation).ok,fixture.name).toBe(fixture.expected.valid);if(fixture.expected.valid)expect(assessmentEligibility(fixture.observation as never).availability,fixture.name).toBe(fixture.expected.assessment);}
});
test('transactional demo repeat completes only the selected crew task',async()=>{
 const repo=new Repository(new MemoryStorage(),new FixedClock(DEMO_TIME));await repo.execute(command(await createDemoRecords(),'fixtures'));await captureDemoReading(repo,'crew-a','repeat-a');
 expect(await repo.read('demo','FollowUpTask','task-crew-a')).toMatchObject({state:'completed'});expect(await repo.read('demo','FollowUpTask','task-crew-b')).toMatchObject({state:'due'});
});
