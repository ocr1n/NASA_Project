import {assertValid,failure,type TrendRequest} from '../contracts';
import {BASELINE_MEDIA,baselineEvidence} from '../contracts/baselines';
import type {Repository} from '../repositories/repository';
import {projectPersonalTrend} from '../trends/projection';

/** One committed snapshot; an explicitly selected saved reference is never replaced with another method/crew. */
export async function selectPersonalTrend(repo:Pick<Repository,'export'>,request:TrendRequest){
 assertValid('TrendRequest',request);
 const snapshot=await repo.export(request.namespace);
 const crew=snapshot.records.find(r=>r.recordType==='CrewProfile'&&r.astronautId===request.astronautId);
 const mission=snapshot.records.find(r=>r.recordType==='MissionContext'&&r.missionId===request.missionId);
 if(!crew||crew.recordType!=='CrewProfile'||crew.missionId!==request.missionId||crew.profileOrigin!==request.dataOrigin||!mission||mission.recordType!=='MissionContext'||mission.dataOrigin!==request.dataOrigin)throw failure('REFERENCE_INVALID','Trend selection differs from its committed crew/mission/origin.');
 const saved=snapshot.records.filter(r=>r.recordType==='RawRecord'&&r.mediaType===BASELINE_MEDIA).map(raw=>{if(raw.recordType!=='RawRecord')throw failure('REFERENCE_INVALID','Reference evidence is not raw data.');return baselineEvidence(raw);}).filter(e=>e.computation.baseline.baselineId===request.referenceBaselineId).sort((a,b)=>b.sequence-a.sequence)[0];
 return projectPersonalTrend(snapshot.records,request,saved?.computation??null);
}
