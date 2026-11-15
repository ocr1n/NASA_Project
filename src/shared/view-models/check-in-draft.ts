import {failure,SCHEMA_VERSION,validateRecord,type CommandEnvelope,type Observation} from '../contracts';
import type {CaptureInput,NumericCaptureValue} from '../capture';
import {checkInScales,checkInSchedule} from '../metrics/check-in';

/** Uncommitted strings are UI state, never canonical measurements. */
export const emptyDraft=()=>({heartRate:'',heartRateStatus:'value',sleepDuration:'',sleepStatus:'value',sleepUnit:'h',hrContext:'unknown',device:'',posture:'unknown',timePrecision:'unknown',measuredTime:'',timeReason:'Not reported',confidence:'unknown',fatigue:'',mood:'',stress:'',notes:'',height:'',mass:'',profileDate:'',profileMethod:'',gravity:''});
export type CheckInDraft=ReturnType<typeof emptyDraft>;
const choices:Partial<Record<keyof CheckInDraft,string[]>>={heartRateStatus:['value','skipped','unknown','device_issue'],sleepStatus:['value','skipped','unknown','device_issue'],sleepUnit:['h','min'],hrContext:['unknown','rest','exercise'],posture:['unknown','seated','standing','supine'],timePrecision:['unknown','date','exact'],confidence:['unknown','low','fictional_passed']};
export function isDraft(input:unknown):input is CheckInDraft {
 if(!input||typeof input!=='object'||Array.isArray(input))return false;
 const values=input as Record<string,unknown>,keys=Object.keys(emptyDraft());
 return Object.keys(values).length===keys.length&&keys.every(key=>typeof values[key]==='string'&&(values[key] as string).length<=4096&&(!choices[key as keyof CheckInDraft]||choices[key as keyof CheckInDraft]!.includes(values[key] as string)));
}
export interface CachedCrewView {draft:CheckInDraft;dirty:boolean;selectedRegion:string|null;pending:CommandEnvelope|null}
export interface CrewUiCache {cacheVersion:1;schemaVersion:typeof SCHEMA_VERSION;namespace:string;selectedCrewId:string|null;views:Record<string,CachedCrewView>}
export type UiCacheStorage=Pick<Storage,'getItem'|'setItem'>;
/** Validate this namespace's UI state and canonical retry commands, without restoring domain data. */
export function decodeCrewCache(text:string,namespace:string):CrewUiCache {
 const value=JSON.parse(text) as CrewUiCache;
 if(!value||Object.keys(value).sort().join()!=='cacheVersion,namespace,schemaVersion,selectedCrewId,views'||value.cacheVersion!==1||value.schemaVersion!==SCHEMA_VERSION||value.namespace!==namespace||(value.selectedCrewId!==null&&typeof value.selectedCrewId!=='string')||!value.views||typeof value.views!=='object'||Array.isArray(value.views)||Object.keys(value.views).length>100)throw failure('UNSUPPORTED_VERSION','Saved drafts are incompatible. Reset the draft cache to recover.');
 for(const [id,view] of Object.entries(value.views)){
  if(!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(id)||!view||Object.keys(view).sort().join()!=='dirty,draft,pending,selectedRegion'||!isDraft(view.draft)||typeof view.dirty!=='boolean'||!(view.selectedRegion===null||typeof view.selectedRegion==='string'))throw failure('VALIDATION_FAILED','Saved draft is invalid. Reset the draft cache to recover.');
  if(view.pending!==null&&(!validateRecord<CommandEnvelope>('CommandEnvelope',view.pending).ok||view.pending.namespace!==namespace||view.pending.subject.astronautId!==id||view.pending.operation!=='capture'||view.pending.domain!=='capture'))throw failure('VALIDATION_FAILED','Saved retry command is invalid. Reset the draft cache to recover.');
 }
 return value;
}
/** Compile strings into shared capture input; zero and missing remain distinct. */
export function compileCheckIn(draft:CheckInDraft,namespace:string,astronautId:string,operationId:string,receivedAt:string):CaptureInput {
 if(!isDraft(draft))throw failure('VALIDATION_FAILED','The check-in draft is invalid.');
 const quality:Observation['quality']=draft.confidence==='fictional_passed'?{score:0.9,method:'Explicit fictional quality parameter; no clinical validation',flags:['demo_only'],lowConfidence:false}:{score:null,method:'Signal quality not verified',flags:draft.confidence==='low'?['low_confidence']:[],lowConfidence:true};
 const mc:Observation['measurementContext']={modality:'manual',deviceId:draft.device.trim()||null,protocolId:'fictional-daily-rest-v1',method:'fictional self-entry',posture:draft.posture==='unknown'?null:draft.posture,missionPhase:'inflight'};
 const values:NumericCaptureValue[]=[
  {metric:'heart_rate',input:draft.heartRate,unit:'/min',missingReason:draft.heartRateStatus==='value'?null:draft.heartRateStatus,context:draft.hrContext as Observation['context'],measurementContext:mc,quality},
  {metric:'sleep_duration',input:draft.sleepDuration,unit:draft.sleepUnit,missingReason:draft.sleepStatus==='value'?null:draft.sleepStatus,context:'sleep',measurementContext:{...mc,method:'fictional sleep self-report',intervalSeconds:checkInSchedule.intervalSeconds},quality}
 ];
 for(const [key,metric] of [['fatigue','fatigue_rating'],['mood','mood_rating'],['stress','stress_rating']] as const)if(draft[key].trim())values.push({metric,input:draft[key],unit:'1',missingReason:null,context:'unknown',measurementContext:{...mc,scale:checkInScales[metric]},quality});
 for(const [key,metric,unit] of [['height','body_height','cm'],['mass','body_mass','kg']] as const)if(draft[key].trim())values.push({metric,input:draft[key],unit,missingReason:null,context:'unknown',time:{precision:'date',text:draft.profileDate,reason:'Reported profile context date'},measurementContext:{modality:'report',method:draft.profileMethod.trim()||null,gravityCondition:metric==='body_mass'?draft.gravity.trim()||null:null},quality});
 return {namespace,astronautId,operationId,sourceId:'simulation',receivedAt,deliveryMode:'manual',time:{precision:draft.timePrecision as CaptureInput['time']['precision'],text:draft.measuredTime,reason:draft.timeReason},values,notes:draft.notes,completeTaskIds:[`task-${astronautId}`],updateProfileContext:true};
}
