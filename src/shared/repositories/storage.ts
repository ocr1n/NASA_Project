import {ContractError,failure,type CanonicalRecord,type OperationReceipt,type ImportLedgerEntry} from '../contracts';
export interface NamespaceState {records:Record<string,CanonicalRecord>;operations:OperationReceipt[];imports:ImportLedgerEntry[];sequence:number}
export const emptyState=():NamespaceState=>({records:{},operations:[],imports:[],sequence:0});
export const storageKey=(type:string,id:string)=>`${type}:${id}`;
export interface StorageAdapter {
 read(namespace:string):Promise<NamespaceState>;
 transact<T>(namespace:string,work:(draft:NamespaceState)=>T):Promise<T>;
}
/** Safe errors never expose payloads; preserve the original contract failure. */
export function storageError(error:unknown):ContractError {
 if(error instanceof ContractError)return error;
 const name=(error as {name?:string})?.name;
 if(name==='QuotaExceededError')return failure('STORAGE_QUOTA','Local storage is full. Export existing data and free space before retrying.','/',true,'same command');
 if(['SecurityError','MissingAPIError','InvalidStateError','DatabaseClosedError'].includes(name??''))return failure('STORAGE_UNAVAILABLE','Local storage is unavailable. Enable browser storage and reopen.','/',true,'same command');
 return failure('STORAGE_FAILED','The local transaction failed; no partial changes were committed.','/',true,'same command');
}
