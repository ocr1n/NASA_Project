import {expect,test} from 'vitest';
import {compareHistoricalCohorts} from '../src/shared/trends/historical';
import {historicalDemoCohorts} from '../src/shared/trends/fixtures';

test('older compatible synthetic cohorts remain usable with explicit era/date/n/source limits',async()=>{
 const {older,newer}=await historicalDemoCohorts();const c=compareHistoricalCohorts(older,newer);
 expect(c).toMatchObject({availability:'available',absoluteDelta:-3,percentagePointDelta:-3,operationalInterpretation:false});
 expect(c.relativeDelta).toBeCloseTo(-3/61,12);expect(c.left?.date).toBe('1974-01-01');expect(c.left?.sampleSize).toBe(4);
 expect(c.limitations.join(' ')).toContain('Authored');expect(c).not.toHaveProperty('astronautId');
});

test.each(['population','species','protocolId','deviceId','modality','assay','missionDurationDays','statistic'] as const)('incompatible %s yields a reason and no number',async field=>{
 const {older,newer}=await historicalDemoCohorts();const different={...newer,[field]:field==='missionDurationDays'?99:field==='statistic'?'median':'different'};
 const c=compareHistoricalCohorts(older,different);expect(c.availability).toBe('incomparable');expect(c.absoluteDelta).toBeNull();expect(c.reasons.join(' ')).toContain(field);
});

test('unknown acquisition context and unnormalized units cannot become a comparison',async()=>{
 const {older,newer}=await historicalDemoCohorts();
 expect(compareHistoricalCohorts(older,{...newer,deviceId:null}).availability).toBe('incomparable');
 const units=compareHistoricalCohorts(older,{...newer,unit:'mL'});expect(units.availability).toBe('incomparable');expect(units.percentagePointDelta).toBeNull();
});

test('missing or unadmitted real files return an unavailable typed path, never invented cohort numbers',async()=>{
 expect(compareHistoricalCohorts(null,null)).toMatchObject({availability:'baseline_unavailable',absoluteDelta:null,relativeDelta:null});
 const {older,newer}=await historicalDemoCohorts();const c=compareHistoricalCohorts({...older,dataOrigin:'public_research',admission:'research_sandbox'},newer);
 expect(c.availability).toBe('unsupported');expect(c.reasons).toContain('real_historical_pair_not_audited_or_admitted');expect(c.absoluteDelta).toBeNull();
});

test('nonpositive historical denominator and self-comparison have explicit unavailable relative/context states',async()=>{
 const {older,newer}=await historicalDemoCohorts();const c=compareHistoricalCohorts({...older,value:0},newer);
 expect(c.absoluteDelta).toBe(58);expect(c.relativeDelta).toBeNull();expect(c.reasons).toContain('relative_reference_not_positive');
 expect(compareHistoricalCohorts(older,older).availability).toBe('incomparable');
});

test.each(['unknown','   '])('matching unresolved historical device context %j stays incomparable',async deviceId=>{
 const {older,newer}=await historicalDemoCohorts();const result=compareHistoricalCohorts({...older,deviceId},{...newer,deviceId});
 expect(result.availability).toBe('incomparable');expect(result.absoluteDelta).toBeNull();
});
