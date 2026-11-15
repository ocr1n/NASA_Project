import {assertValid,type CanonicalRecord,type Observation,type Report,type RawRecord,type BaselineRequest} from '../contracts';
import {canonicalJSON,sha256} from '../contracts/identity';
import {createDemoRecords,DEMO_TIME} from '../fixtures';

/** Traceable authored preflight exams augment frozen bundles; never relabel an existing record. */
export async function createBaselineFixtureRecords():Promise<CanonicalRecord[]>{
 const records=await createDemoRecords(),extra:CanonicalRecord[]=[];
 for(const type of ['ecg','echo','muscle','dxa'] as const){
  const original=records.find((r):r is Report=>r.recordType==='Report'&&r.type===type)!;
  const reportId='preflight-exam-'+type,dateOnly=type==='echo';
  const originalTime=dateOnly?'2025-12-18':null,timestamp=dateOnly?null:'2025-12-19T12:00:00Z';
  const observationIds:string[]=[];
  for(const id of original.observationIds){
   const sample=records.find((r):r is Observation=>r.recordType==='Observation'&&r.observationId===id)!;
   const observationId='preflight-exam-'+sample.metric,rawRecordId='raw-'+observationId;
   const payload=canonicalJSON({fixtureVersion:'baseline-fixtures/1',demoOnly:true,metric:sample.metric,value:sample.value,timestamp,originalTime,missionPhase:'preflight'});
   const contentHash=await sha256(payload);
   const o:unknown={...structuredClone(sample),observationId,reportId,acquisitionId:reportId,timestamp,
    timePrecision:dateOnly?'date':'exact',originalTime,timeReason:dateOnly?'Fictional report supplies calendar date only.':null,
    measurementContext:{...sample.measurementContext,missionPhase:'preflight'},
    laterality:type==='muscle'||type==='dxa'?sample.measurementContext.laterality:sample.laterality,
    provenance:{...sample.provenance,rawRecordId,contentHash,sourceRecordId:observationId,pipelineVersion:'baseline-fixtures/1',parameters:{...sample.provenance.parameters,demoOnly:true}}
   };
   assertValid<Observation>('Observation',o);
   const raw:RawRecord={schemaVersion:o.schemaVersion,namespace:'demo',recordType:'RawRecord',rawRecordId,revision:1,
    sourceId:'simulation',acquisitionId:reportId,importBatchId:null,payload,fileReference:null,contentHash,
    mediaType:'application/json',encoding:'utf-8',retrievedAt:DEMO_TIME,retentionPolicy:'Preserve authored baseline fixture.',accessPolicy:'Public fictional'};
   assertValid<RawRecord>('RawRecord',raw);extra.push(raw,o);observationIds.push(observationId);
  }
  const reportRawId='raw-'+reportId,payload=canonicalJSON({fixtureVersion:'baseline-fixtures/1',demoOnly:true,type,observationIds,timestamp,originalTime});
  const report:unknown={...structuredClone(original),reportId,observationIds,timestamp,timePrecision:dateOnly?'date':'exact',
   originalTime,timeReason:dateOnly?'Fictional exam date; time of day unknown.':null,originalReportRawRecordId:reportRawId};
  assertValid<Report>('Report',report);
  const raw:RawRecord={schemaVersion:report.schemaVersion,namespace:'demo',recordType:'RawRecord',rawRecordId:reportRawId,revision:1,
   sourceId:'simulation',acquisitionId:reportId,importBatchId:null,payload,fileReference:null,contentHash:await sha256(payload),
   mediaType:'application/json',encoding:'utf-8',retrievedAt:DEMO_TIME,retentionPolicy:'Preserve authored preflight report.',accessPolicy:'Public fictional'};
  assertValid<RawRecord>('RawRecord',raw);extra.push(raw,report);
 }
 return [...records,...extra];
}

/** Explicit fictional UTC windows; a week/window/support count is not a clinical standard. */
export function baselineFixtureRequest(method:BaselineRequest['method'],metric:Observation['metric']='heart_rate'):BaselineRequest{
 const r:BaselineRequest={protocolVersion:'baseline-request/1',namespace:'demo',astronautId:'crew-a',missionId:'mission-demo',
  dataOrigin:'synthetic',metric,method,missionPhase:method==='mission_rolling'?'inflight':'preflight',
  selectorObservationId:method==='preflight_anchor'?'preflight-exam-'+metric:'metric-'+metric,anchorObservationId:method==='preflight_anchor'?'preflight-exam-'+metric:null,
  window:method==='preflight_anchor'?{from:null,to:null,precision:'unknown'}:{
   from:method==='mission_rolling'?'2026-01-07T12:00:00Z':'2025-12-20T12:00:00Z',
   to:method==='mission_rolling'?'2026-01-10T12:00:00Z':'2025-12-23T12:00:00Z',precision:'exact'},
  currentObservationIds:method==='preflight_anchor'?[]:['metric-'+metric],exclusions:[],excludedPeriods:[]};
 assertValid('BaselineRequest',r);return r;
}
