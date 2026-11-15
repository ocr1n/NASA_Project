import { failure } from './index';
/** Deterministic JSON; rejects non-JSON values instead of silently changing their meaning. */
export function canonicalJSON(value:unknown):string {
 if(value===null || typeof value==='string' || typeof value==='boolean')return JSON.stringify(value);
 if(typeof value==='number'){if(!Number.isFinite(value))throw failure('VALIDATION_FAILED','Nonfinite number is not serializable');return JSON.stringify(value);}
 if(Array.isArray(value))return `[${value.map(canonicalJSON).join(',')}]`;
 if(typeof value==='object' && Object.getPrototypeOf(value)===Object.prototype){const x=value as Record<string,unknown>;return `{${Object.keys(x).sort().map(k=>`${JSON.stringify(k)}:${canonicalJSON(x[k])}`).join(',')}}`;}
 throw failure('VALIDATION_FAILED','Only plain serialized JSON records are accepted');
}
export async function sha256(value:string):Promise<string>{
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}
/** Source identity includes the dataset namespace and source version; arrival time is irrelevant. */
export function stableImportKey(namespace:string,sourceId:string,version:string,sourceRecordId:string):string {
 if([namespace,sourceId,version,sourceRecordId].some(x=>!x))throw failure('VALIDATION_FAILED','Import identity fields are required');
 return canonicalJSON([namespace,sourceId,version,sourceRecordId]);
}
export async function importedObservationId(key:string):Promise<string>{return `import_${await sha256(key)}`;}
