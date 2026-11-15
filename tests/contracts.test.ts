import { test, expect } from 'vitest';
import { validateRecord, schema } from '../src/shared/contracts';
import { metricRegistry, normalizeUnit, buildComparisonKey } from '../src/shared/metrics';
import { assessmentEligibility } from '../src/shared/rules/policy';
import { observation } from './helpers';

test('all requested contract definitions are present and runtime compiled',()=>{
  for(const name of ['CrewProfile','MissionContext','Observation','EnvironmentalObservation','MetricDefinition','SourceRecord','SourceSnapshot','RawRecord','ValidationRun','Report','ExerciseSession','ImportBatch','Baseline','ComparisonResult','ThresholdRule','Assessment','FollowUpTask','AtlasRegionManifest','AtlasHighlight','CommandEnvelope','EventEnvelope','ErrorEnvelope','ExportSnapshot']) expect(schema.$defs[name as keyof typeof schema.$defs]).toBeDefined();
  expect(Object.keys(metricRegistry)).toHaveLength(47);
});
test('numeric canonical observation passes serialized validation without mutation',()=>{
 const x=observation();const before=JSON.stringify(x);expect(validateRecord('Observation',x).ok).toBe(true);expect(JSON.stringify(x)).toBe(before);
});
test.each([
 ['wrong unit',{unit:'kg'}],['empty ID',{observationId:''}],['incompatible value variant',{valueKind:'boolean',value:true}],
 ['missing reason',{value:null}],['out of range quality',{quality:{score:2,method:'x',flags:[],lowConfidence:false}}],
 ['unmarked synthetic',{synthetic:false}],['non UTC',{timestamp:'2026-01-10T12:00:00+01:00'}],['NaN',{value:NaN}],['Infinity',{value:Infinity}],
 ['unknown metric',{metric:'made_up'}],['extra alias',{profileId:'crew-a'}]
])('rejects %s',(_,patch)=>expect(validateRecord('Observation',{...observation(),...patch}).ok).toBe(false));
test('date-only and explicit unknown quality remain valid but cannot assess',()=>{
 const x={...observation(),timestamp:null,timePrecision:'date',originalTime:'2026-01-10',quality:{score:null,method:'unknown',flags:[],lowConfidence:true}};
 expect(validateRecord('Observation',x).ok).toBe(true);
 expect(assessmentEligibility(x as never).availability).toBe('insufficient_data');
 expect(validateRecord('Observation',{...x,originalTime:'2026-02-30'}).ok).toBe(false);
});
test('missing measurement is explicit and zero is a value',()=>{
 expect(validateRecord('Observation',{...observation(),value:null,missingReason:'device unavailable'}).ok).toBe(true);
 expect(validateRecord('Observation',{...observation(),value:0}).ok).toBe(true);
});
test('metric-specific SI conversion and incompatible quantity rejection',()=>{
 expect(normalizeUnit('body_mass',1000,'g')).toMatchObject({ok:true,value:1,unit:'kg'});
 expect(normalizeUnit('sleep_duration',90,'min')).toMatchObject({ok:true,value:1.5,unit:'h'});
 expect(normalizeUnit('radiation_dose',1,'Gy')).toMatchObject({ok:false,code:'UNSUPPORTED_UNIT'});
 expect(normalizeUnit('blood_glucose',5,'mmol/L')).toMatchObject({ok:false,code:'UNSUPPORTED_UNIT'});
});
test('unknown context yields incomparable and modality changes comparison key',()=>{
 const a=observation();const b={...a,measurementContext:{...a.measurementContext,modality:'ppg'}};
 expect(buildComparisonKey(a as never).key).not.toBe(buildComparisonKey(b as never).key);
 expect(buildComparisonKey({...a,context:'unknown'} as never)).toMatchObject({availability:'incomparable',key:null});
});
test.each(['bp_systolic','lvef','exercise_duration'])('exam linkage does not split comparable %s measurements',metric=>{
 const a={...observation(),metric,unit:metricRegistry[metric].canonicalUnit,acquisitionId:'exam-1',reportId:'report-1',sessionId:'session-1',measurementContext:{...observation().measurementContext,view:'apical',activity:'cycle',acquisitionId:'exam-1',reportId:'report-1',sessionId:'session-1'}};
 const b={...a,acquisitionId:'exam-2',reportId:'report-2',sessionId:'session-2',measurementContext:{...a.measurementContext,acquisitionId:'exam-2',reportId:'report-2',sessionId:'session-2'}};
 expect(buildComparisonKey(a as never).availability).toBe('available');
 expect(buildComparisonKey(a as never).key).toBe(buildComparisonKey(b as never).key);
});
test('matching rest protocol can compare across preflight and mission phases without losing phase metadata',()=>{
 const a=observation();const b={...a,measurementContext:{...a.measurementContext,missionPhase:'preflight'}};
 expect(buildComparisonKey(a as never).key).toBe(buildComparisonKey(b as never).key);
});
