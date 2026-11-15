import 'fake-indexeddb/auto';
import {afterEach,expect,test} from 'vitest';
import type {Artifact} from '../src/shared/sources/acquisition';
import {fixtureArtifact} from '../src/shared/sources/catalogue';
import {readCSV} from '../src/shared/sources/csv';
import {Repository} from '../src/shared/repositories/repository';
import {MemoryStorage} from '../src/shared/repositories/memory';
import {IndexedDbStorage} from '../src/shared/repositories/indexeddb';
import {FixedClock} from '../src/shared/contracts/clock';
import {previewPTBReports,commandFromPTBPreview} from '../src/shared/capture/ecg-research';
import {createDemoRecords} from '../src/shared/fixtures';
import {prepareEcgReport,emptyEcgContent} from '../src/shared/capture/ecg';
import {importPTBSample} from '../src/shared/sources/pipeline';
import {canonicalJSON,sha256} from '../src/shared/contracts/identity';
import {at,command} from './helpers';

const stores:IndexedDbStorage[]=[];afterEach(async()=>{for(const s of stores.splice(0))await s.db.delete();});
const make=()=>new Repository(new MemoryStorage(),new FixedClock(at));
const rewrite=(artifact:Artifact,update:(rows:Record<string,string>[])=>void):Artifact=>{const rows=readCSV(artifact.payload);update(rows);const headers=Object.keys(rows[0]),quote=(v:string)=>'"'+v.replaceAll('"','""')+'"';return {...artifact,expectedHash:undefined,payload:[headers,...rows.map(r=>headers.map(h=>r[h]??''))].map(row=>row.map(quote).join(',')).join('\n')+'\n'};};

test('preview writes nothing and explicitly maps separate public subjects, methods, missing fields and unknown quality',async()=>{
 const repo=make(),preview=await previewPTBReports(repo,{method:'ECGDeli'});
 expect((await repo.export('research:ptb-xl-plus')).records).toEqual([]);
 expect(preview.rows.map(r=>r.publicSubjectId)).toEqual(['PTB-patient-15709','PTB-patient-13243']);
 expect(preview.rows[0].fields.find(f=>f.metric==='ecg_pr')).toMatchObject({status:'accepted',value:270,unit:'ms'});
 expect(preview.rows[0].fields.find(f=>f.metric==='heart_rate')?.status).toBe('missing');
 const c=await commandFromPTBPreview(preview);expect(c).not.toBeNull();
 const obs=c!.payload.records.filter(r=>r.recordType==='Observation');expect(obs).toHaveLength(14);
 expect(obs.every(o=>o.astronautId===null&&o.missionId===null&&o.dataOrigin==='public_research'&&o.quality.score===null&&o.validation.admission==='research_sandbox')).toBe(true);
 expect(obs.every(o=>o.timestamp===null&&o.timePrecision==='unknown')).toBe(true);
});

test('Uni-G HR comes from HR__Global in bpm and intervals never pool with ECGDeli',async()=>{
 const repo=make(),p=await previewPTBReports(repo,{method:'Uni-G'});
 expect(p.rows[0].fields.find(f=>f.metric==='heart_rate')).toMatchObject({value:63,unit:'/min',originalUnit:'bpm'});
 expect(p.rows[0].fields.find(f=>f.metric==='ecg_qrs')?.value).toBe(86);
 await repo.execute(await commandFromPTBPreview(p));await repo.execute(await commandFromPTBPreview(await previewPTBReports(repo,{method:'ECGDeli'})));
 const reports=await repo.list('research:ptb-xl-plus','Report');expect(reports).toHaveLength(4);expect(new Set(reports.map(r=>r.method))).toEqual(new Set(['ECGDeli','Uni-G']));
 expect((await repo.list('demo','Observation'))).toEqual([]);
});

test('selection commits only chosen reports and preserves full raw files with unmapped columns',async()=>{
 const repo=make(),p=await previewPTBReports(repo,{method:'ECGDeli',selectedEcgIds:['2']});await repo.execute(await commandFromPTBPreview(p));
 expect((await repo.list('research:ptb-xl-plus','Report')).map(r=>r.publicSubjectId)).toEqual(['PTB-patient-13243']);
 expect((await repo.list('research:ptb-xl-plus','RawRecord')).some(r=>r.payload===fixtureArtifact('ptbecgdeli').payload)).toBe(true);
 expect(p.unmappedColumns.length).toBeGreaterThan(500);
});

test('identical repeated import and exact command retry add no reports or observations',async()=>{
 const repo=make(),p=await previewPTBReports(repo,{method:'ECGDeli'}),c=await commandFromPTBPreview(p);const receipt=await repo.execute(c);
 expect(await repo.execute(c)).toEqual(receipt);
 const again=await previewPTBReports(repo,{method:'ECGDeli'});expect(again.rows.every(r=>r.action==='duplicate')).toBe(true);expect(await commandFromPTBPreview(again)).toBeNull();
 expect(await repo.list('research:ptb-xl-plus','Observation')).toHaveLength(14);
});

test('changed content under a stable report identity is a conflict and retains originals',async()=>{
 const repo=make();await repo.execute(await commandFromPTBPreview(await previewPTBReports(repo,{method:'ECGDeli'})));
 const before=await repo.export('research:ptb-xl-plus'),features=rewrite(fixtureArtifact('ptbecgdeli'),rows=>{rows[0].QRS_Dur_Global='200';});
 const p=await previewPTBReports(repo,{method:'ECGDeli',features});expect(p.rows.every(r=>r.action==='conflict')).toBe(true);expect(p.command).toBeNull();
 expect(await repo.export('research:ptb-xl-plus')).toEqual(before);
});

test('malformed row is rejected while valid rows remain selectable; missing numeric cells stay explicit',async()=>{
 const repo=make(),features=rewrite(fixtureArtifact('ptbecgdeli'),rows=>{rows[0].QRS_Dur_Global='12oops';rows[1].PR_Int_Global='';});
 const p=await previewPTBReports(repo,{method:'ECGDeli',features});expect(p.rows[0].action).toBe('rejected');
 expect(p.rows[1].fields.find(f=>f.metric==='ecg_pr')).toMatchObject({status:'missing',value:null});
 await repo.execute(await commandFromPTBPreview(p));expect(await repo.list('research:ptb-xl-plus','Report')).toHaveLength(1);
});

test('wrong documentation units, missing required columns and unjoined patient IDs cannot yield a report',async()=>{
 for(const change of ['unit','column','parent']){
  const repo=make(),options:{method:'ECGDeli';description?:Artifact;features?:Artifact;parent?:Artifact}={method:'ECGDeli'};
  if(change==='unit')options.description=rewrite(fixtureArtifact('ptbdescription'),rows=>{rows.find(r=>r.id==='QRS_Dur_Global')!.unit='mV';});
  if(change==='column')options.features={...fixtureArtifact('ptbecgdeli'),expectedHash:undefined,payload:fixtureArtifact('ptbecgdeli').payload.replace('QRS_Dur_Global,','Unrecognized_QRS,')};
  if(change==='parent')options.parent=rewrite(fixtureArtifact('ptbparent'),rows=>{rows[0].patient_id='';rows[1].patient_id='';});
  const p=await previewPTBReports(repo,options);expect(p.command).toBeNull();expect(p.rows.every(r=>r.action==='rejected')).toBe(true);
 }
});

test('tampered preview and direct canonical values cannot bypass original-file validation',async()=>{
 const repo=make(),p=await previewPTBReports(repo,{method:'ECGDeli'});p.rows[0].publicSubjectId='another-patient';
 await expect(commandFromPTBPreview(p)).rejects.toHaveProperty('detail.code');
 const fresh=await previewPTBReports(repo,{method:'ECGDeli'}),c=await commandFromPTBPreview(fresh);const o=c!.payload.records.find(r=>r.recordType==='Observation'&&r.metric==='ecg_pr')!;
 if(o.recordType==='Observation')o.value=999;
 await expect(repo.execute(c)).rejects.toHaveProperty('detail.code');expect((await repo.export('research:ptb-xl-plus')).records).toEqual([]);
});

test('research export restores reports, subjects, original evidence and stable duplicate state',async()=>{
 const repo=make();await repo.execute(await commandFromPTBPreview(await previewPTBReports(repo,{method:'Uni-G'})));
 const snapshot=await repo.export('research:ptb-xl-plus'),copy=make();await copy.restore(snapshot);
 expect((await copy.export('research:ptb-xl-plus')).records).toEqual(snapshot.records);
 expect((await previewPTBReports(copy,{method:'Uni-G'})).rows.every(r=>r.action==='duplicate')).toBe(true);
 const altered=structuredClone(snapshot),r=altered.records.find(r=>r.recordType==='Report')!;if(r.recordType==='Report')r.publicSubjectId='PTB-patient-1';
 const {integrity,...body}=altered;altered.integrity={algorithm:'sha256',recordCount:body.records.length,contentHash:await sha256(canonicalJSON(body))};
 await expect(make().restore(altered)).rejects.toHaveProperty('detail.code');
});

test('actual IndexedDB report-write failure rolls back every source/raw/report/reading and exact retry succeeds',async()=>{
 const storage=new IndexedDbStorage('ecg-import-'+crypto.randomUUID());stores.push(storage);const repo=new Repository(storage,new FixedClock(at));
 const p=await previewPTBReports(repo,{method:'ECGDeli'}),c=await commandFromPTBPreview(p),events:unknown[]=[];repo.subscribe(e=>events.push(e));
 const hook=(_key:unknown,row:{record:{recordType:string}})=>{if(row.record.recordType==='Report')throw new DOMException('Forced report failure','QuotaExceededError');};
 storage.db.records.hook('creating',hook);await expect(repo.execute(c)).rejects.toHaveProperty('detail.code');expect((await repo.export('research:ptb-xl-plus')).records).toEqual([]);expect(events).toEqual([]);
 storage.db.records.hook('creating').unsubscribe(hook);await repo.execute(c);expect(events).toHaveLength(1);
});

test('manual and research paths emit the same canonical report/observation structure with separate ownership and admission',async()=>{
 const repo=make();await repo.execute(command(await createDemoRecords()));const content=emptyEcgContent('crew-a');content.reportKey='parity';content.lead='Global';content.method='ECGDeli';content.values[0].input='63';
 const manual=await prepareEcgReport(repo,content),research=await commandFromPTBPreview(await previewPTBReports(repo,{method:'ECGDeli'}));
 const m=manual.payload.records.find(r=>r.recordType==='Observation')!,r=research!.payload.records.find(r=>r.recordType==='Observation')!;
 expect(Object.keys(m).sort()).toEqual(Object.keys(r).sort());
 if(m.recordType==='Observation'&&r.recordType==='Observation'){expect(m.validation.admission).toBe('demo_only');expect(r.validation.admission).toBe('research_sandbox');expect(m.quality.score).toBeNull();expect(r.quality.score).toBeNull();}
});

test('report import preserves all earlier module 01 sample/source identities unchanged',async()=>{
 const repo=make();await importPTBSample(repo);const before=await repo.export('research:ptb-xl-plus');
 await repo.execute(await commandFromPTBPreview(await previewPTBReports(repo,{method:'Uni-G'})));
 const after=await repo.export('research:ptb-xl-plus');for(const record of before.records)expect(after.records).toContainEqual(record);
});

test('direct imports cannot change preview identity or sneak unrelated records into the report command',async()=>{
 for(const kind of ['token','extra']){
  const repo=make(),p=await previewPTBReports(repo,{method:'ECGDeli'}),c=await commandFromPTBPreview(p);
  if(kind==='token')c!.payload.previewToken='f'.repeat(64);
  else {const other=await previewPTBReports(repo,{method:'Uni-G'}),report=other.command!.payload.records.find(r=>r.recordType==='Report')!;c!.payload.records.push(report);}
  await expect(repo.execute(c)).rejects.toHaveProperty('detail.code');expect((await repo.export('research:ptb-xl-plus')).records).toEqual([]);
 }
});

test('concurrent identical previews with different arrival clocks remain a logical no-op',async()=>{
 const repo=make(),later=new Repository(repo.storage,new FixedClock('2026-01-10T12:01:00Z'));
 const first=await commandFromPTBPreview(await previewPTBReports(repo,{method:'ECGDeli'})),second=await commandFromPTBPreview(await previewPTBReports(later,{method:'ECGDeli'}));
 await repo.execute(first);await expect(later.execute(second)).resolves.toHaveProperty('committedAt');
 expect(await repo.list('research:ptb-xl-plus','Report')).toHaveLength(2);
});

test('a retained research import still rejects namespace mismatch and duplicate raw IDs',async()=>{
 const repo=make(),c=(await commandFromPTBPreview(await previewPTBReports(repo,{method:'ECGDeli'})))!;
 await repo.execute(c);
 const bad=structuredClone(c);bad.payload.records.find(r=>r.recordType==='ImportBatch')!.namespace='demo';
 await expect(repo.execute(bad)).rejects.toHaveProperty('detail.code');
 const duplicate=structuredClone(c);duplicate.payload.records.push(structuredClone(duplicate.payload.records.find(r=>r.recordType==='RawRecord'&&r.mediaType==='text/csv')!));
 await expect(repo.execute(duplicate)).rejects.toHaveProperty('detail.code');
});

test('ECGDeli mapping rejects an input lacking its published beat-count columns',async()=>{
 const repo=make(),features={...fixtureArtifact('ptbecgdeli'),payload:fixtureArtifact('ptbunig').payload,expectedHash:undefined};
 const p=await previewPTBReports(repo,{method:'ECGDeli',features});expect(p.rows.every(r=>r.action==='rejected')).toBe(true);expect(p.command).toBeNull();
});
