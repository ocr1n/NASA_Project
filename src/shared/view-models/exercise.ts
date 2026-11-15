import {assertValid,ContractError,failure,type ExerciseCaptureContent,type ExerciseSession,type Observation,type CommandEnvelope,type ErrorEnvelope} from '../contracts';
import {selectExerciseNotes} from '../contracts/exercise';
import {emptyExerciseContent,previewExerciseCSV,prepareExercise,commandFromExercisePreview,prepareExerciseNote,type ExercisePreview} from '../capture/exercise';
import type {Repository} from '../repositories/repository';
import {storageError} from '../repositories/storage';
import type {SelectedCrewStore} from './index';
import type {UiCacheStorage} from './check-in-draft';
export interface ExerciseSessionView {session:ExerciseSession;observations:Observation[];notes:ReturnType<typeof selectExerciseNotes>}
interface Edit {sessionId:string;head:string|null;text:string}
interface CachedView {content:ExerciseCaptureContent;notes:string;csv:string;pending:CommandEnvelope|null;pendingKind:'exercise'|'note';edit:Edit|null}
interface View extends CachedView {preview:ExercisePreview|null;busy:boolean;error:ErrorEnvelope|null;notice:string}
export interface ExerciseSnapshot extends View {crewId:string|null;sessions:ExerciseSessionView[];cacheError:ErrorEnvelope|null;loading:boolean}
const fresh=(id:string):View=>({content:emptyExerciseContent(id),notes:'',csv:'',pending:null,pendingKind:'exercise',edit:null,preview:null,busy:false,error:null,notice:''});
function freeze<T>(x:T):T{if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;}
/** Crew-scoped UI drafts derive committed exercise state only from the shared repository. */
export class ExerciseStore {
 private views=new Map<string,View>();private listeners=new Set<()=>void>();private snapshot:ExerciseSnapshot=freeze({...fresh('unselected'),crewId:null,sessions:[],cacheError:null,loading:true});
 private generation=0;private cacheError:ErrorEnvelope|null=null;private blocked=false;private stopCrew:()=>void;private stopRepo:()=>void;
 constructor(private repo:Repository,private crewStore:SelectedCrewStore,private cache?:UiCacheStorage,private cacheKey='astronaut-exercise-ui-v1'){
  try{const text=cache?.getItem(cacheKey);if(text){const saved=JSON.parse(text);if(saved.version!=='exercise-ui/1'||!saved.views||typeof saved.views!=='object')throw failure('UNSUPPORTED_VERSION','Exercise draft cache is incompatible.');
   for(const [id,item] of Object.entries(saved.views)){const v=item as CachedView;assertValid('ExerciseCaptureContent',v.content);if(v.content.crewId!==id||typeof v.notes!=='string'||v.notes.length>4000||typeof v.csv!=='string'||v.csv.length>262144||!['exercise','note'].includes(v.pendingKind))throw failure('VALIDATION_FAILED','Exercise cache contains invalid crew drafts.');
    if(v.edit&&(typeof v.edit.text!=='string'||v.edit.text.length>4000||typeof v.edit.sessionId!=='string'||!(v.edit.head===null||typeof v.edit.head==='string')))throw failure('VALIDATION_FAILED','Exercise note draft is invalid.');
    if(v.pending){assertValid('CommandEnvelope',v.pending);if(v.pending.namespace!=='demo'||v.pending.domain!=='sessions'||v.pending.subject.astronautId!==id||v.pending.subject.kind!=='crew')throw failure('REFERENCE_INVALID','Cached exercise command differs from crew.');}
    this.views.set(id,{...v,preview:null,busy:false,error:null,notice:v.pending?'A previous exercise save needs acknowledgement. Retry the same save.':''});
   }
  }}catch(e){this.blocked=true;this.cacheError=e instanceof ContractError?e.detail:failure('STORAGE_UNAVAILABLE','Exercise drafts could not be read. Reset the exercise draft cache to recover.').detail;}
  this.stopCrew=crewStore.subscribe(()=>{const id=crewStore.getSnapshot().selectedCrewId;if(id!==this.snapshot.crewId){this.generation++;this.snapshot=freeze({...fresh(id??'unselected'),crewId:id,sessions:[],cacheError:this.cacheError,loading:true});this.present();void this.refresh();}});
  this.stopRepo=repo.subscribe(e=>{if(e.namespace==='demo')void this.refresh();});
 }
 getSnapshot=()=>this.snapshot;
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 private view(id:string){if(!this.views.has(id))this.views.set(id,fresh(id));return this.views.get(id)!;}
 private present(){const id=this.snapshot.crewId;this.snapshot=freeze({...this.snapshot,...(id?structuredClone(this.view(id)):{}),cacheError:this.cacheError});for(const l of this.listeners)l();}
 private persist(){if(!this.cache||this.blocked)return;try{this.cache.setItem(this.cacheKey,JSON.stringify({version:'exercise-ui/1',views:Object.fromEntries([...this.views].map(([id,{content,notes,csv,pending,pendingKind,edit}])=>[id,{content,notes,csv,pending,pendingKind,edit}]))}));this.cacheError=null;}catch(e){this.cacheError=storageError(e).detail;}}
 initialize(){const id=this.crewStore.getSnapshot().selectedCrewId;this.snapshot=freeze({...this.snapshot,crewId:id});this.present();return this.refresh();}
 updateContent(patch:Partial<ExerciseCaptureContent>){const id=this.snapshot.crewId;if(!id)return;const v=this.view(id);if(v.busy||v.pending||v.csv)return;v.content={...v.content,...patch};v.preview=null;v.error=null;v.notice='';this.persist();this.present();}
 updateNotes(text:string){const id=this.snapshot.crewId;if(!id)return;const v=this.view(id);if(v.busy||v.pending)return;v.notes=text;this.persist();this.present();}
 resetDraft(){const id=this.snapshot.crewId;if(!id||this.view(id).busy)return;this.blocked=false;this.views.set(id,fresh(id));this.persist();this.present();}
 retryCache(){this.blocked=false;this.persist();this.present();}
 async preview(csv:string,crewId=this.snapshot.crewId){if(!crewId)return;const v=this.view(crewId);if(v.busy||v.pending)return;v.busy=true;v.error=null;v.csv=csv;v.preview=null;this.persist();this.present();
  try{v.preview=await previewExerciseCSV(this.repo,csv,crewId);v.content=v.preview.content;v.notice=v.preview.message;}catch(e){v.error=storageError(e).detail;}finally{v.busy=false;this.persist();this.present();}
 }
 beginNotes(sessionId:string){const id=this.snapshot.crewId;if(!id)return;const v=this.view(id),s=this.snapshot.sessions.find(s=>s.session.sessionId===sessionId);if(v.busy||v.pending||!s)return;v.edit={sessionId,text:s.notes.text,head:s.notes.history.at(-1)?.rawRecordId??null};v.error=null;this.persist();this.present();}
 editNotes(text:string){const id=this.snapshot.crewId;if(!id)return;const v=this.view(id);if(!v.edit||v.busy||v.pending)return;v.edit.text=text;this.persist();this.present();}
 async save(kind:'exercise'|'note'='exercise'):Promise<boolean>{
  const id=this.snapshot.crewId;if(!id)return false;const v=this.view(id);if(v.busy)return false;v.busy=true;v.error=null;v.notice='';this.present();
  try{
   if(!v.pending){v.pendingKind=kind;
    if(kind==='note'){if(!v.edit)throw failure('VALIDATION_FAILED','Select retained session notes first.');v.pending=await prepareExerciseNote(this.repo,id,v.edit.sessionId,v.edit.text,v.edit.head);}
    else {if(v.csv&&!v.preview)throw failure('VALIDATION_FAILED','Preview the retained CSV before saving.');v.pending=v.preview?await commandFromExercisePreview(v.preview,v.notes):await prepareExercise(this.repo,v.content,{notes:v.notes});}
   }
   this.persist();this.present();const result=await this.repo.execute(v.pending),completed=v.pendingKind;
   if(completed==='exercise')this.views.set(id,{...fresh(id),notice:result.recordIds.length?'Exercise session saved. Interpretation pending.':'Workout already retained. No session, measurement or task added.'});
   else {v.pending=null;v.edit=null;v.busy=false;v.notice='Session notes saved; earlier evidence retained.';}
   this.persist();this.present();await this.refresh();return true;
  }catch(e){v.busy=false;v.error=storageError(e).detail;this.persist();this.present();return false;}
 }
 async refresh(){const id=this.snapshot.crewId;if(!id)return;const generation=++this.generation;
  try{const [sessions,observations,raws]=await Promise.all([this.repo.list('demo','ExerciseSession'),this.repo.list('demo','Observation'),this.repo.list('demo','RawRecord')]);if(generation!==this.generation||id!==this.snapshot.crewId)return;
   this.snapshot=freeze({...this.snapshot,sessions:sessions.filter(s=>s.astronautId===id).map(session=>({session,observations:observations.filter(o=>o.sessionId===session.sessionId&&o.astronautId===id),notes:selectExerciseNotes(session,raws)})).sort((a,b)=>(b.session.startAt??'').localeCompare(a.session.startAt??'')),loading:false});this.present();
  }catch(e){if(generation===this.generation){this.view(id).error=storageError(e).detail;this.snapshot=freeze({...this.snapshot,loading:false});this.present();}}
 }
 dispose(){this.generation++;this.stopCrew();this.stopRepo();this.listeners.clear();}
}
