import {assertValid,failure,type BaselineRequest,type BaselinePolicy,type Observation,type BaselineComputation,type ComparisonResult} from '../contracts';
import {canonicalJSON,sha256} from '../contracts/identity';
import {buildComparisonKey} from '../metrics';
import {measurementContextIssues} from '../metrics/measurement-context';
import type {Repository} from '../repositories/repository';
import {computeBaseline,BASELINE_ALGORITHM,acquisitionIdentity,sourceIdentity} from './compute';
import {demoBaselinePolicy,exactInstant,calendarDate} from './policy';
export {computeBaseline,BASELINE_ALGORITHM,demoBaselinePolicy};
export {prepareBaselineSave,saveBaselineCalculation,readBaselineHistory,type PreparedBaselineSave} from './persistence';

/** One committed snapshot; no writes. Canonical clock/time/source evidence stays explicit. */
export async function calculateBaseline(
 repo:Pick<Repository,'export'>,request:BaselineRequest,policy:BaselinePolicy=structuredClone(demoBaselinePolicy)
):Promise<BaselineComputation>{
 assertValid('BaselineRequest',request);
 const snapshot=await repo.export(request.namespace);
 const crew=snapshot.records.find(r=>r.recordType==='CrewProfile'&&r.astronautId===request.astronautId);
 const mission=snapshot.records.find(r=>r.recordType==='MissionContext'&&r.missionId===request.missionId);
 if(!crew||crew.recordType!=='CrewProfile'||!mission||mission.recordType!=='MissionContext'||crew.missionId!==request.missionId||crew.profileOrigin!==request.dataOrigin||mission.dataOrigin!==request.dataOrigin)
  throw failure('REFERENCE_INVALID','Baseline request differs from the committed crew/mission/origin.');
 return computeBaseline(snapshot.records.filter((r):r is Observation=>r.recordType==='Observation'),request,policy,snapshot.exportedAt);
}

/** Descriptive same-unit difference only; relativeDelta is a fraction, never a clinical score. */
export async function compareBaseline(current:Observation,computed:BaselineComputation):Promise<ComparisonResult>{
 assertValid<Observation>('Observation',current);assertValid<BaselineComputation>('BaselineComputation',computed);
 const b=computed.baseline,r=computed.detail.request;
 let availability:ComparisonResult['availability']=b.status,reasons=[...b.reasons];
 const reject=(state:ComparisonResult['availability'],reason:string)=>{availability=state;reasons.push(reason);};
 const key=buildComparisonKey(current);
 if(current.namespace!==r.namespace||current.astronautId!==r.astronautId||current.missionId!==r.missionId||current.dataOrigin!==r.dataOrigin)reject('incomparable','owner_mission_origin_mismatch');
 else if(current.metric!==b.metric||current.unit!==b.unit||key.availability!=='available'||key.key!==b.comparabilityKey)reject('incomparable','acquisition_context_mismatch');
 else if(r.method==='mission_rolling'&&current.measurementContext.missionPhase!==r.missionPhase)reject('incomparable','mission_phase_mismatch');
 else if(!current.measurementContext.missionPhase?.trim()||current.measurementContext.missionPhase==='unknown')reject('incomparable','current_mission_phase_unknown');
 else if(current.valueKind!=='number'||typeof current.value!=='number'||current.timePrecision!=='exact'||exactInstant(current.timestamp)===null)reject('insufficient_data','current_value_or_exact_time_unavailable');
 else if(Date.parse(current.timestamp!)>Date.parse(b.calculatedAt))reject('insufficient_data','current_event_after_calculation');
 else if(current.quality.score===null||current.quality.lowConfidence||current.quality.score<computed.detail.policy.minimumQualityScore||current.quality.flags.length||current.validation.admission!=='demo_only'||['conflict','rejected'].includes(current.validation.status)||measurementContextIssues(current).length)reject('insufficient_data','current_quality_or_admission_insufficient');
 const source=sourceIdentity(current),acquisition=acquisitionIdentity(current);
 if(current.supersedesObservationId&&!r.currentObservationIds.includes(current.observationId))reject('incomparable','corrected_current_requires_reference_recomputation');
 if(computed.detail.inputRecords.some(i=>b.observationIds.includes(i.observationId)&&(
  i.observationId===current.observationId||
  canonicalJSON([r.namespace,i.sourceId,i.sourceVersion,i.sourceRecordId])===source||
  acquisition!==null&&canonicalJSON([r.namespace,i.sourceId,i.sourceVersion,i.acquisitionId])===acquisition
 )))reject('incomparable','current_input_or_copy_is_reference');
 const referenceTimes=computed.detail.inputRecords.filter(i=>b.observationIds.includes(i.observationId));
 if(referenceTimes.some(i=>i.timestamp!==null&&Date.parse(i.timestamp)>=Date.parse(current.timestamp??'')))reject('incomparable','reference_not_before_current');
 if(referenceTimes.some(i=>i.timePrecision==='date'&&(!calendarDate(i.originalTime)||i.originalTime!>=(current.timestamp??'').slice(0,10))))reject('incomparable','anchor_calendar_order_unknown');
 const difference=availability==='available'?(current.value as number)-b.center!:null;
 if(difference!==null&&!Number.isFinite(difference))reject('invalid','numeric_difference_not_finite');
 let relative:number|null=null;
 if(availability==='available'){
  if(b.unit==='%'||b.unit==='Cel')reasons.push('relative_delta_not_used_for_percentage_or_affine_unit');
  else if(b.center===0)reasons.push('reference_zero_relative_undefined');
  else {relative=difference!/b.center!;if(!Number.isFinite(relative)){relative=null;reasons.push('relative_delta_not_finite');}}
 }
 const hash=await sha256(canonicalJSON({algorithm:BASELINE_ALGORITHM,current,baselineId:b.baselineId,inputHash:computed.detail.inputHash}));
 const result:ComparisonResult={
  schemaVersion:b.schemaVersion,namespace:r.namespace,recordType:'ComparisonResult',comparisonId:'comparison_'+hash,revision:1,
  astronautId:r.astronautId,metric:b.metric,observationIds:[current.observationId],baselineId:b.baselineId,referenceIds:[],
  comparabilityKey:key.key,availability,reasons:[...new Set(reasons)].sort(),
  absoluteDelta:availability==='available'?difference:null,relativeDelta:availability==='available'?relative:null,
  percentagePointDelta:availability==='available'&&b.unit==='%'?difference:null,trend:null,
  sampleCount:b.sampleCount,coverage:computed.detail.coverage??0,
  qualitySummary:'demo_only; known quality and no unresolved flags required',
  validationSummary:'Descriptive software calculation; operational interpretation disabled'+(computed.detail.coverage===null?'; coverage unknown (serialized as 0, not complete coverage)':''),
  algorithmVersion:BASELINE_ALGORITHM
 };
 assertValid<ComparisonResult>('ComparisonResult',result);return result;
}
