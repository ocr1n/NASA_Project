import {failure,type BaselineRequest,type BaselineComputation,type ComparisonResult,type ErrorEnvelope,type Observation,type SavedBaselineCalculation,type RawRecord,type Exclusion} from '../contracts';
import {BASELINE_MEDIA,baselineEvidence} from '../contracts/baselines';
import {computeBaseline,compareBaseline,demoBaselinePolicy,prepareBaselineSave,type PreparedBaselineSave} from '../baselines';
import {exactInstant} from '../baselines/policy';
import {metricRegistry} from '../metrics';
import type {Repository} from '../repositories/repository';
import {storageError} from '../repositories/storage';
import type {SelectedCrewStore} from './index';

export interface BaselineConfig {
 metric:Observation['metric'];method:BaselineRequest['method'];selectorObservationId:string;anchorObservationId:string;
 from:string;to:string;cadenceSeconds:number|null;exclusions:Exclusion[];
}
export interface BaselineInputView {observation:Observation;included:boolean;reason:string|null}
export interface BaselineHistoryView {raw:RawRecord;evidence:SavedBaselineCalculation}
export interface BaselineSnapshot {
 crewId:string|null;config:BaselineConfig|null;observations:Observation[];calculation:BaselineComputation|null;
 comparison:ComparisonResult|null;inputs:BaselineInputView[];history:BaselineHistoryView[];
 loading:boolean;busy:boolean;pending:boolean;error:ErrorEnvelope|null;notice:string;unavailableReason:string|null;
}
interface CrewView {config:BaselineConfig;pending:PreparedBaselineSave|null;busy:boolean;error:ErrorEnvelope|null;notice:string}
const empty=(crewId:string|null):BaselineSnapshot=>({crewId,config:null,observations:[],calculation:null,comparison:null,inputs:[],history:[],loading:true,busy:false,pending:false,error:null,notice:'',unavailableReason:null});
function freeze<T>(value:T):T {if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;}

/** Editable bounds suggested from recorded exact events, never a clinical interval or imputed exam time. */
function suggested(observations:Observation[],metric:Observation['metric'],method:BaselineRequest['method']):BaselineConfig {
 const matches=observations.filter(o=>o.metric===metric&&o.valueKind==='number');
 const dated=[...matches].filter(o=>o.timePrecision==='exact'&&exactInstant(o.timestamp)!==null).sort((a,b)=>a.timestamp!.localeCompare(b.timestamp!)||a.observationId.localeCompare(b.observationId));
 const current=dated.filter(o=>o.measurementContext.missionPhase!=='preflight').at(-1)??dated.at(-1)??matches[0];
 const anchor=matches.filter(o=>o.measurementContext.missionPhase==='preflight').sort((a,b)=>(a.timestamp??a.originalTime??'').localeCompare(b.timestamp??b.originalTime??''))[0];
 const phase=method==='mission_rolling'?current?.measurementContext.missionPhase:'preflight';
 const series=dated.filter(o=>o.measurementContext.missionPhase===phase);
 const last=series.at(-1)?.timestamp;
 return {metric,method,selectorObservationId:current?.observationId??'unavailable-selection',anchorObservationId:anchor?.observationId??'unavailable-anchor',
  from:series[0]?.timestamp??'',to:method==='mission_rolling'?current?.timestamp??'':last?new Date(Date.parse(last)+1).toISOString():'',cadenceSeconds:null,exclusions:[]};
}

/** One selected-crew owner for computed previews and retained evidence. No computation occurs in React renders. */
export class BaselineStore {
 private snapshot=freeze(empty(null));private listeners=new Set<()=>void>();private views=new Map<string,CrewView>();
 private generation=0;private disposed=false;private stopCrew:()=>void;private stopRepo:()=>void;
 constructor(private repo:Repository,private crewStore:SelectedCrewStore){
  this.stopCrew=crewStore.subscribe(()=>{const id=crewStore.getSnapshot().selectedCrewId;if(id!==this.snapshot.crewId){this.generation++;this.publish(empty(id));void this.refresh();}});
  this.stopRepo=repo.subscribe(event=>{if(event.namespace==='demo')void this.refresh();});
 }
 getSnapshot=()=>this.snapshot;
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 private publish(snapshot:BaselineSnapshot){if(this.disposed)return;this.snapshot=freeze(snapshot);for(const listener of this.listeners)listener();}
 private present(){const v=this.snapshot.crewId?this.views.get(this.snapshot.crewId):null;this.publish({...this.snapshot,...(v?{config:structuredClone(v.config),busy:v.busy,pending:!!v.pending?.command,error:v.error,notice:v.notice}:{})});}
 initialize(){const id=this.crewStore.getSnapshot().selectedCrewId;this.publish(empty(id));return this.refresh();}

 /** Configuration changes replace a preview, never a retained fixed reference. */
 async configure(patch:Partial<BaselineConfig>){
  const id=this.snapshot.crewId,v=id?this.views.get(id):null;if(!v||v.busy||v.pending)return;
  const metric=patch.metric??v.config.metric,method=patch.method??v.config.method;
  if(!metricRegistry[metric]||!['preflight_median','preflight_anchor','mission_rolling'].includes(method))return;
  if(metric!==v.config.metric||method!==v.config.method)v.config=suggested(this.snapshot.observations,metric,method);
  v.config={...v.config,...structuredClone(patch)};v.error=null;v.notice='';
  this.publish({...this.snapshot,calculation:null,comparison:null,inputs:[],loading:true});this.present();await this.refresh();
 }

 /** Compute from exactly one committed export and reject obsolete deliveries on switch/dispose. */
 async refresh(){
  const id=this.snapshot.crewId;if(!id||this.disposed)return;const generation=++this.generation;
  this.publish({...this.snapshot,loading:true,calculation:null,comparison:null,inputs:[]});
  try{
   const exported=await this.repo.export('demo');
   if(generation!==this.generation||id!==this.snapshot.crewId||this.disposed)return;
   const crew=exported.records.find(r=>r.recordType==='CrewProfile'&&r.astronautId===id);
   const mission=crew?.recordType==='CrewProfile'?exported.records.find(r=>r.recordType==='MissionContext'&&r.missionId===crew.missionId):null;
   if(!crew||crew.recordType!=='CrewProfile'||crew.profileOrigin!=='synthetic'||!mission||mission.recordType!=='MissionContext'||mission.dataOrigin!=='synthetic')throw failure('REFERENCE_INVALID','Personal reference requires its committed fictional crew and mission.');
   const observations=exported.records.filter((r):r is Observation=>r.recordType==='Observation'&&r.astronautId===id&&r.missionId===crew.missionId&&r.dataOrigin==='synthetic');
   const history=exported.records.filter((r):r is RawRecord=>r.recordType==='RawRecord'&&r.mediaType===BASELINE_MEDIA).map(raw=>({raw,evidence:baselineEvidence(raw)})).filter(h=>h.evidence.computation.detail.request.astronautId===id&&h.evidence.computation.detail.request.missionId===crew.missionId&&h.evidence.computation.detail.request.dataOrigin==='synthetic').sort((a,b)=>b.evidence.savedAt.localeCompare(a.evidence.savedAt)||b.evidence.sequence-a.evidence.sequence);
   if(!this.views.has(id))this.views.set(id,{config:suggested(observations,'heart_rate','preflight_median'),pending:null,busy:false,error:null,notice:''});
   const v=this.views.get(id)!,c=structuredClone(v.config),selector=observations.find(o=>o.observationId===c.selectorObservationId);
   const request:BaselineRequest={protocolVersion:'baseline-request/1',namespace:'demo',astronautId:id,missionId:crew.missionId,dataOrigin:'synthetic',metric:c.metric,method:c.method,
    missionPhase:c.method==='mission_rolling'?selector?.measurementContext.missionPhase??'unknown':'preflight',selectorObservationId:c.selectorObservationId,
    anchorObservationId:c.method==='preflight_anchor'?c.anchorObservationId:null,
    window:c.method==='preflight_anchor'?{from:null,to:null,precision:'unknown'}:{from:c.from||null,to:c.to||null,precision:'exact'},
    currentObservationIds:selector&&selector.observationId!==requestAnchor(c)?[selector.observationId]:[],exclusions:c.exclusions,excludedPeriods:[]};
   let calculation:BaselineComputation|null=null,comparison:ComparisonResult|null=null,inputs:BaselineInputView[]=[],calculationError:ErrorEnvelope|null=null;
   const unavailableReason=c.method!=='preflight_anchor'&&(!c.from||!c.to)?'Baseline unavailable: no recorded exact window for this reference. Supply explicit UTC bounds to evaluate sparse or missing samples.':null;
   try{
    if(!unavailableReason){
    calculation=await computeBaseline(observations,request,{...structuredClone(demoBaselinePolicy),cadenceSeconds:c.cadenceSeconds},exported.exportedAt);
    if(selector)comparison=await compareBaseline(selector,calculation);
    const included=new Set(calculation.baseline.observationIds),reasons=new Map(calculation.baseline.exclusions.map(e=>[e.observationId,e.reason]));
    inputs=calculation.detail.inputRecords.flatMap(record=>{const observation=observations.find(o=>o.observationId===record.observationId);return observation?[{observation,included:included.has(record.observationId),reason:reasons.get(record.observationId)??null}]:[];});
    }
   }catch(error){calculationError=storageError(error).detail;}
   if(generation!==this.generation||id!==this.snapshot.crewId||this.disposed)return;
   // Keep a save failure visible while still refreshing committed evidence after an uncertain acknowledgement.
   v.error=calculationError??v.error;
   this.publish({...empty(id),config:structuredClone(v.config),observations,history,calculation,comparison,inputs,unavailableReason,loading:false,busy:v.busy,pending:!!v.pending?.command,error:v.error,notice:v.notice});
  }catch(error){if(generation===this.generation&&id===this.snapshot.crewId)this.publish({...this.snapshot,calculation:null,comparison:null,inputs:[],loading:false,error:storageError(error).detail});}
 }

 /** Save or retry the exact prepared command; full snapshot guards remain owned by the repository. */
 async save(reason:string):Promise<boolean>{
  const id=this.snapshot.crewId,v=id?this.views.get(id):null;if(!v||v.busy)return false;
  if(!v.pending&&!this.snapshot.calculation)return false;
  const preview=this.snapshot.calculation;v.busy=true;v.error=null;v.notice='';this.present();
  try{
   if(!v.pending){
    const prepared=await prepareBaselineSave(this.repo,preview!.detail.request,reason,preview!.detail.policy);
    if(prepared.evidence.computation.detail.inputHash!==preview!.detail.inputHash)throw failure('CONFLICT','Recorded inputs changed. Recompute and inspect the reference before saving.');
    v.pending=prepared;
   }
   if(v.pending.command)await this.repo.execute(v.pending.command,v.pending.snapshot);
   v.pending=null;v.notice='Reference saved. Earlier fixed references and calculation history are retained.';return true;
  }catch(error){v.error=storageError(error).detail;return false;}
  finally{v.busy=false;if(id===this.snapshot.crewId){this.present();await this.refresh();}}
 }
 /** Discard only an uncommitted/uncertain prepared action; retained repository evidence is untouched. */
 async recompute(){const v=this.snapshot.crewId?this.views.get(this.snapshot.crewId):null;if(v?.busy)return;if(v){v.pending=null;v.error=null;}await this.refresh();}
 dispose(){this.disposed=true;this.generation++;this.stopCrew();this.stopRepo();this.listeners.clear();}
}
const requestAnchor=(config:BaselineConfig)=>config.method==='preflight_anchor'?config.anchorObservationId:null;
