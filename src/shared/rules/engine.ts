import {assertValid,failure,SCHEMA_VERSION,type CanonicalRecord,type Assessment,type ThresholdRule,type BaselineComputation,type TrendRequest,type FollowUpTask,type CommandEnvelope,type AtlasHighlight} from '../contracts';
import {canonicalJSON,sha256} from '../contracts/identity';
import {buildComparisonKey} from '../metrics';
import {projectPersonalTrend} from '../trends/projection';
import atlasManifest from '../atlas/manifest.json';

export const DEMO_RULE:Readonly<ThresholdRule>={schemaVersion:SCHEMA_VERSION,namespace:'demo',recordType:'ThresholdRule',ruleId:'demo-personal-change-v1',revision:1,version:'fictional-change/1',title:'Fictional sustained personal change',metrics:['heart_rate'],applicableContext:['rest'],population:'Fictional software subjects',protocolId:null,predicates:[{op:'delta_gt',metric:'heart_rate',parameters:{value:5,low:null,high:null}}],evidenceIds:[],admissionRequirements:['demo_only'],baselineStrategy:'fixed',qualityGate:{minimumScore:0.8,allowLowConfidence:false},persistence:{minimumSeconds:60,minimumIndependentSamples:2},severity:'warning',recovery:{minimumSeconds:60,minimumIndependentSamples:2},status:'pending',demoOnly:true,approvedScope:'demo_only',regionMapping:{regionKey:null,layer:'systemic',localizing:false},guidanceSourceIds:[]};
export const DEMO_RECOVERY_DELTA=2,DEMO_MAX_GAP_SECONDS=172800;
export interface DemoRuleOptions {rule:Readonly<ThresholdRule>;direction:'absolute'|'decline_fraction';trigger:number;recovery:number;finding:string;explanation:string;taskPrompt:string}
const defaultOptions:DemoRuleOptions={rule:DEMO_RULE,direction:'absolute',trigger:5,recovery:2,finding:'Fictional sustained deviation',explanation:'Fictional scenario: difference >5 /min; recovery ≤2 /min; two acquisitions over ≥60 seconds.',taskPrompt:'Fictional workflow: inspect the source/reference or collect a compatible resting repeat. This task does not establish recovery.'};
const stamp=(recordType:CanonicalRecord['recordType'])=>({schemaVersion:SCHEMA_VERSION,namespace:'demo',recordType,revision:1});

/** Rebuild the episode from corrected, deduplicated chronological points. No wall clock or hidden counter. */
export async function evaluateDemo(records:CanonicalRecord[],request:TrendRequest,reference:BaselineComputation|null,evaluatedAt:string,options:DemoRuleOptions=defaultOptions){
 const rule=options.rule;if(!rule.demoOnly||rule.approvedScope!=='demo_only'||request.metric!==rule.metrics[0])throw failure('VALIDATION_FAILED','Fictional rule scope/metric differs.');
 const projection=await projectPersonalTrend(records,request,reference);
 let onset:string|null=null,episode:string|null=null,active=false,cleared=false,recovering=false;
 let elevated:typeof projection.points=[],recovery:typeof projection.points=[],support:typeof projection.points=[];
 const enough=(rows:typeof support)=>rows.length>=rule.persistence.minimumIndependentSamples&&(Date.parse(rows.at(-1)!.observation.timestamp!)-Date.parse(rows[0].observation.timestamp!))/1000>=rule.persistence.minimumSeconds;
 let lastTime:number|null=null;
 for(const p of projection.points){
  if(p.reasons.some(r=>r.startsWith('duplicate_identity:')||r==='superseded_observation'))continue;
  const t=p.observation.timestamp?Date.parse(p.observation.timestamp):null;
  if(p.availability!=='available'||p.comparison?.comparison.availability!=='available'||p.observation.context!=='rest'){
   elevated=[];recovery=[];lastTime=t;continue;
  }
  if(lastTime!==null&&t!==null&&(t-lastTime)/1000>DEMO_MAX_GAP_SECONDS){elevated=[];recovery=[];}
  lastTime=t;const relative=p.comparison.comparison.relativeDelta;if(options.direction==='decline_fraction'&&relative===null){elevated=[];recovery=[];continue;}const delta=options.direction==='absolute'?Math.abs(p.comparison.comparison.absoluteDelta!):-relative!;
  if(delta>options.trigger){
   recovery=[];recovering=false;if(!active){if(!elevated.length){onset=p.observation.observationId;cleared=false;}elevated.push(p);if(enough(elevated)){active=true;episode=onset;support=[...elevated];}}else support.push(p);
  }else if(active){
   if(delta<=options.recovery){recovery.push(p);recovering=true;if(enough(recovery)){active=false;cleared=true;recovering=false;support=[...support,...recovery];elevated=[];}}
   else {recovery=[];recovering=false;}
  }else elevated=[];
 }
 const latest=projection.points.filter(p=>!p.reasons.some(r=>r==='superseded_observation'||r.startsWith('duplicate_identity:'))).at(-1);
 const comparison=latest?.comparison?.comparison;
 let availability:Assessment['availability']=!latest?'insufficient_data':latest.availability;
 const reasons=[...(latest?.reasons??['no_current_reading'])];
 if(availability==='available'&&comparison?.availability!=='available'){availability=comparison?.availability??'baseline_unavailable';reasons.push(...(comparison?.reasons??['explicit_reference_unavailable']));}
 if(latest?.observation.timestamp&&(Date.parse(evaluatedAt)-Date.parse(latest.observation.timestamp))/1000>DEMO_MAX_GAP_SECONDS){availability='stale';reasons.push('fictional_freshness_window_exceeded');}
 if(latest?.observation.context!=='rest'&&availability==='available'){availability='incomparable';reasons.push('rest_context_required');}
 if(availability==='available'&&options.direction==='decline_fraction'&&comparison?.relativeDelta===null){availability='baseline_unavailable';reasons.push('positive_relative_reference_required');}
 const identity=episode??onset??latest?.observation.observationId??'no-input';
 const episodeId='demo-episode_'+await sha256(canonicalJSON([request.astronautId,rule.version,identity]));
 const taskId='demo-followup_'+await sha256(canonicalJSON([episodeId,availability==='baseline_unavailable'?'review':'repeat']));
 const taskNeeded=availability!=='available'||active||elevated.length>0;
 const severity:Assessment['severity']=availability!=='available'?null:active?'warning':elevated.length?'watch':'info';
 const observations=[...new Set([...(support.length?support:elevated).map(p=>p.observation.observationId),...(latest?[latest.observation.observationId]:[])])];
 const body={astronautId:request.astronautId,missionId:request.missionId,evaluatedAt,window:request.window,ruleId:rule.ruleId,ruleVersion:rule.version,observationIds:observations,environmentalObservationIds:[],comparisonIds:[],baselineIds:reference?[reference.baseline.baselineId]:[],availability,reasons:[...new Set(reasons)].sort(),severity,finding:availability!=='available'?'Personal interpretation unavailable':active?options.finding:cleared?'Fictional episode recovered':elevated.length?'Fictional isolated deviation':'No fictional deviation established',contributingFactors:[options.explanation,...(reference?[`Reference ${reference.baseline.sampleCount} readings; center ${reference.baseline.center} ${reference.baseline.unit}`]:[])],corroboration:'Repeated acquisitions demonstrate persistence only; no independent scientific corroboration.',sustained:active,independentSampleCount:(active?support:elevated).length,localizationSupported:active&&availability==='available'&&rule.regionMapping.localizing&&support.length>=2&&support.every(p=>p.observation.measurementContext.site===rule.regionMapping.regionKey),limitations:['Demo only; these numbers are not medical thresholds.','No operational rules are admitted.',rule.regionMapping.localizing?'The highlighted reference region is a fictional reported site, not a diagnosis.':'Generic heart rate change cannot localize organ injury.','Task completion and physiological recovery are separate.'],evidenceIds:[],dataOrigin:'synthetic' as const,mode:'demo' as const,lifecycle:cleared?'cleared' as const:recovering?'recovering' as const:'active' as const,taskIds:taskNeeded?[taskId]:[],highlightIds:[]};
 const assessment:Assessment={...stamp('Assessment'),recordType:'Assessment',assessmentId:'demo-assessment_'+await sha256(canonicalJSON(body)),...body};assertValid('Assessment',assessment);
 const old=records.find((r):r is FollowUpTask=>r.recordType==='FollowUpTask'&&r.taskId===taskId);
 let task:FollowUpTask|null=null;
 if(taskNeeded){
  task=old?structuredClone(old):{...stamp('FollowUpTask'),recordType:'FollowUpTask',taskId,astronautId:request.astronautId,type:availability==='baseline_unavailable'?'review_report':'repeat_measurement',dueAt:null,duePrecision:'unknown',state:'due',assessmentIds:[assessment.assessmentId],observationIds:latest?[latest.observation.observationId]:[],requiredMeasurement:{metric:request.metric,comparabilityKey:latest?buildComparisonKey(latest.observation).key:null},completionObservationIds:[],completionReportIds:[],explanation:options.taskPrompt,sourceIds:['simulation'],idempotencyKey:taskId,episodeId,createdAt:evaluatedAt,updatedAt:evaluatedAt};
  if(old&&old.state!=='completed'&&old.type==='repeat_measurement'){
   const repeat=projection.points.find(p=>p.availability==='available'&&buildComparisonKey(p.observation).key===old.requiredMeasurement.comparabilityKey&&!old.observationIds.includes(p.observation.observationId)&&p.observation.timestamp&&Date.parse(p.observation.timestamp)>Date.parse(old.createdAt));
   if(repeat){task={...old,revision:old.revision+1,state:'completed',completionObservationIds:[repeat.observation.observationId],updatedAt:evaluatedAt};}
  }
  assertValid('FollowUpTask',task);
 }
 const completedTasks:FollowUpTask[]=[];
 for(const old of records.filter((r):r is FollowUpTask=>r.recordType==='FollowUpTask'&&r.astronautId===request.astronautId&&r.taskId.startsWith('demo-followup_')&&r.requiredMeasurement.metric===request.metric&&r.type==='repeat_measurement'&&!['completed','cancelled','excused'].includes(r.state))){
  const repeat=projection.points.find(p=>p.availability==='available'&&buildComparisonKey(p.observation).key===old.requiredMeasurement.comparabilityKey&&!old.observationIds.includes(p.observation.observationId)&&p.observation.timestamp&&Date.parse(p.observation.timestamp)>Date.parse(old.createdAt));
  if(repeat){const completed:FollowUpTask={...old,revision:old.revision+1,state:'completed',completionObservationIds:[repeat.observation.observationId],updatedAt:evaluatedAt};completedTasks.push(completed);if(task?.taskId===old.taskId)task=completed;}
 }
 return {assessment,task,completedTasks,projection,rule:structuredClone(rule),episodeId};
}

/** Deterministic identities and revision checks keep repeated evaluation idempotent. */
export async function prepareDemoEvaluation(records:CanonicalRecord[],request:TrendRequest,reference:BaselineComputation|null,evaluatedAt:string,options:DemoRuleOptions=defaultOptions):Promise<CommandEnvelope|null>{
 const result=await evaluateDemo(records,request,reference,evaluatedAt,options),changes:CanonicalRecord[]=[],expectedRevisions:CommandEnvelope['payload']['expectedRevisions']=[];
 const region=atlasManifest.regions.find(r=>r.regionKey===options.rule.regionMapping.regionKey&&r.layer===options.rule.regionMapping.layer&&r.verified);
 if(region){
  const id='demo-highlight_'+await sha256(canonicalJSON([result.episodeId,options.rule.ruleId]));
  const old=records.find((r):r is AtlasHighlight=>r.recordType==='AtlasHighlight'&&r.highlightId===id);
  let highlight:AtlasHighlight|null=null;
  const a=result.assessment,originalAssessmentId=a.assessmentId;
  if(a.availability==='available'&&a.sustained&&a.localizationSupported&&a.severity==='warning'){
   a.highlightIds=[id];a.assessmentId='demo-assessment_'+await sha256(canonicalJSON({...a,assessmentId:null}));
   if(result.task?.assessmentIds.includes(originalAssessmentId))result.task.assessmentIds=result.task.assessmentIds.map(x=>x===originalAssessmentId?a.assessmentId:x);
   highlight={schemaVersion:SCHEMA_VERSION,namespace:'demo',recordType:'AtlasHighlight',highlightId:id,revision:old?.revision??1,astronautId:request.astronautId,regionKey:region.regionKey,layer:options.rule.regionMapping.layer,severity:'warning',kind:'automatic',reason:`${a.finding}. Fictional reported-site change; not a diagnosis.`,assessmentId:a.assessmentId,ruleId:a.ruleId,ruleVersion:a.ruleVersion,observationIds:a.observationIds,confidence:null,confidenceKind:'unknown',limitations:a.limitations,since:old?.since??evaluatedAt,lastEvaluatedAt:evaluatedAt,expires:null,status:a.lifecycle==='recovering'?'recovering':'active',dataOrigin:'synthetic',mode:'demo',manifestId:atlasManifest.manifestId,manifestVersion:atlasManifest.manifestVersion};
  }else if(old){highlight={...old,lastEvaluatedAt:evaluatedAt,...a.lifecycle==='cleared'?{status:'cleared',expires:null}:{expires:evaluatedAt}};}
  if(highlight&&(!old||canonicalJSON(highlight)!==canonicalJSON(old))){if(old){highlight.revision=old.revision+1;expectedRevisions.push({recordType:'AtlasHighlight',recordId:old.highlightId,revision:old.revision});}assertValid('AtlasHighlight',highlight);changes.push(highlight);}
 }
 if(!records.some(r=>r.recordType==='ThresholdRule'&&r.ruleId===result.rule.ruleId))changes.push(result.rule);
 if(!records.some(r=>r.recordType==='Assessment'&&r.assessmentId===result.assessment.assessmentId))changes.push(result.assessment);
 const tasks=new Map([...result.completedTasks,...result.task?[result.task]:[]].map(t=>[t.taskId,t]));
 for(const task of tasks.values()){const old=records.find((r):r is FollowUpTask=>r.recordType==='FollowUpTask'&&r.taskId===task.taskId);if(!old)changes.push(task);else if(old.revision!==task.revision){changes.push(task);expectedRevisions.push({recordType:'FollowUpTask',recordId:old.taskId,revision:old.revision});}}
 if(!changes.length)return null;const id='evaluate_'+await sha256(canonicalJSON(changes));return {schemaVersion:SCHEMA_VERSION,namespace:'demo',operationId:id,idempotencyKey:id,subject:{kind:'crew',astronautId:request.astronautId,missionId:request.missionId},createdAt:evaluatedAt,operation:'upsert',domain:'assessments',payload:{records:changes,expectedRevisions,importKeys:[],previewToken:null}};
}
