import {emptyState,type NamespaceState,type StorageAdapter} from './storage';
/** Serialized copy-on-write transactions mirror IndexedDB's read/write isolation. */
export class MemoryStorage implements StorageAdapter {
 private states=new Map<string,NamespaceState>();private tail:Promise<unknown>=Promise.resolve();
 async read(namespace:string){await this.tail;return structuredClone(this.states.get(namespace)??emptyState());}
 transact<T>(namespace:string,work:(draft:NamespaceState)=>T):Promise<T>{
  const result=this.tail.then(()=>{const draft=structuredClone(this.states.get(namespace)??emptyState());const value=work(draft);this.states.set(namespace,structuredClone(draft));return value;});
  this.tail=result.catch(()=>undefined);return result;
 }
}
