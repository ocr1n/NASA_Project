import {beforeAll,expect,test} from 'vitest';
import {assertValid,type CanonicalRecord,type Observation,type FollowUpTask} from '../src/shared/contracts';
import {computeBaseline,demoBaselinePolicy,compareBaseline,saveBaselineCalculation} from '../src/shared/baselines';
import {baselineFixtureRequest,createBaselineFixtureRecords} from '../src/shared/baselines/fixtures';
import {FixedClock} from '../src/shared/contracts/clock';
import {Repository} from '../src/shared/repositories/repository';
import {MemoryStorage} from '../src/shared/repositories/memory';
import {comparePersonal} from '../src/shared/trends/personal';
import {projectPersonalTrend} from '../src/shared/trends/projection';
import {selectPersonalTrend} from '../src/shared/view-models/trends';
import {at,command} from './helpers';

let records:CanonicalRecord[];
beforeAll(async()=>{records=await createBaselineFixtureRecords();});
const observations=(rows=records)=>rows.filter((r):r is Observation=>r.recordType==='Observation');
const sample=(id:string)=>{const value:unknown=structuredClone(observations().find(o=>o.observationId===id)!);assertValid<Observation>('Observation',value);return value;};
const fixed=()=>computeBaseline(observations(),baselineFixtureRequest('preflight_median'),structuredClone(demoBaselinePolicy),at);
const request=(baselineId:string|null=null)=>({protocolVersion:'trend-request/1' as const,namespace:'demo' as const,astronautId:'crew-a',missionId:'mission-demo',dataOrigin:'synthetic' as const,metric:'heart_rate' as const,missionPhase:'inflight',referenceBaselineId:baselineId,window:{from:'2026-01-07T00:00:00Z',to:'2026-01-11T00:00:00Z',precision:'exact' as const},maximumGapSeconds:172800,cadenceSeconds:null});

test('LVEF comparison retains -3 percentage points and explicit -3/61 relative fraction without changing module 06 callers',async()=>{
 const anchor=sample('preflight-exam-lvef'),current=sample('metric-lvef');anchor.value=61;current.value=58;
 const computed=await computeBaseline([anchor,current],baselineFixtureRequest('preflight_anchor','lvef'),structuredClone(demoBaselinePolicy),at);
 const result=await comparePersonal(current,computed);
 expect(result.comparison).toMatchObject({availability:'available',absoluteDelta:-3,percentagePointDelta:-3});
 expect(result.comparison.relativeDelta).toBeCloseTo(-3/61,12);expect(result.coverage).toBeNull();
 expect((await compareBaseline(current,computed)).relativeDelta).toBeNull();
});

test.each([0,-1])('nonpositive denominator %s retains a finite difference and an unavailable relative result',async center=>{
 const anchor=sample('preflight-exam-lvef'),current=sample('metric-lvef');anchor.value=center;current.value=58;
 const b=await computeBaseline([anchor,current],baselineFixtureRequest('preflight_anchor','lvef'),structuredClone(demoBaselinePolicy),at);
 const result=await comparePersonal(current,b);expect(result.comparison.absoluteDelta).toBe(58-center);expect(result.comparison.relativeDelta).toBeNull();
 expect(result.comparison.reasons).toContain('relative_reference_not_positive');
});

test('comparison rejects another crew and preserves baseline-unavailable evidence',async()=>{
 const b=await fixed();expect((await comparePersonal(sample('vega-heart_rate'),b)).comparison.availability).toBe('incomparable');
 const unavailable=await comparePersonal(sample('metric-heart_rate'),null);expect(unavailable.comparison).toMatchObject({availability:'baseline_unavailable',absoluteDelta:null});
});

test('observed points have a hand-computable slope and nullable coverage, without joining another protocol',async()=>{
 const b=await fixed(),r=request(b.baseline.baselineId);r.window.to='2026-01-10T00:00:00Z';
 const p=await projectPersonalTrend(records,r,b);
 expect(p.series).toHaveLength(1);expect(p.series[0]).toMatchObject({sampleCount:3,slopePerDay:1,coverage:null});
 expect(p.points.filter(p=>p.availability==='available').map(p=>p.observation.value)).toEqual([67,68,69]);
 expect(p.points.every(p=>p.observation.astronautId==='crew-a')).toBe(true);
});

test('explicit gaps and missing observations break segments; no gap policy disconnects every point',async()=>{
 const missing=sample('rolling-2');missing.value=null;missing.missingReason='Not recorded';
 const rows=records.map(r=>r.recordType==='Observation'&&r.observationId===missing.observationId?missing:r);
 const p=await projectPersonalTrend(rows,request(),null);
 expect(p.points.find(p=>p.observation.observationId==='rolling-2')).toMatchObject({availability:'insufficient_data',segment:null});
 expect(new Set(p.points.filter(p=>p.segment!==null).map(p=>p.segment)).size).toBeGreaterThan(1);
 const disconnected=await projectPersonalTrend(records,{...request(),maximumGapSeconds:null},null);
 const valid=disconnected.points.filter(p=>p.availability==='available');expect(new Set(valid.map(p=>p.segment)).size).toBe(valid.length);
});

test('different protocols remain separate series and public research never enters selected crew projection',async()=>{
 const changed=sample('rolling-2');changed.measurementContext.protocolId='another-protocol';
 const rows=records.map(r=>r.recordType==='Observation'&&r.observationId===changed.observationId?changed:r);
 const p=await projectPersonalTrend(rows,request(),null);expect(p.series).toHaveLength(2);
 expect(p.series.find(s=>s.sampleCount===1)?.slopePerDay).toBeNull();
 await expect(projectPersonalTrend(rows,{...request(),namespace:'research:ptb'} as never,null)).rejects.toHaveProperty('detail.code');
});

test('source/acquisition copies count once and conflicting copies are quarantined',async()=>{
 const copy=sample('rolling-1');copy.observationId='copy';
 const p=await projectPersonalTrend([...records,copy],request(),null);
 expect(p.points.filter(p=>p.availability==='available')).toHaveLength(4);
 expect(p.points.find(p=>p.observation.observationId==='rolling-1')?.reasons.join(' ')).toContain('duplicate');
 const conflict=structuredClone(copy);conflict.observationId='conflicting-copy';conflict.value=999;
 const bad=await projectPersonalTrend([...records,copy,conflict],request(),null);
 expect(bad.points.filter(p=>['copy','rolling-1','conflicting-copy'].includes(p.observation.observationId)).every(p=>p.availability==='invalid')).toBe(true);
});

test('correction leaves replace originals, while invalid/forked chains remain excluded',async()=>{
 const corrected=sample('rolling-2');corrected.observationId='corrected';corrected.supersedesObservationId='rolling-2';corrected.value=70;corrected.provenance.sourceRecordId='corrected';
 const p=await projectPersonalTrend([...records,corrected],request(),null);
 expect(p.points.find(p=>p.observation.observationId==='rolling-2')?.availability).toBe('invalid');
 expect(p.points.find(p=>p.observation.observationId==='corrected')?.availability).toBe('available');
 const fork=structuredClone(corrected);fork.observationId='fork';fork.value=80;fork.provenance.sourceRecordId='fork';
 const bad=await projectPersonalTrend([...records,corrected,fork],request(),null);
 expect(bad.points.filter(p=>['corrected','fork'].includes(p.observation.observationId)).every(p=>p.availability==='invalid')).toBe(true);
});

test('report/session and repeat markers use canonical links only',async()=>{
 const task=structuredClone(records.find(r=>r.recordType==='FollowUpTask'&&r.astronautId==='crew-a')) as FollowUpTask;task.state='completed';task.completionObservationIds=['rolling-2'];
 const rows=records.map(r=>r.recordType==='FollowUpTask'&&r.taskId===task.taskId?task:r);
 const p=await projectPersonalTrend(rows,request(),null);
 expect(p.points.find(p=>p.observation.observationId==='rolling-2')?.repeatTaskIds).toEqual([task.taskId]);
 expect(p.points.find(p=>p.observation.observationId==='rolling-3')?.repeatTaskIds).toEqual([]);
});

test('repository selector resolves explicit immutable reference evidence and never substitutes another ID',async()=>{
 const repo=new Repository(new MemoryStorage(),new FixedClock(at));await repo.execute(command(records));
 const saved=await saveBaselineCalculation(repo,baselineFixtureRequest('preflight_median'),'Explicit trend reference');
 const p=await selectPersonalTrend(repo,request(saved.evidence.computation.baseline.baselineId));
 expect(p.reference?.baseline.baselineId).toBe(saved.evidence.computation.baseline.baselineId);
 const absent=await selectPersonalTrend(repo,request('missing-reference'));expect(absent.reference).toBeNull();expect(absent.reasons).toContain('reference_not_retained');
});

test('protocol transitions and unknown-context samples break a resumed acquisition line',async()=>{
 const changed=sample('rolling-2');changed.measurementContext.protocolId='another-protocol';
 for(const protocolId of ['another-protocol',null]){
  changed.measurementContext.protocolId=protocolId;
  const rows=records.map(r=>r.recordType==='Observation'&&r.observationId===changed.observationId?structuredClone(changed):r);
  const p=await projectPersonalTrend(rows,{...request(),maximumGapSeconds:864000},null);
  expect(p.points.find(p=>p.observation.observationId==='rolling-1')?.segment).not.toBe(p.points.find(p=>p.observation.observationId==='rolling-3')?.segment);
 }
});

test('same-time points have no invented slope and remain disconnected acquisitions',async()=>{
 const rows=records.filter(r=>r.recordType!=='Observation'||r.metric!=='heart_rate'||r.measurementContext.missionPhase!=='inflight');
 for(const id of ['rolling-1','rolling-2']){const o=sample(id);o.timestamp='2026-01-08T12:00:00Z';rows.push(o);}
 const p=await projectPersonalTrend(rows,request(),null);expect(p.series[0]).toMatchObject({sampleCount:2,slopePerDay:null});
 expect(p.points[0].segment).not.toBe(p.points[1].segment);
});

test('unit boundaries and affine references stay explicit rather than converting or dividing blindly',async()=>{
 const wrong=sample('rolling-2');Object.assign(wrong,{unit:'bpm'}); // Deliberately untyped input must fail the canonical boundary.
 await expect(projectPersonalTrend(records.map(r=>r.recordType==='Observation'&&r.observationId===wrong.observationId?wrong:r),request(),null)).rejects.toMatchObject({detail:{code:'VALIDATION_FAILED'}});
 const anchor=sample('metric-body_temperature'),current=structuredClone(anchor);anchor.observationId='temp-anchor';anchor.acquisitionId='temp-anchor';anchor.provenance.sourceRecordId='temp-anchor';anchor.timestamp='2025-12-19T12:00:00Z';anchor.measurementContext.missionPhase='preflight';current.value=38;
 const req=baselineFixtureRequest('preflight_anchor','body_temperature');req.anchorObservationId=anchor.observationId;req.selectorObservationId=current.observationId;req.currentObservationIds=[current.observationId];
 const b=await computeBaseline([anchor,current],req,structuredClone(demoBaselinePolicy),at),c=await comparePersonal(current,b);
 expect(c.comparison.relativeDelta).toBeNull();expect(c.comparison.reasons).toContain('relative_affine_unit_undefined');
});

test('a conflicting correction ancestor quarantines its descendants and cannot influence the slope',async()=>{
 const conflict=sample('rolling-2');conflict.value=999;
 const child=sample('rolling-2');child.observationId='conflicted-child';child.supersedesObservationId='rolling-2';child.provenance.sourceRecordId='conflicted-child';child.value=700;
 const p=await projectPersonalTrend([...records,conflict,child],request(),null);
 expect(p.points.find(p=>p.observation.observationId===child.observationId)?.availability).toBe('invalid');
 expect(p.series[0].sampleCount).toBe(3);
});

test('an excluded or superseded trend point cannot carry an available nested comparison',async()=>{
 const child=sample('rolling-2');child.observationId='valid-child';child.supersedesObservationId='rolling-2';child.provenance.sourceRecordId='valid-child';child.value=70;
 const b=await fixed(),p=await projectPersonalTrend([...records,child],request(b.baseline.baselineId),b);
 const old=p.points.find(p=>p.observation.observationId==='rolling-2');expect(old?.availability).toBe('invalid');expect(old?.comparison).toBeNull();
});

test('unknown acquisition identity cannot contribute independent trend support',async()=>{
 const unknown=sample('rolling-2');unknown.acquisitionId=null;
 const p=await projectPersonalTrend(records.map(r=>r.recordType==='Observation'&&r.observationId===unknown.observationId?unknown:r),request(),null);
 expect(p.points.find(p=>p.observation.observationId==='rolling-2')?.availability).toBe('insufficient_data');
 expect(p.series[0].sampleCount).toBe(3);
});

test('an unpositionable event disconnects every potentially affected series without assigning it a time',async()=>{
 const unknown=sample('rolling-2');Object.assign(unknown,{timestamp:null,originalTime:null,timePrecision:'unknown',timeReason:'Measurement time not supplied'});
 const p=await projectPersonalTrend(records.map(r=>r.recordType==='Observation'&&r.observationId===unknown.observationId?unknown:r),{...request(),maximumGapSeconds:864000},null);
 const valid=p.points.filter(p=>p.availability==='available');expect(new Set(valid.map(p=>p.segment)).size).toBe(valid.length);
 expect(p.points.find(p=>p.observation.observationId==='rolling-2')?.observation.timestamp).toBeNull();
});

test('exact event ordering uses instants across fractional and whole-second UTC representations',async()=>{
 const rows=records.filter(r=>r.recordType!=='Observation'||r.metric!=='heart_rate'||r.measurementContext.missionPhase!=='inflight');
 const first=sample('rolling-1'),second=sample('rolling-2');first.timestamp='2026-01-08T12:00:00Z';second.timestamp='2026-01-08T12:00:00.500Z';rows.push(first,second);
 const p=await projectPersonalTrend(rows,request(),null);expect(p.points.map(p=>p.observation.observationId)).toEqual(['rolling-1','rolling-2']);
 expect(p.points[0].segment).toBe(p.points[1].segment);
});

test('calendar-only rows have deterministic display ordering without claiming an exact event time',async()=>{
 const rest=records.filter(r=>r.recordType!=='Observation'||r.metric!=='heart_rate'||r.measurementContext.missionPhase!=='inflight');
 const partial=sample('rolling-1'),first=sample('rolling-2'),second=sample('rolling-3');
 Object.assign(partial,{observationId:'b-date',acquisitionId:'b-date',timestamp:null,originalTime:'2026-01-08',timePrecision:'date',timeReason:'Calendar date supplied'});partial.provenance.sourceRecordId='b-date';
 Object.assign(first,{observationId:'a-first',acquisitionId:'a-first',timestamp:'2026-01-08T12:00:00Z'});first.provenance.sourceRecordId='a-first';
 Object.assign(second,{observationId:'c-second',acquisitionId:'c-second',timestamp:'2026-01-08T12:00:00.500Z'});second.provenance.sourceRecordId='c-second';
 for(const order of [[partial,first,second],[second,partial,first],[first,second,partial]]){
  const p=await projectPersonalTrend([...rest,...order],request(),null);
  expect(p.points.map(p=>p.observation.observationId)).toEqual(['b-date','a-first','c-second']);
  expect(p.points[0].observation.timestamp).toBeNull();
 }
});
