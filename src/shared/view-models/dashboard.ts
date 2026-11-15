import {failure,type Observation,type TrendRequest} from '../contracts';
import type {Repository} from '../repositories/repository';
import {BASELINE_MEDIA,baselineEvidence} from '../contracts/baselines';
import {projectPersonalTrend} from '../trends/projection';
import {historicalDemoCohorts} from '../trends/fixtures';
import {compareHistoricalCohorts} from '../trends/historical';

export async function selectDashboard(repo:Repository,crewId:string,metric:Observation['metric'],referenceId:string|null,window?:{from:string;to:string},phase?:string){
 const {records}=await repo.export('demo'),crew=records.find(r=>r.recordType==='CrewProfile'&&r.astronautId===crewId),mission=records.find(r=>r.recordType==='MissionContext'&&r.missionId===(crew?.recordType==='CrewProfile'?crew.missionId:null));
 if(!crew||crew.recordType!=='CrewProfile'||!mission||mission.recordType!=='MissionContext'||!mission.scenarioClock)throw failure('REFERENCE_INVALID','Selected crew scenario unavailable.');
 const observations=records.filter((r):r is Observation=>r.recordType==='Observation'&&r.astronautId===crewId&&r.missionId===crew.missionId&&r.dataOrigin==='synthetic');
 const references=records.filter(r=>r.recordType==='RawRecord'&&r.mediaType===BASELINE_MEDIA).map(r=>{if(r.recordType!=='RawRecord')throw Error();return baselineEvidence(r).computation;}).filter(c=>c.baseline.astronautId===crewId&&c.baseline.metric===metric);
 const reference=references.find(c=>c.baseline.baselineId===referenceId)??null;
 const request:TrendRequest={protocolVersion:'trend-request/1',namespace:'demo',astronautId:crewId,missionId:crew.missionId,dataOrigin:'synthetic',metric,missionPhase:phase??mission.missionPhase??'inflight',referenceBaselineId:referenceId,window:{from:window?.from??mission.missionStart??'2026-01-01T00:00:00Z',to:window?.to??new Date(Date.parse(mission.scenarioClock)+1).toISOString(),precision:'exact'},maximumGapSeconds:172800,cadenceSeconds:null};
 const cohorts=await historicalDemoCohorts();
 const latest=(['heart_rate','sleep_duration','lvef','muscle_thickness'] as const).map(metric=>({metric,observation:observations.filter(o=>o.metric===metric&&o.measurementContext.missionPhase!=='preflight'&&!observations.some(newer=>newer.supersedesObservationId===o.observationId)).sort((a,b)=>Date.parse(b.timestamp??'')-Date.parse(a.timestamp??'')||b.observationId.localeCompare(a.observationId))[0]??null}));
 return {projection:await projectPersonalTrend(records,request,reference),references,latest,historical:compareHistoricalCohorts(cohorts.older,cohorts.newer),scenarioClock:mission.scenarioClock,phases:[...new Set(observations.map(o=>o.measurementContext.missionPhase).filter((p):p is string=>!!p&&p!=='unknown'))].sort()};
}

export async function advanceDemoClock(repo:Repository,crewId:string){const crew=await repo.require('demo','CrewProfile',crewId),mission=await repo.require('demo','MissionContext',crew.missionId);if(!mission.scenarioClock)throw failure('VALIDATION_FAILED','Scenario clock unavailable.');const next=new Date(Date.parse(mission.scenarioClock)+86400000).toISOString();if(Date.parse(next)>Date.parse(repo.clock.now()))throw failure('VALIDATION_FAILED','Scenario time cannot advance beyond the local clock.');const id='advance-demo-'+mission.revision;await repo.execute({schemaVersion:'0.1.0',namespace:'demo',operationId:id,idempotencyKey:id,subject:{kind:'mission',astronautId:null,missionId:mission.missionId},createdAt:repo.clock.now(),operation:'upsert',domain:'configuration',payload:{records:[{...mission,revision:mission.revision+1,scenarioClock:next}],expectedRevisions:[{recordType:'MissionContext',recordId:mission.missionId,revision:mission.revision}],importKeys:[],previewToken:null}});}
