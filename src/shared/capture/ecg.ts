import {assertValid,SCHEMA_VERSION,type EcgCaptureContent,type EcgCaptureEvidence,type Report,type RawRecord,type CommandEnvelope} from '../contracts';
import {canonicalJSON,sha256} from '../contracts/identity';
import {ECG_MEDIA,ecgMetrics,ecgNumericInputs,ecgReportId,validateEcgContent} from '../contracts/ecg';
import {prepareCapture,captureTime} from './index';
import type {Repository} from '../repositories/repository';

/** New fictional manual draft: optional measures start explicitly missing. */
export function emptyEcgContent(crewId:string):EcgCaptureContent{
 return {reportKey:`manual-${crypto.randomUUID()}`,crewId,time:{precision:'unknown',text:'',reason:'Not reported'},lead:'',method:'',deviceId:null,protocolId:null,posture:null,context:'unknown',missionPhase:'unknown',qtcCorrection:null,hrvMethod:null,windowSeconds:null,artifactHandling:null,qualityNotes:'',values:ecgMetrics.map(metric=>({metric,input:'',unit:metric==='heart_rate'?'bpm':'ms',missingReason:metric==='heart_rate'?null:'not reported'}))};
}

/** Manual report extends central numeric capture and commits all evidence atomically. */
export async function prepareEcgReport(repo:Repository,content:EcgCaptureContent,options:{receivedAt?:string}={}):Promise<CommandEnvelope>{
 validateEcgContent(content);
 const c=structuredClone(content);c.values.sort((a,b)=>ecgMetrics.indexOf(a.metric)-ecgMetrics.indexOf(b.metric));
 const crew=await repo.require('demo','CrewProfile',c.crewId),source=await repo.require('demo','SourceRecord','simulation'),mission=await repo.require('demo','MissionContext',crew.missionId);
 const receivedAt=options.receivedAt??repo.clock.now(),identity={sourceId:source.sourceId,astronautId:crew.astronautId,missionId:crew.missionId,content:c},reportId=await ecgReportId(source.version,identity),evidenceId=`ecg-evidence-${reportId.slice(4)}`;
 const command=await prepareCapture(repo,{namespace:'demo',astronautId:crew.astronautId,operationId:`ecg-${crypto.randomUUID()}`,sourceId:source.sourceId,receivedAt,deliveryMode:'manual',time:c.time,values:ecgNumericInputs(c,reportId),notes:c.qualityNotes});
 command.domain='reports';const observations=command.payload.records.filter(r=>r.recordType==='Observation');
 for(const o of observations){o.reportId=reportId;o.provenance.parameters.ecgEvidenceId=evidenceId;}
 const evidence:EcgCaptureEvidence={protocolVersion:'ecg-report/1',reportId,...identity,contentFingerprint:await sha256(canonicalJSON(c)),receivedAt,deliveryMode:'manual'};
 const payload=canonicalJSON(evidence),raw:RawRecord={schemaVersion:SCHEMA_VERSION,namespace:'demo',recordType:'RawRecord',rawRecordId:evidenceId,revision:1,sourceId:source.sourceId,acquisitionId:reportId,importBatchId:null,payload,fileReference:null,contentHash:await sha256(payload),mediaType:ECG_MEDIA,encoding:'utf-8',retrievedAt:receivedAt,retentionPolicy:'Retain original fictional ECG report input',accessPolicy:'Fictional demo only'};
 const report:unknown={schemaVersion:SCHEMA_VERSION,namespace:'demo',recordType:'Report',reportId,revision:1,astronautId:crew.astronautId,missionId:crew.missionId,publicSubjectId:null,type:'ecg',...captureTime(c.time,mission),sourceId:source.sourceId,observationIds:observations.map(o=>o.observationId),method:c.method,deviceId:c.deviceId,lead:c.lead,view:null,site:null,laterality:null,originalReportRawRecordId:evidenceId,dataOrigin:'synthetic'};
 assertValid<Report>('Report',report);command.payload.records.push(report,raw);assertValid('CommandEnvelope',command);return command;
}
