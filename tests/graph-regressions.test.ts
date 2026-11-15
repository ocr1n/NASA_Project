import {test,expect} from 'vitest';
import {createDemoRecords,createResearchRecords,DEMO_TIME} from '../src/shared/fixtures';
import {Repository} from '../src/shared/repositories/repository';
import {MemoryStorage} from '../src/shared/repositories/memory';
import {FixedClock} from '../src/shared/contracts/clock';
import {canonicalJSON,sha256,stableImportKey,importedObservationId} from '../src/shared/contracts/identity';
import {buildComparisonKey} from '../src/shared/metrics';
import {highlightEligibility} from '../src/shared/rules/policy';
import type {AtlasHighlight} from '../src/shared/contracts';
import {command,seedRecords,observation} from './helpers';
const make=()=>new Repository(new MemoryStorage(),new FixedClock(DEMO_TIME));

test.each(['correction','derived'])('research %s cannot link a different public subject',async kind=>{
 const records=await createResearchRecords();const original=records.find(r=>r.recordType==='Observation')!;
 const r=make();await r.execute({...command(records,'research-seed'),namespace:'research:test-fixtures'});
 const next={...structuredClone(original),observationId:'other-subject',publicSubjectId:'different-subject',supersedesObservationId:kind==='correction'?original.observationId:null};
 if(kind==='derived')next.provenance.evidenceObservationIds=[original.observationId];
 await expect(r.execute({...command([next],'cross-subject',{operation:kind==='correction'?'correct':'upsert'}),namespace:'research:test-fixtures'})).rejects.toMatchObject({detail:{code:'REFERENCE_INVALID'}});
 expect(await r.list('research:test-fixtures','Observation')).toHaveLength(1);
});

test('same research subject correction remains valid',async()=>{
 const records=await createResearchRecords();const original=records.find(r=>r.recordType==='Observation')!;const r=make();
 await r.execute({...command(records,'seed'),namespace:'research:test-fixtures'});
 await r.execute({...command([{...original,observationId:'corrected',supersedesObservationId:original.observationId}],'correct',{operation:'correct'}),namespace:'research:test-fixtures'});
 expect(await r.list('research:test-fixtures','Observation')).toHaveLength(2);
});

async function automaticFixture(){
 const records=await createDemoRecords();
 const rule=records.find(r=>r.recordType==='ThresholdRule')!;
 rule.regionMapping={regionKey:'muscle_left',layer:'muscular',localizing:true};
 const original=records.filter(r=>r.recordType==='Observation').find(r=>r.metric==='heart_rate')!;
 const observations=[0,1].map(i=>Object.assign(structuredClone(original),{observationId:`localization-${i}`,acquisitionId:`independent-${i}`,timestamp:i?'2026-01-10T12:00:00Z':'2026-01-10T11:58:00Z'}));
 const assessment=records.find(r=>r.recordType==='Assessment')!;
 Object.assign(assessment,{availability:'available',reasons:[],severity:'warning',sustained:true,independentSampleCount:2,localizationSupported:true,observationIds:observations.map(o=>o.observationId)});
 const manifest=records.find(r=>r.recordType==='AtlasRegionManifest')!;
 manifest.regions=[{regionKey:'muscle_left',label:'Fictional muscle',layer:'muscular',laterality:'left',structureIds:['fixture-muscle'],verified:true},{regionKey:'heart',label:'Fictional organ',layer:'organ',laterality:'midline',structureIds:['fixture-heart'],verified:true}];
 const highlight:AtlasHighlight={...structuredClone(records.find(r=>r.recordType==='AtlasHighlight')!),highlightId:'automatic-fixture',kind:'automatic',severity:'warning',assessmentId:assessment.assessmentId,ruleId:rule.ruleId,ruleVersion:rule.version,observationIds:observations.map(o=>o.observationId)};
 records.push(...observations,highlight);return {records,rule,assessment,manifest,highlight,observations};
}

test('properly bound fictional automatic evidence passes both shared boundaries',async()=>{
 const f=await automaticFixture();expect(highlightEligibility(f.highlight,f.assessment,f.rule,f.observations,f.manifest).visible).toBe(true);
 await make().execute(command(f.records,'automatic'));
});

test.each(['wrong-region','unrelated-evidence','rule-severity','unmapped-wrong-region'])('automatic finding rejects %s in selectors and writes',async kind=>{
 const f=await automaticFixture();
 if(kind.includes('wrong-region')){f.highlight.regionKey='heart';f.highlight.layer='organ';}
 if(kind==='unrelated-evidence')f.assessment.observationIds=[];
 if(kind==='rule-severity'){f.assessment.severity='critical';f.highlight.severity='critical';}
 if(kind==='unmapped-wrong-region')f.manifest.regions.forEach(r=>{r.verified=false;r.structureIds=[];});
 expect(highlightEligibility(f.highlight,f.assessment,f.rule,f.observations,f.manifest).visible).toBe(false);
 await expect(make().execute(command(f.records,'invalid-automatic'))).rejects.toMatchObject({detail:{code:'REFERENCE_INVALID'}});
});

test.each(['old-key','current-key','missing-key'])('available comparison rejects a changed protocol with %s',async kind=>{
 const records=await createDemoRecords();const current=structuredClone(records.filter(r=>r.recordType==='Observation').find(r=>r.observationId==='metric-heart_rate')!);
 current.observationId='new-protocol-current';current.measurementContext.protocolId='different-protocol';records.push(current);
 const comparison=records.find(r=>r.recordType==='ComparisonResult')!;comparison.observationIds=[current.observationId];
 if(kind==='current-key')comparison.comparabilityKey=buildComparisonKey(current).key;
 if(kind==='missing-key')comparison.comparabilityKey=null;
 await expect(make().execute(command(records,'incompatible'))).rejects.toMatchObject({detail:{code:'REFERENCE_INVALID'}});
});

test('scientific admission cannot count lineages without supporting sources',async()=>{
 const records=seedRecords();const run=records.find(r=>r.recordType==='ValidationRun')!;
 Object.assign(run,{status:'verified',admission:'assessment_eligible',independentEvidenceGroups:[{lineageId:'lineage-a',sourceIds:[],locations:['fixture location A']},{lineageId:'lineage-b',sourceIds:[],locations:['fixture location B']}]});
 await expect(make().execute(command(records,'empty-evidence'))).rejects.toMatchObject({detail:{code:expect.stringMatching(/^(VALIDATION_FAILED|REFERENCE_INVALID)$/)}});
});

test('restore rejects an import ledger key for a different source row even with a recomputed checksum',async()=>{
 const r=make();await r.execute(command(seedRecords(),'seed'));
 const key=stableImportKey('demo','simulation','demo-1','external-row');const o=observation(await importedObservationId(key));
 o.deliveryMode='file_import';o.provenance.sourceRecordId='external-row';
 const c=command([o],'import',{operation:'import'});c.payload.previewToken='b'.repeat(64);c.payload.importKeys=[{key,observationId:o.observationId,fingerprint:await sha256(canonicalJSON(o))}] as never;
 await r.execute(c);const exported=await r.export('demo');const validCopy=make();await validCopy.restore(exported);await validCopy.execute(c);
 expect(await validCopy.list('demo','Observation')).toHaveLength(1);
 const restored=make();
 exported.importLedger[0].key=stableImportKey('demo','simulation','demo-1','future-row');
 const {integrity,...body}=exported;exported.integrity={...integrity,contentHash:await sha256(canonicalJSON(body))};
 await expect(restored.restore(exported)).rejects.toMatchObject({detail:{code:'REFERENCE_INVALID'}});
 expect(await restored.list('demo','Observation')).toHaveLength(0);
});
