import 'fake-indexeddb/auto';
import {afterEach,expect,test} from 'vitest';
import {measurementBundles,measurementScales} from '../src/shared/metrics/bundles';
import {metricRegistry,normalizeUnit,buildComparisonKey} from '../src/shared/metrics';
import {MEASUREMENT_PIPELINE,validateMeasurementAcquisitions} from '../src/shared/metrics/measurement-context';
import evidence from '../src/shared/metrics/measurement-evidence.json';
import {Repository} from '../src/shared/repositories/repository';
import {MemoryStorage} from '../src/shared/repositories/memory';
import {IndexedDbStorage} from '../src/shared/repositories/indexeddb';
import {FixedClock} from '../src/shared/contracts/clock';
import {createDemoRecords,DEMO_TIME} from '../src/shared/fixtures';
import {prepareCapture,type CaptureInput,type NumericCaptureValue} from '../src/shared/capture';
import {validateRecord,type Observation} from '../src/shared/contracts';
import {assessmentEligibility} from '../src/shared/rules/policy';
import {command} from './helpers';

const quality={score:0.9,method:'Fictional quality parameter',flags:['demo_only'],lowConfidence:false};
const mc={modality:'report',deviceId:'fictional-device',protocolId:'fictional-protocol',method:'fictional_report',posture:'seated'};
const value=(metric:NumericCaptureValue['metric'],input:string,unit=metricRegistry[metric].canonicalUnit!):NumericCaptureValue=>({metric,input,unit,missingReason:null,context:'rest',measurementContext:{...mc},quality});
const capture=(values:NumericCaptureValue[],operationId='bundle-capture'):CaptureInput=>({namespace:'demo',astronautId:'crew-a',sourceId:'simulation',operationId,receivedAt:DEMO_TIME,deliveryMode:'manual',time:{precision:'exact',text:'2026-01-10T11:00:00Z',reason:''},notes:'Fictional acceptance only',values});
const databases:IndexedDbStorage[]=[];
afterEach(async()=>{for(const storage of databases.splice(0))await storage.db.delete();});
async function setup(indexed=false){const storage=indexed?new IndexedDbStorage(`module03-${crypto.randomUUID()}`):new MemoryStorage();if(storage instanceof IndexedDbStorage)databases.push(storage);const repo=new Repository(storage,new FixedClock(DEMO_TIME));await repo.execute(command(await createDemoRecords()));return repo;}
const bpValues=()=>[value('bp_systolic','118'),value('bp_diastolic','76')].map(v=>({...v,acquisitionId:'declared-bp-pair'}));

test('all selected fields have purpose, source, collection method, shared units, timing and missing path',()=>{
 expect(measurementBundles.map(b=>b.id)).toEqual(['daily','cardiac','exercise','additional']);
 const fields=measurementBundles.flatMap(b=>b.fields);
 for(const metric of ['heart_rate','sleep_duration','fatigue_rating','ecg_qrs','lvef','lv_edv','exercise_duration','perceived_exertion','exercise_mean_hr','exercise_peak_hr','cycling_power','bp_systolic','bp_diastolic','spo2','blood_glucose','body_mass','body_height','bone_mineral_density','vo2_relative','vo2max_relative','vo2_absolute','respiratory_rate','body_temperature','mood_rating','stress_rating'])expect(fields.some(f=>f.metric===metric)).toBe(true);
 for(const f of fields){expect([f.purpose,f.sourcePath,f.timing,f.missingPath].every(Boolean)).toBe(true);expect(f.references.length).toBeGreaterThan(0);expect(f.collectionMethods.length).toBeGreaterThan(0);expect(f.inputUnits).toEqual(metricRegistry[f.metric].allowedInputUnits);expect(f.definitionStatus).toBe('pending');}
});

test.each([['daily','heart_rate'],['cardiac','ecg_qrs'],['exercise','exercise_mean_hr'],['additional','blood_glucose']] as const)('%s has a valid and explicitly missing example with provenance/context',async(bundle,metric)=>{
 const records=await createDemoRecords(),o=records.find((r):r is Observation=>r.recordType==='Observation'&&r.metric===metric)!;
 expect(measurementBundles.find(b=>b.id===bundle)!.fields.some(f=>f.metric===metric)).toBe(true);expect(validateRecord('Observation',o).ok).toBe(true);expect(assessmentEligibility(o).availability).toBe('available');
 expect(o.source.tier).toBe('simulation');expect(o.measurementContext.method).toBeTruthy();expect(o.provenance.rawRecordId).toBeTruthy();
 const missing={...o,value:null,missingReason:'Device/report unavailable',quality:{...quality,score:null,lowConfidence:true}};
 expect(validateRecord('Observation',missing).ok).toBe(true);expect(assessmentEligibility(missing).availability).toBe('insufficient_data');expect(missing.value).toBeNull();
});

test.each([false,true])('paired BP commits together and failure stays atomic (IndexedDB=%s)',async(indexed)=>{
 const repo=await setup(indexed),x=capture(bpValues());const before=(await repo.list('demo','Observation')).length;
 await repo.execute(await prepareCapture(repo,x));const pair=(await repo.list('demo','Observation')).filter(o=>o.acquisitionId==='declared-bp-pair');expect(pair).toHaveLength(2);expect(new Set(pair.map(o=>o.acquisitionId)).size).toBe(1);expect((await repo.list('demo','Observation')).length).toBe(before+2);
 const changed=bpValues();changed[1].measurementContext.posture='standing';const snapshot=await repo.export('demo');await expect(prepareCapture(repo,capture(changed,'bad-pair'))).rejects.toThrow('mismatched');expect((await repo.export('demo')).records).toEqual(snapshot.records);
});

test.each(['one_component','different_acquisition','different_device','unknown_posture','different_time','one_missing'])('BP %s is refused before commit',async(kind)=>{
 const repo=await setup(),v=bpValues();
 if(kind==='one_component')v.pop();if(kind==='different_acquisition')v[1].acquisitionId='other-pair';if(kind==='different_device')v[1].measurementContext.deviceId='other-device';if(kind==='unknown_posture')v[1].measurementContext.posture='unknown';
 const x=capture(v);if(kind==='different_time')v[1].time={precision:'exact',text:'2026-01-10T10:00:00Z',reason:''};if(kind==='one_missing'){v[1].input='';v[1].missingReason='Device failure';}
 await expect(prepareCapture(repo,x)).rejects.toThrow();expect((await repo.list('demo','Observation')).some(o=>o.observationId.startsWith('checkin-'))).toBe(false);
});

test.each([false,true])('direct repository commands cannot bypass new acquisition checks (IndexedDB=%s)',async(indexed)=>{
 const repo=await setup(indexed),c=await prepareCapture(repo,capture(bpValues()));const o=c.payload.records.find((r):r is Observation=>r.recordType==='Observation'&&r.metric==='bp_diastolic')!;o.measurementContext.deviceId='other-device';
 const before=await repo.export('demo');await expect(repo.execute(c)).rejects.toThrow('mismatched');expect((await repo.export('demo')).records).toEqual(before.records);
});

test('paired BP accepts equivalent reported offsets without inventing date precision',async()=>{
 const repo=await setup(),v=bpValues();v[1].time={precision:'exact',text:'2026-01-10T16:00:00+05:00',reason:''};await repo.execute(await prepareCapture(repo,capture(v)));
 const pair=(await repo.list('demo','Observation')).filter(o=>o.acquisitionId==='declared-bp-pair');expect(pair[0].timestamp).toBe(pair[1].timestamp);expect(new Set(pair.map(o=>o.originalTime)).size).toBe(2);
});

test.each(['publicSubjectId','datasetId','namespace'] as const)('BP cannot pair across public research %s with null crew IDs',async(field)=>{
 const repo=await setup(),c=await prepareCapture(repo,capture(bpValues()));
 const pair=c.payload.records.filter((r):r is Observation=>r.recordType==='Observation').map(o=>({...o,namespace:'research:fictional-acquisition',astronautId:null,missionId:null,publicSubjectId:'fictional-public-a',datasetId:'fictional-acquisition',dataOrigin:'public_research' as const,synthetic:false}));
 expect(()=>validateMeasurementAcquisitions(pair)).not.toThrow();pair[1][field]='different-owner';
 expect(()=>validateMeasurementAcquisitions(pair)).toThrow('both BP values');
});

test.each([false,true])('declared acquisition must match retained raw identity (IndexedDB=%s)',async(indexed)=>{
 const repo=await setup(indexed),c=await prepareCapture(repo,capture(bpValues()));
 const raw=c.payload.records.find(r=>r.recordType==='RawRecord')!;if(raw.recordType!=='RawRecord')throw Error('Missing raw record');raw.acquisitionId='other-acquisition';
 const before=await repo.export('demo');await expect(repo.execute(c)).rejects.toThrow('retained raw acquisition');expect((await repo.export('demo')).records).toEqual(before.records);
});

test('missing BP remains missing with reported date precision and device failure',async()=>{
 const repo=await setup(),v=bpValues();for(const x of v){x.input='';x.missingReason='Device failure';x.measurementContext={};}
 const x=capture(v);x.time={precision:'date',text:'2026-01-10',reason:'Report date only'};await repo.execute(await prepareCapture(repo,x));
 for(const o of (await repo.list('demo','Observation')).filter(o=>o.observationId.startsWith('checkin-'))){expect(o.value).toBeNull();expect(o.timestamp).toBeNull();expect(o.timePrecision).toBe('date');expect(o.missingReason).toBe('Device failure');}
});

test('glucose factor agrees with laboratory and metrology precision and is analyte gated',()=>{
 const g=evidence.glucoseConversion;
 expect(g.factor).toBe(18.02);expect(Number((g.sources[1].molecularWeight!/10).toFixed(g.factorDecimalPlaces))).toBe(g.factor);expect(Number((1/g.sources[2].inverseFactor!).toFixed(g.factorDecimalPlaces))).toBe(g.factor);
 expect(normalizeUnit('blood_glucose',5,'mmol/L',{analyte:'glucose'})).toMatchObject({ok:true,value:90.1,unit:'mg/dL'});expect(normalizeUnit('blood_glucose',5,'mmol/L',{analyte:'lactate'}).ok).toBe(false);expect(normalizeUnit('blood_glucose',5,'mmol/L').ok).toBe(false);
});

test('glucose keeps original units/analyte/meal method and rejects missing or wrong context',async()=>{
 const repo=await setup(),v=value('blood_glucose','5','mmol/L');v.measurementParameters={analyte:'glucose'};v.measurementContext.mealContext='reported fasting';await repo.execute(await prepareCapture(repo,capture([v])));
 const o=(await repo.list('demo','Observation')).find(o=>o.observationId.startsWith('checkin-'))!;expect(o.value).toBeCloseTo(90.1);expect(o.provenance.originalValue).toBe(5);expect(o.provenance.originalUnit).toBe('mmol/L');expect(o.provenance.parameters.analyte).toBe('glucose');expect(o.measurementContext.mealContext).toBe('reported fasting');expect(JSON.parse((await repo.require('demo','RawRecord',o.provenance.rawRecordId)).payload!).input.measurementParameters.analyte).toBe('glucose');
 v.measurementContext.mealContext='unknown';await expect(prepareCapture(repo,capture([v],'unknown-meal'))).rejects.toThrow('meal context');v.measurementContext.mealContext='reported fasting';v.measurementParameters.analyte='lactate';await expect(prepareCapture(repo,capture([v],'wrong-analyte'))).rejects.toThrow();
 const legacy={...o,provenance:{...o.provenance,parameters:{}}};expect(buildComparisonKey(legacy).availability).toBe('incomparable');expect(legacy.provenance.parameters).toEqual({});
});

test('absolute/relative VO2 conversions and measured/estimated results stay separate',async()=>{
 expect(normalizeUnit('vo2_absolute',1750,'mL/min')).toMatchObject({ok:true,value:1.75,unit:'L/min'});expect(normalizeUnit('vo2_relative',0.025,'L/(kg.min)')).toMatchObject({ok:true,value:25,unit:'mL/(kg.min)'});
 expect(normalizeUnit('vo2_absolute',25,'mL/(kg.min)').ok).toBe(false);expect(normalizeUnit('vo2_relative',1.75,'L/min').ok).toBe(false);
 const repo=await setup(),v=value('vo2_relative','25');v.context='exercise';v.measurementParameters={resultBasis:'measured'};await repo.execute(await prepareCapture(repo,capture([v])));const o=(await repo.list('demo','Observation')).find(o=>o.observationId.startsWith('checkin-'))!;
 expect(buildComparisonKey(o).availability).toBe('available');expect(buildComparisonKey({...o,provenance:{...o.provenance,parameters:{resultBasis:'estimated'}}}).key).not.toBe(buildComparisonKey(o).key);
 v.measurementParameters.resultBasis='unknown';await expect(prepareCapture(repo,capture([v],'unknown-vo2'))).rejects.toThrow('result basis');
});

test('DXA density and microgravity mass reject incompatible acquisition while missing remains explicit',async()=>{
 const repo=await setup(),density=value('bone_mineral_density','1.1');density.measurementContext={...mc,site:'left hip',modality:'ultrasound'};await expect(prepareCapture(repo,capture([density]))).rejects.toThrow('DXA');density.measurementContext.modality='dxa';await repo.execute(await prepareCapture(repo,capture([density],'dxa-report')));
 const mass=value('body_mass','70');mass.measurementContext={...mc,gravityCondition:'microgravity',method:'earth_scale'};await expect(prepareCapture(repo,capture([mass],'earth-scale'))).rejects.toThrow('Microgravity');mass.measurementContext.method='inertial_mass_device';await repo.execute(await prepareCapture(repo,capture([mass],'inertial-mass')));
 mass.input='';mass.missingReason='Mass device unavailable';mass.measurementContext.method='earth_scale';await repo.execute(await prepareCapture(repo,capture([mass],'missing-mass')));
});

test('scale names/versions cannot be equated and unordered anchors fail',async()=>{
 const repo=await setup(),v=value('fatigue_rating','2');v.measurementContext.scale=measurementScales.fatigue_rating;await repo.execute(await prepareCapture(repo,capture([v])));const o=(await repo.list('demo','Observation')).find(o=>o.observationId.startsWith('checkin-'))!;
 const changed={...o,measurementContext:{...o.measurementContext,scale:measurementScales.perceived_exertion}};expect(buildComparisonKey(changed).key).not.toBe(buildComparisonKey(o).key);
 v.measurementContext.scale={...measurementScales.fatigue_rating!,low:4,high:4};v.input='4';await expect(prepareCapture(repo,capture([v],'bad-scale'))).rejects.toThrow('ordered');
});

test('exercise HR cannot enter the resting reference and capture makes no new baseline',async()=>{
 const repo=await setup(),before=await repo.list('demo','Baseline'),v=value('heart_rate','110');v.context='exercise';v.measurementContext={modality:'manual',deviceId:'fictional-device',protocolId:'fictional-rest',method:'fictional entry',posture:'seated'};await repo.execute(await prepareCapture(repo,capture([v])));const o=(await repo.list('demo','Observation')).find(o=>o.observationId.startsWith('checkin-'))!;
 expect(buildComparisonKey(o).key).not.toBe(buildComparisonKey({...o,context:'rest'}).key);expect(await repo.list('demo','Baseline')).toEqual(before);
 const resting=before.find(b=>b.method==='preflight_median')!;await expect(repo.execute(command([{...resting,baselineId:'illegal-rest',revision:1,observationIds:[o.observationId],sampleCount:1}],'illegal-baseline'))).rejects.toThrow('Baseline context differs');
});

test('manual/file/replay input passes the same checked capture path with no automatic assessment',async()=>{
 for(const mode of ['manual','file_import','replay'] as const){const repo=await setup(),x=capture(bpValues());x.deliveryMode=mode;const assessments=await repo.list('demo','Assessment');await repo.execute(await prepareCapture(repo,x));const o=(await repo.list('demo','Observation')).find(o=>o.observationId.startsWith('checkin-'))!;expect(o.deliveryMode).toBe(mode);expect(o.provenance.pipelineVersion).toBe(MEASUREMENT_PIPELINE);expect(await repo.list('demo','Assessment')).toEqual(assessments);}
});
