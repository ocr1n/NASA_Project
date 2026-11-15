import {expect,test} from 'vitest';
import {Repository} from '../src/shared/repositories/repository';
import {MemoryStorage} from '../src/shared/repositories/memory';
import {FixedClock} from '../src/shared/contracts/clock';
import {createBaselineFixtureRecords,baselineFixtureRequest} from '../src/shared/baselines/fixtures';
import {saveBaselineCalculation} from '../src/shared/baselines';
import {selectDashboard,advanceDemoClock} from '../src/shared/view-models/dashboard';
import {at,command} from './helpers';
test('dashboard joins the selected saved reference and crew without historical fixtures entering personal points',async()=>{
 const repo=new Repository(new MemoryStorage(),new FixedClock('2026-11-15T00:00:00Z'));await repo.execute(command(await createBaselineFixtureRecords()));const saved=await saveBaselineCalculation(repo,baselineFixtureRequest('preflight_median'),'Dashboard reference');const id=saved.evidence.computation.baseline.baselineId;
 const a=await selectDashboard(repo,'crew-a','heart_rate',id);expect(a.projection.points.every(p=>p.observation.astronautId==='crew-a')).toBe(true);expect(a.projection.reference?.baseline.center).toBe(62);expect(a.historical.percentagePointDelta).toBe(-3);
 const b=await selectDashboard(repo,'crew-b','heart_rate',null);expect(b.references).toHaveLength(0);expect(b.projection.points.every(p=>p.observation.astronautId==='crew-b')).toBe(true);
 await advanceDemoClock(repo,'crew-a');expect((await repo.require('demo','MissionContext','mission-demo')).scenarioClock).toBe('2026-01-11T12:00:00.000Z');expect((await repo.list('demo','Observation')).some(o=>o.timestamp===at)).toBe(true);
});
