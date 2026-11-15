import {assertValid,failure,SCHEMA_VERSION,type DemoScenarioInput,type DemoScenarioReading,type DemoScenarioResponse,type DemoScenarioState,type RawRecord,type Observation,type CanonicalRecord,type CommandEnvelope,type BaselineRequest,type Assessment,type FollowUpTask} from '../contracts';
import {canonicalJSON,sha256} from '../contracts/identity';
import {FixedClock} from '../contracts/clock';
import {Repository} from '../repositories/repository';
import {MemoryStorage} from '../repositories/memory';
import {DEMO_TIME} from '../fixtures';
import {createBaselineFixtureRecords} from '../baselines/fixtures';
import {saveBaselineCalculation} from '../baselines';
import {BASELINE_MEDIA,baselineEvidence} from '../contracts/baselines';
import {prepareCapture} from '../capture';
import {ensureAtlasManifest} from '../atlas';
import {scenarioConfig} from '../rules/scenario-config';
import {prepareDemoEvaluation} from '../rules/engine';
import {comparePersonal} from '../trends/personal';

export const SCENARIO_MEDIA='application/vnd.nasa-project.atlas-demo-state+json';
export const SCENARIO_CLOCK='2026-01-12T12:00:00Z';
const prefix=(input:DemoScenarioInput)=>`scenario-${input.scenarioId}-`;
const observationId=(input:DemoScenarioInput,index:number)=>`${prefix(input)}reading-${index}`;

export function validateScenario(input:unknown):DemoScenarioInput {
 if(canonicalJSON(input).length>65536)throw failure('VALIDATION_FAILED','Demo input is limited to 64 KiB.');
 assertValid<DemoScenarioInput>('DemoScenarioInput',input);
 if(input.initialCount>input.readings.length)throw failure('VALIDATION_FAILED','Initial count exceeds supplied readings.');
 let previous=Date.parse(DEMO_TIME);for(const reading of input.readings){const at=Date.parse(reading.timestamp);if(at<=previous||at>Date.parse(SCENARIO_CLOCK))throw failure('VALIDATION_FAILED','Demo readings need distinct increasing times after the base fixture clock and before January 12, 2026, 12:00 UTC.');previous=at;}
 return structuredClone(input);
}

async function stateRecord(state:DemoScenarioState):Promise<RawRecord>{assertValid('DemoScenarioState',state);const payload=canonicalJSON(state);return {schemaVersion:SCHEMA_VERSION,namespace:'demo',recordType:'RawRecord',rawRecordId:`${prefix(state.input)}state-${state.sequence}`,revision:1,sourceId:'simulation',acquisitionId:null,importBatchId:null,payload,fileReference:null,contentHash:await sha256(payload),mediaType:SCENARIO_MEDIA,encoding:'utf-8',retrievedAt:SCENARIO_CLOCK,retentionPolicy:'Retain original fictional inputs and every walkthrough response.',accessPolicy:'Project-authored fictional demo only'};}

function states(records:CanonicalRecord[],crewId:string){return records.filter((r):r is RawRecord=>r.recordType==='RawRecord'&&r.mediaType===SCENARIO_MEDIA).map(raw=>{if(!raw.payload)throw failure('VALIDATION_FAILED','Demo state payload is missing.');const state:unknown=JSON.parse(raw.payload);assertValid<DemoScenarioState>('DemoScenarioState',state);return {raw,state};}).filter(x=>x.state.input.crewId===crewId).sort((a,b)=>b.state.sequence-a.state.sequence);}

export async function readDemoScenario(repo:Repository,crewId:string){const {records}=await repo.export('demo'),saved=states(records,crewId)[0];if(!saved)return null;const config=scenarioConfig(saved.state.input.kind);
 const assessment=records.filter((r):r is Assessment=>r.recordType==='Assessment'&&r.astronautId===crewId&&r.ruleId===config.options.rule.ruleId).sort((a,b)=>Date.parse(b.evaluatedAt)-Date.parse(a.evaluatedAt)||b.assessmentId.localeCompare(a.assessmentId))[0]??null;
 const tasks=records.filter((r):r is FollowUpTask=>r.recordType==='FollowUpTask'&&r.astronautId===crewId&&r.taskId.startsWith('demo-followup_')&&r.requiredMeasurement.metric===config.metric);
 const observations=records.filter((r):r is Observation=>r.recordType==='Observation'&&r.observationId.startsWith(prefix(saved.state.input))).sort((a,b)=>Date.parse(a.timestamp??'')-Date.parse(b.timestamp??''));
 const rawReference=records.find(r=>r.recordType==='RawRecord'&&r.mediaType===BASELINE_MEDIA&&baselineEvidence(r).computation.baseline.baselineId===saved.state.baselineId);
 const reference=rawReference?.recordType==='RawRecord'?baselineEvidence(rawReference).computation:null;
 const current=observations.filter(o=>o.measurementContext.missionPhase==='inflight').at(-1);
 return {...saved,records,config,assessment,tasks,observations,reference,comparison:current?await comparePersonal(current,reference):null};
}

async function capture(repo:Repository,input:DemoScenarioInput,reading:DemoScenarioReading,index:number,preflight=false){const config=scenarioConfig(input.kind);return prepareCapture(repo,{namespace:'demo',astronautId:input.crewId,sourceId:'simulation',operationId:`${prefix(input)}${preflight?'reference':'reading'}-${index}`,receivedAt:SCENARIO_CLOCK,deliveryMode:'file_import',time:{precision:'exact',text:reading.timestamp,reason:''},notes:`Fictional atlas walkthrough ${input.scenarioId}; not a clinical measurement.`,values:[{metric:config.metric,input:reading.value===null?'':String(reading.value),unit:config.unit,missingReason:reading.value===null?'Not reported in fictional input':null,context:'rest',measurementContext:{...config.measurementContext,site:reading.site,missionPhase:preflight?'preflight':'inflight'},quality:{score:reading.qualityScore,lowConfidence:reading.lowConfidence||reading.qualityScore===null,method:'Fictional supplied quality parameter',flags:[]},observationId:preflight?`${prefix(input)}reference-${index}`:observationId(input,index)}]});}

function evaluationInput(records:CanonicalRecord[],state:DemoScenarioState){const config=scenarioConfig(state.input.kind),source=records.find(r=>r.recordType==='RawRecord'&&r.mediaType===BASELINE_MEDIA&&baselineEvidence(r).computation.baseline.baselineId===state.baselineId);if(!source||source.recordType!=='RawRecord')throw failure('REFERENCE_INVALID','Scenario reference evidence is unavailable.');
 const reference=baselineEvidence(source).computation,evaluatedAt=state.input.readings[state.appliedCount-1].timestamp;
 const scoped=records.filter(r=>r.recordType!=='Observation'||r.metric!==config.metric||r.observationId.startsWith(prefix(state.input)));
 return {records:scoped,reference,evaluatedAt,options:config.options,request:{protocolVersion:'trend-request/1' as const,namespace:'demo' as const,astronautId:state.input.crewId,missionId:'mission-demo',dataOrigin:'synthetic' as const,metric:config.metric,missionPhase:'inflight',referenceBaselineId:state.baselineId,window:{from:'2026-01-01T00:00:00Z',to:new Date(Date.parse(evaluatedAt)+1).toISOString(),precision:'exact' as const},maximumGapSeconds:172800,cadenceSeconds:null}};
}

/** Pure input file -> independent canonical snapshot, using the existing capture/reference/rule path. */
export async function compileDemoScenario(value:unknown){
 const input=validateScenario(value),repo=new Repository(new MemoryStorage(),new FixedClock(SCENARIO_CLOCK));
 const seed=await createBaselineFixtureRecords();for(const record of seed)if(record.recordType==='MissionContext')record.scenarioClock=SCENARIO_CLOCK;
 await repo.execute({schemaVersion:SCHEMA_VERSION,namespace:'demo',operationId:'seed-scenario',idempotencyKey:'seed-scenario',subject:{kind:'namespace',astronautId:null,missionId:null},createdAt:SCENARIO_CLOCK,operation:'upsert',domain:'configuration',payload:{records:seed,expectedRevisions:[],importKeys:[],previewToken:null}});await ensureAtlasManifest(repo);
 const config=scenarioConfig(input.kind);
 for(let i=0;i<3;i++)await repo.execute(await capture(repo,input,{timestamp:`2025-12-${20+i}T10:00:00Z`,value:input.reference[i],qualityScore:.95,lowConfidence:false,site:config.regionKey},i,true));
 const count=Math.min(input.initialCount,2);for(let i=0;i<count;i++)await repo.execute(await capture(repo,input,input.readings[i],i));
 const request:BaselineRequest={protocolVersion:'baseline-request/1',namespace:'demo',astronautId:input.crewId,missionId:'mission-demo',dataOrigin:'synthetic',metric:config.metric,method:'preflight_median',missionPhase:'preflight',selectorObservationId:observationId(input,0),anchorObservationId:null,window:{from:'2025-12-20T00:00:00Z',to:'2025-12-23T00:00:00Z',precision:'exact'},currentObservationIds:Array.from({length:count},(_,i)=>observationId(input,i)),exclusions:[],excludedPeriods:[]};
 const saved=await saveBaselineCalculation(repo,request,'Explicit preflight inputs from the fictional atlas demo.');
 const state:DemoScenarioState={protocolVersion:'atlas-demo-state/1',input,appliedCount:count,sequence:1,previousRawRecordId:null,baselineId:saved.evidence.computation.baseline.baselineId,response:null};
 const stateRaw=await stateRecord(state);const exported=await repo.export('demo'),e=evaluationInput([...exported.records,stateRaw],state),command=await prepareDemoEvaluation(e.records,e.request,e.reference,e.evaluatedAt,e.options);
 const mission=await repo.require('demo','MissionContext','mission-demo');
 const records:CanonicalRecord[]=[stateRaw,...command?.payload.records??[],{...mission,revision:mission.revision+1,scenarioClock:e.evaluatedAt}];await repo.execute({schemaVersion:SCHEMA_VERSION,namespace:'demo',operationId:'start-'+input.scenarioId,idempotencyKey:'start-'+input.scenarioId,subject:{kind:'crew',astronautId:input.crewId,missionId:'mission-demo'},createdAt:SCENARIO_CLOCK,operation:'upsert',domain:'assessments',payload:{records,expectedRevisions:[...command?.payload.expectedRevisions??[],{recordType:'MissionContext',recordId:mission.missionId,revision:mission.revision}],importKeys:[],previewToken:null}});
 for(let i=count;i<input.initialCount;i++)await repo.execute(await prepareScenarioStep(repo,input.crewId,{site:'confirmed',acquisition:'confirmed',notes:'Prewritten fictional response for the completed-recovery demo.'},true));
 return repo.export('demo');
}

/** Answers and an optional next scripted acquisition commit atomically; answers alone never mean recovery. */
export async function prepareScenarioStep(repo:Repository,crewId:string,response:DemoScenarioResponse,includeNext=true):Promise<CommandEnvelope>{
 assertValid('DemoScenarioResponse',response);const view=await readDemoScenario(repo,crewId);if(!view)throw failure('REFERENCE_INVALID','No walkthrough belongs to this crew.');
 const next:DemoScenarioState=structuredClone(view.state);next.sequence++;next.previousRawRecordId=view.raw.rawRecordId;next.response=structuredClone(response);
 let captureCommand:CommandEnvelope|null=null;const mission=await repo.require('demo','MissionContext','mission-demo');
 const clockRecords:CanonicalRecord[]=[],clockRevisions:CommandEnvelope['payload']['expectedRevisions']=[];
 if(includeNext){if(next.appliedCount>=next.input.readings.length)throw failure('VALIDATION_FAILED','No further scripted measurement is available.');const reading=next.input.readings[next.appliedCount];if(mission.scenarioClock&&Date.parse(reading.timestamp)<=Date.parse(mission.scenarioClock))throw failure('CONFLICT','Scenario time has advanced beyond this scripted report. Reload the demo to replay it.');if(response.site==='uncertain'||response.acquisition==='uncertain')reading.lowConfidence=true;
  const updated={...mission,revision:mission.revision+1,scenarioClock:reading.timestamp};clockRecords.push(updated);clockRevisions.push({recordType:'MissionContext',recordId:mission.missionId,revision:mission.revision});
  // Prepare against the proposed clock in an isolated copy, then commit clock + capture together.
  const proposed=new Repository(new MemoryStorage(),new FixedClock(SCENARIO_CLOCK));await proposed.restore(await repo.export('demo'));await proposed.execute({schemaVersion:SCHEMA_VERSION,namespace:'demo',operationId:'prepare-demo-clock',idempotencyKey:'prepare-demo-clock',subject:{kind:'mission',astronautId:null,missionId:mission.missionId},createdAt:SCENARIO_CLOCK,operation:'upsert',domain:'configuration',payload:{records:[updated],expectedRevisions:clockRevisions,importKeys:[],previewToken:null}});
  captureCommand=await capture(proposed,next.input,reading,next.appliedCount);next.appliedCount++;
 }
 const raw=await stateRecord(next),records=[...captureCommand?.payload.records??[],...clockRecords,raw],e=evaluationInput([...view.records,...records],next);
 const evaluation=includeNext?await prepareDemoEvaluation(e.records,e.request,e.reference,e.evaluatedAt,e.options):null;
 return {schemaVersion:SCHEMA_VERSION,namespace:'demo',operationId:`${prefix(next.input)}step-${next.sequence}`,idempotencyKey:`${prefix(next.input)}step-${next.sequence}`,subject:{kind:'crew',astronautId:crewId,missionId:'mission-demo'},createdAt:SCENARIO_CLOCK,operation:'capture',domain:'capture',payload:{records:[...records,...evaluation?.payload.records??[]],expectedRevisions:[...clockRevisions,...evaluation?.payload.expectedRevisions??[]],importKeys:[],previewToken:null}};
}
