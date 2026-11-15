import {assertValid,failure,type CommandEnvelope,type ErrorEnvelope,type MissionContext,type Observation,type RawRecord,type Report,type SourceRecord} from '../contracts';
import {selectCollectionAttempts} from '../contracts/collection';
import {collectionGroups,collectionSchedules,collectionSlot,type CollectionSlot,type CollectionGroup} from '../metrics/collection';
import {prepareCollection} from '../capture/collection';
import {prepareCapture} from '../capture';
import type {Repository} from '../repositories/repository';
import {storageError} from '../repositories/storage';
import type {SelectedCrewStore} from './index';
import type {UiCacheStorage} from './check-in-draft';
import {freshCollectionDraft,isCollectionDraft,collectionValues,reportedCollectionTime,type CollectionDraft} from './collection-draft';

interface View {draft:CollectionDraft;pending:CommandEnvelope|null;busy:boolean;error:ErrorEnvelope|null;notice:string}
export interface CollectionReportView {report:Report;observations:Observation[];source:SourceRecord|null;raw:RawRecord|null}
export interface CollectionSlotView {scheduleId:string;label:string;slot:CollectionSlot|null;attempts:ReturnType<typeof selectCollectionAttempts>}
export interface CollectionSnapshot extends View {crewId:string|null;mission:MissionContext|null;reports:CollectionReportView[];slots:CollectionSlotView[];readings:Observation[];loading:boolean;cacheError:ErrorEnvelope|null}
const fresh=():View=>({draft:freshCollectionDraft(),pending:null,busy:false,error:null,notice:''});
function freeze<T>(value:T):T{if(value&&typeof value==='object'){Object.freeze(value);for(const item of Object.values(value))freeze(item);}return value;}
/** Repository-derived collection/report views; drafts and exact retries stay scoped by crew. */
export class CollectionStore {
 private views=new Map<string,View>();private listeners=new Set<()=>void>();private generation=0;private cacheError:ErrorEnvelope|null=null;private blocked=false;
 private snapshot:CollectionSnapshot=freeze({...fresh(),crewId:null,mission:null,reports:[],slots:[],readings:[],loading:true,cacheError:null});private stopCrew:()=>void;private stopRepo:()=>void;
 constructor(private repo:Repository,private crewStore:SelectedCrewStore,private cache?:UiCacheStorage,private cacheKey='astronaut-collection-ui-v1'){
  try{const text=cache?.getItem(cacheKey);if(text){const data=JSON.parse(text);if(data.version!=='collection-ui/1'||!data.views||typeof data.views!=='object'||Array.isArray(data.views))throw failure('UNSUPPORTED_VERSION','Collection draft cache is incompatible.');
   for(const [id,item] of Object.entries(data.views)){const saved=item as {draft:CollectionDraft;pending:CommandEnvelope|null};if(!saved||typeof saved!=='object'||Object.keys(saved).length!==2||!Object.hasOwn(saved,'pending')||!isCollectionDraft(saved.draft))throw failure('VALIDATION_FAILED','Collection cache contains invalid drafts.');
    if(saved.pending){assertValid('CommandEnvelope',saved.pending);if(saved.pending.subject.kind!=='crew'||saved.pending.subject.astronautId!==id||saved.pending.namespace!=='demo'||saved.pending.domain!=='capture'||saved.pending.operation!=='capture')throw failure('REFERENCE_INVALID','Cached collection command differs from crew.');}
    this.views.set(id,{...fresh(),draft:saved.draft,pending:saved.pending,notice:saved.pending?'A previous collection save needs acknowledgement. Retry the same save.':''});
   }
  }}catch(e){this.blocked=true;this.cacheError=storageError(e).detail;}
  this.stopCrew=crewStore.subscribe(()=>{const id=crewStore.getSnapshot().selectedCrewId;if(id!==this.snapshot.crewId){this.generation++;this.snapshot=freeze({...fresh(),crewId:id,mission:null,reports:[],slots:[],readings:[],loading:true,cacheError:this.cacheError});this.present();void this.refresh();}});
  this.stopRepo=repo.subscribe(e=>{if(e.namespace==='demo')void this.refresh();});
 }
 getSnapshot=()=>this.snapshot;
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 private view(id:string){if(!this.views.has(id))this.views.set(id,fresh());return this.views.get(id)!;}
 private present(){const id=this.snapshot.crewId;this.snapshot=freeze({...this.snapshot,...(id?structuredClone(this.view(id)):{}),cacheError:this.cacheError});for(const l of this.listeners)l();}
 private persist(){if(!this.cache||this.blocked)return;try{this.cache.setItem(this.cacheKey,JSON.stringify({version:'collection-ui/1',views:Object.fromEntries([...this.views].map(([id,v])=>[id,{draft:v.draft,pending:v.pending}]))}));this.cacheError=null;}catch(e){this.cacheError=storageError(e).detail;}}
 initialize(){this.snapshot=freeze({...this.snapshot,crewId:this.crewStore.getSnapshot().selectedCrewId});this.present();return this.refresh();}
 update(patch:Partial<CollectionDraft>){const id=this.snapshot.crewId;if(!id)return;const v=this.view(id);if(v.busy||v.pending)return;const draft={...v.draft,...patch};if(!isCollectionDraft(draft))throw failure('VALIDATION_FAILED','Invalid collection draft.');v.draft=draft;v.error=null;v.notice='';this.persist();this.present();}
 selectGroup(group:CollectionGroup){const id=this.snapshot.crewId;if(!id)return;const v=this.view(id);if(v.busy||v.pending)return;v.draft={...freshCollectionDraft(group),scheduleId:v.draft.scheduleId};this.persist();this.present();}
 selectSchedule(scheduleId:string){this.update({scheduleId,reportId:'',outcome:'recorded',reason:'',context:'rest'});}
 reset(){const id=this.snapshot.crewId;if(!id||this.view(id).busy)return;this.blocked=false;this.views.set(id,fresh());this.persist();this.present();}
 retryCache(){this.blocked=false;this.persist();this.present();}
 async save():Promise<boolean>{
  const id=this.snapshot.crewId;if(!id)return false;const v=this.view(id);if(v.busy)return false;v.busy=true;v.error=null;v.notice='';this.present();
  try{
   if(!v.pending){const d=v.draft,operationId=crypto.randomUUID(),values=collectionValues(d,`acquisition-${operationId}`);
    if(d.scheduleId){const slot=this.snapshot.slots.find(s=>s.scheduleId===d.scheduleId);if(!slot?.slot)throw failure('VALIDATION_FAILED','Collection slot is unavailable.');
     if(d.outcome==='recorded'&&d.scheduleId!=='fictional-context-7d'&&!d.reportId)throw failure('VALIDATION_FAILED','Select an existing report or record why it is missing.');
     v.pending=await prepareCollection(this.repo,{astronautId:id,scheduleId:d.scheduleId,slotIndex:slot.slot.index,expectedHead:slot.attempts.at(-1)?.raw.rawRecordId??null,outcome:d.outcome,reason:d.reason,time:reportedCollectionTime(d),values,reportId:d.outcome==='recorded'&&d.reportId?d.reportId:null,notes:d.notes,operationId});
    }else{
     if(['skipped','device_failed'].includes(d.outcome))throw failure('VALIDATION_FAILED','Select a collection slot to record a skip or device failure.');
     v.pending=await prepareCapture(this.repo,{namespace:'demo',astronautId:id,operationId,sourceId:'simulation',receivedAt:this.repo.clock.now(),deliveryMode:'manual',time:reportedCollectionTime(d),values,notes:d.notes});
    }
   }
   this.persist();this.present();await this.repo.execute(v.pending);
   this.views.set(id,{...fresh(),notice:'Collection saved. Interpretation and quality remain separate from recording.'});this.persist();this.present();await this.refresh();return true;
  }catch(e){v.busy=false;v.error=storageError(e).detail;this.persist();this.present();return false;}
 }
 async refresh(){const id=this.snapshot.crewId;if(!id)return;const generation=++this.generation;
  try{const crew=await this.repo.require('demo','CrewProfile',id);const [mission,reports,observations,raws,sources]=await Promise.all([this.repo.require('demo','MissionContext',crew.missionId),this.repo.list('demo','Report'),this.repo.list('demo','Observation'),this.repo.list('demo','RawRecord'),this.repo.list('demo','SourceRecord')]);
   if(generation!==this.generation||id!==this.snapshot.crewId)return;
   this.snapshot=freeze({...this.snapshot,mission,reports:reports.filter(r=>r.astronautId===id&&r.missionId===crew.missionId&&['ecg','echo'].includes(r.type)).map(report=>({report,observations:observations.filter(o=>o.astronautId===id&&o.reportId===report.reportId&&report.observationIds.includes(o.observationId)),source:sources.find(s=>s.sourceId===report.sourceId)??null,raw:raws.find(r=>r.rawRecordId===report.originalReportRawRecordId)??null})),slots:collectionSchedules.map(s=>{const slot=collectionSlot(mission,s.scheduleId);return {scheduleId:s.scheduleId,label:s.label,slot,attempts:slot?selectCollectionAttempts(raws,id,s.scheduleId,slot.index):[]};}),readings:observations.filter(o=>o.astronautId===id&&Object.values(collectionGroups).flat().includes(o.metric)&&o.observationId.startsWith('checkin-')),loading:false});this.present();
  }catch(e){if(generation===this.generation){this.view(id).error=storageError(e).detail;this.snapshot=freeze({...this.snapshot,mission:null,reports:[],slots:[],readings:[],loading:false});this.present();}}
 }
 dispose(){this.generation++;this.stopCrew();this.stopRepo();this.listeners.clear();}
}
