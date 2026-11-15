import {assertValid,ContractError,failure,type EcgCaptureContent,type EcgCaptureEvidence,type Report,type Observation,type CommandEnvelope,type ErrorEnvelope} from '../contracts';
import {ECG_MEDIA,ecgEvidence} from '../contracts/ecg';
import {emptyEcgContent,prepareEcgReport} from '../capture/ecg';
import type {Repository} from '../repositories/repository';
import {storageError} from '../repositories/storage';
import type {SelectedCrewStore} from './index';
import type {UiCacheStorage} from './check-in-draft';

interface Draft {content:EcgCaptureContent;pending:CommandEnvelope|null}
interface View extends Draft {busy:boolean;error:ErrorEnvelope|null;notice:string}
export interface EcgReportView {report:Report;observations:Observation[];evidence:EcgCaptureEvidence|null}
export interface EcgSnapshot extends View {crewId:string|null;reports:EcgReportView[];cacheError:ErrorEnvelope|null;loading:boolean}
const fresh=(id:string):View=>({content:emptyEcgContent(id),pending:null,busy:false,error:null,notice:''});
function freeze<T>(x:T):T{if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;}

/** Database/crew-scoped drafts; saved report views come only from repository subscriptions. */
export class EcgStore {
 private views=new Map<string,View>();private listeners=new Set<()=>void>();private snapshot:EcgSnapshot=freeze({...fresh('unselected'),crewId:null,reports:[],cacheError:null,loading:true});
 private generation=0;private cacheError:ErrorEnvelope|null=null;private blocked=false;private stopCrew:()=>void;private stopRepo:()=>void;
 constructor(private repo:Repository,private crewStore:SelectedCrewStore,private cache?:UiCacheStorage,private cacheKey='astronaut-ecg-ui-v1'){
  try{const text=cache?.getItem(cacheKey);if(text){const saved=JSON.parse(text);if(saved.version!=='ecg-ui/1'||!saved.views||typeof saved.views!=='object'||Array.isArray(saved.views))throw failure('UNSUPPORTED_VERSION','ECG draft cache is incompatible. Reset ECG drafts to recover.');
   for(const [id,item] of Object.entries(saved.views)){const v=item as Draft;assertValid('EcgDraftContent',v.content);if(v.content.crewId!==id)throw failure('REFERENCE_INVALID','ECG draft belongs to another crew.');
    if(v.pending){assertValid('CommandEnvelope',v.pending);if(v.pending.namespace!=='demo'||v.pending.domain!=='reports'||v.pending.operation!=='capture'||v.pending.subject.kind!=='crew'||v.pending.subject.astronautId!==id)throw failure('REFERENCE_INVALID','Cached ECG command differs from its crew.');}
    this.views.set(id,{content:v.content,pending:v.pending??null,busy:false,error:null,notice:v.pending?'A previous ECG save needs acknowledgement. Retry the same save.':''});
   }
  }}catch(e){this.blocked=true;this.cacheError=e instanceof ContractError?e.detail:failure('STORAGE_UNAVAILABLE','ECG drafts could not be read. Reset ECG drafts to recover.').detail;}
  this.stopCrew=crewStore.subscribe(()=>{const id=crewStore.getSnapshot().selectedCrewId;if(id!==this.snapshot.crewId){this.generation++;this.snapshot=freeze({...fresh(id??'unselected'),crewId:id,reports:[],cacheError:this.cacheError,loading:true});this.present();void this.refresh();}});
  this.stopRepo=repo.subscribe(e=>{if(e.namespace==='demo')void this.refresh();});
 }
 getSnapshot=()=>this.snapshot;
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 private view(id:string){if(!this.views.has(id))this.views.set(id,fresh(id));return this.views.get(id)!;}
 private present(){const id=this.snapshot.crewId;this.snapshot=freeze({...this.snapshot,...(id?structuredClone(this.view(id)):{}),cacheError:this.cacheError});for(const l of this.listeners)l();}
 private persist(){if(!this.cache||this.blocked)return;try{this.cache.setItem(this.cacheKey,JSON.stringify({version:'ecg-ui/1',views:Object.fromEntries([...this.views].map(([id,{content,pending}])=>[id,{content,pending}]))}));this.cacheError=null;}catch(e){this.cacheError=storageError(e).detail;}}
 initialize(){this.snapshot=freeze({...this.snapshot,crewId:this.crewStore.getSnapshot().selectedCrewId});this.present();return this.refresh();}
 updateContent(patch:Partial<EcgCaptureContent>){const id=this.snapshot.crewId;if(!id)return;const v=this.view(id);if(v.busy||v.pending)return;v.content={...v.content,...patch,crewId:id};v.error=null;v.notice='';this.persist();this.present();}
 resetDraft(){const id=this.snapshot.crewId;if(!id||this.view(id).busy)return;this.blocked=false;this.views.set(id,fresh(id));this.persist();this.present();}
 resetCache(){if([...this.views.values()].some(v=>v.busy))return;this.blocked=false;this.persist();this.present();}
 async save():Promise<boolean>{
  const id=this.snapshot.crewId;if(!id)return false;const v=this.view(id);if(v.busy)return false;v.busy=true;v.error=null;v.notice='';this.present();
  try{if(!v.pending)v.pending=await prepareEcgReport(this.repo,v.content);this.persist();this.present();const result=await this.repo.execute(v.pending);
   this.views.set(id,{...fresh(id),notice:result.recordIds.length?'ECG report saved. Signal quality and interpretation remain unknown.':'This ECG report is already retained. No measurements added.'});
   this.persist();this.present();await this.refresh();return true;
  }catch(e){v.busy=false;v.error=storageError(e).detail;if(['CONFLICT','VALIDATION_FAILED','REFERENCE_INVALID'].includes(v.error.code))v.pending=null;this.persist();this.present();return false;}
 }
 async refresh(){const id=this.snapshot.crewId;if(!id)return;const generation=++this.generation;
  try{const [reports,observations,raws]=await Promise.all([this.repo.list('demo','Report'),this.repo.list('demo','Observation'),this.repo.list('demo','RawRecord')]);if(generation!==this.generation||id!==this.snapshot.crewId)return;
   const rawMap=new Map(raws.map(r=>[r.rawRecordId,r]));
   this.snapshot=freeze({...this.snapshot,reports:reports.filter(r=>r.type==='ecg'&&r.astronautId===id).map(report=>{const raw=rawMap.get(report.originalReportRawRecordId);return {report,observations:observations.filter(o=>o.reportId===report.reportId&&o.astronautId===id),evidence:raw?.mediaType===ECG_MEDIA?ecgEvidence(raw):null};}).sort((a,b)=>(b.report.timestamp??b.report.originalTime??'').localeCompare(a.report.timestamp??a.report.originalTime??'')),loading:false});this.present();
  }catch(e){if(generation===this.generation){this.view(id).error=storageError(e).detail;this.snapshot=freeze({...this.snapshot,loading:false});this.present();}}
 }
 dispose(){this.generation++;this.stopCrew();this.stopRepo();this.listeners.clear();}
}
