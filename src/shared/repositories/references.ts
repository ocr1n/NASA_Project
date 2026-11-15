import {failure,recordId,type CanonicalRecord} from '../contracts';
import {metricRegistry,buildComparisonKey} from '../metrics';
import {highlightEligibility} from '../rules/policy';
import {storageKey} from './storage';
import {MEASUREMENT_PIPELINE,validateMeasurementAcquisitions} from '../metrics/measurement-context';
import {validateExerciseGraph} from '../contracts/exercise';
import {validateCollectionGraph} from '../contracts/collection';
import {validateEcgGraph} from '../contracts/ecg';
import {validateResearchEcgGraph} from '../contracts/ecg-research';
import {validateUltrasoundGraph} from '../contracts/ultrasound';

import {validateBaselineGraph} from '../contracts/baselines';
// This internal lookup bridges generated variants; public APIs retain generated types.
type Row=CanonicalRecord & Record<string,any>;
// Research observations deliberately have no astronaut/mission IDs: those nulls are not a subject identity.
const sameSubject=(a:Row,b:Row)=>a.dataOrigin===b.dataOrigin&&(a.dataOrigin==='public_research'
 ?a.namespace===b.namespace&&(a.datasetId??a.namespace.slice(9))===(b.datasetId??b.namespace.slice(9))&&a.publicSubjectId===b.publicSubjectId
 :a.astronautId===b.astronautId&&a.missionId===b.missionId);
const refs:Record<string,Record<string,string>>={
 CrewProfile:{missionId:'MissionContext',bodyHeightObservationId:'Observation',bodyMassObservationId:'Observation'},
 MissionContext:{sourceIds:'SourceRecord'},RawRecord:{sourceId:'SourceRecord',importBatchId:'ImportBatch'},
 ValidationRun:{subjectRecordIds:'*',sourceIds:'SourceRecord',ruleIds:'ThresholdRule',sourcesChecked:'SourceRecord'},
 Report:{sourceId:'SourceRecord',originalReportRawRecordId:'RawRecord',observationIds:'Observation'},
 ExerciseSession:{sourceId:'SourceRecord',observationIds:'Observation'},ImportBatch:{sourceId:'SourceRecord'},
 Baseline:{observationIds:'Observation'},ComparisonResult:{observationIds:'Observation',baselineId:'Baseline',referenceIds:'*'},
 ThresholdRule:{evidenceIds:'*',guidanceSourceIds:'SourceRecord'},
 Assessment:{ruleId:'ThresholdRule',observationIds:'Observation',environmentalObservationIds:'EnvironmentalObservation',comparisonIds:'ComparisonResult',baselineIds:'Baseline',evidenceIds:'*',taskIds:'FollowUpTask',highlightIds:'AtlasHighlight'},
 FollowUpTask:{assessmentIds:'Assessment',observationIds:'Observation',completionObservationIds:'Observation',completionReportIds:'Report',sourceIds:'SourceRecord'},
 AtlasHighlight:{assessmentId:'Assessment',ruleId:'ThresholdRule',observationIds:'Observation',manifestId:'AtlasRegionManifest'}
};
/** Validate the whole candidate graph before persistence. Shared source/config records are unowned. */
export function validateGraph(records:CanonicalRecord[],namespace:string,now:string):void {
 const byKey=new Map(records.map(r=>[storageKey(r.recordType,recordId(r)),r as Row]));const byId=new Map<string,Row>();
 const invalid=(message:string,path:string)=>{throw failure('REFERENCE_INVALID',message,path);};
 for(const r of records){const id=recordId(r);if(byId.has(id))invalid('Record IDs must be unique within a namespace',id);byId.set(id,r as Row);}
 const get=(type:string,id:string,path:string):Row=>{const found=type==='*'?byId.get(id):byKey.get(storageKey(type,id));if(!found)invalid('A referenced record is missing',path);return found!;};
 for(const record of records){const r=record as Row,path=`/${r.recordType}/${recordId(r)}`;
  if(r.namespace!==namespace)invalid('Namespace mismatch',path);
  const origin=r.dataOrigin??r.profileOrigin;
  if(origin==='synthetic'&&namespace!=='demo')invalid('Synthetic personal data belongs in demo',path);
  if(origin==='public_research'&&!namespace.startsWith('research:'))invalid('Research origin requires a research namespace',path);
  if(origin==='crew_measurement'&&namespace!=='crew')invalid('Measured crew data requires crew namespace',path);
  if(namespace.startsWith('research:')&&['CrewProfile','MissionContext','Baseline','ComparisonResult','Assessment','FollowUpTask','AtlasHighlight','ExerciseSession','EnvironmentalObservation'].includes(r.recordType))invalid('Personal timelines are excluded from research namespaces',path);
  let crew:Row|undefined,mission:Row|undefined;
  if(r.astronautId){crew=get('CrewProfile',r.astronautId,path+'/astronautId');if(r.recordType!=='CrewProfile'&&origin&&crew.profileOrigin!==origin)invalid('Origin differs from crew profile',path);}
  if(r.missionId){mission=get('MissionContext',r.missionId,path+'/missionId');if(crew&&crew.missionId!==r.missionId)invalid('Crew does not belong to this mission',path);}
  if(r.missionAnchor){get('MissionContext',r.missionAnchor.missionId,path+'/missionAnchor');if(r.missionId!==r.missionAnchor.missionId)invalid('Partial-time anchor has wrong mission',path);}
  for(const [field,type] of Object.entries(refs[r.recordType]??{})){
   const value=r[field];for(const id of value===null||value===undefined?[]:Array.isArray(value)?value:[value]){
    const target=get(type,id,path+'/'+field);
    if(r.astronautId&&target.astronautId&&r.astronautId!==target.astronautId)invalid('Cross-crew reference',path+'/'+field);
    if(r.missionId&&target.missionId&&r.missionId!==target.missionId)invalid('Cross-mission reference',path+'/'+field);
   }
  }
  for(const field of ['timestamp','startAt','endAt','observedFrom','observedTo','evaluatedAt','calculatedAt'])if(r[field]&&Date.parse(r[field])>Date.parse(now))invalid('Event time is later than the supplied clock',path+'/'+field);
  for(const [from,to] of [['startAt','endAt'],['observedFrom','observedTo']])if(r[from]&&r[to]&&Date.parse(r[from])>Date.parse(r[to]))invalid('Time interval is reversed',path);
  if(r.window?.from&&r.window?.to&&Date.parse(r.window.from)>Date.parse(r.window.to))invalid('Window is reversed',path);
  if(r.recordType==='Observation'||r.recordType==='EnvironmentalObservation'){
   const s=get('SourceRecord',r.source.sourceId,path+'/source');for(const field of ['name','tier','canonicalURL','version','license','attribution','retrievedAt'] as const)if(r.source[field]!==s[field])invalid('Source snapshot differs from retained source version',path+'/source/'+field);
   const raw=get('RawRecord',r.provenance.rawRecordId,path+'/provenance');if(raw.sourceId!==s.sourceId||raw.contentHash!==r.provenance.contentHash)invalid('Raw provenance does not match the source/hash',path+'/provenance');
   if(r.provenance.pipelineVersion===MEASUREMENT_PIPELINE&&raw.acquisitionId!==r.acquisitionId)invalid('Declared acquisition differs from retained raw acquisition',path+'/acquisitionId');
   const run=get('ValidationRun',r.validation.validationRunId,path+'/validation');if(run.status!==r.validation.status||run.admission!==r.validation.admission||run.procedureVersion!==r.validation.procedureVersion)invalid('Validation decision differs from its run',path+'/validation');
   if(r.dataOrigin==='synthetic'&&s.tier!=='simulation')invalid('Demo source must be labeled simulation',path+'/source');
   if(r.dataOrigin==='public_research'&&r.datasetId!==namespace.slice(9))invalid('Dataset identity differs from namespace',path+'/datasetId');
   if(r.recordType==='EnvironmentalObservation'&&!['environment','additional'].includes(metricRegistry[r.metric].category))invalid('Personal metric cannot become environmental data',path+'/metric');
   if(r.recordType==='Observation'&&metricRegistry[r.metric].category==='environment')invalid('Ambient metric cannot become personal data',path+'/metric');
   for(const id of r.validation.evidenceIds)get('*',id,path+'/validation/evidenceIds');
   for(const id of r.provenance.evidenceObservationIds){const target=get('Observation',id,path+'/provenance/evidenceObservationIds');if(!sameSubject(r,target))invalid('Derived evidence is owned by another subject',path);}
   for(const id of r.provenance.windowIds)get('*',id,path+'/provenance/windowIds');
   if(r.provenance.importBatchId)get('ImportBatch',r.provenance.importBatchId,path+'/provenance/importBatchId');
   for(const [field,type] of [['reportId','Report'],['sessionId','ExerciseSession'],['supersedesObservationId','Observation']])if(r[field]){
    const target=get(type,r[field],path+'/'+field);if(!sameSubject(r,target))invalid('Linked record has a different subject/mission',path+'/'+field);
    if(field==='supersedesObservationId'&&(target.metric!==r.metric||target.unit!==r.unit||target.observationId===r.observationId))invalid('Correction changes identity or quantity',path);
    if(field!=='supersedesObservationId'&&!target.observationIds.includes(r.observationId))invalid('Report/session linkage must be reciprocal',path+'/'+field);
   }
  }
  if(r.recordType==='CrewProfile')for(const [field,metric] of [['bodyHeightObservationId','body_height'],['bodyMassObservationId','body_mass']])if(r[field]){const o=get('Observation',r[field],path);if(o.astronautId!==r.astronautId||o.metric!==metric)invalid('Profile measurement has wrong owner/metric',path);}
  if(r.recordType==='Report'){
   if(namespace.startsWith('research:')?(!r.publicSubjectId||r.astronautId||r.missionId):(!r.astronautId||r.publicSubjectId||!r.missionId))invalid('Report subject variant is incompatible',path);
   for(const id of r.observationIds){const o=get('Observation',id,path);if(o.reportId!==r.reportId||o.publicSubjectId!==r.publicSubjectId)invalid('Report observations must match subject and backlink',path);}
  }
  if(r.recordType==='ExerciseSession')for(const id of r.observationIds)if(get('Observation',id,path).sessionId!==r.sessionId)invalid('Session observation backlink differs',path);
  if(r.recordType==='Baseline'){
   if(r.unit!==metricRegistry[r.metric].canonicalUnit)invalid('Baseline unit is incompatible',path);
   if(r.status==='available'&&(r.sampleCount!==r.observationIds.length||r.sampleCount<1||r.center===null||!r.comparabilityKey))invalid('Available baseline requires traceable samples and key',path);
   for(const id of r.observationIds){const o=get('Observation',id,path);if(o.metric!==r.metric||o.unit!==r.unit)invalid('Baseline quantity differs',path);if(r.status==='available'&&buildComparisonKey(o as never).key!==r.comparabilityKey)invalid('Baseline context differs',path);}
   for(const e of r.exclusions)get('Observation',e.observationId,path);
  }
  if(r.recordType==='ComparisonResult'){
   if(r.baselineId){const b=get('Baseline',r.baselineId,path);if(b.metric!==r.metric)invalid('Comparison baseline metric differs',path);if(b.observationIds.some((id:string)=>r.observationIds.includes(id)))invalid('An observation cannot compare with itself as baseline',path);}
   for(const id of r.observationIds)if(get('Observation',id,path).metric!==r.metric)invalid('Comparison metric differs',path);
   if(r.availability==='available'){
    const key=r.comparabilityKey;
    const matches=(o:Row)=>o.metric===r.metric&&o.value!==null&&o.timePrecision==='exact'&&o.quality.score!==null&&!o.quality.lowConfidence&&buildComparisonKey(o as never).key===key;
    if(!key||!r.observationIds.length||r.observationIds.some((id:string)=>!matches(get('Observation',id,path))))invalid('Available comparison requires compatible known current inputs',path);
    const references=r.baselineId?[get('Baseline',r.baselineId,path)]:r.referenceIds.map((id:string)=>get('*',id,path));
    if(!references.length||references.some((ref:Row)=>ref.recordType==='Baseline'
     ?ref.metric!==r.metric||ref.status!=='available'||ref.comparabilityKey!==key
     :ref.recordType!=='Observation'||r.observationIds.includes(ref.observationId)||!matches(ref)))invalid('Available comparison requires an available compatible reference',path);
   }
  }
  if(r.recordType==='ValidationRun'){
   const lineages=new Set<string>();for(const g of r.independentEvidenceGroups){if(lineages.has(g.lineageId))invalid('Repeated lineage is not independent evidence',path);if(!g.locations.length||!g.sourceIds.length)invalid('Evidence needs retained supporting sources and an exact location',path);for(const id of g.sourceIds){const s=get('SourceRecord',id,path);if(!s.lineageIds.includes(g.lineageId))invalid('Evidence lineage differs from source',path);}lineages.add(g.lineageId);}
   if(r.admission==='assessment_eligible'&&(r.status!=='verified'||lineages.size<2||r.conflicts.length))invalid('Automatic admission requires independent verified evidence',path);
  }
  if(r.recordType==='ThresholdRule'&&r.approvedScope==='operational')if(r.demoOnly||r.status!=='verified'||r.metrics.some((m:string)=>metricRegistry[m].definitionStatus!=='verified'))invalid('Operational rules require independently admitted definitions',path);
  if(r.recordType==='Assessment'){
   const rule=get('ThresholdRule',r.ruleId,path);if(rule.version!==r.ruleVersion)invalid('Rule version differs',path);
   if(r.mode==='operational'&&(rule.demoOnly||rule.approvedScope!=='operational'||origin!=='crew_measurement'))invalid('Demo assessment cannot become operational',path);
   if(r.mode==='demo'&&(origin!=='synthetic'||!rule.demoOnly))invalid('Demo assessment origin/scope differs',path);
  }
  if(r.recordType==='FollowUpTask'&&r.state==='completed'){
   const evidence=[...r.completionObservationIds.map((id:string)=>get('Observation',id,path)),...r.completionReportIds.flatMap((id:string)=>get('Report',id,path).observationIds.map((o:string)=>get('Observation',o,path)))];
   if(!evidence.some(o=>o.astronautId===r.astronautId&&o.metric===r.requiredMeasurement.metric&&o.value!==null&&!r.observationIds.includes(o.observationId)&&(!r.requiredMeasurement.comparabilityKey||buildComparisonKey(o as never).key===r.requiredMeasurement.comparabilityKey)))invalid('Task completion requires a new matching measurement',path);
  }
  if(r.recordType==='AtlasHighlight'){
   const manifest=get('AtlasRegionManifest',r.manifestId,path);if(manifest.manifestVersion!==r.manifestVersion)invalid('Manifest version differs',path);
   if(r.kind==='automatic'){
    const a=get('Assessment',r.assessmentId!,path),rule=get('ThresholdRule',r.ruleId!,path);if(a.ruleId!==r.ruleId||a.ruleVersion!==r.ruleVersion||a.mode!==r.mode||a.severity!==r.severity)invalid('Finding differs from assessment',path);
    const result=highlightEligibility(r as never,a as never,rule as never,r.observationIds.map((id:string)=>get('Observation',id,path)) as never,manifest as never);
    // Unmapped entries remain inspectable, but other automatic gates must hold.
    if(!result.visible&&result.reason!=='unmapped'&&r.status!=='cleared')invalid('Automatic finding gates are not satisfied',path);
   }
  }
 }
 validateMeasurementAcquisitions(records.filter(r=>r.recordType==='Observation'));
 validateExerciseGraph(records,namespace,now);
 validateCollectionGraph(records,namespace);
 validateUltrasoundGraph(records,namespace,now);
 validateEcgGraph(records,namespace);
 validateResearchEcgGraph(records,namespace);

 validateBaselineGraph(records,namespace,now);
 const pending=new Set<string>();const tasks=records.filter(r=>r.recordType==='FollowUpTask') as Row[];
 for(const t of tasks)if(!['completed','cancelled','excused'].includes(t.state)){const key=JSON.stringify([t.astronautId,t.episodeId,t.type,t.requiredMeasurement]);if(pending.has(key))invalid('Duplicate pending action for the same episode',t.taskId);pending.add(key);}
}
