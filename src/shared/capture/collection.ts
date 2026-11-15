import {assertValid,failure,SCHEMA_VERSION,type CollectionAttemptEvidence,type CommandEnvelope,type RawRecord} from '../contracts';
import {canonicalJSON,sha256} from '../contracts/identity';
import {COLLECTION_MEDIA,collectionId,selectCollectionAttempts} from '../contracts/collection';
import {collectionSlot} from '../metrics/collection';
import type {Repository} from '../repositories/repository';
import {captureTime,prepareCapture,type NumericCaptureValue,type ReportedTime} from './index';

export interface CollectionInput {astronautId:string;scheduleId:string;slotIndex:number;expectedHead:string|null;outcome:CollectionAttemptEvidence['outcome'];reason:string;time:ReportedTime;values:NumericCaptureValue[];reportId:string|null;notes:string;operationId?:string}
/** Prepare a capture/attempt together; repository graph validation is the final atomic authority. */
export async function prepareCollection(repo:Repository,input:CollectionInput):Promise<CommandEnvelope>{
 const crew=await repo.require('demo','CrewProfile',input.astronautId),mission=await repo.require('demo','MissionContext',crew.missionId),slot=collectionSlot(mission,input.scheduleId,input.slotIndex);
 if(!slot)throw failure('VALIDATION_FAILED','The fictional collection slot is unavailable; check the mission clock and plan.');
 const chain=selectCollectionAttempts(await repo.list('demo','RawRecord'),crew.astronautId,input.scheduleId,input.slotIndex),head=chain.at(-1);
 if(input.expectedHead!==(head?.raw.rawRecordId??null))throw failure('CONFLICT','Collection attempt head changed. Review retained attempts before retrying.');
 if(head?.evidence.outcome==='recorded')throw failure('CONFLICT','This collection slot is already recorded.');
 const operationId=input.operationId??crypto.randomUUID(),at=repo.clock.now();
 const command:CommandEnvelope={schemaVersion:SCHEMA_VERSION,namespace:'demo',operationId,idempotencyKey:operationId,subject:{kind:'crew',astronautId:crew.astronautId,missionId:crew.missionId},createdAt:at,operation:'capture',domain:'capture',payload:{records:[],expectedRevisions:[],importKeys:[],previewToken:null}};
 let time=input.time;
 if(input.reportId){const report=await repo.require('demo','Report',input.reportId);
  // Link the Report's own date; review arrival/due time cannot replace its acquisition date.
  time={precision:report.timePrecision==='exact'?'exact':report.timePrecision==='date'?'date':'unknown',text:report.originalTime??report.timestamp??'',reason:report.timeReason??''};
 }
 captureTime(time,mission);
 if(input.values.length){const numerical=await prepareCapture(repo,{namespace:'demo',astronautId:crew.astronautId,sourceId:'simulation',operationId,receivedAt:at,deliveryMode:'manual',time,notes:input.notes,values:input.values});command.payload.records.push(...numerical.payload.records);}
 const e:CollectionAttemptEvidence={protocolVersion:'collection-attempt/1',astronautId:crew.astronautId,missionId:crew.missionId,sourceId:'simulation',schedule:slot.schedule,slotIndex:slot.index,dueAt:slot.dueAt,sequence:chain.length+1,previousRawRecordId:head?.raw.rawRecordId??null,outcome:input.outcome,reason:input.reason,time,observationIds:command.payload.records.filter(r=>r.recordType==='Observation').map(r=>r.observationId),reportIds:input.reportId?[input.reportId]:[],recordedAt:at};
 assertValid('CollectionAttemptEvidence',e);const id=collectionId(e),payload=canonicalJSON(e);
 const raw:RawRecord={schemaVersion:SCHEMA_VERSION,namespace:'demo',recordType:'RawRecord',rawRecordId:id,revision:1,sourceId:'simulation',acquisitionId:id,importBatchId:null,payload,fileReference:null,contentHash:await sha256(payload),mediaType:COLLECTION_MEDIA,encoding:'utf-8',retrievedAt:at,retentionPolicy:'Retain every fictional collection attempt',accessPolicy:'Fictional demo only'};
 command.payload.records.push(raw);assertValid('CommandEnvelope',command);return command;
}
