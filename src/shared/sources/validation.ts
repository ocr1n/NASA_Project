import {assertValid,type EvidenceGroup,type SourceRecord,type ValidationRun} from '../contracts';
import {sourcePolicy} from '../rules/policy';

export const PROCEDURE_VERSION='provenance-structural-method-evidence/1';
export const PIPELINE_VERSION='sources/1';
export type EvidenceCheck={sourceId:string;lineageId:string;location:string;stance:'supports'|'conflicts';relevant:boolean};
export type ClaimKind='definition'|'protocol'|'conversion'|'algorithm_output'|'interpretation'|'sample_integrity';

/** Evidence is counted by reviewed lineage, never URL, paper count or algorithm count. No clinical tolerance default. */
export function validateEvidence(input:{namespace:string;id:string;kind:ClaimKind;claim:string;sources:SourceRecord[];checks:EvidenceCheck[];at:string;errors?:string[];conflicts?:string[];limitations?:string[];methodComparisons?:string[];reviewComplete?:boolean;normalization?:string;tolerance?:ValidationRun['toleranceDefinition'];subjectRecordIds?:string[]}):ValidationRun {
 const errors=[...(input.errors??[])],conflicts=[...(input.conflicts??[])],groups=new Map<string,EvidenceGroup>();
 for(const check of input.checks){
  const source=input.sources.find(s=>s.sourceId===check.sourceId);
  if(!source||!source.lineageIds.includes(check.lineageId)||!check.location.trim()){errors.push('Evidence has missing source, location or lineage');continue;}
  if(!check.relevant)continue;
  if(check.stance==='conflicts')conflicts.push(`${check.sourceId}: ${check.location}`);
  const group=groups.get(check.lineageId)??{lineageId:check.lineageId,sourceIds:[],locations:[]};
  group.sourceIds=[...new Set([...group.sourceIds,check.sourceId])];group.locations=[...new Set([...group.locations,check.location])];groups.set(check.lineageId,group);
 }
 const status:ValidationRun['status']=errors.length?'rejected':conflicts.length?'conflict':!input.reviewComplete||groups.size===0?'pending':groups.size<sourcePolicy.minimumIndependentLineages?'single_source':'verified';
 // Module 01 admits only research integrity; crew admission requires later, separately reviewed scientific definitions.
 const admission:ValidationRun['admission']=input.namespace==='demo'?'demo_only':input.namespace.startsWith('research:')&&['verified','single_source'].includes(status)?'research_sandbox':'quarantined';
 const run:ValidationRun={schemaVersion:'0.1.0',namespace:input.namespace,recordType:'ValidationRun',validationRunId:input.id,revision:1,claim:`${input.kind}: ${input.claim}`,subjectRecordIds:input.subjectRecordIds??[],sourceIds:input.sources.map(s=>s.sourceId),ruleIds:[],independentEvidenceGroups:[...groups.values()],sourcesChecked:[...new Set(input.checks.map(c=>c.sourceId).filter(id=>input.sources.some(s=>s.sourceId===id)))],normalization:input.normalization??'No numeric normalization',toleranceDefinition:input.tolerance??null,structuralResults:errors.length?errors:['Required structural checks passed'],methodComparisons:input.methodComparisons??[],conflicts,limitations:input.limitations??[],status,admission,reviewer:'Module 01 bounded technical review; no clinical admission',procedureVersion:PROCEDURE_VERSION,pipelineVersion:PIPELINE_VERSION,runAt:input.at};
 assertValid<ValidationRun>('ValidationRun',run);return run;
}
