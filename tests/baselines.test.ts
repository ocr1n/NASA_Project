import {beforeAll,expect,test} from 'vitest';
import {assertValid,type Observation,type Observation1,type BaselineComputation,type BaselinePolicy,type CanonicalRecord} from '../src/shared/contracts';
import {canonicalJSON} from '../src/shared/contracts/identity';
import {createResearchRecords} from '../src/shared/fixtures';
import {computeBaseline,calculateBaseline,compareBaseline,demoBaselinePolicy} from '../src/shared/baselines';
import {createBaselineFixtureRecords,baselineFixtureRequest} from '../src/shared/baselines/fixtures';
import {Repository} from '../src/shared/repositories/repository';
import {MemoryStorage} from '../src/shared/repositories/memory';
import {FixedClock} from '../src/shared/contracts/clock';
import {command,at} from './helpers';
let records:CanonicalRecord[],samples:Observation1[];
const policy=():BaselinePolicy=>({...structuredClone(demoBaselinePolicy),cadenceSeconds:86400});
const fixed=()=>baselineFixtureRequest('preflight_median');
const rolling=()=>baselineFixtureRequest('mission_rolling');
const anchor=(metric:Observation['metric']='lvef')=>baselineFixtureRequest('preflight_anchor',metric);
const read=(id:string)=>structuredClone(samples.find(o=>o.observationId===id)!);
const replace=(changed:Observation1)=>samples.map(o=>o.observationId===changed.observationId?changed:o);
// Fixture edits use the generated envelope; production entry points enforce its full schema union.
const run=(input:ReadonlyArray<Observation1>=samples,request=fixed(),p=policy())=>computeBaseline(input as Observation[],request,p,at);
const compare=(current:Observation1,computed:BaselineComputation)=>compareBaseline(current as Observation,computed);
beforeAll(async()=>{records=await createBaselineFixtureRecords();samples=records.filter((r):r is Observation=>r.recordType==='Observation');});

test('truthful exam fixtures validate graph and preserve all frozen bundles/references',async()=>{
 const repo=new Repository(new MemoryStorage(),new FixedClock(at));await repo.execute(command(records,'baseline-fixtures'));
 expect(await createBaselineFixtureRecords()).toEqual(records);
 expect((await repo.list('demo','Report')).map(r=>r.type)).toEqual(expect.arrayContaining(['ecg','echo','muscle','dxa']));
 expect(await repo.read('demo','Baseline','baseline-fixed')).toMatchObject({center:62,algorithmVersion:'fixture-precomputed-1'});
 expect(await repo.read('demo','Observation','preflight-exam-lvef')).toMatchObject({timestamp:null,timePrecision:'date',originalTime:'2025-12-18',measurementContext:{missionPhase:'preflight'}});
 expect(await repo.read('demo','Observation','metric-lvef')).toMatchObject({measurementContext:{missionPhase:'inflight'}});
});
test('known preflight median and raw MAD expose n, coverage and source/raw evidence',async()=>{
 const result=await run();expect(result.baseline).toMatchObject({status:'available',center:62,spread:2,sampleCount:3,observationIds:['preflight-1','preflight-2','preflight-3']});
 expect(result.detail).toMatchObject({expectedSlots:3,occupiedSlots:3,coverage:1,operationalInterpretation:false});
 expect(result.detail.inputRecords.find(i=>i.observationId==='preflight-1')).toMatchObject({sourceId:'simulation',rawRecordId:'raw-preflight-1'});
 expect(result.detail.uncertainty).toContain('raw_mad_not_confidence_interval');
});
test('even sample median/MAD and constant zero spread are descriptive results',async()=>{
 const fourth={...read('preflight-3'),observationId:'fourth',acquisitionId:'fourth',value:66,timestamp:'2025-12-22T18:00:00Z',provenance:{...read('preflight-3').provenance,sourceRecordId:'fourth'}};
 expect((await run([...samples,fourth])).baseline).toMatchObject({center:63,spread:2,sampleCount:4});
 const constants=samples.map(o=>o.observationId.startsWith('preflight-')&&o.metric==='heart_rate'?{...o,value:62}:o);
 expect((await run(constants)).baseline).toMatchObject({center:62,spread:0});
});
test('one supported center does not fabricate spread when spread support is higher',async()=>{
 const p={...policy(),minimumSamples:2,minimumSpreadSamples:3};
 expect((await run(samples.filter(o=>o.observationId!=='preflight-3'),fixed(),p)).baseline).toMatchObject({status:'available',sampleCount:2,center:61,spread:null});
});
test.each(['lvef','lv_edv','lv_esv','ecg_qtc','muscle_thickness','bone_mineral_density'] as const)('single dated %s anchor has n=1 and no invented variability',async metric=>{
 const result=await run(samples,anchor(metric));expect(result.baseline).toMatchObject({status:'available',sampleCount:1,spread:null});
 expect(result.detail.uncertainty).toContain('single_exam_no_variability');
 if(metric==='lvef')expect(result.baseline.window).toEqual({from:null,to:null,precision:'date'});
});
test('single LVEF anchor difference is in percentage points, volumes remain mL',async()=>{
 const ef=await run(samples,anchor('lvef'));
 const current={...read('metric-lvef'),value:65};
 expect(await compare(current,ef)).toMatchObject({availability:'available',absoluteDelta:5,percentagePointDelta:5,relativeDelta:null,trend:null});
 const volume=await run(samples,anchor('lv_edv'));
 expect(await compare({...read('metric-lv_edv'),value:130},volume)).toMatchObject({availability:'available',absoluteDelta:10,percentagePointDelta:null});
});
test('date-only anchor cannot acquire an exact time/window or same-day order',async()=>{
 const req=anchor();req.window={from:'2025-12-18T00:00:00Z',to:'2025-12-19T00:00:00Z',precision:'exact'};
 expect((await run(samples,req)).baseline).toMatchObject({status:'baseline_unavailable',exclusions:expect.arrayContaining([{observationId:'preflight-exam-lvef',reason:'date_precision_cannot_enter_exact_window'}])});
 const result=await run(samples,anchor());
 expect(await compare({...read('metric-lvef'),timestamp:'2025-12-18T18:00:00Z'},result)).toMatchObject({availability:'incomparable',absoluteDelta:null});
});
test('rolling computation differs from fixed reference without changing it or retained records',async()=>{
 const before=canonicalJSON(records),reference=await run(),mission=await run(samples,rolling());
 expect(mission.baseline).toMatchObject({method:'mission_rolling',center:68,spread:1,sampleCount:3});
 expect(mission.baseline.baselineId).not.toBe(reference.baseline.baselineId);
 expect(reference.baseline.center).toBe(62);expect(canonicalJSON(records)).toBe(before);
});
test('clock changes fingerprint changed date eligibility without inventing an exam time',async()=>{
 const before=await computeBaseline(samples as Observation[],anchor(),policy(),'2025-12-18T12:00:00Z');
 const after=await run(samples,anchor());
 expect(before.baseline.status).toBe('baseline_unavailable');expect(after.baseline.status).toBe('available');
 expect(after.baseline.baselineId).not.toBe(before.baseline.baselineId);
 expect(after.baseline.window).toEqual({from:null,to:null,precision:'date'});
});
test('new unrelated in-flight arrivals do not change fixed-window result identity',async()=>{
 const added={...read('metric-heart_rate'),observationId:'new-flight',acquisitionId:'new-flight',value:75,provenance:{...read('metric-heart_rate').provenance,sourceRecordId:'new-flight'}};
 expect((await run([...samples,added])).baseline).toEqual((await run()).baseline);
});
test('window/current leakage excludes the current acquisition and any copied ID',async()=>{
 const current={...read('metric-heart_rate'),timestamp:'2026-01-09T18:00:00Z'};
 const copy={...current,observationId:'current-copy'};
 const req=rolling();req.window.to='2026-01-10T12:00:00Z';
 const result=await run([...replace(current),copy],req);
 expect(result.baseline.observationIds).toEqual(['rolling-1','rolling-2','rolling-3']);
 expect(result.detail.effectiveWindow.to).toBe('2026-01-09T18:00:00.000Z');
 expect(result.baseline.exclusions).toEqual(expect.arrayContaining([{observationId:'current-copy',reason:'current_input_or_copy'}]));
 expect(await compare(read('rolling-2'),result)).toMatchObject({availability:'incomparable',absoluteDelta:null});
});
test('rolling upper cutoff uses earliest current event time and exact half-open bounds',async()=>{
 const req=rolling();req.currentObservationIds.push('rolling-3');
 const result=await run(samples,req);
 expect(result.baseline.observationIds).toEqual(['rolling-1','rolling-2']);expect(result.baseline.status).toBe('insufficient_data');
 expect(result.detail.effectiveWindow.to).toBe('2026-01-09T12:00:00.000Z');
});
test.each(['protocolId','deviceId','posture','modality'] as const)('%s mismatch stays out of the repeated reference',async field=>{
 const bad=read('preflight-1');bad.measurementContext[field]='different';
 expect((await run(replace(bad))).baseline).toMatchObject({status:'insufficient_data',sampleCount:2});
});
test.each([['ecg_qtc','lead'],['ecg_qtc','qtcCorrection'],['lvef','view'],['lvef','method'],['muscle_thickness','laterality']] as const)('%s %s mismatch refuses an anchor difference',async(metric,field)=>{
 const result=await run(samples,anchor(metric)),current=read('metric-'+metric);
 if(field==='laterality')current.laterality='right';else current.measurementContext[field]='different';
 expect(await compare(current,result)).toMatchObject({availability:'incomparable',absoluteDelta:null});
});
test('rest/exercise and unknown required context do not silently form one series',async()=>{
 const bad=read('preflight-1');bad.context='exercise';
 expect((await run(replace(bad))).baseline.sampleCount).toBe(2);
 const selector=read('metric-heart_rate');selector.measurementContext.protocolId=null;
 expect((await run(replace(selector))).baseline).toMatchObject({status:'incomparable',center:null,reasons:expect.arrayContaining(['context_unknown:protocolId'])});
});
test('zero denominator retains absolute delta; Celsius has no misleading relative delta',async()=>{
 const zeros=samples.map(o=>o.observationId.startsWith('preflight-')&&o.metric==='heart_rate'?{...o,value:0}:o);
 const result=await run(zeros);
 expect(await compare(read('metric-heart_rate'),result)).toMatchObject({availability:'available',absoluteDelta:62,relativeDelta:null,reasons:expect.arrayContaining(['reference_zero_relative_undefined'])});
 const temp=read('metric-body_temperature'),pre={...temp,observationId:'preflight-temperature',timestamp:'2025-12-19T12:00:00Z',acquisitionId:'preflight-temperature',measurementContext:{...temp.measurementContext,missionPhase:'preflight'}};
 pre.provenance={...pre.provenance,sourceRecordId:pre.observationId};
 const req=anchor('body_temperature');req.anchorObservationId=pre.observationId;req.selectorObservationId=pre.observationId;
 expect(await compare({...temp,value:37},await run([...samples,pre],req))).toMatchObject({availability:'available',relativeDelta:null});
});
test.each(['missing','quality','flags','partial'] as const)('%s input is excluded without imputation',async kind=>{
 const bad=read('preflight-1');
 if(kind==='missing'){bad.value=null;bad.missingReason='not measured';}
 if(kind==='quality')bad.quality={score:null,method:'unknown',flags:[],lowConfidence:true};
 if(kind==='flags')bad.quality.flags=['unresolved period'];
 if(kind==='partial'){bad.timestamp=null;bad.timePrecision='date';bad.originalTime='2025-12-20';}
 const result=await run(replace(bad));expect(result.baseline).toMatchObject({status:'insufficient_data',sampleCount:2,center:null,spread:null});
 expect(result.baseline.exclusions.some(e=>e.observationId===bad.observationId)).toBe(true);
});
test('identical duplicates collapse; conflicting IDs/source/acquisition do not add support',async()=>{
 const original=read('preflight-1'),copy={...original,observationId:'copy'};
 expect((await run([...samples,original])).baseline.sampleCount).toBe(3);
 expect((await run([...samples,copy])).baseline.sampleCount).toBe(3);
 const conflict={...copy,value:90};
 expect((await run([...samples,conflict])).baseline).toMatchObject({status:'insufficient_data',sampleCount:2});
 const idConflict={...original,value:90};
 const a=await run([...samples,idConflict]),b=await run([idConflict,...samples].reverse());
 expect(a).toEqual(b);expect(a.baseline).toMatchObject({status:'invalid',center:null,reasons:expect.arrayContaining(['input_identity_conflict:preflight-1'])});
});
test('a flagged/conflicting copy cannot be hidden by quality filtering',async()=>{
 const copy={...read('preflight-1'),observationId:'bad-copy',value:90,quality:{...read('preflight-1').quality,flags:['unresolved']}};
 expect((await run([...samples,copy])).baseline.observationIds).not.toContain('preflight-1');
});
test('overlapping source/acquisition duplicates form one support component',async()=>{
 const original=read('preflight-1'),bridge={...original,observationId:'bridge',acquisitionId:'shared-acquisition'};
 const tail={...bridge,observationId:'tail',provenance:{...bridge.provenance,sourceRecordId:'tail'}};
 const result=await run([...samples,bridge,tail]);
 expect(result.baseline).toMatchObject({sampleCount:3,center:62});
 expect(await run([tail,bridge,...samples].reverse())).toEqual(result);
 expect((await run([...samples,bridge,{...tail,value:99}])).baseline).toMatchObject({sampleCount:2,status:'insufficient_data'});
});
test('current dependencies outside the window and changed cutoffs are fingerprinted',async()=>{
 const before=await run(samples,rolling());
 const current={...read('metric-heart_rate'),timestamp:'2026-01-06T12:00:00Z'};
 const after=await run(replace(current),rolling());
 expect(after.baseline.baselineId).not.toBe(before.baseline.baselineId);
 expect(after.detail.inputRecords.map(i=>i.observationId)).toContain(current.observationId);
 expect(after.baseline).toMatchObject({status:'baseline_unavailable',sampleCount:0});
});
test('unrelated out-of-window identity conflicts do not invalidate a fixed reference',async()=>{
 const flight={...read('metric-heart_rate'),observationId:'unrelated-flight',acquisitionId:'unrelated-flight',provenance:{...read('metric-heart_rate').provenance,sourceRecordId:'unrelated-flight'}};
 expect((await run([...samples,flight,{...flight,value:99}])).baseline).toEqual((await run()).baseline);
});
test('unflagged extreme values remain in descriptive evidence without a clinical outlier cutoff',async()=>{
 const extreme={...read('preflight-3'),value:10000};
 expect((await run(replace(extreme))).baseline).toMatchObject({center:62,spread:2,sampleCount:3});
});
test('future or unknown-phase current input cannot produce an available difference',async()=>{
 const result=await run();
 expect(await compare({...read('metric-heart_rate'),timestamp:'2027-01-01T00:00:00Z'},result)).toMatchObject({availability:'insufficient_data',absoluteDelta:null});
 const current=read('metric-heart_rate');current.measurementContext.missionPhase='unknown';
 expect(await compare(current,result)).toMatchObject({availability:'incomparable',absoluteDelta:null});
});
test('unknown correction ancestors quarantine descendants and stale current inputs refuse a rolling result',async()=>{
 const original=read('preflight-1'),orphan={...original,observationId:'orphan',supersedesObservationId:'absent',acquisitionId:'orphan',provenance:{...original.provenance,sourceRecordId:'orphan'}};
 const child={...orphan,observationId:'child',supersedesObservationId:'orphan',acquisitionId:'child',provenance:{...orphan.provenance,sourceRecordId:'child'}};
 expect((await run([...samples,orphan,child])).baseline.observationIds).not.toContain('child');
 const current=read('metric-heart_rate'),corrected={...current,observationId:'corrected-current',supersedesObservationId:current.observationId,acquisitionId:'corrected-current',provenance:{...current.provenance,sourceRecordId:'corrected-current'}};
 expect((await run([...samples,corrected],rolling())).baseline).toMatchObject({status:'invalid',center:null,reasons:expect.arrayContaining(['current_input_superseded:metric-heart_rate'])});
});
test('both selected crew and public-research input remain separate from personal computation',async()=>{
 const sample=read('preflight-1'),research=(await createResearchRecords()).find((r):r is Observation=>r.recordType==='Observation')!;
 assertValid('Observation',research);
 expect((await run([...samples,{...sample,observationId:'other-crew',astronautId:'crew-b'},research])).baseline).toEqual((await run()).baseline);
});
test('correction and late arrival recompute deterministic versions while preserving original output',async()=>{
 const before=await run(),original=read('preflight-1');
 const correction={...original,observationId:'corrected-1',acquisitionId:'corrected-1',value:66,supersedesObservationId:original.observationId,provenance:{...original.provenance,sourceRecordId:'corrected-1'}};
 const result=await run([...samples,correction]);expect(result.baseline).toMatchObject({center:64,sampleCount:3});
 expect(result.baseline.observationIds).toContain('corrected-1');expect(result.baseline.baselineId).not.toBe(before.baseline.baselineId);expect(before.baseline.center).toBe(62);
 const late={...original,observationId:'late',acquisitionId:'late',timestamp:'2025-12-21T18:00:00Z',receivedAt:at,value:63,provenance:{...original.provenance,sourceRecordId:'late'}};
 expect((await run([...samples,late])).baseline).toMatchObject({center:62.5,sampleCount:4});
 expect(await run([...samples,late].reverse())).toEqual(await run([...samples,late]));
});
test('correction branches/cycles and correction of current input remain excluded',async()=>{
 const original=read('preflight-1'),correction={...original,observationId:'correction-a',acquisitionId:'correction-a',supersedesObservationId:original.observationId,provenance:{...original.provenance,sourceRecordId:'correction-a'}};
 const branch={...correction,observationId:'correction-b',acquisitionId:'correction-b',provenance:{...original.provenance,sourceRecordId:'correction-b'}};
 expect((await run([...samples,correction,branch])).baseline.observationIds).not.toContain(original.observationId);
 const cycleA={...original,supersedesObservationId:'cycle'},cycleB={...correction,observationId:'cycle',supersedesObservationId:original.observationId};
 expect((await run([...replace(cycleA),cycleB])).baseline.observationIds).not.toContain(original.observationId);
 const req=fixed();req.currentObservationIds=[correction.observationId];
 expect((await run([...samples,correction],req)).baseline.observationIds).not.toContain(correction.observationId);
});
test('moving a correction outside the reference window does not resurrect its original',async()=>{
 const original=read('preflight-1'),correction={...original,observationId:'moved',timestamp:at,acquisitionId:'moved',supersedesObservationId:original.observationId,provenance:{...original.provenance,sourceRecordId:'moved'}};
 const result=await run([...samples,correction]);expect(result.baseline).toMatchObject({sampleCount:2,status:'insufficient_data'});
 expect(result.baseline.exclusions).toEqual(expect.arrayContaining([{observationId:'preflight-1',reason:'superseded_by:moved'}]));
});
test('explicit unresolved periods, gaps and recomputation remain inspectable',async()=>{
 const req=rolling();req.excludedPeriods=[{window:{from:'2026-01-08T00:00:00Z',to:'2026-01-09T00:00:00Z',precision:'exact'},reason:'unresolved authored episode'}];
 const result=await run(samples,req,{...policy(),minimumSamples:2,minimumSpreadSamples:3});
 expect(result.baseline).toMatchObject({sampleCount:2,center:68,spread:null});
 expect(result.detail).toMatchObject({coverage:2/3,expectedSlots:3,occupiedSlots:2});
 expect(result.baseline.exclusions).toEqual(expect.arrayContaining([{observationId:'rolling-2',reason:'excluded_period:unresolved authored episode'}]));
 expect((await run(samples,rolling())).baseline.baselineId).not.toBe(result.baseline.baselineId);
});
test('an explicit unresolved exclusion cannot be bypassed by a copy or correction',async()=>{
 const original=read('rolling-2'),copy={...original,observationId:'excluded-copy'};
 const request=rolling();request.exclusions=[{observationId:original.observationId,reason:'unresolved episode'}];
 const p={...policy(),minimumSamples:2,minimumSpreadSamples:3};
 expect((await run([...samples,copy],request,p)).baseline.observationIds).toEqual(['rolling-1','rolling-3']);
 const correction={...original,observationId:'excluded-correction',acquisitionId:'excluded-correction',supersedesObservationId:original.observationId,provenance:{...original.provenance,sourceRecordId:'excluded-correction'}};
 expect((await run([...samples,correction],request,p)).baseline.observationIds).toEqual(['rolling-1','rolling-3']);
 request.exclusions=[];
 expect((await run([...samples,correction],request,p)).baseline.observationIds).toContain('excluded-correction');
});
test('no cadence means explicit unknown coverage; support count is not continuous certainty',async()=>{
 const result=await run(samples,fixed(),structuredClone(demoBaselinePolicy));
 expect(result.detail).toMatchObject({coverage:null,expectedSlots:null,occupiedSlots:null});
 expect(result.detail.uncertainty).toContain('coverage_unknown_without_cadence');
});
test('crew, mission, origin and phase remain isolated',async()=>{
 const req=fixed();req.astronautId='crew-b';req.selectorObservationId='vega-heart_rate';req.currentObservationIds=['vega-heart_rate'];
 expect((await run(samples,req)).baseline).toMatchObject({status:'baseline_unavailable',sampleCount:0});
 const wrong=rolling();wrong.missionPhase='another-phase';
 expect((await run(samples,wrong)).baseline).toMatchObject({status:'invalid',center:null,reasons:expect.arrayContaining(['current_mission_phase_mismatch'])});
 const measured={...fixed(),namespace:'crew' as const,dataOrigin:'crew_measurement' as const};
 expect((await run(samples,measured)).baseline).toMatchObject({status:'unsupported',center:null,reasons:['operational_method_support_unverified']});
 const result=await run();
 expect(await compare({...read('metric-heart_rate'),missionId:'other-mission'},result)).toMatchObject({availability:'incomparable'});
});
test('one committed snapshot calculation performs no writes and detects wrong owner',async()=>{
 const repo=new Repository(new MemoryStorage(),new FixedClock(at));await repo.execute(command(records,'seed'));
 const before=await repo.export('demo'),result=await calculateBaseline(repo,fixed(),policy()),after=await repo.export('demo');
 expect(result.baseline.center).toBe(62);expect(after).toEqual(before);
 const req=fixed();req.missionId='wrong';
 await expect(calculateBaseline(repo,req)).rejects.toMatchObject({detail:{code:'REFERENCE_INVALID'}});
 let calls=0;await calculateBaseline({export:async namespace=>{calls++;return repo.export(namespace);}},fixed(),policy());expect(calls).toBe(1);
});
test('bad policy, window, unsupported time and invalid canonical input refuse computation',async()=>{
 await expect(run(samples,fixed(),{...policy(),minimumSamples:0})).rejects.toMatchObject({detail:{code:'VALIDATION_FAILED'}});
 const req=rolling();req.window.from='2026-01-12T00:00:00Z';
 await expect(run(samples,req)).rejects.toMatchObject({detail:{code:'VALIDATION_FAILED'}});
 const invalid={...read('preflight-1'),value:Number.NaN};
 await expect(run(replace(invalid))).rejects.toMatchObject({detail:{code:'VALIDATION_FAILED'}});
 const bad=read('metric-heart_rate');bad.timestamp=null;bad.timePrecision='unknown';bad.timeReason='not recorded';
 expect((await run(replace(bad),rolling())).baseline).toMatchObject({status:'invalid',center:null,reasons:expect.arrayContaining(['current_event_time_not_exact'])});
 const result=await run();assertValid('BaselineComputation',result);
});
