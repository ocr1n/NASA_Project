import {assertValid,SCHEMA_VERSION,type CanonicalRecord,type Observation,type CommandEnvelope} from '../contracts';
import {canonicalJSON,sha256} from '../contracts/identity';
import {metricRegistry,buildComparisonKey} from '../metrics';
import type {Repository} from '../repositories/repository';
import {prepareCapture} from '../capture';
import {checkInSchedule} from '../metrics/check-in';
import {collectionSchedules} from '../metrics/collection';
export const DEMO_TIME='2026-01-10T12:00:00Z';
const rawEmptyHash='44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a';
const b=(recordType:string,idField:string,id:string)=>({schemaVersion:SCHEMA_VERSION,namespace:'demo',recordType,[idField]:id,revision:1});
const source={...b('SourceRecord','sourceId','simulation'),name:'Project-authored fictional scenario',tier:'simulation',canonicalURL:null,doi:null,publisher:'Project team',host:'local',version:'demo-1',license:'Project-authored fictional data; project license pending',attribution:'Project team',accessRestrictions:[],retrievedAt:DEMO_TIME,supportedMetrics:Object.keys(metricRegistry),purpose:'Software acceptance only',nasaSearchEvidence:[],fallbackReason:null,lineageIds:['simulation'],reviewStatus:'pending'};
const sourceSnapshot={schemaVersion:SCHEMA_VERSION,sourceId:'simulation',name:source.name,tier:'simulation',canonicalURL:null,version:'demo-1',license:source.license,attribution:'Project team',retrievedAt:DEMO_TIME};
const values:Record<string,number>={heart_rate:62,sleep_duration:7,fatigue_rating:2,mood_rating:3,stress_rating:2,respiratory_rate:14,body_temperature:36.7,bp_systolic:118,bp_diastolic:76,spo2:98,blood_glucose:90,body_mass:70,body_height:175,ecg_pr:160,ecg_qrs:90,ecg_qt:380,ecg_qtc:400,ecg_rr_irregularity:0,hrv_rmssd:35,hrv_sdnn:40,lvef:60,lv_edv:120,lv_esv:48,muscle_thickness:25,bone_mineral_density:1.1,exercise_duration:20,exercise_mean_hr:110,exercise_peak_hr:130,cycling_power:100,perceived_exertion:3,vo2_relative:25,vo2max_relative:40,vo2_absolute:1.75,radiation_dose:0.1,radiation_dose_rate:0.01,cabin_co2:600,cabin_o2:21,cabin_temperature:22,cabin_pressure:101,radiation_absorbed_dose:0.1,radiation_absorbed_dose_rate:0.01,cabin_co2_partial_pressure:0.06,cabin_o2_partial_pressure:21};
const reportFor=(metric:string)=>metric.startsWith('ecg_')||metric.startsWith('hrv_')?'report-ecg':['lvef','lv_edv','lv_esv'].includes(metric)?'report-echo':metric==='muscle_thickness'?'report-muscle':metric==='bone_mineral_density'?'report-dxa':null;
const scale={scaleId:'fictional-rating',version:'demo-1',low:0,high:4,lowLabel:'Scenario low',highLabel:'Scenario high'};
function demoObservation(metric:string,id:string,crew='crew-a',patch:Record<string,unknown>={}):Observation {
 const m=metricRegistry[metric];const kind=m.valueKinds[0];const structured={code:'reported-site',text:'Fictional left limb report',site:'muscle_left',laterality:'left',certainty:'reported',author:'Scenario author'};
 const value=kind==='structured'?structured:values[metric]??null;
 const x={...b('Observation','observationId',id),astronautId:crew,missionId:'mission-demo',publicSubjectId:null,datasetId:null,timestamp:DEMO_TIME,timePrecision:'exact',originalTime:null,timeReason:null,missionAnchor:null,receivedAt:DEMO_TIME,
 metric,valueKind:kind,value,unit:m.canonicalUnit,missingReason:value===null?'Not supplied in the original fictional scenario':null,context:m.category==='exercise'?'exercise':'rest',
 measurementContext:{modality:metric==='bone_mineral_density'?'dxa':'report',deviceId:'fictional-report',protocolId:'scenario-rest-v1',method:'scenario_report',posture:'seated',missionPhase:'inflight',activity:'cycling',site:metric.startsWith('muscle')?'muscle_left':'reported_site',laterality:'left',lead:'II',view:'apical',qtcCorrection:'fictional_fixture',artifactHandling:'fixture_only',statistic:'reported',doseQuantity:metric.includes('absorbed')?'absorbed':'equivalent',oxygenContext:'scenario_cabin',mealContext:'scenario_fasting',gravityCondition:'scenario',workload:'fictional 100 W',indexing:'unindexed',windowSeconds:300,intervalSeconds:3600,scale},
 source:sourceSnapshot,quality:{score:0.9,method:'fictional acceptance parameter',flags:[],lowConfidence:false},validation:{status:'pending',validationRunId:'validation-demo',evidenceIds:[],procedureVersion:'demo-1',issues:[],admission:'demo_only'},dataOrigin:'synthetic',deliveryMode:'manual',synthetic:true,era:'fictional scenario',
 provenance:{rawRecordId:`raw-${id}`,contentHash:rawEmptyHash,sourceRecordId:id,importBatchId:null,pipelineVersion:'demo-1',algorithm:null,parameters:{demoOnly:true,...metric==='blood_glucose'?{analyte:'glucose'}:{},...metric.startsWith('vo2')?{resultBasis:'measured'}:{}},originalUnit:m.canonicalUnit,originalValue:value,evidenceObservationIds:[],windowIds:[],originalSamplingHz:null,outputSamplingHz:null},
 reportId:reportFor(metric),sessionId:m.category==='exercise'?'session-demo':null,acquisitionId:metric.startsWith('bp_')?'paired-bp':id,regionKey:null,laterality:null,supersedesObservationId:null,...patch};
 assertValid<Observation>('Observation',x);return x;
}
async function withRaw(observation:Observation){
 const payload=JSON.stringify({demoOnly:true,id:observation.observationId,metric:observation.metric,value:observation.value});const hash=await sha256(payload);
 const o={...observation,provenance:{...observation.provenance,contentHash:hash}};
 const raw={...b('RawRecord','rawRecordId',o.provenance.rawRecordId),sourceId:'simulation',acquisitionId:o.acquisitionId,importBatchId:null,payload,fileReference:null,contentHash:hash,mediaType:'application/json',encoding:'utf-8',retrievedAt:DEMO_TIME,retentionPolicy:'Preserve fictional provenance',accessPolicy:'Public fictional'};
 return [raw,o];
}
const checked=(records:unknown[]):CanonicalRecord[]=>records.map(record=>{assertValid<CanonicalRecord>((record as CanonicalRecord).recordType,record);return record;});
export async function createDemoRecords():Promise<CanonicalRecord[]> {
 const records:unknown[]=[source,...Object.values(metricRegistry),
 {...b('MissionContext','missionId','mission-demo'),label:'Orbital research scenario',environmentType:'iss',missionStart:'2026-01-01T00:00:00Z',scenarioClock:DEMO_TIME,missionPhase:'inflight',location:'fictional cabin',schedule:[checkInSchedule],communicationScenario:null,dataOrigin:'synthetic',sourceIds:['simulation']},
 ...['crew-a','crew-b'].map(id=>({...b('CrewProfile','astronautId',id),alias:id==='crew-a'?'Aster':'Vega',missionId:'mission-demo',missionStart:'2026-01-01T00:00:00Z',displayTimeZone:'UTC',preferences:{locale:'en',reducedMotion:false},bodyHeightObservationId:null,bodyMassObservationId:null,profileOrigin:'synthetic',createdAt:DEMO_TIME,updatedAt:DEMO_TIME})),
 {...b('ValidationRun','validationRunId','validation-demo'),claim:'Software fixture integrity; no scientific claim',subjectRecordIds:[],sourceIds:['simulation'],ruleIds:[],independentEvidenceGroups:[],sourcesChecked:['simulation'],normalization:'Canonical fixture values',toleranceDefinition:null,structuralResults:['Schema checked by tests'],methodComparisons:[],conflicts:[],limitations:['Fictional; no clinical interpretation'],status:'pending',admission:'demo_only',reviewer:'fixture author',procedureVersion:'demo-1',pipelineVersion:'demo-1',runAt:DEMO_TIME}];
 const observations:Observation[]=[];
 for(const m of Object.values(metricRegistry)){
  const o=demoObservation(m.metric,`metric-${m.metric}`);
  if(m.category==='environment'){
   const rawAndObs=await withRaw(o);const {astronautId,publicSubjectId,datasetId,reportId,sessionId,supersedesObservationId,observationId,...envelope}=rawAndObs[1] as Observation;
   records.push(rawAndObs[0],{...envelope,recordType:'EnvironmentalObservation',environmentalObservationId:`environment-${m.metric}`,instrumentId:'fictional-instrument',location:'fictional cabin',observedFrom:'2026-01-10T11:00:00Z',observedTo:DEMO_TIME});
  }else{const pair=await withRaw(o);records.push(...pair);observations.push(pair[1] as Observation);}
 }
 for(const [id,value,timestamp,phase] of [
 ['preflight-1',60,'2025-12-20T12:00:00Z','preflight'],['preflight-2',62,'2025-12-21T12:00:00Z','preflight'],['preflight-3',64,'2025-12-22T12:00:00Z','preflight'],
 ['rolling-1',67,'2026-01-07T12:00:00Z','inflight'],['rolling-2',68,'2026-01-08T12:00:00Z','inflight'],['rolling-3',69,'2026-01-09T12:00:00Z','inflight']
 ] as const){const o=demoObservation('heart_rate',id,'crew-a',{value,timestamp,measurementContext:{...demoObservation('heart_rate','template').measurementContext,missionPhase:phase}});const pair=await withRaw(o);records.push(...pair);observations.push(pair[1] as Observation);}
 for(const metric of ['heart_rate','sleep_duration']){const o=demoObservation(metric,`vega-${metric}`,'crew-b',{value:metric==='heart_rate'?72:6.5});const pair=await withRaw(o);records.push(...pair);observations.push(pair[1] as Observation);}
 const echo=observations.find(o=>o.metric==='lvef')!;
 const baseline=(id:string,method:string,ids:string[],center:number|null,status='available')=>{
  const samples=observations.filter(o=>ids.includes(o.observationId));return {...b('Baseline','baselineId',id),astronautId:'crew-a',metric:method==='preflight_anchor'?'lvef':'heart_rate',unit:method==='preflight_anchor'?'%':'/min',comparabilityKey:samples[0]?buildComparisonKey(samples[0]).key:null,comparabilityVersion:SCHEMA_VERSION,method,observationIds:ids,window:{from:samples[0]?.timestamp??null,to:samples.at(-1)?.timestamp??null,precision:'exact'},sampleCount:ids.length,center,spread:method==='preflight_anchor'||!ids.length?null:2,qualityCriteria:'Fictional quality >= 0.8; demo only',admissionCriteria:'demo_only',exclusions:[],calculatedAt:DEMO_TIME,algorithmVersion:'fixture-precomputed-1',status,reasons:status==='available'?[]:['no_preflight_data']};};
 records.push(baseline('baseline-fixed','preflight_median',['preflight-1','preflight-2','preflight-3'],62),baseline('baseline-anchor','preflight_anchor',[echo.observationId],60),baseline('baseline-rolling','mission_rolling',['rolling-1','rolling-2','rolling-3'],68),baseline('baseline-unavailable','preflight_median',[],null,'baseline_unavailable'));
 for(const [id,type] of [['report-ecg','ecg'],['report-echo','echo'],['report-muscle','muscle'],['report-dxa','dxa']]){
  const samples=observations.filter(o=>o.reportId===id);const payload=JSON.stringify({demoOnly:true,type,observations:samples.map(o=>o.observationId)}),hash=await sha256(payload);
  records.push({...b('RawRecord','rawRecordId',`raw-${id}`),sourceId:'simulation',acquisitionId:id,importBatchId:null,payload,fileReference:null,contentHash:hash,mediaType:'application/json',encoding:'utf-8',retrievedAt:DEMO_TIME,retentionPolicy:'demo',accessPolicy:'public fictional'},
  {...b('Report','reportId',id),astronautId:'crew-a',publicSubjectId:null,missionId:'mission-demo',type,timestamp:DEMO_TIME,timePrecision:'exact',originalTime:null,timeReason:null,missionAnchor:null,sourceId:'simulation',observationIds:samples.map(o=>o.observationId),method:'fictional report',deviceId:null,lead:type==='ecg'?'II':null,view:type==='echo'?'apical':null,site:type==='muscle'?'muscle_left':null,laterality:type==='muscle'?'left':null,originalReportRawRecordId:`raw-${id}`,dataOrigin:'synthetic'});
 }
 records.push({...b('ExerciseSession','sessionId','session-demo'),astronautId:'crew-a',missionId:'mission-demo',activity:'cycling',startAt:'2026-01-10T11:40:00Z',endAt:DEMO_TIME,durationMinutes:20,workload:'Fictional 100 W',protocolId:'scenario-exercise-v1',observationIds:observations.filter(o=>o.sessionId==='session-demo').map(o=>o.observationId),sourceId:'simulation',sourceSessionId:'scenario-session',notes:'Precomputed fixture; no exercise engine',dataOrigin:'synthetic'},
 {...b('ImportBatch','importBatchId','import-demo'),sourceId:'simulation',sourceVersion:'demo-1',fileHash:rawEmptyHash,parser:'fictional fixture',parserVersion:'demo-1',mapping:[],previewToken:rawEmptyHash,previewState:'previewed',acceptedRows:0,rejectedRows:0,quarantinedRows:0,errors:[],stableSourceRecordKeys:[],importedAt:DEMO_TIME},
 {...b('ComparisonResult','comparisonId','comparison-demo'),astronautId:'crew-a',metric:'heart_rate',observationIds:['rolling-3'],baselineId:'baseline-fixed',referenceIds:[],comparabilityKey:buildComparisonKey(observations.find(o=>o.observationId==='rolling-3')!).key,availability:'available',reasons:[],absoluteDelta:7,relativeDelta:7/62,percentagePointDelta:null,trend:null,sampleCount:1,coverage:1,qualitySummary:'Fictional',validationSummary:'demo_only',algorithmVersion:'fixture-precomputed-1'},
 {...b('ThresholdRule','ruleId','rule-demo'),version:'demo-1',title:'Fictional missing-data workflow',metrics:['heart_rate'],applicableContext:['rest'],population:'Fictional software subjects',protocolId:null,predicates:[{op:'missing',metric:'heart_rate',parameters:{value:null,low:null,high:null}}],evidenceIds:[],admissionRequirements:['demo_only'],baselineStrategy:'fixed',qualityGate:{minimumScore:0.8,allowLowConfidence:false},persistence:{minimumSeconds:60,minimumIndependentSamples:2},severity:'warning',recovery:{minimumSeconds:60,minimumIndependentSamples:2},status:'pending',demoOnly:true,approvedScope:'demo_only',regionMapping:{regionKey:null,layer:'systemic',localizing:false},guidanceSourceIds:[]},
 {...b('Assessment','assessmentId','assessment-demo'),astronautId:'crew-a',missionId:'mission-demo',evaluatedAt:DEMO_TIME,window:{from:null,to:null,precision:'unknown'},ruleId:'rule-demo',ruleVersion:'demo-1',observationIds:[],environmentalObservationIds:[],comparisonIds:[],baselineIds:[],availability:'insufficient_data',reasons:['fixture_no_automatic_interpretation'],severity:null,finding:'No automatic physiological interpretation',contributingFactors:[],corroboration:'Fictional fixture only',sustained:false,independentSampleCount:0,localizationSupported:false,limitations:['No diagnosis or clinical validity'],evidenceIds:[],dataOrigin:'synthetic',mode:'demo',lifecycle:'active',taskIds:[],highlightIds:[]},
 {...b('AtlasRegionManifest','manifestId','manifest-demo'),manifestVersion:'demo-unmapped-1',asset:{sourceURL:null,revision:'unmapped',contentHash:rawEmptyHash,format:'unmapped',attributions:[],referenceLimitations:['No anatomical model or geometry loaded in module 00','Reference anatomy is not personalized'],coordinateSystem:'unverified',units:'m',scale:1},regions:[{regionKey:'muscle_left',label:'Reported left muscle site',layer:'muscular',laterality:'left',structureIds:[],verified:false}]},
 {...b('AtlasHighlight','highlightId','highlight-reported'),astronautId:'crew-a',regionKey:'muscle_left',layer:'muscular',severity:'info',kind:'reported_site',reason:'Fictional reported site; no automatic anatomy claim',assessmentId:null,ruleId:null,ruleVersion:null,observationIds:['metric-injury_report'],confidence:null,confidenceKind:'unknown',limitations:['Unmapped reference geometry'],since:DEMO_TIME,lastEvaluatedAt:DEMO_TIME,expires:null,status:'active',dataOrigin:'synthetic',mode:'demo',manifestId:'manifest-demo',manifestVersion:'demo-unmapped-1'},
 ...['crew-a','crew-b'].map(id=>({...b('FollowUpTask','taskId',`task-${id}`),astronautId:id,type:'repeat_measurement',dueAt:DEMO_TIME,duePrecision:'exact',state:'due',assessmentIds:[],observationIds:[id==='crew-a'?'metric-heart_rate':'vega-heart_rate'],requiredMeasurement:{metric:'heart_rate',comparabilityKey:null},completionObservationIds:[],completionReportIds:[],explanation:'Fictional repeat workflow; no medical recommendation',sourceIds:['simulation'],idempotencyKey:`task-${id}`,episodeId:`episode-${id}`,createdAt:DEMO_TIME,updatedAt:DEMO_TIME})));
 return checked(records);
}
export async function createResearchRecords():Promise<CanonicalRecord[]> {
 const all=await createDemoRecords();const o=structuredClone(all.find(r=>r.recordType==='Observation'&&r.metric==='heart_rate')!) as Observation;
 const keep=all.filter(r=>r.recordType==='SourceRecord'||r.recordType==='ValidationRun'||r.recordType==='RawRecord'&&r.rawRecordId===o.provenance.rawRecordId);
 const namespace='research:test-fixtures';o.namespace=namespace;o.astronautId=null;o.missionId=null;o.publicSubjectId='subject-test';o.datasetId='test-fixtures';o.dataOrigin='public_research';o.synthetic=false;o.validation.admission='research_sandbox';
 const shared=keep.map(r=>{const next=structuredClone(r) as unknown as Record<string,unknown>;next.namespace=namespace;if(next.recordType==='ValidationRun')next.admission='research_sandbox';return next;});
 return checked([...shared,o]);
}
export const failureCases=[
 ['invalid_unit',{unit:'kg'},false,'invalid'],['missing_quality',{quality:{score:null,method:'unknown',flags:[],lowConfidence:true}},true,'insufficient_data'],
 ['low_quality',{quality:{score:0.1,method:'fixture',flags:['uncertain'],lowConfidence:true}},true,'insufficient_data'],['unknown_time',{timestamp:null,timePrecision:'unknown',timeReason:'unreported'},true,'insufficient_data'],
 ['partial_date',{timestamp:null,timePrecision:'date',originalTime:'2026-01-10'},true,'insufficient_data'],['missing_value',{value:null,missingReason:'unavailable'},true,'insufficient_data'],
 ['protocol_unknown',{measurementContext:{...demoObservation('heart_rate','template').measurementContext,protocolId:null}},true,'incomparable'],
 ['quarantined_conflict',{validation:{status:'conflict',validationRunId:'validation-conflict',evidenceIds:[],procedureVersion:'demo-1',issues:['conflicting source'],admission:'quarantined'}},true,'invalid'],
 ['late_replay',{timestamp:'2026-01-02T12:00:00Z',receivedAt:DEMO_TIME,deliveryMode:'replay'},true,'available']
].map(([name,patch,valid,assessment])=>({name:String(name),observation:demoObservation('heart_rate',`case-${name}`),patch,expected:{valid:Boolean(valid),assessment:String(assessment)}})).map(f=>({...f,observation:{...f.observation,...f.patch as object}}));
export async function captureDemoReading(repo:Repository,astronautId:string,operationId:string){
 const prior=(await repo.storage.read('demo')).operations.find(r=>r.operationId===operationId);if(prior)return prior;
 const o=demoObservation('heart_rate',`repeat-${operationId}`,astronautId);
 const c=await prepareCapture(repo,{namespace:'demo',astronautId,operationId,sourceId:'simulation',receivedAt:DEMO_TIME,deliveryMode:'manual',time:{precision:'exact',text:DEMO_TIME,reason:''},notes:'Fictional repeat fixture',completeTaskIds:[`task-${astronautId}`],values:[{metric:'heart_rate',observationId:`repeat-${operationId}`,input:astronautId==='crew-a'?'63':'73',unit:'/min',missingReason:null,context:'rest',measurementContext:o.measurementContext,quality:o.quality}]});
 return repo.execute(c);
}
/** Add the fictional schedule to older installed demos through a revision-checked command. */
export async function ensureCheckInSchedule(repo:Repository){
 const mission=await repo.require('demo','MissionContext','mission-demo');
 if(mission.schedule.some(item=>item.scheduleId===checkInSchedule.scheduleId))return;
 const c:CommandEnvelope={schemaVersion:SCHEMA_VERSION,namespace:'demo',operationId:'configure-module02-daily',idempotencyKey:'configure-module02-daily',subject:{kind:'mission',astronautId:null,missionId:mission.missionId},createdAt:repo.clock.now(),operation:'upsert',domain:'configuration',payload:{records:[{...mission,revision:mission.revision+1,schedule:[...mission.schedule,checkInSchedule]}],expectedRevisions:[{recordType:'MissionContext',recordId:mission.missionId,revision:mission.revision}],importKeys:[],previewToken:null}};
 return repo.execute(c);
}

/** Revision-checked additive configuration for older demos, without rewriting their evidence. */
export async function ensureCollectionSchedules(repo:Repository){
 const mission=await repo.require('demo','MissionContext','mission-demo');
 for(const item of collectionSchedules){const old=mission.schedule.find(s=>s.scheduleId===item.scheduleId);if(old&&canonicalJSON(old)!==canonicalJSON(item))throw new Error('Existing fictional collection configuration differs; preserved for review.');}
 const missing=collectionSchedules.filter(item=>!mission.schedule.some(s=>s.scheduleId===item.scheduleId));if(!missing.length)return;
 const id=`configure-module03-collection-${mission.revision}`;
 return repo.execute({schemaVersion:SCHEMA_VERSION,namespace:'demo',operationId:id,idempotencyKey:id,subject:{kind:'mission',astronautId:null,missionId:mission.missionId},createdAt:repo.clock.now(),operation:'upsert',domain:'configuration',payload:{records:[{...mission,revision:mission.revision+1,schedule:[...mission.schedule,...missing]}],expectedRevisions:[{recordType:'MissionContext',recordId:mission.missionId,revision:mission.revision}],importKeys:[],previewToken:null}});
}
