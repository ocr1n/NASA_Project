import {failure,type EcgResearchPreview,type CommandEnvelope,type Report,type Observation,type ErrorEnvelope} from '../contracts';
import {storageError} from '../repositories/storage';
import type {Repository} from '../repositories/repository';
import {previewPTBReports,commandFromPTBPreview,type PTBReportInput} from '../capture/ecg-research';
import {fixtureArtifact} from '../sources/catalogue';
import type {EcgResearchMethod} from '../contracts/ecg-research';

type Role='features'|'parent'|'description';
export interface EcgImportSnapshot {method:EcgResearchMethod;preview:EcgResearchPreview|null;selectedEcgIds:string[];reports:{report:Report;observations:Observation[]}[];files:Record<Role,string>;busy:boolean;pending:boolean;error:ErrorEnvelope|null;notice:string}
const freeze=<T,>(value:T):T=>{if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;};

/** Public research boundary; it never subscribes to a crew or supplies clinical rows to a personal view. */
export class EcgImportStore {
 private snapshot:EcgImportSnapshot=freeze({method:'ECGDeli',preview:null,selectedEcgIds:[],reports:[],files:{features:'Pinned ECGDeli excerpt',parent:'Pinned parent metadata',description:'Pinned feature description'},busy:false,pending:false,error:null,notice:''});
 private input:PTBReportInput={method:'ECGDeli'};private pendingCommand:CommandEnvelope|null=null;private listeners=new Set<()=>void>();private disposed=false;private generation=0;private readGeneration=0;private stopRepo:()=>void;
 constructor(private repo:Repository){this.stopRepo=repo.subscribe(e=>{if(e.namespace==='research:ptb-xl-plus')void this.refresh();});}
 getSnapshot=()=>this.snapshot;
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 private update(patch:Partial<EcgImportSnapshot>){if(this.disposed)return;this.snapshot=freeze({...this.snapshot,...patch,pending:!!this.pendingCommand});for(const listener of this.listeners)listener();}
 initialize(){return this.refresh();}
 setMethod(method:EcgResearchMethod){if(this.snapshot.busy||this.pendingCommand||!['ECGDeli','Uni-G'].includes(method))return;this.generation++;this.input={method};this.update({method,preview:null,selectedEcgIds:[],files:{features:`Pinned ${method} excerpt`,parent:'Pinned parent metadata',description:'Pinned feature description'},error:null,notice:''});}
 async loadFile(role:Role,file:File){
  if(this.snapshot.busy||this.pendingCommand)return;
  const generation=++this.generation,method=this.snapshot.method;this.update({busy:true,preview:null,selectedEcgIds:[],error:null});
  try{
   if(file.size>2097152)throw failure('VALIDATION_FAILED','Use a licensed PTB CSV excerpt at most 2 MiB.');
   const bytes=new Uint8Array(await file.arrayBuffer()),payload=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes),encoded=new TextEncoder().encode(payload);
   if(encoded.length!==bytes.length||encoded.some((byte,i)=>byte!==bytes[i]))throw failure('VALIDATION_FAILED','The CSV must preserve valid UTF-8 source bytes.');
   if(this.disposed||generation!==this.generation)return;
   const id=role==='features'?(method==='ECGDeli'?'ptbecgdeli':'ptbunig'):role==='parent'?'ptbparent':'ptbdescription';
   this.input={...this.input,[role]:{...fixtureArtifact(id),payload,expectedHash:undefined}};this.update({preview:null,error:null,notice:'File loaded for preview only; no records saved.',files:{...this.snapshot.files,[role]:file.name}});
  }catch(error){if(generation===this.generation)this.update({preview:null,error:storageError(error).detail});}
  finally{if(generation===this.generation)this.update({busy:false});}
 }
 async preview(selectedEcgIds?:string[]){
  if(this.snapshot.busy||this.pendingCommand)return;const generation=++this.generation;this.update({busy:true,error:null,notice:''});
  try{const preview=await previewPTBReports(this.repo,{...this.input,...(selectedEcgIds?{selectedEcgIds}:{})});if(generation===this.generation)this.update({preview,selectedEcgIds:preview.selectedEcgIds});}
  catch(error){if(generation===this.generation)this.update({preview:null,error:storageError(error).detail});}
  finally{if(generation===this.generation)this.update({busy:false});}
 }
 selectRows(ids:string[]){if(this.snapshot.busy||this.pendingCommand)return Promise.resolve();this.update({selectedEcgIds:[...ids]});return this.preview(ids);}
 async save():Promise<boolean>{
  if(this.snapshot.busy||!this.snapshot.preview&&!this.pendingCommand)return false;this.update({busy:true,error:null,notice:''});
  try{
   if(!this.pendingCommand)this.pendingCommand=await commandFromPTBPreview(this.snapshot.preview!);
   this.update({});if(this.pendingCommand)await this.repo.execute(this.pendingCommand);this.pendingCommand=null;
   this.update({notice:'ECG research reports retained. Signal quality and personal interpretation remain unavailable.'});await this.refresh();
   try{this.update({preview:await previewPTBReports(this.repo,{...this.input,selectedEcgIds:this.snapshot.preview?.selectedEcgIds})});}catch(error){this.update({preview:null,error:storageError(error).detail});}return true;
  }catch(error){this.update({error:storageError(error).detail});return false;}
  finally{this.update({busy:false});}
 }
 async resetPreview(){if(this.snapshot.busy)return;this.pendingCommand=null;this.generation++;this.update({preview:null,selectedEcgIds:[],error:null,notice:'Preview cleared; retained research records are unchanged.'});await this.refresh();}
 async refresh(){const generation=++this.readGeneration;
  try{const snapshot=await this.repo.export('research:ptb-xl-plus');if(this.disposed||generation!==this.readGeneration)return;
   const reports=snapshot.records.filter((r):r is Report=>r.recordType==='Report'&&r.type==='ecg'&&r.dataOrigin==='public_research');
   this.update({reports:reports.map(report=>({report,observations:snapshot.records.filter((r):r is Observation=>r.recordType==='Observation'&&r.reportId===report.reportId&&r.publicSubjectId===report.publicSubjectId)}))});
  }catch(error){if(generation===this.readGeneration)this.update({error:storageError(error).detail});}
 }
 async exportRecords(){try{return await this.repo.export('research:ptb-xl-plus');}catch(error){this.update({error:storageError(error).detail});return null;}}
 dispose(){this.disposed=true;this.generation++;this.readGeneration++;this.stopRepo();this.listeners.clear();}
}
