import type {CrewProfile,MissionContext,Baseline,Observation,FollowUpTask,AtlasHighlight,Assessment,ErrorEnvelope,CommandEnvelope} from '../contracts';
import {ContractError,failure} from '../contracts';
import type {Repository} from '../repositories/repository';
import {storageError} from '../repositories/storage';
import {prepareCapture} from '../capture';
import {emptyDraft,isDraft,decodeCrewCache,compileCheckIn,type CheckInDraft,type UiCacheStorage,type CachedCrewView,type CrewUiCache} from './check-in-draft';
export interface CrewSnapshot {
 selectedCrewId:string|null;crew:CrewProfile|null;profiles:CrewProfile[];mission:MissionContext|null;baselines:Baseline[];
 observations:Observation[];tasks:FollowUpTask[];highlights:AtlasHighlight[];assessments:Assessment[];
 selectedRegion:string|null;cameraFocus:string|null;loading:boolean;error:ErrorEnvelope|null;
 draft:CheckInDraft;dirty:boolean;busy:boolean;captureError:ErrorEnvelope|null;captureNotice:string;cacheError:ErrorEnvelope|null;switchNotice:string;
}
const empty=(id:string|null):CrewSnapshot=>({selectedCrewId:id,crew:null,profiles:[],mission:null,baselines:[],observations:[],tasks:[],highlights:[],assessments:[],selectedRegion:null,cameraFocus:null,loading:!!id,error:null,draft:emptyDraft(),dirty:false,busy:false,captureError:null,captureNotice:'',cacheError:null,switchNotice:''});
function freeze<T>(value:T):T {if(value&&typeof value==='object'){Object.freeze(value);for(const nested of Object.values(value))freeze(nested);}return value;}
interface View extends CachedCrewView {busy:boolean;error:ErrorEnvelope|null;notice:string}
const newView=():View=>({draft:emptyDraft(),dirty:false,selectedRegion:null,pending:null,busy:false,error:null,notice:''});
export class SelectedCrewStore {
 private snapshot=freeze(empty(null));private listeners=new Set<()=>void>();private generation=0;private unsubscribe:()=>void;
 private views=new Map<string,View>();private preferredCrew:string|null=null;private cacheError:ErrorEnvelope|null=null;private cacheBlocked=false;
 constructor(private repo:Repository,private namespace:string,private cache?:UiCacheStorage,private cacheKey='astronaut-health-ui-v1'){
  try{const text=cache?.getItem(cacheKey);if(text){const saved=decodeCrewCache(text,namespace);this.preferredCrew=saved.selectedCrewId;for(const [id,view] of Object.entries(saved.views))this.views.set(id,{...view,busy:false,error:null,notice:view.pending?'A previous save needs acknowledgement. Retry the same check-in.':''});}}
  catch(e){this.cacheBlocked=true;this.cacheError=e instanceof ContractError?e.detail:failure('STORAGE_UNAVAILABLE','Saved drafts could not be read. Reset the draft cache or retry storage.').detail;}
  this.unsubscribe=repo.subscribe(e=>{if(e.namespace===namespace)void this.refresh();});
 }
 getSnapshot=()=>this.snapshot;
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 private view(id:string){if(!this.views.has(id))this.views.set(id,newView());return this.views.get(id)!;}
 private update(value:CrewSnapshot){this.snapshot=freeze(value);for(const listener of this.listeners)listener();}
 private present(){const id=this.snapshot.selectedCrewId;if(!id)return;const v=this.view(id);this.update({...this.snapshot,draft:structuredClone(v.draft),dirty:v.dirty,busy:v.busy,selectedRegion:v.selectedRegion,cameraFocus:v.selectedRegion,captureError:v.error,captureNotice:v.notice,cacheError:this.cacheError});}
 private persist(){
  if(!this.cache||this.cacheBlocked)return;
  const value:CrewUiCache={cacheVersion:1,schemaVersion:'0.1.0',namespace:this.namespace,selectedCrewId:this.snapshot.selectedCrewId,views:Object.fromEntries([...this.views].map(([id,v])=>[id,{draft:v.draft,dirty:v.dirty,selectedRegion:v.selectedRegion,pending:v.pending}]))};
  try{this.cache.setItem(this.cacheKey,JSON.stringify(value));this.cacheError=null;}catch(e){this.cacheError=storageError(e).detail;}
 }
 async initialize(){try{const profiles=await this.repo.list(this.namespace,'CrewProfile');await this.selectCrew(profiles.some(p=>p.astronautId===this.preferredCrew)?this.preferredCrew!:profiles[0]?.astronautId??'crew-a');}catch(e){this.update({...this.snapshot,error:storageError(e).detail,loading:false});}}
 async selectCrew(id:string){
  const old=this.snapshot,notice=old.dirty&&old.selectedCrewId!==id?`Unsaved draft retained for ${old.crew?.alias??old.selectedCrewId}.`:'';
  this.generation++;this.update({...empty(id),profiles:old.profiles,switchNotice:notice});this.preferredCrew=id;this.persist();this.present();await this.refresh();
 }
 selectRegion(region:string|null){const id=this.snapshot.selectedCrewId;if(!id)return;this.view(id).selectedRegion=region;this.persist();this.present();}
 updateDraft(patch:Partial<CheckInDraft>){const id=this.snapshot.selectedCrewId;if(!id||this.view(id).busy)return;const v=this.view(id),draft={...v.draft,...patch};if(!isDraft(draft))throw failure('VALIDATION_FAILED','Invalid draft field.');this.views.set(id,{...v,draft,dirty:true,pending:null,error:null,notice:''});this.persist();this.present();}
 resetDraft(){const id=this.snapshot.selectedCrewId;if(!id||this.view(id).busy)return;this.cacheBlocked=false;this.views.set(id,newView());this.persist();this.present();}
 retryDraftCache(){this.cacheBlocked=false;this.persist();this.present();}
 async saveCheckIn():Promise<boolean>{
  const id=this.snapshot.selectedCrewId;if(!id||this.view(id).busy)return false;
  const v=this.view(id);v.busy=true;v.error=null;v.notice='';this.present();
  try{
   const c:CommandEnvelope=v.pending??await prepareCapture(this.repo,compileCheckIn(v.draft,this.namespace,id,crypto.randomUUID(),this.repo.clock.now()));
   v.pending=c;this.persist();this.present();await this.repo.execute(c);
   this.views.set(id,{...newView(),selectedRegion:v.selectedRegion,notice:'Check-in saved. Evaluation pending; no medical interpretation.'});this.persist();this.present();await this.refresh();return true;
  }catch(e){v.busy=false;v.error=e instanceof ContractError?e.detail:storageError(e).detail;this.persist();this.present();return false;}
 }
 async refresh(){const id=this.snapshot.selectedCrewId;if(!id)return;const generation=++this.generation;
  try{
   const crewPromise=this.repo.require(this.namespace,'CrewProfile',id);
   const [crew,mission,profiles,observations,tasks,highlights,assessments,baselines]=await Promise.all([crewPromise,crewPromise.then(crew=>this.repo.require(this.namespace,'MissionContext',crew.missionId)),this.repo.list(this.namespace,'CrewProfile'),this.repo.list(this.namespace,'Observation'),this.repo.list(this.namespace,'FollowUpTask'),this.repo.list(this.namespace,'AtlasHighlight'),this.repo.list(this.namespace,'Assessment'),this.repo.list(this.namespace,'Baseline')]);
   if(generation!==this.generation||id!==this.snapshot.selectedCrewId)return;
   this.update({...this.snapshot,crew,mission,profiles,observations:observations.filter(o=>o.astronautId===id).sort((a,b)=>(b.timestamp??b.originalTime??'').localeCompare(a.timestamp??a.originalTime??'')),tasks:tasks.filter(t=>t.astronautId===id),highlights:highlights.filter(h=>h.astronautId===id),assessments:assessments.filter(a=>a.astronautId===id),baselines:baselines.filter(b=>b.astronautId===id),loading:false,error:null});this.present();
  }catch(error){if(generation===this.generation){this.update({...empty(id),profiles:this.snapshot.profiles,loading:false,error:error instanceof ContractError?error.detail:storageError(error).detail});this.present();}}
 }
 dispose(){this.generation++;this.unsubscribe();this.listeners.clear();}
}
