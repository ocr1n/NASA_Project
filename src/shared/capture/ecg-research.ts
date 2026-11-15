import {assertValid,failure,SCHEMA_VERSION,type CanonicalRecord,type CommandEnvelope,type EcgResearchPreview,type EcgResearchEvidence,type ImportBatch,type Observation} from '../contracts';
import {canonicalJSON,sha256,stableImportKey} from '../contracts/identity';
import {prepareArtifact,type Artifact} from '../sources/acquisition';
import {fixtureArtifact} from '../sources/catalogue';
import {ECG_RESEARCH_MEDIA,ECG_RESEARCH_PIPELINE,reportSourceId,researchMapping,analyzeResearchFile,buildResearchReport,researchEvidence,researchBatchIdentity,buildResearchRun,type EcgResearchMethod} from '../contracts/ecg-research';
import type {Repository} from '../repositories/repository';

export interface PTBReportInput {method:EcgResearchMethod;features?:Artifact;parent?:Artifact;description?:Artifact;selectedEcgIds?:string[]}

/** Read-only named-file preview. Cancellation retains no sources, raw files or domain records. */
export async function previewPTBReports(repo:Repository,input:PTBReportInput):Promise<EcgResearchPreview>{
 if(!['ECGDeli','Uni-G'].includes(input.method))throw failure('VALIDATION_FAILED','Choose the published ECGDeli or Uni-G method.');
 const base=fixtureArtifact(input.method==='ECGDeli'?'ptbecgdeli':'ptbunig'),features=input.features??base,parent=input.parent??fixtureArtifact('ptbparent'),description=input.description??fixtureArtifact('ptbdescription');
 for(const field of ['canonicalURL','version','license'] as const)if(features.source[field]!==base.source[field])throw failure('REFERENCE_INVALID','Feature source/version/rights differ from the named PTB input.');
 if([features,parent,description].some(a=>a.source.namespace!=='research:ptb-xl-plus'||a.payload.length>2097152))throw failure('VALIDATION_FAILED','Use small PTB research excerpts, at most 2 MiB per file.');
 const mapped=researchMapping(input.method),featureInput:Artifact={...features,source:{...features.source,sourceId:reportSourceId(input.method),name:features.source.name+' — numerical report projection',supportedMetrics:mapped.map(m=>m.canonicalField) as Observation['metric'][],purpose:'Named PTB numerical report projection; public subjects only; same original acquisition lineage.'}};
 const prepared=await Promise.all([prepareArtifact(repo,featureInput),prepareArtifact(repo,parent),prepareArtifact(repo,description)]);
 const originals:CanonicalRecord[]=prepared.flatMap(p=>[p.source,p.raw]),raws=prepared.map(p=>p.raw),analysis=await analyzeResearchFile(input.method,raws[0],raws[1],raws[2],prepared[0].source);
 const existing=await repo.list('research:ptb-xl-plus','RawRecord');
 for(const row of analysis.rows)if(row.action==='create'){
  const old=existing.find(raw=>raw.mediaType===ECG_RESEARCH_MEDIA&&researchEvidence(raw).reportId===row.reportId);
  if(old){row.action=researchEvidence(old).contentFingerprint===row.contentFingerprint?'duplicate':'conflict';if(row.action==='conflict')row.errors.push('Stable ECG report identity has different original file content; retained evidence is preserved.');}
 }
 const selectedEcgIds=input.selectedEcgIds??analysis.rows.filter(r=>['create','duplicate'].includes(r.action)).map(r=>r.ecgId);
 if(new Set(selectedEcgIds).size!==selectedEcgIds.length||selectedEcgIds.some(id=>!analysis.rows.some(r=>r.ecgId===id)))throw failure('VALIDATION_FAILED','Select distinct ECG records present in the preview.');
 const selected=analysis.rows.filter(r=>selectedEcgIds.includes(r.ecgId)),fresh=selected.filter(r=>r.action==='create');let command:CommandEnvelope|null=null;
 if(fresh.length&&!selected.some(r=>['rejected','conflict'].includes(r.action))){
  const hash=await researchBatchIdentity(input.method,raws,fresh.map(r=>r.ecgId)),importBatchId=`ptb-batch_${hash}`,validationRunId=`ptb-run_${hash}`,receivedAt=repo.clock.now();
  const evidence:EcgResearchEvidence[]=fresh.map(row=>({protocolVersion:'ptb-ecg-report/1',method:input.method,ecgId:row.ecgId,publicSubjectId:row.publicSubjectId!,reportId:row.reportId!,featureRawRecordId:raws[0].rawRecordId,parentRawRecordId:raws[1].rawRecordId,descriptionRawRecordId:raws[2].rawRecordId,contentFingerprint:row.contentFingerprint!,importBatchId,validationRunId,receivedAt}));
  const bundles=await Promise.all(evidence.map(e=>buildResearchReport(e,originals))),observations=bundles.flatMap(b=>b.observations),run=buildResearchRun(evidence[0],prepared.map(p=>p.source),observations.map(o=>o.observationId));
  const batch:ImportBatch={schemaVersion:SCHEMA_VERSION,namespace:'research:ptb-xl-plus',recordType:'ImportBatch',importBatchId,revision:1,sourceId:prepared[0].source.sourceId,sourceVersion:prepared[0].source.version,fileHash:raws[0].contentHash,parser:'PTB named numerical ECG reports',parserVersion:ECG_RESEARCH_PIPELINE,mapping:mapped,previewToken:hash,previewState:'committed',acceptedRows:fresh.length,rejectedRows:analysis.rows.filter(r=>r.action==='rejected').length,quarantinedRows:analysis.rows.filter(r=>r.action==='conflict').length,errors:analysis.rows.flatMap((row,i)=>row.errors.map(message=>({row:i+2,field:'record',code:row.action==='conflict'?'CONFLICT':'VALIDATION_FAILED',message}))),stableSourceRecordKeys:observations.map(o=>stableImportKey(o.namespace,o.source.sourceId,o.source.version,o.provenance.sourceRecordId)),importedAt:receivedAt};
  command={schemaVersion:SCHEMA_VERSION,namespace:'research:ptb-xl-plus',operationId:`ptb-import_${hash}`,idempotencyKey:`ptb-import_${hash}`,subject:{kind:'namespace',astronautId:null,missionId:null},createdAt:receivedAt,operation:'import',domain:'reports',payload:{records:[...originals,...bundles.flatMap(b=>[b.raw,b.report,...b.observations]),run,batch],expectedRevisions:[],importKeys:await Promise.all(observations.map(async o=>({key:stableImportKey(o.namespace,o.source.sourceId,o.source.version,o.provenance.sourceRecordId),observationId:o.observationId,fingerprint:await sha256(canonicalJSON(o))}))),previewToken:hash}};
  assertValid('CommandEnvelope',command);
 }
 const body={protocolVersion:'ptb-report-preview/1' as const,namespace:'research:ptb-xl-plus' as const,method:input.method,selectedEcgIds:[...selectedEcgIds],rows:analysis.rows,unmappedColumns:analysis.unmappedColumns,command};
 const result:EcgResearchPreview={...body,integrity:await sha256(canonicalJSON(body))};assertValid('EcgResearchPreview',result);return result;
}

/** Return the exact previewed command; duplicates yield null without creating a second import. */
export async function commandFromPTBPreview(preview:EcgResearchPreview):Promise<CommandEnvelope|null>{
 assertValid('EcgResearchPreview',preview);const {integrity,...body}=preview;
 if(await sha256(canonicalJSON(body))!==integrity)throw failure('VALIDATION_FAILED','ECG preview changed. Preview the files again.');
 return preview.command?structuredClone(preview.command):null;
}
