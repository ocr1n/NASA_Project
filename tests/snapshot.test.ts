import {test,expect} from 'vitest';
import {Repository} from '../src/shared/repositories/repository';
import {MemoryStorage} from '../src/shared/repositories/memory';
import {exportSnapshot,restoreSnapshot,MigrationRegistry} from '../src/shared/repositories/snapshot';
import {FixedClock} from '../src/shared/contracts/clock';
import {canonicalJSON,sha256} from '../src/shared/contracts/identity';
import {command,seedRecords,observation,task,at} from './helpers';
const make=()=>new Repository(new MemoryStorage(),new FixedClock(at));
test('export/restore preserves origin time references version and retry ledger',async()=>{
 const r=make();const c=command([...seedRecords(),observation(),task()]);await r.execute(c);const saved=await exportSnapshot(r,'demo');const restored=make();await restoreSnapshot(restored,saved);await restored.execute(c);
 expect(await restored.list('demo','Observation')).toHaveLength(1);expect(await exportSnapshot(restored,'demo')).toEqual(saved);
 expect((await restored.read('demo','Observation','reading-1'))).toMatchObject({timestamp:at,dataOrigin:'synthetic',schemaVersion:'0.1.0',provenance:{rawRecordId:'raw-1'}});
});
test('tampering and broken references cannot partially restore',async()=>{
 const r=make();await r.execute(command([...seedRecords(),observation(),task()]));const saved=await exportSnapshot(r,'demo');const restored=make();
 const tampered=structuredClone(saved);tampered.records.find(x=>x.recordType==='Observation')!.revision=2;
 await expect(restoreSnapshot(restored,tampered)).rejects.toMatchObject({detail:{code:'VALIDATION_FAILED'}});
 const broken=structuredClone(saved);broken.records=broken.records.filter(x=>x.recordType!=='CrewProfile');const {integrity,...body}=broken;broken.integrity={...integrity,recordCount:body.records.length,contentHash:await sha256(canonicalJSON(body))};
 await expect(restoreSnapshot(restored,broken)).rejects.toMatchObject({detail:{code:'REFERENCE_INVALID'}});expect(await restored.list('demo','Observation')).toHaveLength(0);
});
test('occupied destination and unsupported versions reject without replacing work',async()=>{
 const r=make();await r.execute(command(seedRecords()));const saved=await exportSnapshot(r,'demo');await expect(restoreSnapshot(r,saved)).rejects.toMatchObject({detail:{code:'CONFLICT'}});
 await expect(restoreSnapshot(make(),{...saved,schemaVersion:'9.9.9'})).rejects.toMatchObject({detail:{code:'UNSUPPORTED_VERSION'}});
});
test('central migration validates an explicit registered source before conversion',async()=>{
 const r=make();await r.execute(command(seedRecords()));const saved=await exportSnapshot(r,'demo');const registry=new MigrationRegistry();
 // Artificial envelope for dispatcher testing; never presented as a historical project version.
 registry.register('test-only-envelope',x=>{if(!(x as any).testEnvelope)throw new Error('invalid source');return (x as any).testEnvelope;});
 await restoreSnapshot(make(),{schemaVersion:'test-only-envelope',testEnvelope:saved},registry);
 await expect(restoreSnapshot(make(),{schemaVersion:'test-only-envelope'},registry)).rejects.toMatchObject({detail:{code:'VALIDATION_FAILED'}});
});
test('expected missing record reports eviction rather than healthy empty data',async()=>{
 await expect(make().require('demo','CrewProfile','crew-a')).rejects.toMatchObject({detail:{code:'STORAGE_EVICTED'}});
});
