import {beforeAll,expect,test} from 'vitest';
import type {CanonicalRecord,Observation,TrendRequest} from '../src/shared/contracts';
import {createBaselineFixtureRecords,baselineFixtureRequest} from '../src/shared/baselines/fixtures';
import {computeBaseline,demoBaselinePolicy} from '../src/shared/baselines';
import {evaluateDemo as evaluate,prepareDemoEvaluation} from '../src/shared/rules/engine';
import {at} from './helpers';
import {command} from './helpers';
import {Repository} from '../src/shared/repositories/repository';
import {MemoryStorage} from '../src/shared/repositories/memory';
import {FixedClock} from '../src/shared/contracts/clock';
import {saveBaselineCalculation} from '../src/shared/baselines';
import {selectWorkflow,retainWorkflow} from '../src/shared/view-models/workflow';
let records:CanonicalRecord[];
beforeAll(async()=>{records=await createBaselineFixtureRecords();});
const run=(rows:CanonicalRecord[],req:TrendRequest,ref:Parameters<typeof evaluate>[2],now:string)=>evaluate(rows,{...req,referenceBaselineId:ref?.baseline.baselineId??null},ref,now);
const request:TrendRequest={protocolVersion:'trend-request/1',namespace:'demo',astronautId:'crew-a',missionId:'mission-demo',dataOrigin:'synthetic',metric:'heart_rate',missionPhase:'inflight',referenceBaselineId:null,window:{from:'2026-01-01T00:00:00Z',to:'2026-01-10T12:00:01Z',precision:'exact'},maximumGapSeconds:172800,cadenceSeconds:null};
const observations=()=>records.filter((r):r is Observation=>r.recordType==='Observation');
const fixed=()=>computeBaseline(observations(),baselineFixtureRequest('preflight_median'),structuredClone(demoBaselinePolicy),at);
function scenario(values:number[]):CanonicalRecord[]{
 const template=observations().find(o=>o.observationId==='rolling-3')!;
 const rows:CanonicalRecord[]=records.filter(r=>r.recordType!=='Observation'||r.metric!=='heart_rate'||r.measurementContext.missionPhase==='preflight');
 for(const [i,value] of values.entries()){const current:Observation=structuredClone(template);current.value=value;current.observationId='episode-'+i;current.acquisitionId='episode-'+i;current.timestamp='2026-01-10T11:'+String(i).padStart(2,'0')+':00Z';current.provenance.sourceRecordId='episode-'+i;rows.push(current);}return rows;
}
test('isolated versus sustained deviations are deterministic and never localize heart rate',async()=>{
 const ref=await fixed();const once=await run(scenario([70]),request,ref,at),twice=await run(scenario([70,71]),request,ref,at);
 expect(once.assessment.severity).toBe('watch');expect(twice.assessment).toMatchObject({severity:'warning',sustained:true,localizationSupported:false,highlightIds:[]});
 expect((await run(scenario([70,71]),request,ref,at)).assessment).toEqual(twice.assessment);expect(twice.task?.episodeId).toBe(twice.episodeId);
});
test('unknown quality, missing reference, stale inputs and another crew never produce actionable warning',async()=>{
 const ref=await fixed(),rows=scenario([70,71]);for(const r of rows)if(r.recordType==='Observation'&&r.observationId.startsWith('episode-')){r.quality.score=null;r.quality.lowConfidence=true;}
 expect((await run(rows,request,ref,at)).assessment.severity).toBeNull();expect((await run(scenario([70]),request,null,at)).assessment.availability).toBe('baseline_unavailable');
 expect((await run(scenario([70,71]),request,ref,'2026-01-15T00:00:00Z')).assessment).toMatchObject({availability:'stale',severity:null});
 const other={...request,astronautId:'crew-b'};await expect(run(scenario([70,71]),other,ref,at)).rejects.toHaveProperty('detail.code');
});
test('duplicate acquisitions cannot satisfy persistence; recovery needs two compatible observations',async()=>{
 const ref=await fixed(),rows=scenario([70,71]);const current=rows.filter((r):r is Observation=>r.recordType==='Observation'&&r.observationId.startsWith('episode-'));current[1].acquisitionId=current[0].acquisitionId;
 expect((await run(rows,request,ref,at)).assessment.severity).not.toBe('warning');
 expect((await run(scenario([70,71,63]),request,ref,at)).assessment).toMatchObject({severity:'warning',lifecycle:'recovering'});
 expect((await run(scenario([70,71,63,63]),request,ref,at)).assessment).toMatchObject({severity:'info',lifecycle:'cleared'});
 const recurrence=await run(scenario([70,71,63,63,72,73]),request,ref,at);expect(recurrence.assessment.severity).toBe('warning');expect(recurrence.episodeId).not.toBe((await run(scenario([70,71]),request,ref,at)).episodeId);
});
test('completed repeat task does not clear a sustained finding and repeated evaluation reuses its task',async()=>{
 const ref=await fixed(),rows=scenario([70,71]),first=await run(rows,request,ref,at);const task=first.task!;task.state='completed';task.completionObservationIds=['episode-1'];
 const next=await run([...rows,task],request,ref,at);expect(next.task?.taskId).toBe(task.taskId);expect(next.assessment.severity).toBe('warning');
 const command=await prepareDemoEvaluation([...rows,first.rule,first.assessment,task],{...request,referenceBaselineId:ref.baseline.baselineId},ref,at);expect(command).toBeNull();
});

test('saved-reference workflow commits canonical assessment/task records once and restores',async()=>{
 const repo=new Repository(new MemoryStorage(),new FixedClock(at));await repo.execute(command(records));
 const saved=await saveBaselineCalculation(repo,baselineFixtureRequest('preflight_median'),'Demo workflow reference');
 const baselineId=saved.evidence.computation.baseline.baselineId;
 expect((await selectWorkflow(repo,'crew-a',baselineId)).result.assessment.severity).toBe('warning');
 expect(await retainWorkflow(repo,'crew-a',baselineId)).toBe(true);expect(await retainWorkflow(repo,'crew-a',baselineId)).toBe(false);
 const copy=new Repository(new MemoryStorage(),new FixedClock(at));await copy.restore(await repo.export('demo'));expect((await selectWorkflow(copy,'crew-a',baselineId)).result.assessment.severity).toBe('warning');
});

test('a matching repeat completes its retained task even when the new reading no longer creates a finding',async()=>{
 const ref=await fixed(),first=await run(scenario([70]),request,ref,'2026-01-10T11:00:00Z');
 const next=await run([...scenario([70,63]),first.task!,first.rule,first.assessment],request,ref,'2026-01-10T11:01:00Z');
 expect(next.assessment.severity).toBe('info');expect(next.completedTasks).toHaveLength(1);expect(next.completedTasks[0]).toMatchObject({taskId:first.task!.taskId,state:'completed',completionObservationIds:['episode-1']});
});
