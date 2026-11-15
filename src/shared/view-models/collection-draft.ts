import {failure,type Observation,type CollectionAttemptEvidence} from '../contracts';
import {collectionGroups,type CollectionGroup} from '../metrics/collection';
import {metricRegistry} from '../metrics';
import {measurementScales} from '../metrics/bundles';
import type {NumericCaptureValue,ReportedTime} from '../capture';

export interface CollectionDraft {
 group:CollectionGroup;values:{metric:Observation['metric'];input:string;unit:string}[];
 scheduleId:string;outcome:CollectionAttemptEvidence['outcome'];reason:string;reportId:string;
 precision:ReportedTime['precision'];time:string;timeReason:string;notes:string;
 context:Observation['context'];modality:string;device:string;posture:string;protocol:string;method:string;site:string;meal:string;oxygen:string;gravity:string;basis:string;interval:string;
}
export const freshCollectionDraft=(group:CollectionGroup='bp'):CollectionDraft=>({group,values:collectionGroups[group].map(metric=>({metric,input:'',unit:metricRegistry[metric].canonicalUnit!})),scheduleId:'',outcome:'recorded',reason:'',reportId:'',precision:'unknown',time:'',timeReason:'',notes:'',context:'rest',modality:'',device:'',posture:'',protocol:'',method:'',site:'',meal:'',oxygen:'',gravity:'',basis:'',interval:''});
const textFields=['scheduleId','reason','reportId','time','timeReason','notes','modality','device','posture','protocol','method','site','meal','oxygen','gravity','basis','interval'] as const;
/** Validate UI cache structure only; numerical/acquisition authority stays in shared capture. */
export function isCollectionDraft(input:unknown):input is CollectionDraft {
 if(!input||typeof input!=='object')return false;const d=input as CollectionDraft;
 const keys=Object.keys(freshCollectionDraft());
 return Object.keys(d).length===keys.length&&Object.keys(d).every(k=>keys.includes(k))&&Object.hasOwn(collectionGroups,d.group)&&['recorded','missing','skipped','device_failed'].includes(d.outcome)&&['exact','date','unknown'].includes(d.precision)&&['rest','exercise','sleep','eva','launch','landing','pre_flight','post_flight','unknown'].includes(d.context)&&textFields.every(k=>typeof d[k]==='string'&&d[k].length<=4000)&&Array.isArray(d.values)&&d.values.length===collectionGroups[d.group].length&&d.values.every((v,i)=>v&&Object.keys(v).length===3&&v.metric===collectionGroups[d.group][i]&&typeof v.input==='string'&&v.input.length<200&&metricRegistry[v.metric].allowedInputUnits.includes(v.unit));
}
export const reportedCollectionTime=(d:CollectionDraft):ReportedTime=>({precision:d.precision,text:d.time,reason:d.timeReason});
/** Convert reported strings to the shared capture input; no synthetic number or context filling. */
export function collectionValues(d:CollectionDraft,acquisitionId:string):NumericCaptureValue[]{
 if(d.outcome==='skipped'||d.outcome==='device_failed'||d.scheduleId.includes('ecg')||d.scheduleId.includes('echo'))return [];
 if(d.outcome==='missing'&&!d.reason.trim())throw failure('VALIDATION_FAILED','Describe why the acquisition is missing.');
 if(d.outcome==='missing'&&d.values.some(v=>v.input.trim()))throw failure('VALIDATION_FAILED','Clear entered values before marking the acquisition missing.');
 let interval:number|null=null;if(d.interval){if(!/^\d+(?:\.\d+)?$/.test(d.interval)||!Number.isFinite(Number(d.interval))||Number(d.interval)<=0)throw failure('VALIDATION_FAILED','Observation interval must be positive seconds.');interval=Number(d.interval);}
 return d.values.map(v=>({metric:v.metric as NumericCaptureValue['metric'],input:v.input,unit:v.unit,missingReason:d.outcome==='missing'?d.reason:null,context:d.context,acquisitionId,
  measurementContext:{modality:d.modality||null,deviceId:d.device||null,posture:d.posture||null,protocolId:d.protocol||null,method:d.method||null,site:d.site||null,mealContext:d.meal||null,oxygenContext:d.oxygen||null,gravityCondition:d.gravity||null,intervalSeconds:interval,...v.metric in measurementScales?{scale:measurementScales[v.metric as keyof typeof measurementScales]}:{}},
  measurementParameters:{...v.metric==='blood_glucose'?{analyte:'glucose'}:{},...v.metric.startsWith('vo2')?{resultBasis:(d.basis||'unknown') as 'measured'|'estimated'|'unknown'}:{}},
  quality:{score:null,method:'Reported quality unknown',flags:['reported_quality_unknown'],lowConfidence:true}}));
}
