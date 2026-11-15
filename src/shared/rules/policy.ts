import type { Observation, ThresholdRule, Assessment, AtlasHighlight, AtlasRegionManifest } from '../contracts';
import { metricRegistry, buildComparisonKey } from '../metrics';
import {measurementContextIssues} from '../metrics/measurement-context';
export const sourcePolicy=Object.freeze({minimumIndependentLineages:2,preferredIndependentLineages:3,automaticAdmissions:['assessment_eligible'] as const,productionRules:[] as ThresholdRule[]});
/** Availability means eligible input, never "healthy". Quality scores are dimensionless in [0,1]. */
export function assessmentEligibility(o:Observation,minimumScore?:number):{availability:'available'|'insufficient_data'|'incomparable'|'unsupported'|'invalid';reasons:string[]} {
 const reasons:string[]=[];
 if(o.timestamp===null||o.timePrecision!=='exact')reasons.push('event_time_not_exact');
 if(o.value===null)reasons.push('measurement_missing');
 if(o.quality.score===null||o.quality.lowConfidence||(minimumScore!==undefined&&o.quality.score!<minimumScore))reasons.push('quality_insufficient');
 if(reasons.length)return {availability:'insufficient_data',reasons};
 if(o.validation.admission==='quarantined')return {availability:'invalid',reasons:['input_quarantined']};
 const acquisitionIssues=measurementContextIssues(o);if(acquisitionIssues.length)return {availability:'incomparable',reasons:acquisitionIssues};
 if(o.dataOrigin==='public_research')return {availability:'unsupported',reasons:['research_not_personal_assessment']};
 if(o.dataOrigin!=='synthetic'&&(o.validation.status!=='verified'||o.validation.admission!=='assessment_eligible'||metricRegistry[o.metric]?.definitionStatus!=='verified'))return {availability:'insufficient_data',reasons:['scientific_admission_pending']};
 const key=buildComparisonKey(o);if(key.availability!=='available')return {availability:'incomparable',reasons:key.reasons};
 return {availability:'available',reasons:[]};
}
/** Viewer eligibility only; later rule engines supply assessments and evidence, never meshes. */
export function highlightEligibility(h:AtlasHighlight,a:Assessment|null,rule:ThresholdRule|null,observations:Observation[],manifest:AtlasRegionManifest):{visible:boolean;reason:string} {
 if(h.status==='cleared')return {visible:false,reason:'cleared'};
 const region=manifest.regions.find(r=>r.regionKey===h.regionKey&&r.layer===h.layer);
 if(h.kind==='reported_site')return region?.verified&&region.structureIds.length?{visible:true,reason:'reported_site'}:{visible:false,reason:'unmapped'};
 if(!a||!rule||a.assessmentId!==h.assessmentId||a.ruleId!==rule.ruleId||h.ruleId!==rule.ruleId||a.ruleVersion!==rule.version||h.ruleVersion!==rule.version||a.astronautId!==h.astronautId||a.mode!==h.mode||a.dataOrigin!==h.dataOrigin||a.severity!==h.severity||rule.severity!==h.severity)return {visible:false,reason:'assessment_rule_mismatch'};
 if(rule.regionMapping.regionKey!==h.regionKey||rule.regionMapping.layer!==h.layer)return {visible:false,reason:'region_mapping_mismatch'};
 if(observations.length!==h.observationIds.length||h.observationIds.some(id=>!a.observationIds.includes(id)||!observations.some(o=>o.observationId===id)))return {visible:false,reason:'assessment_evidence_mismatch'};
 if(!a||!rule||a.availability!=='available'||!a.sustained||!a.localizationSupported||!rule.regionMapping.localizing||!['warning','critical'].includes(h.severity))return {visible:false,reason:'localization_or_persistence_insufficient'};
 if(!observations.length||observations.some(o=>o.astronautId!==h.astronautId||assessmentEligibility(o,rule.qualityGate.minimumScore).availability!=='available'))return {visible:false,reason:'evidence_insufficient'};
 const acquisitions=new Set(observations.map(o=>o.acquisitionId).filter(Boolean));
 const times=observations.map(o=>Date.parse(o.timestamp!));
 if(acquisitions.size<rule.persistence.minimumIndependentSamples||(Math.max(...times)-Math.min(...times))/1000<rule.persistence.minimumSeconds)return {visible:false,reason:'persistence_insufficient'};
 if(rule.demoOnly && (h.mode!=='demo'||observations.some(o=>o.dataOrigin!=='synthetic')))return {visible:false,reason:'demo_isolation'};
 if(!region?.verified||region.structureIds.length===0)return {visible:false,reason:'unmapped'};
 return {visible:true,reason:'supported'};
}
