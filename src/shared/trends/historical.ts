import {assertValid,type HistoricalCohort,type HistoricalComparison} from '../contracts';
import {metricRegistry} from '../metrics';

/** Separate cohort context only; no astronaut identity, severity, causal inference or personal reference graph. */
export function compareHistoricalCohorts(left:HistoricalCohort|null,right:HistoricalCohort|null):HistoricalComparison{
 if(left)assertValid('HistoricalCohort',left);if(right)assertValid('HistoricalCohort',right);
 let availability:HistoricalComparison['availability']='available';const reasons:string[]=[];
 if(!left||!right){availability='baseline_unavailable';reasons.push('audited_compatible_historical_pair_unavailable');}
 else if(left.dataOrigin!=='synthetic'||right.dataOrigin!=='synthetic'){availability='unsupported';reasons.push('real_historical_pair_not_audited_or_admitted');}
 else {
  if(left.cohortId===right.cohortId){availability='incomparable';reasons.push('same_cohort_is_not_an_independent_comparison');}
  for(const field of ['species','population','missionDurationDays','metric','unit','modality','protocolId','deviceId','assay','statistic'] as const){
   const unknown=(value:unknown)=>value===null||typeof value==='string'&&(!value.trim()||['unknown','not_reported','unreported'].includes(value.trim().toLowerCase()));
   if(unknown(left[field])||unknown(right[field])||left[field]!==right[field]){availability='incomparable';reasons.push('historical_context_mismatch:'+field);}
  }
  if(left.unit!==metricRegistry[left.metric].canonicalUnit||right.unit!==metricRegistry[right.metric].canonicalUnit){availability='incomparable';reasons.push('canonical_unit_required');}
  if([left,right].some(c=>c.value===null||c.sampleSize===null||!c.sources.length||c.admission!=='demo_only'||['conflict','rejected'].includes(c.validationStatus))){availability='insufficient_data';reasons.push('cohort_value_support_or_source_unavailable');}
 }
 let absoluteDelta=availability==='available'?right!.value!-left!.value!:null;
 if(absoluteDelta!==null&&!Number.isFinite(absoluteDelta)){availability='invalid';absoluteDelta=null;reasons.push('numeric_difference_not_finite');}
 let relativeDelta:number|null=null;
 if(availability==='available'){
  if(left!.unit==='Cel')reasons.push('relative_affine_unit_undefined');
  else if(left!.value!<=0)reasons.push('relative_reference_not_positive');
  else {const ratio=absoluteDelta!/left!.value!;if(Number.isFinite(ratio))relativeDelta=ratio;else reasons.push('relative_delta_not_finite');}
 }
 const result:HistoricalComparison={protocolVersion:'historical-comparison/1',left:left?structuredClone(left):null,right:right?structuredClone(right):null,availability,reasons:[...new Set(reasons)].sort(),absoluteDelta,relativeDelta,percentagePointDelta:availability==='available'&&left!.unit==='%'?absoluteDelta:null,limitations:[...new Set(['Descriptive cohort difference; no causal spaceflight effect, biological evolution, clinical interval or emergency threshold.',...(left?.limitations??[]),...(right?.limitations??[])])],algorithmVersion:'historical-context-comparison/1',operationalInterpretation:false};
 assertValid('HistoricalComparison',result);return result;
}
