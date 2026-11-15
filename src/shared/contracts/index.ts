import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import artifact from './v0.1.0.schema.json';
import type { CanonicalRecord, ErrorEnvelope } from './generated';
export type * from './generated';
export const schema = artifact;
export const SCHEMA_VERSION = artifact.$defs.ExportSnapshot.properties.schemaVersion.const as '0.1.0';
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true, strictRequired: false, coerceTypes: false, useDefaults: false, removeAdditional: false });
addFormats(ajv);
ajv.addSchema(artifact);
// Compile every definition now, so a bad branch cannot remain hidden until capture.
const validators = new Map(Object.keys(artifact.$defs).map(name => [name, ajv.getSchema(`${artifact.$id}#/$defs/${name}`)!]));
export type ValidationResult<T> = {ok:true;value:T} | {ok:false;issues:{path:string;message:string}[]};
/** Validate the serialized authority without coercing, filling or deleting fields. */
export function validateRecord<T=CanonicalRecord>(name:string,value:unknown):ValidationResult<T> {
 const validator=validators.get(name);
 if(!validator) return {ok:false,issues:[{path:'/',message:'Unknown contract type'}]};
 if(validator(value)) return {ok:true,value:value as T};
 return {ok:false,issues:(validator.errors??[]).map(e=>({path:e.instancePath||'/',message:e.message??'Invalid record'}))};
}
export type RecordType=CanonicalRecord['recordType'];
export const recordTypes=Object.entries(artifact.$defs).filter(([,s])=>'properties' in s && 'recordType' in s.properties && 'const' in s.properties.recordType).map(([n])=>n) as RecordType[];
export const idFields=Object.fromEntries(recordTypes.map(name=>{
 const s=artifact.$defs[name as keyof typeof artifact.$defs] as {required:string[]}; return [name,s.required[3]];
})) as Record<RecordType,string>;
export const recordId=(record:CanonicalRecord):string => (record as unknown as Record<string,unknown>)[idFields[record.recordType]] as string;
export class ContractError extends Error {
 constructor(public readonly detail:ErrorEnvelope){super(detail.message);this.name='ContractError';}
}
export function failure(code:ErrorEnvelope['code'],message:string,path='/',recoverable=false,retryContext:string|null=null):ContractError {
 return new ContractError({schemaVersion:SCHEMA_VERSION,code,message,path,recoverable,retryContext});
}
export function assertValid<T=CanonicalRecord>(name:string,value:unknown):asserts value is T {
 const result=validateRecord<T>(name,value);
 if(!result.ok)throw failure('VALIDATION_FAILED','Record does not satisfy the canonical contract',result.issues[0]?.path??'/');
}
