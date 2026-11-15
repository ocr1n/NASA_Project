import {failure,type Observation} from '../contracts';
import {canonicalJSON} from '../contracts/identity';

export const MEASUREMENT_PIPELINE='measurement-capture/03.1';
export const microgravityMassMethods=Object.freeze(['inertial_mass_device','oscillation_mass_device','labeled_mass_report'] as const);
const known=(value:unknown):boolean=>typeof value==='string'&&!!value.trim()&&value!=='unknown';
const bp=(o:Observation)=>o.metric==='bp_systolic'||o.metric==='bp_diastolic';

/** Acquisition meaning only. Reasons are not diagnoses, severity or population limits. */
export function measurementContextIssues(o:Observation):string[]{
 if(o.value===null)return [];
 const m=o.measurementContext,p=o.provenance.parameters,issues:string[]=[];
 if(o.metric==='blood_glucose'){
  if(p.analyte!=='glucose')issues.push('Reported analyte must be glucose; otherwise mark the measurement missing.');
  if(!known(m.mealContext)||!known(m.method))issues.push('Glucose needs reported meal context and acquisition method.');
 }
 if(['vo2_relative','vo2max_relative','vo2_absolute'].includes(o.metric)){
  if(!['measured','estimated'].includes(String(p.resultBasis)))issues.push('VO2 needs an explicit measured or estimated result basis.');
  if(!known(m.method)||!known(m.protocolId))issues.push('VO2 needs its reported test method and protocol.');
 }
 if(o.metric==='bone_mineral_density'&&(m.modality!=='dxa'||!known(m.site)||!known(m.deviceId)||!known(m.method)))issues.push('Density needs a site-specific DXA report/device path; muscle thickness is not DXA density.');
 if(o.metric==='body_mass'&&m.gravityCondition==='microgravity'&&!microgravityMassMethods.some(method=>method===m.method))issues.push('Microgravity mass needs an appropriate mass device or labeled mass report; an ordinary Earth scale is incompatible.');
 if(m.scale&&(m.scale.low>=m.scale.high||!known(m.scale.lowLabel)||!known(m.scale.highLabel)))issues.push('Named scale anchors must be ordered and labeled.');
 if(['fatigue_rating','mood_rating','stress_rating','perceived_exertion'].includes(o.metric)&&!m.scale)issues.push('A subjective value needs its named, versioned scale anchors.');
 if(bp(o)&&(!known(m.deviceId)||!known(m.posture)||!known(m.protocolId)||!known(m.method)||!known(o.acquisitionId)))issues.push('Paired BP needs a declared acquisition, device, posture, protocol and method.');
 return issues;
}

/** Validate the declared BP pair; timestamps/units have already been normalized centrally. */
export function validateMeasurementAcquisitions(observations:Observation[]):void {
 const current=observations.filter(o=>o.provenance.pipelineVersion===MEASUREMENT_PIPELINE);
 for(const o of current){
  const issues=measurementContextIssues(o);
  if(issues.length)throw failure('VALIDATION_FAILED',issues[0],`${o.metric}:context`);
  if(!bp(o)||o.value===null)continue;
  const pair=observations.filter(other=>bp(other)&&other.namespace===o.namespace&&other.astronautId===o.astronautId&&other.missionId===o.missionId&&other.publicSubjectId===o.publicSubjectId&&other.datasetId===o.datasetId&&other.dataOrigin===o.dataOrigin&&other.acquisitionId===o.acquisitionId);
  if(pair.length!==2||new Set(pair.map(x=>x.metric)).size!==2||pair.some(x=>x.value===null))throw failure('VALIDATION_FAILED','Enter both BP values from one acquisition or explicitly record missing values.','bp_pair');
  const key=(x:Observation)=>canonicalJSON([x.context,x.timestamp,x.timePrecision,x.timePrecision==='exact'?null:x.originalTime,x.timePrecision==='exact'?null:x.timeReason,x.source.sourceId,x.source.version,...['deviceId','posture','protocolId','method'].map(field=>x.measurementContext[field as keyof Observation['measurementContext']]??null)]);
  if(pair.some(x=>key(x)!==key(o)))throw failure('VALIDATION_FAILED','BP pair has mismatched source, time, context, posture, device or protocol.','bp_pair');
 }
}
