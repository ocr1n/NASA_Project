import 'fake-indexeddb/auto';
import {afterEach,expect,test} from 'vitest';
import {Repository} from '../src/shared/repositories/repository';
import {MemoryStorage} from '../src/shared/repositories/memory';
import {IndexedDbStorage} from '../src/shared/repositories/indexeddb';
import {FixedClock} from '../src/shared/contracts/clock';
import {createDemoRecords,DEMO_TIME} from '../src/shared/fixtures';
import {prepareEcgReport,emptyEcgContent} from '../src/shared/capture/ecg';
import {ECG_MEDIA,ecgEvidence} from '../src/shared/contracts/ecg';
import {canonicalJSON,sha256} from '../src/shared/contracts/identity';
import {buildComparisonKey} from '../src/shared/metrics';
import type {CommandEnvelope,RawRecord,EcgCaptureContent} from '../src/shared/contracts';
import {command} from './helpers';
const dbs:IndexedDbStorage[]=[];afterEach(async()=>{for(const s of dbs.splice(0))await s.db.delete();});
export function reportContent(id='crew-a'):EcgCaptureContent{
 const c=emptyEcgContent(id);Object.assign(c,{reportKey:'fictional-ecg-001',lead:'II',method:'fictional reported measurement',deviceId:'fictional ECG',protocolId:'fictional-ecg-v1',posture:'seated',context:'rest',missionPhase:'preflight',time:{precision:'exact',text:'2025-12-20T10:00:00+05:00',reason:''},qualityNotes:'Tracing quality was not assessed'});
 c.values=c.values.map(v=>v.metric==='heart_rate'?{...v,input:'63',unit:'bpm',missingReason:null}:v.metric==='ecg_pr'?{...v,input:'0.16',unit:'s',missingReason:null}:v);return c;
}
async function setup(indexed=false){const storage=indexed?new IndexedDbStorage(`ecg-${crypto.randomUUID()}`):new MemoryStorage();if(storage instanceof IndexedDbStorage)dbs.push(storage);const repo=new Repository(storage,new FixedClock(DEMO_TIME));await repo.execute(command(await createDemoRecords()));return repo;}
const report=(c:CommandEnvelope)=>c.payload.records.find(r=>r.recordType==='Report')!;
const values=(c:CommandEnvelope)=>c.payload.records.filter(r=>r.recordType==='Observation');

test.each([false,true])('reported values/units, dated anchor, raw input, unknown quality and atomic report links (%s IndexedDB)',async indexed=>{
 const repo=await setup(indexed),before=await repo.export('demo'),c=await prepareEcgReport(repo,reportContent());
 expect(await repo.export('demo')).toEqual(before);expect(values(c)).toHaveLength(7);expect(values(c).find(o=>o.metric==='heart_rate')).toMatchObject({value:63,unit:'/min',provenance:{originalValue:63,originalUnit:'bpm'}});expect(values(c).find(o=>o.metric==='ecg_pr')).toMatchObject({value:160,unit:'ms',provenance:{originalValue:0.16,originalUnit:'s'}});
 await repo.execute(c);const r=report(c);expect(r.timestamp).toBe('2025-12-20T05:00:00.000Z');expect(values(c).every(o=>o.reportId===r.reportId&&o.acquisitionId===r.reportId&&o.quality.score===null&&o.quality.lowConfidence&&o.validation.admission==='demo_only'&&o.measurementContext.missionPhase==='preflight')).toBe(true);
 const raw=c.payload.records.find(r=>r.recordType==='RawRecord'&&r.mediaType===ECG_MEDIA) as RawRecord;expect(ecgEvidence(raw).content).toEqual(reportContent());expect(raw.payload).toContain('"input":"0.16"');expect(values(c).find(o=>o.metric==='ecg_qt')).toMatchObject({value:null,missingReason:'not reported'});
 for(const type of ['Baseline','Assessment','FollowUpTask','AtlasHighlight','CrewProfile'] as const)expect((await repo.export('demo')).records.filter(r=>r.recordType===type)).toEqual(before.records.filter(r=>r.recordType===type));
});

test.each([false,true])('identical/concurrent re-entry is unchanged; content conflicts retain original (%s IndexedDB)',async indexed=>{
 const repo=await setup(indexed),c1=await prepareEcgReport(repo,reportContent()),c2=await prepareEcgReport(repo,reportContent());const receipts=await Promise.all([repo.execute(c1),repo.execute(c2)]);expect(receipts.filter(r=>r.recordIds.length===0)).toHaveLength(1);const before=(await repo.export('demo')).records;
 const again=await prepareEcgReport(repo,reportContent(),{receivedAt:'2026-01-10T11:50:00Z'});expect((await repo.execute(again)).recordIds).toHaveLength(0);expect((await repo.export('demo')).records).toEqual(before);
 const changed=reportContent();changed.values[0].input='64';await expect(repo.execute(await prepareEcgReport(repo,changed))).rejects.toMatchObject({detail:{code:'CONFLICT'}});expect((await repo.export('demo')).records).toEqual(before);
 const collision=await prepareEcgReport(repo,reportContent());collision.operationId='operation-1';collision.idempotencyKey='operation-1';await expect(repo.execute(collision)).rejects.toMatchObject({detail:{code:'CONFLICT'}});
});

test.each([false,true])('failure after candidate writes rolls back; exact retry/reopen/export restore retain links (%s IndexedDB)',async indexed=>{
 let repo=await setup(indexed);const c=await prepareEcgReport(repo,reportContent()),before=await repo.export('demo');
 if(repo.storage instanceof IndexedDbStorage){const table=repo.storage.db.metadata,put=table.put.bind(table);table.put=(()=>{throw {name:'QuotaExceededError'};}) as typeof table.put;await expect(repo.execute(c)).rejects.toMatchObject({detail:{code:'STORAGE_QUOTA'}});table.put=put;}
 else{const transact=repo.storage.transact.bind(repo.storage);repo.storage.transact=(ns,work)=>transact(ns,draft=>{work(draft);throw new Error('Injected after writes');});await expect(repo.execute(c)).rejects.toThrow();repo.storage.transact=transact;}
 expect(await repo.export('demo')).toEqual(before);const receipt=await repo.execute(c);expect(await repo.execute(c)).toEqual(receipt);
 if(repo.storage instanceof IndexedDbStorage){const name=repo.storage.db.name;repo.storage.close();const reopened=new IndexedDbStorage(name);dbs.push(reopened);repo=new Repository(reopened,new FixedClock(DEMO_TIME));expect(await repo.require('demo','Report',report(c).reportId)).toEqual(report(c));}
 const snapshot=await repo.export('demo'),copy=new Repository(new MemoryStorage(),new FixedClock(DEMO_TIME));await copy.restore(snapshot);expect((await copy.export('demo')).records).toEqual(snapshot.records);expect((await copy.execute(await prepareEcgReport(copy,reportContent()))).recordIds).toHaveLength(0);
});

test.each(['date','unknown'] as const)('%s time, unknown device/protocol and explicit missing heart rate remain truthful',async precision=>{
 const repo=await setup(),c=reportContent();c.time={precision,text:precision==='date'?'2025-12-20':'',reason:'Exact exam time unavailable'};c.deviceId=null;c.protocolId=null;c.values[0]={...c.values[0],input:'',missingReason:'HR not reported'};const prepared=await prepareEcgReport(repo,c);await repo.execute(prepared);expect(report(prepared).timestamp).toBeNull();expect(values(prepared).every(o=>o.timestamp===null&&o.timePrecision===precision)).toBe(true);expect(values(prepared).find(o=>o.metric==='heart_rate')?.value).toBeNull();expect(buildComparisonKey(values(prepared).find(o=>o.metric==='ecg_pr')!).availability).toBe('incomparable');
});

test.each(['wrong unit','missing row unit','number prefix','nonfinite','negative','missing value conflict','missing lead','missing method','duplicate metric','exact offset','future time','invalid date','qtc method','hrv metadata'])('%s is rejected before any write',async kind=>{
 const repo=await setup(),c=reportContent(),before=await repo.export('demo');
 if(kind==='wrong unit')c.values[0].unit='kg';if(kind==='missing row unit')c.values[2].unit='kg';if(kind==='number prefix')c.values[0].input='63abc';if(kind==='nonfinite')c.values[0].input='1e309';if(kind==='negative')c.values[0].input='-1';if(kind==='missing value conflict')c.values[0].missingReason='unknown';if(kind==='missing lead')c.lead=' ';if(kind==='missing method')c.method='';if(kind==='duplicate metric')c.values[1]=c.values[0];if(kind==='exact offset')c.time.text='2025-12-20T10:00:00';if(kind==='future time')c.time.text='2026-01-11T00:00:00Z';if(kind==='invalid date')c.time={precision:'date',text:'2025-02-30',reason:''};if(kind==='qtc method')c.values.find(v=>v.metric==='ecg_qtc')!.missingReason=null;if(kind==='hrv metadata')c.values.find(v=>v.metric==='hrv_sdnn')!.missingReason=null;
 await expect(prepareEcgReport(repo,c)).rejects.toThrow();expect(await repo.export('demo')).toEqual(before);
});

test('QTc correction and separate HRV method/window/artifact metadata are retained without deriving support',async()=>{
 const repo=await setup(),c=reportContent();c.qtcCorrection='reported Fridericia';c.hrvMethod='reported NN interval SD';c.windowSeconds=10;c.artifactHandling='unknown';c.values=c.values.map(v=>v.metric==='ecg_qtc'?{...v,input:'0.4',unit:'s',missingReason:null}:v.metric==='hrv_sdnn'?{...v,input:'0.04',unit:'s',missingReason:null}:v);
 const prepared=await prepareEcgReport(repo,c);await repo.execute(prepared);expect(values(prepared).find(o=>o.metric==='ecg_qtc')).toMatchObject({value:400,measurementContext:{qtcCorrection:'reported Fridericia',method:c.method}});const hrv=values(prepared).find(o=>o.metric==='hrv_sdnn')!;expect(hrv).toMatchObject({value:40,measurementContext:{method:c.hrvMethod,windowSeconds:10,artifactHandling:'unknown'},quality:{score:null,lowConfidence:true}});expect(buildComparisonKey(hrv).availability).toBe('incomparable');
});

test('same report key is isolated by crew, including commands and research namespace rejection',async()=>{
 const repo=await setup(),a=await prepareEcgReport(repo,reportContent()),b=await prepareEcgReport(repo,reportContent('crew-b'));expect(report(a).reportId).not.toBe(report(b).reportId);await repo.execute(a);await repo.execute(b);const cross=await prepareEcgReport(repo,reportContent());cross.subject.astronautId='crew-b';await expect(repo.execute(cross)).rejects.toThrow();cross.namespace='research:ptb-xl-plus';await expect(repo.execute(cross)).rejects.toThrow();expect((await repo.list('demo','Report')).filter(r=>r.type==='ecg')).toHaveLength(3);
});

test('altered candidates cannot bypass graph checks by becoming duplicate no-ops',async()=>{
 const repo=await setup();await repo.execute(await prepareEcgReport(repo,reportContent()));const before=(await repo.export('demo')).records;
 for(const kind of ['quality','number','raw','lead','time','method','source','evidence','report id','extra task','domain','missing evidence']){
  const c=await prepareEcgReport(repo,reportContent()),o=values(c)[0],raw=c.payload.records.find(r=>r.recordType==='RawRecord'&&r.mediaType===ECG_MEDIA) as RawRecord;
  if(kind==='quality'){o.quality.score=1;o.quality.lowConfidence=false;}if(kind==='number')o.value=999;if(kind==='raw')(c.payload.records.find(r=>r.recordType==='RawRecord'&&r.mediaType==='application/json') as RawRecord).payload+='x';if(kind==='lead')report(c).lead='I';if(kind==='time')o.timestamp='2025-12-19T00:00:00Z';if(kind==='method')o.measurementContext.method='other';if(kind==='source')o.source.name='other';if(kind==='report id'){report(c).reportId='other';}if(kind==='extra task')c.payload.records.push((await repo.require('demo','FollowUpTask','task-crew-a')));if(kind==='domain')c.domain='configuration';if(kind==='missing evidence')c.payload.records=c.payload.records.filter(r=>r!==raw);
  if(kind==='evidence'){const e=ecgEvidence(raw);e.content.qualityNotes='changed';raw.payload=canonicalJSON(e);raw.contentHash=await sha256(raw.payload);}
  await expect(repo.execute(c)).rejects.toThrow();expect((await repo.export('demo')).records).toEqual(before);
 }
});

test('restore rejects recomputed snapshot hashes with incompatible ECG values, fingerprints or identities',async()=>{
 const repo=await setup();await repo.execute(await prepareEcgReport(repo,reportContent()));
 for(const kind of ['value','fingerprint','identity']){
  const snapshot=await repo.export('demo'),raw=snapshot.records.find(r=>r.recordType==='RawRecord'&&r.mediaType===ECG_MEDIA) as RawRecord;
  if(kind==='value'){const o=snapshot.records.find(r=>r.recordType==='Observation'&&r.provenance.parameters.ecgEvidenceId) as any;o.value=999;}
  else{const e=ecgEvidence(raw);if(kind==='fingerprint')e.content.qualityNotes='changed';else{e.content.reportKey='forged';e.contentFingerprint=await sha256(canonicalJSON(e.content));}raw.payload=canonicalJSON(e);raw.contentHash=await sha256(raw.payload);}
  const {integrity,...body}=snapshot;snapshot.integrity.contentHash=await sha256(canonicalJSON(body));const copy=new Repository(new MemoryStorage(),new FixedClock(DEMO_TIME));await expect(copy.restore(snapshot)).rejects.toThrow();expect(await copy.list('demo','Report')).toHaveLength(0);
 }
});
