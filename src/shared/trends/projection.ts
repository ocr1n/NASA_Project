import {assertValid,failure,type CanonicalRecord,type Observation,type BaselineComputation,type TrendRequest,type TrendPoint,type TrendProjection} from '../contracts';
import {canonicalJSON,sha256} from '../contracts/identity';
import {buildComparisonKey,metricRegistry} from '../metrics';
import {assessmentEligibility} from '../rules/policy';
import {demoBaselinePolicy} from '../baselines';
import {sourceIdentity,acquisitionIdentity} from '../baselines/compute';
import {exactInstant,calendarDate} from '../baselines/policy';
import {comparePersonal} from './personal';

export const TREND_VERSION='observed-personal-trend/1';

/** Canonical events to sparse points. Window/gap/cadence are seconds/UTC configuration, never medical constants. */
export async function projectPersonalTrend(records:ReadonlyArray<CanonicalRecord>,input:TrendRequest,reference:BaselineComputation|null):Promise<TrendProjection>{
 assertValid('TrendRequest',input);const request=structuredClone(input),from=exactInstant(request.window.from),to=exactInstant(request.window.to);
 if(request.window.precision!=='exact'||from===null||to===null||from>=to||!request.missionPhase.trim()||request.missionPhase==='unknown')throw failure('VALIDATION_FAILED','Trend projection needs an ordered exact UTC window and known mission phase.');
 if(reference&&(reference.baseline.baselineId!==request.referenceBaselineId||reference.detail.request.astronautId!==request.astronautId||reference.detail.request.missionId!==request.missionId||reference.detail.request.namespace!==request.namespace||reference.detail.request.dataOrigin!==request.dataOrigin||reference.baseline.metric!==request.metric))throw failure('REFERENCE_INVALID','Trend reference differs from the explicitly selected owner, mission, metric or ID.');
 const scoped=records.filter((r):r is Observation=>r.recordType==='Observation'&&r.namespace===request.namespace&&r.astronautId===request.astronautId&&r.missionId===request.missionId&&r.dataOrigin===request.dataOrigin&&r.metric===request.metric);
 const byId=new Map<string,Observation>(),conflicts=new Set<string>();
 for(const o of scoped){assertValid('Observation',o);const old=byId.get(o.observationId);if(old&&canonicalJSON(old)!==canonicalJSON(o)){conflicts.add(o.observationId);if(canonicalJSON(o)<canonicalJSON(old))byId.set(o.observationId,o);}else if(!old)byId.set(o.observationId,o);}
 const children=new Map<string,string[]>();for(const o of byId.values())if(o.supersedesObservationId)children.set(o.supersedesObservationId,[...(children.get(o.supersedesObservationId)??[]),o.observationId]);
 const invalid=new Map<string,string>();
 const quarantine=(seeds:string[],reason:string)=>{
  const pending=[...seeds],seen=new Set<string>();
  while(pending.length){const id=pending.pop()!;if(seen.has(id))continue;seen.add(id);
   if(byId.has(id))invalid.set(id,conflicts.has(id)?'input_identity_conflict':reason);
   for(const variant of scoped.filter(o=>o.observationId===id)){
    const source=sourceIdentity(variant),acquisition=acquisitionIdentity(variant);
    pending.push(...scoped.filter(o=>sourceIdentity(o)===source||acquisition!==null&&acquisitionIdentity(o)===acquisition).map(o=>o.observationId));
    if(variant.supersedesObservationId)pending.push(variant.supersedesObservationId);
   }
   pending.push(...(children.get(id)??[]));
  }
 };
 for(const o of byId.values()){
  if(conflicts.has(o.observationId))invalid.set(o.observationId,'input_identity_conflict');
  const seen=new Set<string>();let node:Observation|undefined=o;
  while(node){
   if(seen.has(node.observationId)){invalid.set(o.observationId,'correction_cycle');break;}seen.add(node.observationId);
   if((children.get(node.observationId)?.length??0)>1){invalid.set(o.observationId,'correction_chain_conflict');break;}
   const parent:Observation|undefined=node.supersedesObservationId?byId.get(node.supersedesObservationId):undefined;
   if(node.supersedesObservationId&&(!parent||parent.unit!==node.unit)){invalid.set(o.observationId,'correction_target_missing_or_incompatible');break;}
   node=parent;
  }
  if(children.has(o.observationId)&&!invalid.has(o.observationId))invalid.set(o.observationId,'superseded_observation');
 }
 quarantine([...invalid].filter(([,reason])=>reason!=='superseded_observation').map(([id])=>id),'unresolved_correction_or_identity_component');
 // Source and acquisition connections are transitive; copies cannot add independent support.
 const remaining=new Set([...byId.values()].filter(o=>!invalid.has(o.observationId)).sort((a,b)=>a.observationId.localeCompare(b.observationId)));
 while(remaining.size){
  const first=remaining.values().next().value!,group=[first],sources=new Set([sourceIdentity(first)]),acquisitions=new Set([acquisitionIdentity(first)].filter(Boolean));remaining.delete(first);
  let grew=true;while(grew){grew=false;for(const o of remaining){const acquisition=acquisitionIdentity(o);if(sources.has(sourceIdentity(o))||acquisition!==null&&acquisitions.has(acquisition)){group.push(o);remaining.delete(o);sources.add(sourceIdentity(o));if(acquisition)acquisitions.add(acquisition);grew=true;}}}
  const signature=(o:Observation)=>canonicalJSON([o.value,o.unit,o.timestamp,o.originalTime,o.timePrecision,buildComparisonKey(o).key,o.measurementContext.missionPhase,o.quality,o.validation.status,o.validation.admission]);
  if(group.some(o=>signature(o)!==signature(first)))quarantine(group.map(o=>o.observationId),'duplicate_identity_conflict');
  else for(const o of group.slice(1))invalid.set(o.observationId,'duplicate_identity:'+first.observationId);
 }
 const visible=[...byId.values()].filter(o=>{const t=exactInstant(o.timestamp);if(t!==null)return t>=from&&t<to;const date=calendarDate(o.originalTime);return o.measurementContext.missionPhase===request.missionPhase&&(!date||date>=request.window.from!.slice(0,10)&&date<=request.window.to!.slice(0,10));}).sort((a,b)=>{
  const first=exactInstant(a.timestamp),second=exactInstant(b.timestamp);
  const day=(a.timestamp??a.originalTime??'').slice(0,10).localeCompare((b.timestamp??b.originalTime??'').slice(0,10));
  return day||(first===null?0:1)-(second===null?0:1)||(first!==null&&second!==null?first-second:0)||a.observationId.localeCompare(b.observationId);
 });
 const points:TrendPoint[]=await Promise.all(visible.map(async o=>{
  const key=buildComparisonKey(o),gate=assessmentEligibility(o,demoBaselinePolicy.minimumQualityScore);
  let availability:TrendPoint['availability']=gate.availability,reasons=[...gate.reasons];
  if(invalid.has(o.observationId)){availability='invalid';reasons.push(invalid.get(o.observationId)!);}
  else if(o.validation.admission!=='demo_only'||['conflict','rejected'].includes(o.validation.status)){availability='invalid';reasons.push('input_not_admitted');}
  else if(o.quality.flags.length){availability='insufficient_data';reasons.push('unresolved_quality_flags');}
  else if(o.acquisitionId===null){availability='insufficient_data';reasons.push('acquisition_identity_unknown');}
  else if(o.valueKind!=='number'||typeof o.value!=='number'){availability='insufficient_data';reasons.push('numeric_measurement_required');}
  else if(o.unit!==metricRegistry[o.metric].canonicalUnit){availability='incomparable';reasons.push('canonical_unit_required');}
  else if(o.measurementContext.missionPhase!==request.missionPhase){availability='incomparable';reasons.push('mission_phase_mismatch');}
  const seriesKey=key.key?await sha256(canonicalJSON([key.key,request.missionId,o.measurementContext.missionPhase])):null;
  const linkedReports=records.filter(r=>r.recordType==='Report'&&r.namespace===request.namespace&&r.astronautId===request.astronautId&&r.observationIds.includes(o.observationId)).map(r=>r.recordType==='Report'?r.reportId:'');
  const repeatTaskIds=records.filter(r=>r.recordType==='FollowUpTask'&&r.namespace===request.namespace&&r.astronautId===request.astronautId&&r.type==='repeat_measurement'&&(r.completionObservationIds.includes(o.observationId)||r.completionReportIds.some(id=>linkedReports.includes(id)))).map(r=>r.recordType==='FollowUpTask'?r.taskId:'').sort();
  return {observation:structuredClone(o),seriesKey,availability,reasons:[...new Set(reasons)].sort(),segment:null,comparison:reference&&availability==='available'?await comparePersonal(o,reference):null,reportId:o.reportId,sessionId:o.sessionId,repeatTaskIds};
 }));
 const series:TrendProjection['series']=[],keys=[...new Set(points.map(p=>p.seriesKey).filter((key):key is string=>key!==null))].sort();let nextSegment=0;
 const unknownOrder=points.some(point=>exactInstant(point.observation.timestamp)===null);
 for(const seriesKey of keys){
  const group=points.filter(p=>p.seriesKey===seriesKey),valid=group.filter(p=>p.availability==='available'&&p.observation.timestamp!==null);
  let previous:TrendPoint|null=null,segment:number|null=null;
  for(const point of group){
   if(point.availability!=='available'||point.observation.timestamp===null){previous=null;segment=null;continue;}
   const elapsed=previous?Date.parse(point.observation.timestamp)-Date.parse(previous.observation.timestamp!):null;
   const interrupted=previous&&points.slice(points.indexOf(previous)+1,points.indexOf(point)).some(other=>other.seriesKey!==seriesKey||other.availability!=='available');
   if(!previous||unknownOrder||request.maximumGapSeconds===null||elapsed!<=0||elapsed!>request.maximumGapSeconds*1000||interrupted)segment=nextSegment++;
   point.segment=segment;previous=point;
  }
  let slopePerDay:number|null=null;
  if(valid.length>=2){const start=Date.parse(valid[0].observation.timestamp!),xs=valid.map(p=>(Date.parse(p.observation.timestamp!)-start)/86400000),ys=valid.map(p=>p.observation.value as number),meanX=xs.reduce((a,b)=>a+b/xs.length,0),meanY=ys.reduce((a,b)=>a+b/ys.length,0),denominator=xs.reduce((sum,x)=>sum+(x-meanX)**2,0),numerator=xs.reduce((sum,x,i)=>sum+(x-meanX)*(ys[i]-meanY),0),slope=numerator/denominator;if(denominator>0&&Number.isFinite(slope))slopePerDay=slope;}
  const slots=request.cadenceSeconds===null?null:Math.ceil((to-from)/(request.cadenceSeconds*1000));
  if(slots!==null&&!Number.isSafeInteger(slots))throw failure('VALIDATION_FAILED','Coverage window exceeds supported slot representation.');
  const occupied=slots===null?null:new Set(valid.map(p=>Math.floor((Date.parse(p.observation.timestamp!)-from)/(request.cadenceSeconds!*1000)))).size;
  series.push({seriesKey,metric:request.metric,unit:metricRegistry[request.metric].canonicalUnit,missionPhase:request.missionPhase,sampleCount:valid.length,slopePerDay,slopeUnit:slopePerDay===null?null:`${metricRegistry[request.metric].canonicalUnit}/d`,coverage:slots===null?null:occupied!/slots,limitations:['Observed-point OLS only; no forecast, imputation, confidence interval or clinical interpretation.',...(slots===null?['coverage_unknown_without_cadence']:['coverage_counts_observed_slots_not_continuous_signal']),...(request.maximumGapSeconds===null?['gap_policy_unknown_points_disconnected']:[]),...(unknownOrder?['event_order_uncertain_points_disconnected']:[])]});
 }
 const result:TrendProjection={protocolVersion:'trend-projection/1',request,reference:reference?structuredClone(reference):null,points,series,reasons:request.referenceBaselineId&&!reference?['reference_not_retained']:[],algorithmVersion:TREND_VERSION,operationalInterpretation:false};
 assertValid('TrendProjection',result);return result;
}
