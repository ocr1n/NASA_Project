import {assertValid,failure,type CanonicalRecord,type RawRecord,type ReportCaptureContent,type ReportCaptureEvidence,type ReportMetricInput,type Observation,type ImportBatch,type CommandEnvelope} from './index';
import {canonicalJSON,sha256,stableImportKey,importedObservationId} from './identity';
import {captureNumber,captureTime} from '../capture';
import {metricRegistry} from '../metrics';

export const ULTRASOUND_MEDIA='application/vnd.nasa-project.ultrasound-report+json';
export const ULTRASOUND_PIPELINE='ultrasound-report/05.2';
export const ULTRASOUND_CONTEXT='ultrasound-context/1';
export const ultrasoundMetrics=['lvef','lv_edv','lv_esv','lv_edv_indexed','lv_esv_indexed','muscle_thickness'] as const;
function bad(message:string):never {throw failure('VALIDATION_FAILED',message,'ultrasound');}

/** Strict numerical meaning, with no clinical thresholds or guessed acquisition fields. */
export function validateReportContent(content:ReportCaptureContent):ReportCaptureContent {
 assertValid('ReportCaptureContent',content);
 const c=structuredClone(content);c.values.sort((a,b)=>ultrasoundMetrics.indexOf(a.metric)-ultrasoundMetrics.indexOf(b.metric));
 if(new Set(c.values.map(v=>v.metric)).size!==c.values.length)bad('Report measurements must be distinct.');
 if(c.type==='echo'?(c.values.some(v=>v.metric==='muscle_thickness')||!c.values.some(v=>v.metric==='lvef')):(c.values.length!==1||c.values[0].metric!=='muscle_thickness'))bad('Echo requires an explicit LVEF value/missing row; muscle requires one thickness row.');
 if(c.type==='echo'&&(c.muscle!==null||c.site!==null||c.laterality!==null))bad('Echo cannot carry muscle site or laterality metadata.');
 if(c.type==='muscle'&&c.view!==null)bad('Muscle reports cannot carry an echo view.');
 if(c.namespace==='demo'?(c.dataOrigin!=='synthetic'||!c.astronautId||!c.missionId||c.publicSubjectId!==null||c.datasetId!==null):c.namespace==='crew'?(c.dataOrigin!=='crew_measurement'||!c.astronautId||!c.missionId||c.publicSubjectId!==null||c.datasetId!==null):(c.dataOrigin!=='public_research'||c.astronautId!==null||c.missionId!==null||!c.publicSubjectId||c.datasetId!==c.namespace.slice(9)))bad('Report origin/subject must match its explicit namespace.');
 // Unmapped columns participate in content identity and must have a deterministic, reviewable shape.
 let extras:unknown;try{extras=JSON.parse(c.extraColumns);}catch{bad('Extra-column evidence must be serialized JSON.');}
 if(!Array.isArray(extras)||extras.some(x=>!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).sort().join(',')!=='columns,metric'||!c.values.some(v=>v.metric===x.metric)||!x.columns||typeof x.columns!=='object'||Array.isArray(x.columns)||Object.values(x.columns).some(v=>typeof v!=='string'))||new Set(extras.map(x=>x.metric)).size!==extras.length)bad('Extra columns must identify distinct reported rows and string fields.');
 c.extraColumns=canonicalJSON(extras.sort((a,b)=>a.metric.localeCompare(b.metric)));
 for(const v of c.values){
  if(!metricRegistry[v.metric].allowedInputUnits.includes(v.unit))bad(`Unsupported unit for ${v.metric}.`);
  const indexing=v.metric.endsWith('_indexed')?'body_surface_area':['lv_edv','lv_esv'].includes(v.metric)?'unindexed':null;
  if(v.indexing!==indexing)bad(`Quantity/indexing mismatch for ${v.metric}.`);
  const n=reportNumber(c,v);if(v.metric==='lvef'&&n.number!==null&&n.number>100)bad('LVEF must be reported in its percent proportion domain (0–100).');
 }
 return c;
}
/** Input value is in row.unit; output uses the central metric's UCUM unit. */
export function reportNumber(c:ReportCaptureContent,row:ReportMetricInput){return captureNumber({...row,context:c.context,measurementContext:reportMeasurementContext(c,row),quality:c.quality});}
/** Preserve the reported acquisition; missing site/side/device is never inferred. */
export function reportMeasurementContext(c:ReportCaptureContent,row:ReportMetricInput):Observation['measurementContext'] {
 return {modality:c.type==='echo'?'echocardiography':'muscle_ultrasound',method:c.method,deviceId:c.deviceId,view:c.view,site:c.site,laterality:c.laterality,posture:c.posture,protocolId:c.protocolId,indexing:row.indexing,missionPhase:c.missionPhase};
}
/** Decode the declared central report protocol without guessing unknown versions. */
export function ultrasoundEvidence(raw:RawRecord):ReportCaptureEvidence {
 if(raw.mediaType!==ULTRASOUND_MEDIA||raw.payload===null)bad('Expected retained numerical ultrasound evidence.');
 let e:unknown;try{e=JSON.parse(raw.payload!);}catch{bad('Report evidence payload is invalid.');}
 assertValid<ReportCaptureEvidence>('ReportCaptureEvidence',e);return e;
}
/** Stable identity retains subject, origin, source version and caller's report key, never arrival time. */
export async function reportIdentities(c:ReportCaptureContent,sourceVersion:string){
 const scope=['ultrasound-report/1',c.dataOrigin,c.astronautId,c.missionId,c.publicSubjectId,c.datasetId,c.type,c.reportKey];
 const suffix=await sha256(stableImportKey(c.namespace,c.sourceId,sourceVersion,await sha256(canonicalJSON(scope))));
 const reportId=`ultrasound_${suffix}`,evidenceId=`ultrasound-raw-${suffix}`;
 const rows=await Promise.all(c.values.map(async v=>{const sourceRecordId=`ultrasound_${await sha256(canonicalJSON([...scope,v.metric]))}`,key=stableImportKey(c.namespace,c.sourceId,sourceVersion,sourceRecordId);return {metric:v.metric,sourceRecordId,key,observationId:await importedObservationId(key)};}));
 return {reportId,evidenceId,rows};
}
/** Bind content, subject and exact file/mapping to a read-only preview. */
export const ultrasoundPreviewToken=(e:ReportCaptureEvidence,b:Pick<ImportBatch,'fileHash'|'mapping'>)=>sha256(canonicalJSON({version:'ultrasound-preview/1',namespace:e.content.namespace,reportId:e.reportId,contentFingerprint:e.contentFingerprint,fileHash:b.fileHash,mapping:b.mapping}));

/** Hash/identity work runs before transactions, including snapshot restore. */
export async function verifyUltrasoundEvidence(records:CanonicalRecord[]){
 for(const raw of records)if(raw.recordType==='RawRecord'&&raw.mediaType===ULTRASOUND_MEDIA){
  const e=ultrasoundEvidence(raw),c=validateReportContent(e.content);
  if(canonicalJSON(c)!==canonicalJSON(e.content)||await sha256(canonicalJSON(c))!==e.contentFingerprint)bad('Report content fingerprint/canonical order differs from retained input.');
  const observations=records.filter((r):r is Observation=>r.recordType==='Observation'&&r.reportId===e.reportId);
  const version=observations[0]?.source.version;if(!version)bad('Report evidence needs its linked observations.');
  const ids=await reportIdentities(c,version);
  if(raw.rawRecordId!==ids.evidenceId||e.reportId!==ids.reportId)bad('Report evidence identity differs from its source/subject/key.');
  for(const row of ids.rows){const o=observations.find(o=>o.metric===row.metric);if(!o||o.observationId!==row.observationId||o.provenance.sourceRecordId!==row.sourceRecordId)bad('Report observation identity differs from its reported metric.');}
 }
}

/** Synchronous semantic guards run on the whole graph for captures and restored exports. */
export function validateUltrasoundGraph(records:CanonicalRecord[],namespace:string,now:string){
 const raws=new Map(records.filter(r=>r.recordType==='RawRecord').map(r=>[r.rawRecordId,r]));
 const reports=new Map(records.filter(r=>r.recordType==='Report').map(r=>[r.reportId,r]));
 const sources=new Map(records.filter(r=>r.recordType==='SourceRecord').map(r=>[r.sourceId,r]));
 const guarded=new Set<string>();
 for(const raw of raws.values())if(raw.mediaType===ULTRASOUND_MEDIA){
  const e=ultrasoundEvidence(raw),c=validateReportContent(e.content),report=reports.get(e.reportId),source=sources.get(c.sourceId);
  if(!report||!source||guarded.has(e.reportId)||namespace!==c.namespace||raw.namespace!==namespace||raw.sourceId!==c.sourceId||raw.acquisitionId!==e.reportId)bad('Report evidence/source/owner linkage differs.');guarded.add(e.reportId);
  if((c.dataOrigin==='synthetic')!==(source.tier==='simulation'))bad('Simulation sources and real reports must remain separate.');
  if(c.values.some(v=>!source.supportedMetrics.includes(v.metric)))bad('Source does not support a reported metric.');
  const mission=records.find(r=>r.recordType==='MissionContext'&&r.missionId===c.missionId);
  const time=captureTime(c.time,mission?.recordType==='MissionContext'?mission:undefined);
  if(Date.parse(e.receivedAt)>Date.parse(now)||c.time.precision==='date'&&c.time.text>now.slice(0,10))bad('Report arrival/date is after the supplied clock.');
  const expected={astronautId:c.astronautId,missionId:c.missionId,publicSubjectId:c.publicSubjectId,type:c.type,sourceId:c.sourceId,...time,method:c.method,deviceId:c.deviceId,lead:null,view:c.view,site:c.site,laterality:c.laterality,originalReportRawRecordId:raw.rawRecordId,dataOrigin:c.dataOrigin};
  for(const [k,v] of Object.entries(expected))if(canonicalJSON(report[k as keyof typeof report])!==canonicalJSON(v))bad(`Report ${k} differs from original evidence.`);
  if(report.observationIds.length!==c.values.length)bad('Report row count differs from original evidence.');
  for(const row of c.values){
   const o=records.find((r):r is Observation=>r.recordType==='Observation'&&r.reportId===report.reportId&&r.metric===row.metric);
   if(!o||!report.observationIds.includes(o.observationId))bad('Report is missing a distinct linked measurement.');
   const n=reportNumber(c,row),projection={namespace:c.namespace,astronautId:c.astronautId,missionId:c.missionId,publicSubjectId:c.publicSubjectId,datasetId:c.datasetId,...time,receivedAt:e.receivedAt,value:n.number,unit:metricRegistry[row.metric].canonicalUnit,missingReason:row.missingReason,context:c.context,measurementContext:reportMeasurementContext(c,row),quality:c.quality,dataOrigin:c.dataOrigin,synthetic:c.dataOrigin==='synthetic',deliveryMode:e.deliveryMode,acquisitionId:report.reportId,sessionId:null,regionKey:null,laterality:c.laterality,supersedesObservationId:null};
   for(const [k,v] of Object.entries(projection))if(canonicalJSON(o[k as keyof Observation])!==canonicalJSON(v))bad(`Report measurement ${k} differs from original evidence.`);
   if(o.provenance.rawRecordId!==raw.rawRecordId||o.provenance.contentHash!==raw.contentHash||o.provenance.originalUnit!==row.unit||o.provenance.originalValue!==n.original||o.provenance.pipelineVersion!==ULTRASOUND_PIPELINE||o.provenance.parameters.reportContextVersion!==ULTRASOUND_CONTEXT||o.provenance.parameters.muscle!==c.muscle||o.provenance.parameters.probeId!==c.probeId||o.source.sourceId!==c.sourceId||o.validation.status!=='pending'||o.validation.admission!==(namespace==='demo'?'demo_only':'quarantined'))bad('Report provenance/admission differs from retained evidence.');
  }
  if(e.deliveryMode==='manual'?(e.originalFileRawRecordId!==null||e.originalFileHash!==null||raw.importBatchId!==null):(!e.originalFileRawRecordId||!e.originalFileHash||!raw.importBatchId))bad('Report delivery/file evidence is inconsistent.');
  if(e.originalFileRawRecordId){const file=raws.get(e.originalFileRawRecordId);if(!file||file.mediaType!=='text/csv'||file.sourceId!==raw.sourceId||file.acquisitionId!==e.reportId||file.contentHash!==e.originalFileHash||file.importBatchId!==raw.importBatchId)bad('Original report CSV evidence is missing or inconsistent.');}
 }
 for(const r of records){
  if(r.recordType==='Report'&&r.reportId.startsWith('ultrasound_')&&!guarded.has(r.reportId))bad('Numerical report identities require retained report evidence.');
  if(r.recordType==='Observation'&&(r.provenance.pipelineVersion===ULTRASOUND_PIPELINE||r.provenance.parameters.reportContextVersion!==undefined)&&(!r.reportId||!guarded.has(r.reportId)))bad('Versioned ultrasound measurements require retained report evidence.');
 }
}

/** Report commands cannot smuggle interpretation, task or anatomy changes into a duplicate no-op. */
export function ultrasoundCommandEvidence(c:CommandEnvelope):ReportCaptureEvidence|null {
 const raws=c.payload.records.filter((r):r is RawRecord=>r.recordType==='RawRecord'&&r.mediaType===ULTRASOUND_MEDIA);
 if(!raws.length)return null;if(raws.length!==1)bad('One report acquisition is allowed per command.');
 const e=ultrasoundEvidence(raws[0]),content=e.content;
 if(c.namespace!==content.namespace||c.domain!=='reports'||c.operation!==(e.deliveryMode==='manual'?'capture':'import')||c.subject.kind!==(content.dataOrigin==='public_research'?'namespace':'crew')||c.subject.astronautId!==content.astronautId||c.subject.missionId!==content.missionId||c.payload.expectedRevisions.length||c.payload.records.some(r=>!['RawRecord','Observation','ValidationRun','Report','ImportBatch'].includes(r.recordType)))bad('Report command differs from its capture/owner boundary.');
 const reportRecords=c.payload.records.filter(r=>r.recordType==='Report');
 if(reportRecords.length!==1||reportRecords[0].reportId!==e.reportId||c.payload.records.some(r=>r.recordType==='Observation'&&r.reportId!==e.reportId)||c.payload.records.filter(r=>r.recordType==='Observation').length!==content.values.length)bad('Report command contains unrelated report/measurement records.');
 const runs=c.payload.records.filter(r=>r.recordType==='ValidationRun');
 const expectedSubjects=[e.reportId,...reportRecords[0].observationIds].sort();
 if(runs.length!==1||runs[0].status!=='pending'||runs[0].admission!==(c.namespace==='demo'?'demo_only':'quarantined')||canonicalJSON([...runs[0].subjectRecordIds].sort())!==canonicalJSON(expectedSubjects)||c.payload.records.some(r=>r.recordType==='Observation'&&r.validation.validationRunId!==runs[0].validationRunId))bad('Report validation must retain one scoped pending integrity run.');
 return e;
}
