import {assertValid,failure,SCHEMA_VERSION,type Observation,type BaselineComputation,type PersonalComparisonEvidence,type ComparisonResult} from '../contracts';
import {canonicalJSON,sha256} from '../contracts/identity';
import {compareBaseline} from '../baselines';
import {buildComparisonKey} from '../metrics';

export const PERSONAL_COMPARISON_VERSION='personal-comparison/1';

/** Descriptive deltas; relativeDelta is a fraction. Percentage-point and affine-unit semantics remain distinct. */
export async function comparePersonal(current:Observation,reference:BaselineComputation|null):Promise<PersonalComparisonEvidence>{
 assertValid('Observation',current);if(reference)assertValid('BaselineComputation',reference);
 if(!current.astronautId)throw failure('REFERENCE_INVALID','A public cohort/subject is not a personal astronaut comparison.');
 let comparison:ComparisonResult;
 if(reference){
  comparison=await compareBaseline(current,reference);
  if(comparison.availability==='available'){
   const center=reference.baseline.center!;
   comparison.reasons=comparison.reasons.filter(r=>r!=='relative_delta_not_used_for_percentage_or_affine_unit');
   if(reference.baseline.unit==='Cel'){comparison.relativeDelta=null;comparison.reasons.push('relative_affine_unit_undefined');}
   else if(center<=0){comparison.relativeDelta=null;comparison.reasons.push('relative_reference_not_positive');}
   else {const ratio=comparison.absoluteDelta!/center;comparison.relativeDelta=Number.isFinite(ratio)?ratio:null;if(!Number.isFinite(ratio))comparison.reasons.push('relative_delta_not_finite');}
  }
 }else comparison={schemaVersion:SCHEMA_VERSION,namespace:current.namespace,recordType:'ComparisonResult',comparisonId:'pending',revision:1,astronautId:current.astronautId,metric:current.metric,observationIds:[current.observationId],baselineId:null,referenceIds:[],comparabilityKey:buildComparisonKey(current).key,availability:'baseline_unavailable',reasons:['explicit_reference_unavailable'],absoluteDelta:null,relativeDelta:null,percentagePointDelta:null,trend:null,sampleCount:0,coverage:0,qualitySummary:'Not evaluated without an explicit personal reference.',validationSummary:'Reference and coverage unavailable; zero is the legacy serialization fallback, not observed coverage.',algorithmVersion:PERSONAL_COMPARISON_VERSION};
 comparison.algorithmVersion=PERSONAL_COMPARISON_VERSION;
 comparison.comparisonId='personal_'+await sha256(canonicalJSON({current,reference,comparison:{...comparison,comparisonId:null}}));
 comparison.reasons=[...new Set(comparison.reasons)].sort();
 const result:PersonalComparisonEvidence={protocolVersion:PERSONAL_COMPARISON_VERSION,comparison,current:structuredClone(current),reference:reference?structuredClone(reference):null,coverage:reference?.detail.coverage??null,limitations:['Descriptive change only; no clinical severity or probability.','Relative change uses a positive denominator; a percentage-point difference is a distinct quantity.',...(reference?.detail.uncertainty??['reference_unavailable'])],operationalInterpretation:false};
 assertValid('PersonalComparisonEvidence',result);return result;
}
