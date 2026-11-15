import {createRoot} from 'react-dom/client';
import {Repository} from './shared/repositories/repository';
import {IndexedDbStorage} from './shared/repositories/indexeddb';
import {DEMO_TIME,ensureCheckInSchedule,ensureCollectionSchedules} from './shared/fixtures';
import {SCHEMA_VERSION,ContractError,failure,type CommandEnvelope} from './shared/contracts';
import {SelectedCrewStore} from './shared/view-models';
import {BaselineStore} from './shared/view-models/baselines';
import {EcgStore} from './shared/view-models/ecg';
import {EcgImportStore} from './shared/view-models/ecg-import';
import {createBaselineFixtureRecords} from './shared/baselines/fixtures';
import {ExerciseStore} from './shared/view-models/exercise';
import {CollectionStore} from './shared/view-models/collection';
import {SourcesStore} from './shared/sources/store';
import {FoundationShell} from './features/shell/FoundationShell';
import './features/shell/shell.css';
import './features/measurements/collection.css';
import {ensureAtlasManifest} from './shared/atlas';
import {compileDemoScenario} from './shared/scenarios';
const root=createRoot(document.getElementById('root')!);let currentStore:SelectedCrewStore|undefined;let currentExercise:ExerciseStore|undefined;let currentCollection:CollectionStore|undefined;let currentSources:SourcesStore|undefined;let currentStorage:IndexedDbStorage|undefined;let currentBaselines:BaselineStore|undefined;let currentEcg:EcgStore|undefined;let currentEcgImport:EcgImportStore|undefined;
async function openExport(input:unknown){
 const demoInput=input&&typeof input==='object'&&'protocolVersion' in input&&input.protocolVersion==='atlas-demo-input/1'?input:null;
 if(demoInput)input=await compileDemoScenario(demoInput);
 const storage=new IndexedDbStorage(`astronaut-health-copy-${crypto.randomUUID()}`),repo=new Repository(storage);
 try{await repo.restore(input);await ensureCheckInSchedule(repo);await ensureCollectionSchedules(repo);await ensureAtlasManifest(repo);localStorage.setItem('foundation-database',storage.db.name);localStorage.setItem(`foundation-installed:${storage.db.name}`,'yes');if(demoInput&&'crewId' in demoInput)localStorage.setItem(`astronaut-health-ui-v1:${storage.db.name}:demo`,JSON.stringify({cacheVersion:1,schemaVersion:'0.1.0',namespace:'demo',selectedCrewId:demoInput.crewId,views:{}}));mount(repo,storage,demoInput?'Fictional demo loaded as an independent local copy. Findings are calculated from its inputs.':'Export opened as an independent local copy.');}catch(e){storage.close();throw e;}
}
function mount(repo:Repository,storage:IndexedDbStorage,notice=''){
 currentEcgImport?.dispose();currentEcg?.dispose();currentStore?.dispose();currentExercise?.dispose();currentCollection?.dispose();currentSources?.dispose();currentBaselines?.dispose();currentStorage?.close();currentStorage=storage;currentStore=new SelectedCrewStore(repo,'demo',localStorage,`astronaut-health-ui-v1:${storage.db.name}:demo`);currentSources=new SourcesStore(repo);currentExercise=new ExerciseStore(repo,currentStore,localStorage,`astronaut-exercise-ui-v1:${storage.db.name}:demo`);currentCollection=new CollectionStore(repo,currentStore,localStorage,`astronaut-collection-ui-v1:${storage.db.name}:demo`);currentBaselines=new BaselineStore(repo,currentStore);currentEcg=new EcgStore(repo,currentStore,localStorage,`astronaut-ecg-ui-v1:${storage.db.name}:demo`);currentEcgImport=new EcgImportStore(repo);
 root.render(<FoundationShell key={storage.db.name} repository={repo} store={currentStore} exerciseStore={currentExercise} collectionStore={currentCollection} baselineStore={currentBaselines} ecgStore={currentEcg} ecgImportStore={currentEcgImport} sourcesStore={currentSources} onRestore={openExport} initialNotice={notice}/>);
}
async function start(){
 let storage:IndexedDbStorage|undefined;
 try{const name=localStorage.getItem('foundation-database')??'astronaut-health-v0';storage=new IndexedDbStorage(name);const repo=new Repository(storage);
  const profiles=await repo.list('demo','CrewProfile');
  if(!profiles.length){if(localStorage.getItem(`foundation-installed:${name}`))throw failure('STORAGE_EVICTED','Previously installed local records are missing. Open a trusted export to recover.','/',true,'restore');
   const c:CommandEnvelope={schemaVersion:SCHEMA_VERSION,namespace:'demo',operationId:'seed-demo-v1',idempotencyKey:'seed-demo-v1',subject:{kind:'namespace',astronautId:null,missionId:null},createdAt:DEMO_TIME,operation:'upsert',domain:'configuration',payload:{records:await createBaselineFixtureRecords(),expectedRevisions:[],importKeys:[],previewToken:null}};await repo.execute(c);localStorage.setItem(`foundation-installed:${name}`,'yes');}
  await ensureCheckInSchedule(repo);await ensureCollectionSchedules(repo);await ensureAtlasManifest(repo);mount(repo,storage);
 }catch(error){storage?.close();const message=error instanceof ContractError?error.detail.message:'Browser storage is unavailable. Enable storage, reopen, or recover from an export.';
  root.render(<main className="startup"><h1>Local data needs attention</h1><p role="alert">{message}</p><label className="restore-label">Open exported copy<input type="file" accept="application/json" onChange={async e=>{try{const file=e.currentTarget.files?.[0];if(file)await openExport(JSON.parse(await file.text()));}catch{root.render(<main className="startup"><h1>Export could not be opened</h1><p role="alert">The export is invalid or storage is unavailable. Reopen this page to try a trusted export.</p></main>);}}}/></label></main>);
 }
}void start();
