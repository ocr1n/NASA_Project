export const at = '2026-01-10T12:00:00Z';
export const rawHash='44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a';
export const base = <K extends string>(recordType: string, idField: K, id: string) => ({ schemaVersion: '0.1.0', namespace: 'demo', recordType, revision: 1, [idField]: id }) as {schemaVersion:string;namespace:string;recordType:string;revision:number}&Record<K,string>;
export const source = () => ({...base('SourceRecord','sourceId','simulation'), name:'Fictional scenario',tier:'simulation',canonicalURL:null,doi:null,publisher:'Project team',host:'local',version:'demo-1',license:'Project-authored fictional data',attribution:'Project team',accessRestrictions:[],retrievedAt:at,supportedMetrics:['heart_rate'],purpose:'Software demonstration',nasaSearchEvidence:[],fallbackReason:null,lineageIds:['simulation'],reviewStatus:'pending'});
export const snapshotSource = () => ({schemaVersion:'0.1.0',sourceId:'simulation',name:'Fictional scenario',tier:'simulation',canonicalURL:null,version:'demo-1',license:'Project-authored fictional data',attribution:'Project team',retrievedAt:at});
export const observation = (id='reading-1', crew='crew-a') => ({
  ...base('Observation','observationId',id), astronautId:crew,missionId:'mission-demo',publicSubjectId:null,datasetId:null,
  timestamp:at,timePrecision:'exact',originalTime:null,timeReason:null,missionAnchor:null,receivedAt:at,
  metric:'heart_rate',valueKind:'number',value:62,unit:'/min',missingReason:null,context:'rest',
  measurementContext:{modality:'manual',deviceId:'demo-device',protocolId:'demo-rest',method:'report',posture:'seated',missionPhase:'inflight'},
  source:snapshotSource(),quality:{score:0.9,method:'fictional',flags:[],lowConfidence:false},
  validation:{status:'pending',validationRunId:'validation-demo',evidenceIds:[],procedureVersion:'demo-1',issues:[],admission:'demo_only'},
  dataOrigin:'synthetic',deliveryMode:'manual',synthetic:true,era:'scenario',
  provenance:{rawRecordId:'raw-1',contentHash:rawHash,sourceRecordId:id,importBatchId:null,pipelineVersion:'demo-1',algorithm:null,parameters:{},originalUnit:'/min',originalValue:62,evidenceObservationIds:[],windowIds:[],originalSamplingHz:null,outputSamplingHz:null},
  reportId:null,sessionId:null,acquisitionId:id,regionKey:null,laterality:null,supersedesObservationId:null
});
export const seedRecords=()=>[
 source(),
 {...base('MissionContext','missionId','mission-demo'),label:'Fictional mission',environmentType:'iss',missionStart:'2026-01-01T00:00:00Z',scenarioClock:at,missionPhase:'inflight',location:'cabin',schedule:[],communicationScenario:null,dataOrigin:'synthetic',sourceIds:['simulation']},
 ...['crew-a','crew-b'].map(astronautId=>({...base('CrewProfile','astronautId',astronautId),alias:astronautId==='crew-a'?'Aster':'Vega',missionId:'mission-demo',missionStart:'2026-01-01T00:00:00Z',displayTimeZone:'UTC',preferences:{locale:'en',reducedMotion:false},bodyHeightObservationId:null,bodyMassObservationId:null,profileOrigin:'synthetic',createdAt:at,updatedAt:at})),
 {...base('RawRecord','rawRecordId','raw-1'),sourceId:'simulation',acquisitionId:null,importBatchId:null,payload:'{}',fileReference:null,contentHash:rawHash,mediaType:'application/json',encoding:'utf-8',retrievedAt:at,retentionPolicy:'demo',accessPolicy:'public fictional'},
 {...base('ValidationRun','validationRunId','validation-demo'),claim:'Fictional software fixture',subjectRecordIds:[],sourceIds:['simulation'],ruleIds:[],independentEvidenceGroups:[],sourcesChecked:['simulation'],normalization:'canonical',toleranceDefinition:null,structuralResults:[],methodComparisons:[],conflicts:[],limitations:['Not scientific evidence'],status:'pending',admission:'demo_only',reviewer:'fixture',procedureVersion:'demo-1',pipelineVersion:'demo-1',runAt:at}
];
export const task=(id='task-1',crew='crew-a')=>({...base('FollowUpTask','taskId',id),astronautId:crew,type:'repeat_measurement',dueAt:at,duePrecision:'exact',state:'due',assessmentIds:[],observationIds:['reading-1'],requiredMeasurement:{metric:'heart_rate',comparabilityKey:null},completionObservationIds:[],completionReportIds:[],explanation:'Fictional repeat workflow',sourceIds:['simulation'],idempotencyKey:id,episodeId:'episode-1',createdAt:at,updatedAt:at});
export const command=(records:unknown[],id='operation-1',extra:Record<string,unknown>={})=>({schemaVersion:'0.1.0',namespace:'demo',operationId:id,idempotencyKey:id,subject:{kind:'namespace',astronautId:null,missionId:null},createdAt:at,operation:'upsert',domain:'configuration',payload:{records,expectedRevisions:[],importKeys:[],previewToken:null as string|null},...extra});
