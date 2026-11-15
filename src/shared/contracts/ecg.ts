import {assertValid,failure,type CanonicalRecord,type RawRecord,type EcgCaptureContent,type EcgCaptureEvidence,type MissionContext,type CommandEnvelope} from './index';
import {canonicalJSON,sha256} from './identity';
import {captureNumber,captureTime,type NumericCaptureValue} from '../capture';
import {metricRegistry} from '../metrics';
import {MEASUREMENT_PIPELINE} from '../metrics/measurement-context';

export const ECG_MEDIA='application/vnd.nasa-project.ecg-report+json';
export const ecgMetrics=['heart_rate','ecg_pr','ecg_qrs','ecg_qt','ecg_qtc','hrv_sdnn','hrv_rmssd'] as const;
export const ecgLabels={heart_rate:'ECG heart rate',ecg_pr:'PR interval',ecg_qrs:'QRS duration',ecg_qt:'QT interval',ecg_qtc:'QTc interval',hrv_sdnn:'SDNN',hrv_rmssd:'RMSSD'};

/** Validate reported metadata without inferring intervals, quality or clinical support. */
export function validateEcgContent(c:EcgCaptureContent){
 if(!c.lead?.trim())throw failure('VALIDATION_FAILED','Enter the lead setup reported for this ECG.','lead');
 if(!c.method?.trim())throw failure('VALIDATION_FAILED','Enter the named measurement method from the report.','method');
 assertValid('EcgCaptureContent',c);
 if(c.lead!==c.lead.trim()||c.method!==c.method.trim())throw failure('VALIDATION_FAILED','Remove surrounding spaces from the lead and method.');
 if(new Set(c.values.map(v=>v.metric)).size!==7||!ecgMetrics.every(m=>c.values.some(v=>v.metric===m)))throw failure('VALIDATION_FAILED','ECG needs seven distinct reported value or missing rows.','values');
 if(c.values.some(v=>v.metric==='ecg_qtc'&&!v.missingReason)&&!c.qtcCorrection?.trim())throw failure('VALIDATION_FAILED','A QTc value needs the correction method stated on the report.','qtcCorrection');
 if(c.values.some(v=>v.metric.startsWith('hrv_')&&!v.missingReason)&&(!c.hrvMethod?.trim()||!c.artifactHandling?.trim()||!c.windowSeconds))throw failure('VALIDATION_FAILED','HRV values need their reported method, duration in seconds and artifact handling.','hrv');
 for(const v of ecgNumericInputs(c,'validation')){if(!metricRegistry[v.metric].allowedInputUnits.includes(v.unit))throw failure('VALIDATION_FAILED','Select a registered ECG input unit.',v.metric);captureNumber(v);}
}

/** Shared numeric inputs: HRV keeps its own reported window/method, distinct from intervals. */
export function ecgNumericInputs(c:EcgCaptureContent,reportId:string):NumericCaptureValue[]{
 return c.values.map(v=>({...v,observationId:`${reportId}-${v.metric}`,acquisitionId:reportId,context:c.context,
  measurementContext:{modality:'ecg',lead:c.lead,method:v.metric.startsWith('hrv_')?c.hrvMethod:c.method,deviceId:c.deviceId,protocolId:c.protocolId,posture:c.posture,missionPhase:c.missionPhase,qtcCorrection:v.metric==='ecg_qtc'?c.qtcCorrection:null,windowSeconds:v.metric.startsWith('hrv_')?c.windowSeconds:null,artifactHandling:v.metric.startsWith('hrv_')?c.artifactHandling:null,statistic:'reported'},
  quality:{score:null,method:'Not independently assessed',flags:['premeasured report; signal quality unknown','fictional input'],lowConfidence:true}}));
}

/** Only explicitly versioned evidence is decoded; legacy fixture reports remain unchanged. */
export function ecgEvidence(raw:RawRecord):EcgCaptureEvidence{
 let e:unknown;try{e=JSON.parse(raw.payload!);}catch{throw failure('VALIDATION_FAILED','ECG evidence is invalid.');}
 assertValid<EcgCaptureEvidence>('EcgCaptureEvidence',e);validateEcgContent(e.content);return e;
}

/** Integrity checks run outside the write transaction, including on export restore. */
export async function verifyEcgEvidence(records:CanonicalRecord[]){
 for(const raw of records)if(raw.recordType==='RawRecord'&&raw.mediaType===ECG_MEDIA){
  const e=ecgEvidence(raw),source=records.find(r=>r.recordType==='SourceRecord'&&r.sourceId===e.sourceId);
  if(await sha256(canonicalJSON(e.content))!==e.contentFingerprint)throw failure('VALIDATION_FAILED','ECG content fingerprint differs from retained input.');
  // Source may be a retained prerequisite rather than part of this command.
  if(source?.recordType==='SourceRecord'&&e.reportId!==await ecgReportId(source.version,e))throw failure('REFERENCE_INVALID','ECG report identity differs from retained input.');
 }
}

/** Stable identity includes source/version and owner; arrival time is never report identity. */
export async function ecgReportId(sourceVersion:string,e:Pick<EcgCaptureEvidence,'sourceId'|'astronautId'|'missionId'|'content'>){
 return `ecg_${await sha256(canonicalJSON(['demo',e.sourceId,sourceVersion,e.astronautId,e.missionId,e.content.reportKey]))}`;
}

/** Guard direct commands before duplicate detection, so a no-op cannot hide tampering. */
export async function validateEcgCommand(c:CommandEnvelope,sourceVersion:string){
 const raw=c.payload.records.filter((r):r is RawRecord=>r.recordType==='RawRecord'&&r.mediaType===ECG_MEDIA);
 if(raw.length!==1)throw failure('VALIDATION_FAILED','An ECG capture records exactly one report.');
 const e=ecgEvidence(raw[0]);
 if(c.domain!=='reports'||c.operation!=='capture'||c.namespace!=='demo'||c.subject.kind!=='crew'||c.subject.astronautId!==e.astronautId||c.subject.missionId!==e.missionId||c.createdAt!==e.receivedAt||c.payload.importKeys.length||c.payload.expectedRevisions.length||c.payload.previewToken!==null)throw failure('REFERENCE_INVALID','ECG command differs from its report owner or capture path.');
 if(c.payload.records.some(r=>!['RawRecord','Observation','ValidationRun','Report'].includes(r.recordType))||c.payload.records.filter(r=>r.recordType==='Report').length!==1||c.payload.records.filter(r=>r.recordType==='ValidationRun').length!==1||c.payload.records.filter(r=>r.recordType==='RawRecord').length!==8)throw failure('VALIDATION_FAILED','ECG capture requires one report, seven numerical inputs and their evidence/validation only.');
 if(e.reportId!==await ecgReportId(sourceVersion,e))throw failure('REFERENCE_INVALID','ECG identity differs from its source, owner or report key.');
 return {raw:raw[0],evidence:e};
}

/** Graph checks run both on writes and restore, preserving original values and unknown quality. */
export function validateEcgGraph(records:CanonicalRecord[],namespace:string){
 const bad=(message:string):never=>{throw failure('REFERENCE_INVALID',message);};
 const seen=new Set<string>();
 for(const raw of records)if(raw.recordType==='RawRecord'&&raw.mediaType===ECG_MEDIA){
  const e=ecgEvidence(raw),c=e.content;
  const report=records.find(r=>r.recordType==='Report'&&r.reportId===e.reportId);
  const mission=records.find(r=>r.recordType==='MissionContext'&&r.missionId===e.missionId);
  if(!report||report.recordType!=='Report'||!mission||mission.recordType!=='MissionContext')bad('ECG report or mission is missing.');
  const r=report!,m=mission! as MissionContext;
  if(r.recordType!=='Report')return;
  if(seen.has(r.reportId))bad('ECG report has duplicate retained evidence.');seen.add(r.reportId);
  if(namespace!=='demo'||r.type!=='ecg'||r.dataOrigin!=='synthetic'||r.astronautId!==e.astronautId||r.missionId!==e.missionId||c.crewId!==e.astronautId||r.publicSubjectId!==null||r.sourceId!==e.sourceId||raw.sourceId!==e.sourceId||raw.acquisitionId!==r.reportId||r.originalReportRawRecordId!==raw.rawRecordId||raw.rawRecordId!==`ecg-evidence-${r.reportId.slice(4)}`||raw.importBatchId!==null||raw.retrievedAt!==e.receivedAt)bad('ECG evidence differs from report identity, owner or source.');
  if(r.method!==c.method||r.lead!==c.lead||r.deviceId!==c.deviceId||r.view!==null||r.site!==null||r.laterality!==null)bad('ECG report context differs from original input.');
  const time=captureTime(c.time,m);
  for(const key of ['timestamp','timePrecision','originalTime','timeReason','missionAnchor'] as const)if(canonicalJSON(r[key])!==canonicalJSON(time[key]))bad('ECG report time differs from original precision.');
  if(r.observationIds.length!==7)bad('ECG report requires seven numerical/missing rows.');
  for(const v of ecgNumericInputs(c,r.reportId)){
   const o=records.find(r=>r.recordType==='Observation'&&r.observationId===v.observationId);
   if(!o||o.recordType!=='Observation')bad('ECG observation is missing.');
   const obs=o!;if(obs.recordType!=='Observation')return;
   const parsed=captureNumber(v),numRaw=records.find(r=>r.recordType==='RawRecord'&&r.rawRecordId===obs.provenance.rawRecordId);
   if(!numRaw||numRaw.recordType!=='RawRecord'||numRaw.mediaType!=='application/json'||numRaw.acquisitionId!==r.reportId||numRaw.retrievedAt!==e.receivedAt||numRaw.importBatchId!==null)bad('ECG original numerical input is missing.');
   let payload:any;try{payload=JSON.parse((numRaw as RawRecord).payload!);}catch{bad('ECG numerical payload is invalid.');}
   if(canonicalJSON(payload)!==canonicalJSON({input:v,time:c.time,notes:c.qualityNotes,receivedAt:e.receivedAt,deliveryMode:e.deliveryMode,astronautId:e.astronautId}))bad('ECG numerical raw input differs from report evidence.');
   if(!r.observationIds.includes(obs.observationId)||obs.reportId!==r.reportId||obs.acquisitionId!==r.reportId||obs.astronautId!==e.astronautId||obs.missionId!==e.missionId||obs.source.sourceId!==e.sourceId||obs.context!==c.context||obs.sessionId!==null||obs.regionKey!==null||obs.laterality!==null||obs.supersedesObservationId!==null||obs.receivedAt!==e.receivedAt||obs.deliveryMode!==e.deliveryMode)bad('ECG numerical ownership/linkage differs from report evidence.');
   if(obs.metric!==v.metric||obs.value!==parsed.number||obs.missingReason!==(parsed.number===null?v.missingReason:null)||obs.provenance.originalUnit!==v.unit||obs.provenance.originalValue!==parsed.original||canonicalJSON(obs.measurementContext)!==canonicalJSON(v.measurementContext)||canonicalJSON(obs.quality)!==canonicalJSON(v.quality)||obs.provenance.parameters.ecgEvidenceId!==raw.rawRecordId||obs.provenance.parameters.notes!==c.qualityNotes||obs.provenance.importBatchId!==null||obs.provenance.algorithm!==null||obs.validation.admission!=='demo_only'||obs.validation.status!=='pending')bad('ECG values, method or unknown quality differ from original report.');
   if(obs.provenance.pipelineVersion!==MEASUREMENT_PIPELINE||obs.provenance.sourceRecordId!==obs.observationId||obs.provenance.originalSamplingHz!==null||obs.provenance.outputSamplingHz!==null||obs.provenance.windowIds.length||obs.provenance.evidenceObservationIds.length||canonicalJSON(obs.provenance.parameters)!==canonicalJSON({reportedTimePrecision:c.time.precision,reportedTimeText:c.time.text,notes:c.qualityNotes,ecgEvidenceId:raw.rawRecordId}))bad('ECG provenance cannot become waveform-derived evidence.');
   const run=records.find(r=>r.recordType==='ValidationRun'&&r.validationRunId===obs.validation.validationRunId);
   if(!run||run.recordType!=='ValidationRun'||canonicalJSON([...run.subjectRecordIds].sort())!==canonicalJSON([...r.observationIds].sort()))bad('ECG validation must refer to its seven report measurements.');
   for(const key of ['timestamp','timePrecision','originalTime','timeReason','missionAnchor'] as const)if(canonicalJSON(obs[key])!==canonicalJSON(time[key]))bad('ECG numerical time differs from its report.');
  }
 }
 for(const o of records)if(o.recordType==='Observation'&&o.provenance.parameters.ecgEvidenceId&&!records.some(r=>r.recordType==='RawRecord'&&r.rawRecordId===o.provenance.parameters.ecgEvidenceId&&r.mediaType===ECG_MEDIA))bad('ECG observation requires its retained report evidence.');
}
