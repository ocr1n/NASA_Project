import {
 assertValid, SCHEMA_VERSION, type Observation, type Baseline, type BaselineRequest,
 type BaselinePolicy, type BaselineComputation, type Exclusion
} from '../contracts';
import {canonicalJSON,sha256} from '../contracts/identity';
import {buildComparisonKey,metricRegistry} from '../metrics';
import {measurementContextIssues} from '../metrics/measurement-context';
import {calendarDate,exactInstant,validateCalculation} from './policy';

export const BASELINE_ALGORITHM='personal-baseline/1';
const sameOwner=(o:Observation,r:BaselineRequest)=>o.namespace===r.namespace&&o.astronautId===r.astronautId&&o.missionId===r.missionId&&o.dataOrigin===r.dataOrigin;
export const sourceIdentity=(o:Observation)=>canonicalJSON([o.namespace,o.source.sourceId,o.source.version,o.provenance.sourceRecordId]);
export const acquisitionIdentity=(o:Observation)=>o.acquisitionId?canonicalJSON([o.namespace,o.source.sourceId,o.source.version,o.acquisitionId]):null;

/** Same-unit location only. Preserve tiny same-sign values and avoid opposite-sign overflow. */
function median(values:number[]):number {
 const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);
 if(sorted.length%2)return sorted[middle];
 const left=sorted[middle-1],right=sorted[middle];
 return left<0&&right>0?left/2+right/2:left+(right-left)/2;
}
function eligibility(o:Observation,policy:BaselinePolicy,key:string|null):string|null {
 if(o.value===null)return 'measurement_missing';
 if(o.valueKind!=='number'||typeof o.value!=='number')return 'numeric_measurement_required';
 if(o.validation.admission!=='demo_only'||['conflict','rejected'].includes(o.validation.status))return 'admission_ineligible';
 if(o.quality.score===null||o.quality.lowConfidence||o.quality.score<policy.minimumQualityScore)return 'quality_insufficient';
 if(o.quality.flags.length)return 'unresolved_quality_flags';
 const issues=measurementContextIssues(o);if(issues.length)return 'acquisition_context_invalid:'+issues.join(';');
 const comparison=buildComparisonKey(o);
 if(comparison.availability!=='available')return comparison.reasons.join(';');
 return comparison.key===key?null:'acquisition_context_mismatch';
}

/** Pure calculation: UTC windows are half-open; no repository writes, imputation or clinical rules. */
export async function computeBaseline(
 observations:ReadonlyArray<Observation>,requestInput:BaselineRequest,policyInput:BaselinePolicy,calculatedAt:string
):Promise<BaselineComputation> {
 const request=structuredClone(requestInput),policy=structuredClone(policyInput);
 validateCalculation(request,policy,calculatedAt);
 const scoped=observations.filter(o=>sameOwner(o,request)&&o.metric===request.metric).map(o=>structuredClone(o));
 const byId=new Map<string,Observation>(),versions=new Map<string,Map<string,Observation>>(),conflictingIds=new Set<string>(),diagnostics:string[]=[],fatal:string[]=[];
 for(const o of scoped){
  assertValid<Observation>('Observation',o);
  const serialized=canonicalJSON(o),prior=byId.get(o.observationId);
  const variants=versions.get(o.observationId)??new Map<string,Observation>();variants.set(serialized,o);versions.set(o.observationId,variants);
  if(prior&&canonicalJSON(prior)!==serialized){
   conflictingIds.add(o.observationId);
   // Deterministic evidence representation only: a conflict cannot produce a numeric result.
   if(serialized<canonicalJSON(prior))byId.set(o.observationId,o);
  }
  else if(prior)continue;
  else byId.set(o.observationId,o);
 }
 const selector=byId.get(request.selectorObservationId);
 const selectedKey=selector?buildComparisonKey(selector):null;
 const key=selectedKey?.key??null;
 const seriesKey=key?canonicalJSON([key,request.missionId,request.missionPhase]):null;
 const current=request.currentObservationIds.map(id=>byId.get(id));
 const currentTimes=current.map(o=>o?.timePrecision==='exact'?exactInstant(o.timestamp):null);
 if(current.some(o=>!o))fatal.push('current_input_missing_or_wrong_owner');
 if(current.some(o=>o&&buildComparisonKey(o).key!==key))fatal.push('current_context_mismatch');
 if(request.method==='mission_rolling'&&current.some(o=>o&&o.measurementContext.missionPhase!==request.missionPhase))fatal.push('current_mission_phase_mismatch');
 if(request.method==='mission_rolling'&&currentTimes.some(t=>t===null))fatal.push('current_event_time_not_exact');
 const from=exactInstant(request.window.from),requestedTo=exactInstant(request.window.to);
 const exactCurrent=currentTimes.filter((t):t is number=>t!==null);
 const cutoff=request.method==='mission_rolling'&&exactCurrent.length?Math.min(...exactCurrent,requestedTo!):requestedTo;
 const effectiveWindow={...request.window,to:cutoff===null?null:new Date(cutoff).toISOString()};
 const inWindow=(o:Observation)=>{const t=exactInstant(o.timestamp);return t!==null&&from!==null&&requestedTo!==null&&t>=from&&t<requestedTo;};
 // Include correction ancestors/descendants even when a correction moves an event outside the window.
 const related=new Set([...byId.values()].filter(o=>request.method==='preflight_anchor'
  ?o.observationId===request.anchorObservationId
  :inWindow(o)||(o.timestamp===null&&o.measurementContext.missionPhase===request.missionPhase)).map(o=>o.observationId));
 // Selector/current records also affect compatibility, ordering and leakage, even outside the window.
 for(const id of [request.selectorObservationId,...request.currentObservationIds])if(byId.has(id))related.add(id);
 let grew=true;
 while(grew){
  grew=false;
  const relatedSources=new Set([...related].map(id=>sourceIdentity(byId.get(id)!)));
  const relatedAcquisitions=new Set([...related].map(id=>acquisitionIdentity(byId.get(id)!)).filter(Boolean));
  for(const o of byId.values()){
   if(!related.has(o.observationId)&&(relatedSources.has(sourceIdentity(o))||(acquisitionIdentity(o)&&relatedAcquisitions.has(acquisitionIdentity(o))))){related.add(o.observationId);grew=true;}
   if(o.supersedesObservationId&&(related.has(o.observationId)||related.has(o.supersedesObservationId)))
    for(const id of [o.observationId,o.supersedesObservationId])if(byId.has(id)&&!related.has(id)){related.add(id);grew=true;}
  }
 }
 const relevant=[...related].map(id=>byId.get(id)!).sort((a,b)=>a.observationId.localeCompare(b.observationId));
 for(const id of conflictingIds)if(related.has(id))fatal.push('input_identity_conflict:'+id);
 const excluded=new Map<string,string>();
 const exclude=(o:Observation,reason:string)=>{if(!excluded.has(o.observationId))excluded.set(o.observationId,reason);};
 const children=new Map<string,Observation[]>();
 for(const o of relevant)if(o.supersedesObservationId){
  const parent=byId.get(o.supersedesObservationId);
  if(!parent||parent.unit!==o.unit)exclude(o,'correction_target_missing_or_incompatible');
  else children.set(parent.observationId,[...(children.get(parent.observationId)??[]),o]);
 }
 const correctionComponent=(id:string):Set<string>=>{
  const result=new Set<string>(),pending=[id];
  while(pending.length){const next=pending.pop()!;if(result.has(next))continue;result.add(next);
   const node=byId.get(next);if(node?.supersedesObservationId&&byId.has(node.supersedesObservationId))pending.push(node.supersedesObservationId);
   for(const child of children.get(next)??[])pending.push(child.observationId);
  }return result;
 };
 for(const o of relevant){
  if(excluded.get(o.observationId)==='correction_target_missing_or_incompatible')
   for(const id of correctionComponent(o.observationId))exclude(byId.get(id)!,'correction_target_missing_or_incompatible');
  const seen=new Set<string>();let node:Observation|undefined=o;
  while(node){if(seen.has(node.observationId)){for(const id of correctionComponent(o.observationId))if(byId.has(id))exclude(byId.get(id)!,'correction_cycle');break;}
   seen.add(node.observationId);node=node.supersedesObservationId?byId.get(node.supersedesObservationId):undefined;
  }
  if((children.get(o.observationId)?.length??0)>1)for(const id of correctionComponent(o.observationId))exclude(byId.get(id)!,'correction_chain_conflict');
 }
 const currentLineage=new Set(request.currentObservationIds.flatMap(id=>[...correctionComponent(id)]));
 for(const id of request.currentObservationIds){
  if(children.has(id))fatal.push('current_input_superseded:'+id);
  if(excluded.has(id))fatal.push('current_correction_invalid:'+id);
 }
 const currentSources=new Set(current.filter((o):o is Observation=>!!o).map(sourceIdentity));
 const currentAcquisitions=new Set(current.filter((o):o is Observation=>!!o).map(acquisitionIdentity).filter(Boolean));
 // An unresolved explicit exclusion stays attached to its correction lineage until reviewed.
 for(const explicit of request.exclusions)if(related.has(explicit.observationId))
  for(const id of correctionComponent(explicit.observationId))exclude(byId.get(id)!,'explicit:'+explicit.reason);
 for(const o of relevant){
  if(excluded.has(o.observationId))continue;
  if(children.has(o.observationId)){exclude(o,'superseded_by:'+children.get(o.observationId)![0].observationId);continue;}
  if(currentLineage.has(o.observationId)||currentSources.has(sourceIdentity(o))||(acquisitionIdentity(o)&&currentAcquisitions.has(acquisitionIdentity(o)))){exclude(o,'current_input_or_copy');continue;}
  if(request.method==='preflight_anchor'&&o.observationId!==request.anchorObservationId){exclude(o,'not_selected_anchor');continue;}
  if(o.measurementContext.missionPhase!==request.missionPhase){exclude(o,'mission_phase_mismatch');continue;}
  const explicit=request.exclusions.find(e=>e.observationId===o.observationId);if(explicit){exclude(o,'explicit:'+explicit.reason);continue;}
  const t=exactInstant(o.timestamp),date=o.timePrecision==='date'?calendarDate(o.originalTime):null;
  if(request.method==='preflight_anchor'&&date){
   if(date>=calculatedAt.slice(0,10)){exclude(o,'anchor_calendar_order_unknown');continue;}
   if(request.window.precision==='exact'){exclude(o,'date_precision_cannot_enter_exact_window');continue;}
   if(current.some(c=>c&&(c.timestamp??'').slice(0,10)<=date)){exclude(o,'anchor_calendar_order_unknown');continue;}
  }else {
   if(o.timePrecision!=='exact'||t===null){exclude(o,'event_time_not_exact');continue;}
   if(request.window.precision==='exact'&&(from===null||cutoff===null||t<from||t>=cutoff)){exclude(o,'outside_effective_window');continue;}
   if(t>Date.parse(calculatedAt)){exclude(o,'event_time_after_calculation');continue;}
  }
  if(request.excludedPeriods.some(p=>t===null||t>=Date.parse(p.window.from!)&&t<Date.parse(p.window.to!))){exclude(o,'excluded_period:'+request.excludedPeriods.filter(p=>t===null||t>=Date.parse(p.window.from!)&&t<Date.parse(p.window.to!)).map(p=>p.reason).join(';'));continue;}
  const issue=eligibility(o,policy,key);if(issue){exclude(o,issue);continue;}
  if(!o.acquisitionId){exclude(o,'acquisition_identity_unknown');continue;}
 }
 // Duplicate source identities/acquisitions never add support; conflicts do not choose a winner.
 const leaves=relevant.filter(o=>!children.has(o.observationId)),remaining=new Set(leaves);
 // Source and acquisition identities form one transitive component. Two separate passes
 // can discard the surviving representative when duplicate relationships overlap.
 while(remaining.size){
  const first=remaining.values().next().value!,group=[first];remaining.delete(first);
  const sources=new Set([sourceIdentity(first)]),acquisitions=new Set([acquisitionIdentity(first)].filter(Boolean));
  let expanded=true;
  while(expanded){expanded=false;for(const o of remaining){
   const source=sourceIdentity(o),acquisition=acquisitionIdentity(o);
   if(sources.has(source)||acquisition!==null&&acquisitions.has(acquisition)){
    group.push(o);remaining.delete(o);sources.add(source);if(acquisition)acquisitions.add(acquisition);expanded=true;
   }
  }}
  if(group.length>1){
   const explicitlyExcluded=group.find(o=>excluded.get(o.observationId)?.startsWith('explicit:'));
   if(explicitlyExcluded){
    for(const o of group)exclude(o,excluded.get(explicitlyExcluded.observationId)!);
    continue;
   }
   const signature=(o:Observation)=>canonicalJSON([o.value,o.unit,o.timestamp,o.originalTime,o.timePrecision,buildComparisonKey(o).key,o.measurementContext.missionPhase,o.quality,o.validation.status,o.validation.admission]);
   if(group.some(o=>signature(o)!==signature(group[0])))for(const o of group)exclude(o,'duplicate_identity_conflict');
   else {
    const retained=group.find(o=>!excluded.has(o.observationId)&&o.observationId===request.anchorObservationId)??group.find(o=>!excluded.has(o.observationId))??group[0];
    for(const o of group)if(o!==retained)exclude(o,'duplicate_identity:'+retained.observationId);
   }
  }
 }
 const included=relevant.filter(o=>!excluded.has(o.observationId)).sort((a,b)=>(a.timestamp??a.originalTime??'').localeCompare(b.timestamp??b.originalTime??'')||a.observationId.localeCompare(b.observationId));
 let status:Baseline['status']='available',reasons:string[]=[];
 if(policy.demoOnly&&(request.namespace!=='demo'||request.dataOrigin!=='synthetic')){status='unsupported';reasons=['operational_method_support_unverified'];}
 else if(fatal.length){status='invalid';reasons=[...new Set(fatal)].sort();}
 else if(!selector){status='baseline_unavailable';reasons=['selector_missing_or_wrong_owner'];}
 else if(selectedKey?.availability!=='available'){status='incomparable';reasons=selectedKey?.reasons??['selector_context_unknown'];}
 else if(!metricRegistry[request.metric].valueKinds.includes('number')){status='unsupported';reasons=['numeric_metric_required'];}
 else if(included.length<(request.method==='preflight_anchor'?1:policy.minimumSamples)){status=included.length?'insufficient_data':'baseline_unavailable';reasons=['insufficient_comparable_support'];}
 const center=status==='available'?median(included.map(o=>o.value as number)):null;
 const spread=status==='available'&&request.method!=='preflight_anchor'&&included.length>=policy.minimumSpreadSamples?median(included.map(o=>Math.abs((o.value as number)-center!))):null;
 if((center!==null&&!Number.isFinite(center))||(spread!==null&&!Number.isFinite(spread))){status='invalid';reasons=['numeric_result_not_finite'];}
 const evidenceRecords=relevant.flatMap(o=>[...versions.get(o.observationId)!.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([,v])=>v));
 const inputRecords=await Promise.all(evidenceRecords.map(async o=>({
  observationId:o.observationId,hash:await sha256(canonicalJSON(o)),sourceId:o.source.sourceId,sourceVersion:o.source.version,
  sourceRecordId:o.provenance.sourceRecordId,rawRecordId:o.provenance.rawRecordId,acquisitionId:o.acquisitionId,
  timestamp:o.timestamp,originalTime:o.originalTime,timePrecision:o.timePrecision
 })));
 const inputHash=await sha256(canonicalJSON({algorithm:BASELINE_ALGORITHM,request,policy,key,effectiveWindow,inputRecords,
  selection:{status,reasons,included:included.map(o=>o.observationId),exclusions:[...excluded].sort(([a],[b])=>a.localeCompare(b))}}));
 const countWindow=from!==null&&cutoff!==null&&cutoff>from&&policy.cadenceSeconds!==null&&request.method!=='preflight_anchor';
 const expectedSlots=countWindow?Math.ceil((cutoff!-from!)/(policy.cadenceSeconds!*1000)):null;
 const occupiedSlots=countWindow?new Set(included.map(o=>Math.floor((Date.parse(o.timestamp!)-from!)/(policy.cadenceSeconds!*1000)))).size:null;
 const detail:BaselineComputation['detail']={
  protocolVersion:'baseline-computation/1',request,policy,inputHash,seriesKey,operationalInterpretation:false,effectiveWindow,
  expectedSlots,occupiedSlots,coverage:expectedSlots===null?null:occupiedSlots!/expectedSlots,
  uncertainty:['demo_support_not_clinically_validated',...(request.method==='preflight_anchor'?['single_exam_no_variability']:spread===null?['spread_support_insufficient']:['raw_mad_not_confidence_interval']),...(expectedSlots===null?['coverage_unknown_without_cadence']:['coverage_counts_observed_slots_not_continuous_signal'])],
  diagnostics:[...new Set(diagnostics)].sort(),inputRecords
 };
 const hasDate=included.some(o=>o.timePrecision==='date');
 const baseline:Baseline={
  schemaVersion:SCHEMA_VERSION,namespace:request.namespace,recordType:'Baseline',baselineId:'baseline_'+request.method+'_'+inputHash,revision:1,
  astronautId:request.astronautId,metric:request.metric,unit:metricRegistry[request.metric].canonicalUnit,comparabilityKey:key,comparabilityVersion:SCHEMA_VERSION,
  method:request.method,observationIds:included.map(o=>o.observationId),window:{from:hasDate?null:included[0]?.timestamp??null,to:hasDate?null:included.at(-1)?.timestamp??null,precision:hasDate?'date':included.length?'exact':'unknown'},
  sampleCount:included.length,center:status==='available'?center:null,spread:status==='available'?spread:null,
  qualityCriteria:canonicalJSON({minimumScore:policy.minimumQualityScore,lowConfidence:false,unresolvedFlags:false,demoOnly:true}),
  admissionCriteria:'demo_only; method support is fictional',exclusions:[...excluded].map(([observationId,reason]):Exclusion=>({observationId,reason})).sort((a,b)=>a.observationId.localeCompare(b.observationId)),
  calculatedAt,algorithmVersion:BASELINE_ALGORITHM,status,reasons
 };
 const result={baseline,detail};assertValid<BaselineComputation>('BaselineComputation',result);return result;
}
