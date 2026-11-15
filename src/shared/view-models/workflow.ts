import {failure,type TrendRequest} from '../contracts';
import {BASELINE_MEDIA,baselineEvidence} from '../contracts/baselines';
import type {Repository} from '../repositories/repository';
import {evaluateDemo,prepareDemoEvaluation} from '../rules/engine';

export async function selectWorkflow(repo:Repository,crewId:string,baselineId:string|null){
 const {records}=await repo.export('demo');const crew=records.find(r=>r.recordType==='CrewProfile'&&r.astronautId===crewId),mission=records.find(r=>r.recordType==='MissionContext'&&r.missionId===(crew?.recordType==='CrewProfile'?crew.missionId:null));
 if(!crew||crew.recordType!=='CrewProfile'||!mission||mission.recordType!=='MissionContext'||!mission.scenarioClock)throw failure('REFERENCE_INVALID','Selected scenario is unavailable.');
 const references=records.filter(r=>r.recordType==='RawRecord'&&r.mediaType===BASELINE_MEDIA).map(r=>{if(r.recordType!=='RawRecord')throw Error();return baselineEvidence(r).computation;}).filter(c=>c.baseline.astronautId===crewId&&c.baseline.metric==='heart_rate'&&c.baseline.method!=='mission_rolling');
 const reference=references.find(c=>c.baseline.baselineId===baselineId)??null;
 const request:TrendRequest={protocolVersion:'trend-request/1',namespace:'demo',astronautId:crewId,missionId:mission.missionId,dataOrigin:'synthetic',metric:'heart_rate',missionPhase:mission.missionPhase??'inflight',referenceBaselineId:baselineId,window:{from:mission.missionStart??'2026-01-01T00:00:00Z',to:new Date(Date.parse(mission.scenarioClock)+1).toISOString(),precision:'exact'},maximumGapSeconds:172800,cadenceSeconds:null};
 return {records,references,reference,request,evaluatedAt:mission.scenarioClock,result:await evaluateDemo(records,request,reference,mission.scenarioClock)};
}
export async function retainWorkflow(repo:Repository,crewId:string,baselineId:string|null){const view=await selectWorkflow(repo,crewId,baselineId);const command=await prepareDemoEvaluation(view.records,view.request,view.reference,view.evaluatedAt);if(command)await repo.execute(command);return !!command;}
