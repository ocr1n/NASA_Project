import {test,expect} from 'vitest';
import {Repository} from '../src/shared/repositories/repository';
import {MemoryStorage} from '../src/shared/repositories/memory';
import {FixedClock} from '../src/shared/contracts/clock';
import {createDemoRecords,DEMO_TIME} from '../src/shared/fixtures';
import {prepareCapture,captureTime,type CaptureInput} from '../src/shared/capture';
import {command} from './helpers';
import {checkInScales} from '../src/shared/metrics/check-in';
import {assessmentEligibility} from '../src/shared/rules/policy';
import {buildComparisonKey} from '../src/shared/metrics';

async function setup(){const repo=new Repository(new MemoryStorage(),new FixedClock(DEMO_TIME));await repo.execute(command(await createDemoRecords()));return repo;}
const input=(patch:Partial<CaptureInput>={}):CaptureInput=>({namespace:'demo',astronautId:'crew-a',operationId:'capture-one',sourceId:'simulation',receivedAt:DEMO_TIME,deliveryMode:'manual',time:{precision:'exact',text:'2026-01-10T16:00:00+05:00',reason:''},notes:'Fictional notes',completeTaskIds:['task-crew-a'],values:[{metric:'heart_rate',input:'63',unit:'/min',missingReason:null,context:'rest',measurementContext:{modality:'manual',deviceId:'fictional-device',protocolId:'fictional-rest',method:'fictional entry',posture:'seated'},quality:{score:0.9,method:'fictional quality parameter',flags:[],lowConfidence:false}}],...patch});
test('capture commits raw/evidence/value/task together, preserves offset and never creates a baseline',async()=>{
 const repo=await setup(),baselineCount=(await repo.list('demo','Baseline')).length,c=await prepareCapture(repo,input());
 const receipt=await repo.execute(c);expect(await repo.execute(c)).toEqual(receipt);
 const o=(await repo.list('demo','Observation')).find(o=>o.observationId.startsWith('checkin-'))!;
 expect(o.timestamp).toBe('2026-01-10T11:00:00.000Z');expect(o.originalTime).toBe('2026-01-10T16:00:00+05:00');expect(o.receivedAt).toBe(DEMO_TIME);expect(o.validation.status).toBe('pending');expect(o.validation.admission).toBe('demo_only');
 expect(JSON.parse((await repo.require('demo','RawRecord',o.provenance.rawRecordId)).payload!).notes).toBe('Fictional notes');
 expect((await repo.require('demo','FollowUpTask','task-crew-a')).state).toBe('completed');expect((await repo.list('demo','Baseline')).length).toBe(baselineCount);expect((await repo.list('demo','Observation')).filter(o=>o.observationId.startsWith('checkin-'))).toHaveLength(1);
});
test.each(['skip','unknown','device_issue','exercise','low_quality','date'])('%s remains honest and cannot complete a resting repeat',async(kind)=>{
 const repo=await setup(),x=input();
 if(['skip','unknown','device_issue'].includes(kind)){x.values[0].input='';x.values[0].missingReason=kind;}
 if(kind==='exercise')x.values[0].context='exercise';
 if(kind==='low_quality')x.values[0].quality={score:null,method:'unverified',flags:['uncertain'],lowConfidence:true};
 if(kind==='date')x.time={precision:'date',text:'2026-01-10',reason:''};
 const c=await prepareCapture(repo,x);await repo.execute(c);
 expect((await repo.require('demo','FollowUpTask','task-crew-a')).state).toBe('due');
 const o=(await repo.list('demo','Observation')).find(o=>o.observationId.startsWith('checkin-'))!;
 if(kind==='date')expect(o.timestamp).toBeNull();if(['skip','unknown','device_issue'].includes(kind)){expect(o.value).toBeNull();expect(o.missingReason).toBe(kind);}
 if(kind==='exercise'){const rest={...o,context:'rest' as const};expect(buildComparisonKey(o).key).not.toBe(buildComparisonKey(rest).key);}
 if(kind==='low_quality')expect(assessmentEligibility(o).availability).toBe('insufficient_data');
});
test.each(['','NaN','Infinity','12abc','-1'])('malformed numerical input %s is rejected with no commit',async(text)=>{
 const repo=await setup(),x=input();x.values[0].input=text;const before=await repo.export('demo');await expect(prepareCapture(repo,x)).rejects.toThrow();expect((await repo.export('demo')).records).toEqual(before.records);
});
test('registry conversions, named scale anchors and original units are used by capture',async()=>{
 const repo=await setup(),x=input();x.values=[{...x.values[0],metric:'sleep_duration',input:'420',unit:'min',context:'sleep',measurementContext:{method:'self-report',intervalSeconds:86400}},{...x.values[0],metric:'fatigue_rating',input:'2',unit:'1',measurementContext:{scale:checkInScales.fatigue_rating}}];x.completeTaskIds=[];
 await repo.execute(await prepareCapture(repo,x));const sleep=(await repo.list('demo','Observation')).find(o=>o.observationId.startsWith('checkin-')&&o.metric==='sleep_duration')!;expect(sleep.value).toBe(7);expect(sleep.provenance.originalUnit).toBe('min');expect(sleep.provenance.originalValue).toBe(420);
 x.operationId='invalid-unit';x.values[0].unit='kg';await expect(prepareCapture(repo,x)).rejects.toThrow();x.values[0].unit='min';x.values[0].input='2000';await expect(prepareCapture(repo,x)).rejects.toThrow();x.values[0].input='420';x.values[1].input='5';await expect(prepareCapture(repo,x)).rejects.toThrow();
});
test('unknown time/context stays unknown and delivery uses the same canonical path',async()=>{
 const repo=await setup(),x=input();x.time={precision:'unknown',text:'',reason:'Device did not record time'};x.values[0].context='unknown';x.deliveryMode='replay';await repo.execute(await prepareCapture(repo,x));const o=(await repo.list('demo','Observation')).find(o=>o.observationId.startsWith('checkin-'))!;expect(o.timestamp).toBeNull();expect(o.context).toBe('unknown');expect(o.deliveryMode).toBe('replay');expect((await repo.require('demo','FollowUpTask','task-crew-a')).state).toBe('due');
});
test('calendar/offset validation rejects normalization guesses, future events and invalid offsets',async()=>{
 const repo=await setup(),mission=await repo.require('demo','MissionContext','mission-demo');for(const text of ['2026-02-30','2026-01-10T12:00','2026-01-10T24:00:00Z','2026-01-10T10:00:00+15:00','2026-01-11T00:00:00Z'])expect(()=>captureTime({precision:text.length===10?'date':'exact',text,reason:''},mission)).toThrow();
});
test('cross-origin/crew tasks are rejected and dated profile context uses observations',async()=>{
 const repo=await setup();await expect(prepareCapture(repo,input({namespace:'crew'}))).rejects.toThrow();await expect(prepareCapture(repo,input({completeTaskIds:['task-crew-b']}))).rejects.toThrow();
 const x=input({completeTaskIds:[],updateProfileContext:true});x.values=[{...x.values[0],metric:'body_height',input:'1.75',unit:'m',time:{precision:'date',text:'2025-12-20',reason:''},measurementContext:{method:'fictional report'}}];await repo.execute(await prepareCapture(repo,x));const crew=await repo.require('demo','CrewProfile','crew-a');expect(crew.bodyHeightObservationId).not.toBeNull();expect((await repo.require('demo','Observation',crew.bodyHeightObservationId!)).value).toBe(175);
});
test('a failed transaction preserves all records and the identical command succeeds on retry',async()=>{
 const repo=await setup(),c=await prepareCapture(repo,input()),before=await repo.export('demo'),original=repo.storage.transact.bind(repo.storage);repo.storage.transact=async()=>{throw new Error('failure injection');};await expect(repo.execute(c)).rejects.toThrow();repo.storage.transact=original;expect((await repo.export('demo')).records).toEqual(before.records);await repo.execute(c);expect((await repo.require('demo','FollowUpTask','task-crew-a')).state).toBe('completed');
});
test('invalid dated profile input identifies its own date field and incomplete mass provenance is rejected',async()=>{
 const repo=await setup(),x=input({completeTaskIds:[],updateProfileContext:true});x.values=[{...x.values[0],metric:'body_mass',input:'70',unit:'kg',time:{precision:'date',text:'2026-02-30',reason:''},measurementContext:{method:'fictional report'}}];await expect(prepareCapture(repo,x)).rejects.toMatchObject({detail:{path:'body_mass:time'}});x.values[0].time!.text='2025-12-20';await expect(prepareCapture(repo,x)).rejects.toMatchObject({detail:{path:'body_mass:gravity'}});
});
