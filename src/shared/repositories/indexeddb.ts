import Dexie,{type Table} from 'dexie';
import type {CanonicalRecord} from '../contracts';
import {canonicalJSON} from '../contracts/identity';
import {emptyState,storageError,type NamespaceState,type StorageAdapter} from './storage';
interface StoredRecord {key:string;namespace:string;record:CanonicalRecord}
interface Metadata extends Omit<NamespaceState,'records'> {namespace:string}
export class FoundationDatabase extends Dexie {
 records!:Table<StoredRecord,string>;metadata!:Table<Metadata,string>;
 constructor(name:string){super(name);this.version(1).stores({records:'key,namespace',metadata:'namespace'});}
}
export class IndexedDbStorage implements StorageAdapter {
 readonly db:FoundationDatabase;
 constructor(name='astronaut-health-v0'){this.db=new FoundationDatabase(name);}
 private async load(namespace:string):Promise<NamespaceState>{
  const meta=await this.db.metadata.get(namespace);const rows=await this.db.records.where('namespace').equals(namespace).toArray();
  return {records:Object.fromEntries(rows.map(row=>[row.key.slice(namespace.length+1),row.record])),operations:meta?.operations??[],imports:meta?.imports??[],sequence:meta?.sequence??0};
 }
 async read(namespace:string){try{return await this.db.transaction('r',this.db.records,this.db.metadata,()=>this.load(namespace));}catch(e){throw storageError(e);}}
 async transact<T>(namespace:string,work:(draft:NamespaceState)=>T):Promise<T>{
  try{return await this.db.transaction('rw',this.db.records,this.db.metadata,async()=>{
   const original=await this.load(namespace);const draft=structuredClone(original);const result=work(draft);
   // All CPU work was synchronous; only IndexedDB promises are awaited here.
   for(const [key,record] of Object.entries(draft.records))if(!original.records[key]||canonicalJSON(record)!==canonicalJSON(original.records[key]))await this.db.records.put({key:`${namespace}|${key}`,namespace,record});
   await this.db.metadata.put({namespace,operations:draft.operations,imports:draft.imports,sequence:draft.sequence});return result;
  });}catch(e){throw storageError(e);}
 }
 close(){this.db.close();}
}
