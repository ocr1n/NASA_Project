import {assertValid,failure,ContractError,SCHEMA_VERSION,type Observation,type CommandEnvelope,type CanonicalRecord,type MissionContext} from '../contracts';
import {canonicalJSON,sha256} from '../contracts/identity';
import {metricRegistry,normalizeUnit,buildComparisonKey} from '../metrics';
import {assessmentEligibility} from '../rules/policy';
import {validateEvidence,PROCEDURE_VERSION} from '../sources/validation';
import type {Repository} from '../repositories/repository';
import {MEASUREMENT_PIPELINE,validateMeasurementAcquisitions} from '../metrics/measurement-context';

export interface ReportedTime {precision:'exact'|'date'|'unknown';text:string;reason:string}
export interface NumericCaptureValue {
 metric:Exclude<Observation['metric'],'symptom_report'|'injury_report'>;input:string;unit:string;missingReason:string|null;
 context:Observation['context'];measurementContext:Observation['measurementContext'];
 quality:Observation['quality'];time?:ReportedTime;observationId?:string;
 acquisitionId?:string;measurementParameters?:{analyte?:string|null;resultBasis?:'measured'|'estimated'|'unknown'|null};
}
export interface CaptureInput {
 namespace:string;astronautId:string;operationId:string;sourceId:string;
 receivedAt:string;deliveryMode:Observation['deliveryMode'];time:ReportedTime;
 values:NumericCaptureValue[];notes:string;completeTaskIds?:string[];updateProfileContext?:boolean;
}
const invalid=(message:string,path:string):never=>{throw failure('VALIDATION_FAILED',message,path);};
const validDate=(text:string)=>{
 if(!/^\d{4}-\d\d-\d\d$/.test(text))return false;
 const time=Date.parse(`${text}T00:00:00Z`);
 return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===text;
};
/** Exact input requires its own offset; partial dates retain their calendar precision. */
export function captureTime(input:ReportedTime,mission:Pick<MissionContext,'scenarioClock'>={scenarioClock:null}):Pick<Observation,'timestamp'|'timePrecision'|'originalTime'|'timeReason'|'missionAnchor'> {
 const {precision,text,reason}=input;
 if(precision==='unknown')return {timestamp:null,timePrecision:'unknown',originalTime:text.trim()||null,timeReason:reason.trim()||'Not reported',missionAnchor:null};
 if(!validDate(text.slice(0,10)))return invalid('Enter a valid reported calendar date.','time');
 if(precision==='date'){
  if(!validDate(text))return invalid('Date-only input must be YYYY-MM-DD.','time');
  if(mission.scenarioClock&&text>mission.scenarioClock.slice(0,10))return invalid('The reported date is after the fictional scenario date.','time');
  return {timestamp:null,timePrecision:'date',originalTime:text,timeReason:reason.trim()||'Only calendar date was reported',missionAnchor:null};
 }
 const match=/^\d{4}-\d\d-\d\dT(\d\d):(\d\d)(?::(\d\d)(?:\.\d{1,3})?)?(Z|[+-](\d\d):(\d\d))$/.exec(text);
 if(!match||+match[1]>23||+match[2]>59||+(match[3]??0)>59||+(match[5]??0)>14||+(match[6]??0)>59||(+match[5]===14&&+match[6]!==0)||!Number.isFinite(Date.parse(text)))return invalid('Exact time needs a valid ISO time with Z or an explicit offset (for example +05:00).','time');
 const timestamp=new Date(text).toISOString();
 if(mission.scenarioClock&&Date.parse(timestamp)>Date.parse(mission.scenarioClock))return invalid('Measurement time is after the fictional scenario clock.','time');
 return {timestamp,timePrecision:'exact',originalTime:text,timeReason:null,missionAnchor:null};
}
/** Parse a full numeric input, never an empty string, numeric prefix or implicit zero. */
export function captureNumber(value:NumericCaptureValue):{number:number|null;original:number|null} {
 const text=value.input.trim();
 if(value.missingReason){if(text)return invalid('Clear the value when marking a measurement missing.',value.metric);return {number:null,original:null};}
 if(!text||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(text)||!Number.isFinite(Number(text)))return invalid('Enter a finite number or select an explicit missing reason.',value.metric);
 const original=Number(text),normalized=normalizeUnit(value.metric,original,value.unit,value.measurementParameters);
 if(!normalized.ok)return invalid(normalized.reason,value.metric);
 if(normalized.value<0)return invalid('This quantity cannot be negative.',value.metric);
 const scale=value.measurementContext.scale;
 if(scale&&metricRegistry[value.metric].requiredContext.includes('scale')&&(normalized.value<scale.low||normalized.value>scale.high))return invalid('The value is outside the named scale anchors.',value.metric);
 if(value.metric==='sleep_duration'&&value.measurementContext.intervalSeconds!=null&&normalized.value*3600>value.measurementContext.intervalSeconds)return invalid('Sleep duration exceeds its reported observation interval.',value.metric);
 return {number:normalized.value,original};
}
/** Prepare outside storage transactions; the canonical command is the only persistence path. */
export async function prepareCapture(repo:Repository,input:CaptureInput):Promise<CommandEnvelope> {
 if(input.namespace!=='demo')throw failure('REFERENCE_INVALID','This personal check-in is for the fictional demo only.');
 if(!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,70}$/.test(input.operationId))return invalid('Invalid capture identity.','operationId');
 if(!input.values.length||new Set(input.values.map(v=>v.metric)).size!==input.values.length)return invalid('A capture needs distinct registered measurements.','values');
 const crew=await repo.require(input.namespace,'CrewProfile',input.astronautId);
 const [mission,source]=await Promise.all([repo.require(input.namespace,'MissionContext',crew.missionId),repo.require(input.namespace,'SourceRecord',input.sourceId)]);
 if(crew.profileOrigin!=='synthetic'||mission.dataOrigin!=='synthetic'||source.tier!=='simulation')throw failure('REFERENCE_INVALID','Fictional input requires its own fictional crew, mission and source.');
 const sourceSnapshot={schemaVersion:SCHEMA_VERSION,sourceId:source.sourceId,name:source.name,tier:source.tier,canonicalURL:source.canonicalURL,version:source.version,license:source.license,attribution:source.attribution,retrievedAt:source.retrievedAt};
 const records:CanonicalRecord[]=[],observations:Observation[]=[];
 const validationId=`validation-${input.operationId}`;
 for(const value of input.values){
  const definition=metricRegistry[value.metric];
  if(!definition?.valueKinds.includes('number')||definition.category==='environment'||!source.supportedMetrics.includes(value.metric))return invalid('Source or registry does not support this personal numerical metric.',value.metric);
  if(!definition.allowedInputUnits.includes(value.unit))return invalid('Select a registered input unit.',value.metric);
  const parsed=captureNumber(value),time=(()=>{try{return captureTime(value.time??input.time,mission);}catch(e){if(value.time&&e instanceof ContractError)throw failure(e.detail.code,e.detail.message,`${value.metric}:time`);throw e;}})();
  const observationId=value.observationId??`checkin-${input.operationId}-${value.metric}`,rawRecordId=`raw-${observationId}`;
  const payload=canonicalJSON({input:value,time:value.time??input.time,notes:input.notes,receivedAt:input.receivedAt,deliveryMode:input.deliveryMode,astronautId:input.astronautId});
  const contentHash=await sha256(payload);
  records.push({schemaVersion:SCHEMA_VERSION,namespace:input.namespace,recordType:'RawRecord',rawRecordId,revision:1,sourceId:source.sourceId,acquisitionId:value.acquisitionId??observationId,importBatchId:null,payload,fileReference:null,contentHash,mediaType:'application/json',encoding:'utf-8',retrievedAt:input.receivedAt,retentionPolicy:'Retain original fictional input',accessPolicy:'Fictional demo only'});
  const o:unknown={schemaVersion:SCHEMA_VERSION,namespace:input.namespace,recordType:'Observation',observationId,revision:1,astronautId:crew.astronautId,missionId:crew.missionId,publicSubjectId:null,datasetId:null,...time,receivedAt:input.receivedAt,metric:value.metric,valueKind:'number',value:parsed.number,unit:definition.canonicalUnit,missingReason:parsed.number===null?value.missingReason:null,context:value.context,measurementContext:structuredClone(value.measurementContext),source:sourceSnapshot,quality:structuredClone(value.quality),validation:{status:'pending',validationRunId:validationId,evidenceIds:[],procedureVersion:PROCEDURE_VERSION,issues:['Fictional input; scientific interpretation pending'],admission:'demo_only'},dataOrigin:'synthetic',deliveryMode:input.deliveryMode,synthetic:true,era:'fictional scenario',provenance:{rawRecordId,contentHash,sourceRecordId:observationId,importBatchId:null,pipelineVersion:MEASUREMENT_PIPELINE,algorithm:null,parameters:{...value.measurementParameters,reportedTimePrecision:(value.time??input.time).precision,reportedTimeText:(value.time??input.time).text,notes:input.notes},originalUnit:value.unit,originalValue:parsed.original,evidenceObservationIds:[],windowIds:[],originalSamplingHz:null,outputSamplingHz:null},reportId:null,sessionId:null,acquisitionId:value.acquisitionId??observationId,regionKey:null,laterality:value.measurementContext.laterality??null,supersedesObservationId:null};
  assertValid<Observation>('Observation',o);observations.push(o);records.push(o);
 }
 validateMeasurementAcquisitions(observations);
 const run=validateEvidence({namespace:input.namespace,id:validationId,kind:'sample_integrity',claim:'Fictional capture structure and preserved input; no scientific claim',sources:[source],checks:[],at:input.receivedAt,subjectRecordIds:observations.map(o=>o.observationId),limitations:['No independent acquisition corroboration','No clinical interpretation'],reviewComplete:false});
 records.push(run);
 const expectedRevisions:CommandEnvelope['payload']['expectedRevisions']=[];
 for(const id of input.completeTaskIds??[]){
  const task=await repo.require(input.namespace,'FollowUpTask',id);
  if(task.astronautId!==crew.astronautId||id!==`task-${crew.astronautId}`||task.assessmentIds.length||task.type!=='repeat_measurement')throw failure('REFERENCE_INVALID','Only this crew’s explicit fictional repeat task may be completed.');
  if(task.state==='completed')continue;
  const evidence=observations.find(o=>o.context==='rest'&&o.metric===task.requiredMeasurement.metric&&assessmentEligibility(o).availability==='available'&&(!task.requiredMeasurement.comparabilityKey||buildComparisonKey(o).key===task.requiredMeasurement.comparabilityKey));
  if(evidence){records.push({...task,revision:task.revision+1,state:'completed',completionObservationIds:[evidence.observationId],updatedAt:input.receivedAt});expectedRevisions.push({recordType:'FollowUpTask',recordId:id,revision:task.revision});}
 }
 if(input.updateProfileContext){
  const height=observations.find(o=>o.metric==='body_height'&&o.value!==null&&o.timePrecision!=='unknown');
  const mass=observations.find(o=>o.metric==='body_mass'&&o.value!==null&&o.timePrecision!=='unknown');
  if(mass&&!mass.measurementContext.method)return invalid('Mass context requires an acquisition method.','body_mass:method');
  if(mass&&!mass.measurementContext.gravityCondition)return invalid('Mass context requires a reported gravity/device condition.','body_mass:gravity');
  if(height&&!height.measurementContext.method)return invalid('Height context requires an acquisition method.','body_height:method');
  if(height||mass){records.push({...crew,revision:crew.revision+1,bodyHeightObservationId:height?.observationId??crew.bodyHeightObservationId,bodyMassObservationId:mass?.observationId??crew.bodyMassObservationId,updatedAt:input.receivedAt});expectedRevisions.push({recordType:'CrewProfile',recordId:crew.astronautId,revision:crew.revision});}
 }
 for(const record of records)assertValid(record.recordType,record);
 const command:CommandEnvelope={schemaVersion:SCHEMA_VERSION,namespace:input.namespace,operationId:input.operationId,idempotencyKey:input.operationId,subject:{kind:'crew',astronautId:crew.astronautId,missionId:crew.missionId},createdAt:input.receivedAt,operation:'capture',domain:'capture',payload:{records,expectedRevisions,importKeys:[],previewToken:null}};
 assertValid<CommandEnvelope>('CommandEnvelope',command);return command;
}
