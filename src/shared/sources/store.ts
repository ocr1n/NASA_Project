import type {Observation,SourceRecord,ValidationRun} from '../contracts';
import type {Repository} from '../repositories/repository';
import {importNASACatalogue,importPTBSample} from './pipeline';
import {importEvidenceLedger} from './ledger';

export type SourcesSnapshot={busy:boolean;notice:string;error:string;sources:readonly SourceRecord[];observations:readonly Observation[];runs:readonly ValidationRun[]};
const freeze=<T,>(value:T):T=>{if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;};

/** Independent research selector; this store never supplies public clinical rows to selected-crew state. */
export class SourcesStore {
 private snapshot:SourcesSnapshot=freeze({busy:false,notice:'Pinned archive fixtures available offline after installation.',error:'',sources:[],observations:[],runs:[]});private listeners=new Set<()=>void>();private generation=0;
 constructor(private repository:Repository){}
 getSnapshot=()=>this.snapshot;
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 private update(value:SourcesSnapshot){this.snapshot=freeze(value);for(const listener of this.listeners)listener();}
 async refresh(){const generation=++this.generation;try{
  const [nasa,ptb,observations,nasaRuns,ptbRuns,ledger]=await Promise.all([this.repository.list('research:osd575','SourceRecord'),this.repository.list('research:ptb-xl-plus','SourceRecord'),this.repository.list('research:ptb-xl-plus','Observation'),this.repository.list('research:osd575','ValidationRun'),this.repository.list('research:ptb-xl-plus','ValidationRun'),this.repository.list('research:evidence','ValidationRun')]);
  if(generation===this.generation)this.update({...this.snapshot,sources:[...nasa,...ptb],observations,runs:[...nasaRuns,...ptbRuns,...ledger]});
 }catch{if(generation===this.generation)this.update({...this.snapshot,error:'Research storage could not be read. Retry opening the sample.'});}}
 async openSample(){if(this.snapshot.busy)return;this.update({...this.snapshot,busy:true,error:''});try{
  await importNASACatalogue(this.repository);await importEvidenceLedger(this.repository);const result=await importPTBSample(this.repository);
  this.update({...this.snapshot,notice:result.status==='unchanged'?'Retained research sample unchanged.':`Research sample retained: ${result.batch.acceptedRows} ECG records. Individual assessment unavailable.`});await this.refresh();
 }catch(error){this.update({...this.snapshot,error:error instanceof Error?error.message:'Sample could not be opened. Existing history is preserved.'});}finally{this.update({...this.snapshot,busy:false});}}
 dispose(){this.generation++;this.listeners.clear();}
}
