import {useEffect,useState,useSyncExternalStore,type ReactNode} from 'react';
import type {Repository} from '../../shared/repositories/repository';
import type {SelectedCrewStore} from '../../shared/view-models';
import {ContractError,type Observation} from '../../shared/contracts';
import {metricRegistry} from '../../shared/metrics';
import {SourcesPanel} from '../sources/SourcesPanel';
import type {SourcesStore} from '../../shared/sources/store';
import {CheckInForm} from '../check-in/CheckInForm';
import {ProfileContext} from '../check-in/ProfileContext';
import {missionDay} from '../../shared/contracts/clock';
import {ExercisePanel} from '../exercise/ExercisePanel';
import type {ExerciseStore} from '../../shared/view-models/exercise';
import {CollectionPanel} from '../measurements/CollectionPanel';
import type {CollectionStore} from '../../shared/view-models/collection';
import type {BaselineStore} from '../../shared/view-models/baselines';
import {BaselinePanel} from '../baselines/BaselinePanel';
import {EcgPanel} from '../ecg/EcgPanel';
import type {EcgStore} from '../../shared/view-models/ecg';
import type {EcgImportStore} from '../../shared/view-models/ecg-import';
import {EcgImportPanel} from '../ecg/EcgImportPanel';
import {UltrasoundPanel} from '../ultrasound/UltrasoundPanel';
import {WorkflowPanel} from '../workflow/WorkflowPanel';
import {AtlasPanel} from '../atlas/AtlasPanel';
import {DashboardPanel} from '../dashboard/DashboardPanel';
import {DemoScenariosPanel} from '../demos/DemoScenariosPanel';
import {MissionProgress,FlightLog} from '../mission/MissionPanel';
import {selectSavedReferences,type SavedReference} from '../../shared/view-models/mission';
interface Props {repository:Repository;store:SelectedCrewStore;exerciseStore:ExerciseStore;collectionStore:CollectionStore;baselineStore:BaselineStore;ecgStore:EcgStore;ecgImportStore:EcgImportStore;sourcesStore:SourcesStore;onRestore:(input:unknown)=>Promise<void>;initialNotice:string}
type PageId='overview'|'checkin'|'trends'|'atlas'|'reports'|'findings'|'log'|'sources';
const PAGES:{id:PageId;label:string}[]=[{id:'overview',label:'Overview'},{id:'checkin',label:'Check-in'},{id:'trends',label:'Trends'},{id:'atlas',label:'Atlas'},{id:'reports',label:'Reports'},{id:'findings',label:'Findings'},{id:'log',label:'Log'},{id:'sources',label:'Sources'}];
const displayValue=(o:Observation)=>o.value===null?`Unknown (${o.missingReason})`:typeof o.value==='object'?'Reported value':`${o.value} ${o.unit??''}`;
const newest=(o:Observation[])=>[...o].sort((a,b)=>Date.parse(b.timestamp??'')-Date.parse(a.timestamp??'')||b.observationId.localeCompare(a.observationId))[0]??null;
export function FoundationShell({repository,store,exerciseStore,collectionStore,baselineStore,ecgStore,ecgImportStore,sourcesStore,onRestore,initialNotice}:Props){
 const snapshot=useSyncExternalStore(store.subscribe,store.getSnapshot);
 const [page,setPage]=useState<PageId>('overview'),[visited,setVisited]=useState<PageId[]>(['overview']);
 const [notice,setNotice]=useState(initialNotice),[error,setError]=useState(''),[busy,setBusy]=useState(false),[offlineReady,setOfflineReady]=useState(false),[references,setReferences]=useState<SavedReference[]>([]);
 useEffect(()=>{void store.initialize();return()=>store.dispose();},[store]);
 useEffect(()=>{
  if(!('serviceWorker' in navigator))return;
  const update=()=>setOfflineReady(!!navigator.serviceWorker.controller);navigator.serviceWorker.addEventListener('controllerchange',update);update();
  void navigator.serviceWorker.getRegistration().then(existing=>existing??navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)).then(()=>navigator.serviceWorker.ready).then(update).catch(()=>{setOfflineReady(false);});
  return()=>navigator.serviceWorker.removeEventListener('controllerchange',update);
 },[]);
 // Saved references live in immutable baseline evidence, so they are read from the repository, not a fixture list.
 useEffect(()=>{
  const crewId=snapshot.selectedCrewId;
  if(!crewId){setReferences([]);return;}
  let live=true;const load=()=>{void selectSavedReferences(repository,crewId).then(next=>{if(live)setReferences(next);}).catch(()=>{if(live)setReferences([]);});};
  load();const stop=repository.subscribe(event=>{if(event.namespace==='demo')load();});
  return()=>{live=false;stop();};
 },[repository,snapshot.selectedCrewId]);
 const run=async(work:()=>Promise<void>)=>{setBusy(true);setError('');try{await work();}catch(e){setError(e instanceof ContractError?e.detail.message:'The action failed. Existing local data is preserved; retry or open a trusted export.');}finally{setBusy(false);}};
 const go=(id:PageId)=>{setPage(id);setVisited(previous=>previous.includes(id)?previous:[...previous,id]);window.scrollTo({top:0});};
 const readings=snapshot.observations.filter(o=>o.metric==='heart_rate'||o.metric==='sleep_duration');
 const day=snapshot.mission?.missionStart&&snapshot.mission.scenarioClock?missionDay(snapshot.mission.missionStart,snapshot.mission.scenarioClock):null;
 const clock=snapshot.mission?.scenarioClock?.slice(0,16).replace('T',' ')??null;
 const task=snapshot.tasks.find(t=>t.type==='repeat_measurement');
 const taskState=task?.state==='completed'?'Completed':task?'Due':'Loading';
 const inFlight=snapshot.observations.filter(o=>o.measurementContext.missionPhase!=='preflight');
 const rate=newest(inFlight.filter(o=>o.metric==='heart_rate')),sleep=newest(inFlight.filter(o=>o.metric==='sleep_duration'));
 const pageContent:Record<PageId,ReactNode>={
  overview:<>
   <header className="page-head"><p className="eyebrow">Mission overview</p><h2>A connected record, not a score</h2><p className="lead">One path end to end: a reading, the personal reference it is compared with, the evidence behind it, a cautious finding, the follow-up and the recovery. Unknown data stays unknown.</p></header>
   <div className="stat-grid">
    <article className="card stat"><span className="meta">Resting heart rate</span><strong>{rate?`${String(rate.value)}`:'—'}<small>{rate?.unit??''}</small></strong><span className="stat-foot">{rate?.originalTime??rate?.timestamp??'No reading yet'}</span></article>
    <article className="card stat"><span className="meta">Sleep</span><strong>{sleep?`${String(sleep.value)}`:'—'}<small>{sleep?.unit??''}</small></strong><span className="stat-foot">{sleep?.originalTime??sleep?.timestamp??'No reading yet'}</span></article>
    <article className="card stat"><span className="meta">Saved references</span><strong>{references.length}</strong><span className="stat-foot">{references[0]?`Latest ${references[0].savedAt.slice(0,10)}`:'Save one in Trends'}</span></article>
    <article className="card stat"><span className="meta">Follow-up</span><strong className="stat-state">{taskState}</strong><span className="stat-foot">{task?.requiredMeasurement.metric.replaceAll('_',' ')??'No task'}</span></article>
   </div>
   <div className="cols cols-2">
    <MissionProgress snapshot={snapshot} references={references}/>
    <div className="stack">
     <FlightLog snapshot={snapshot} references={references} limit={5}/>
     <DemoScenariosPanel key={`demo:${snapshot.selectedCrewId}`} repository={repository} crewId={snapshot.selectedCrewId} store={store} onOpen={onRestore}/>
    </div>
   </div>
   <section className="card history" id="history" aria-labelledby="history-heading">
    <div className="card-head"><div><h2 id="history-heading">Reading history</h2><p>Heart rate and sleep, with retained measurement and entry times.</p></div><button type="button" className="link" onClick={()=>go('log')}>Open flight log</button></div>
    <div className="table-scroll"><table aria-label="Reading history"><thead><tr><th scope="col">Reading / source</th><th scope="col">Value</th><th scope="col">Reported measurement time</th><th scope="col">Quality / validation</th></tr></thead><tbody>{readings.map(o=><tr key={o.observationId}><td>{o.measurementContext.missionPhase==='preflight'?'Preflight':metricRegistry[o.metric].label}<small>{o.deliveryMode} · {o.context}</small><small>{o.source.name}</small><small>Device/report: {o.measurementContext.deviceId??'Unknown'}</small></td><td className="numeric">{displayValue(o)}</td><td>{o.originalTime??o.timestamp??'Unknown time'}<small>{o.timePrecision} precision{o.timeReason?` · ${o.timeReason}`:''}</small><small>Entered: {o.receivedAt??'Unknown'}</small></td><td>{o.quality.score===null?'Unknown':`${o.quality.score} (fictional)`}<small>{o.quality.lowConfidence?'Low confidence':'Fictional quality parameter'}</small><small>{o.validation.status} · {o.validation.admission}</small></td></tr>)}</tbody></table></div>
    {!readings.length&&<p className="empty">Loading the selected crew's saved history.</p>}
   </section>
  </>,
  checkin:<>
   <header className="page-head"><p className="eyebrow">01 · Input</p><h2>Daily check-in</h2><p className="lead">A resting reading and last night's sleep, once per scenario day. Missing values stay missing — that is a valid answer.</p></header>
   <CheckInForm snapshot={snapshot} store={store}/>
   <ProfileContext snapshot={snapshot}/>
  </>,
  trends:<>
   <header className="page-head"><p className="eyebrow">02 · Comparison</p><h2>Trends and personal references</h2><p className="lead">Observed values with gaps preserved, compared against a reference you choose and can inspect.</p></header>
   {snapshot.crew&&<DashboardPanel key={`dashboard:${snapshot.crew.astronautId}`} repository={repository} crewId={snapshot.crew.astronautId}/>}
   <BaselinePanel store={baselineStore}/>
  </>,
  atlas:<>
   <header className="page-head"><p className="eyebrow">03 · Orientation</p><h2>Reference anatomy</h2><p className="lead">A published three-layer model. Teal is selection; amber is a fictional finding. It is never a personal reconstruction.</p></header>
   {snapshot.crew&&<AtlasPanel key={snapshot.crew.astronautId} repository={repository} snapshot={snapshot} store={store}/>}
  </>,
  reports:<>
   <header className="page-head"><p className="eyebrow">04 · Examinations</p><h2>Reports and sessions</h2><p className="lead">Examinations, workouts and additional measurements. Every entry keeps its own method, unit and time.</p></header>
   {snapshot.crew&&<UltrasoundPanel key={`ultrasound:${snapshot.crew.astronautId}`} repository={repository} crewId={snapshot.crew.astronautId} missionId={snapshot.crew.missionId} database={localStorage.getItem('foundation-database')??'astronaut-health-v0'}/>}
   <ExercisePanel store={exerciseStore}/>
   <EcgPanel store={ecgStore}/>
   <CollectionPanel store={collectionStore}/>
  </>,
  findings:<>
   <header className="page-head"><p className="eyebrow">05 · Interpretation</p><h2>Findings and follow-ups</h2><p className="lead">One documentable fictional rule, its reasons and the tasks it asks for. Completing a task never clears a finding.</p></header>
   {snapshot.crew&&<WorkflowPanel key={snapshot.crew.astronautId} repository={repository} crewId={snapshot.crew.astronautId}/>}
  </>,
  log:<>
   <header className="page-head"><p className="eyebrow">06 · Record</p><h2>Flight log</h2><p className="lead">Every committed step of the chain, rebuilt from this browser's records. Not a diagnosis, trend or prediction.</p></header>
   <FlightLog snapshot={snapshot} references={references} limit={40} title="All committed events" headingId="log-page-heading"/>
  </>,
  sources:<>
   <header className="page-head"><p className="eyebrow">07 · Evidence</p><h2>Sources, research and limits</h2><p className="lead">What backs each measurement, and what this prototype deliberately does not claim.</p></header>
   <SourcesPanel store={sourcesStore}/>
   <EcgImportPanel store={ecgImportStore}/>
   <details className="card limits"><summary>What this prototype does not do</summary><ul><li>No diagnosis, medical advice, treatment or risk probability.</li><li>No invented clinical thresholds: the one rule is a fictional software demonstration.</li><li>No live sensors or phone measurement; input is manual or file-based.</li><li>No patient-specific anatomy: the atlas is a published reference model.</li><li>No backfilled data: missing, unknown or incompatible readings stay that way.</li></ul></details>
  </>
 };
 return <div className="app">
  <header className="topbar">
   <div className="topbar-inner">
    <a className="brand" href="#main" onClick={event=>{event.preventDefault();go('overview');}}><span className="brand-mark" aria-hidden/>ORBITAL</a>
    <nav className="tabs" aria-label="Workspace sections">{PAGES.map(item=><button type="button" key={item.id} className="tab" aria-current={page===item.id?'page':undefined} onClick={()=>go(item.id)}>{item.label}</button>)}</nav>
    <div className="identity">
     <label className="sr-only" htmlFor="crew-selector">Choose crew</label>
     <select id="crew-selector" value={snapshot.selectedCrewId??''} disabled={busy} onChange={e=>{setNotice('');void store.selectCrew(e.currentTarget.value);}}>{snapshot.profiles.map(crew=><option key={crew.astronautId} value={crew.astronautId}>{crew.alias}</option>)}</select>
     <h1>{snapshot.crew?.alias??'Loading crew'}</h1>
    </div>
   </div>
   <div className="subbar">
    <span className="meta">Mission day {day??'unknown'}</span>
    <span className="meta mono">{clock??'clock unknown'} UTC</span>
    <span className="meta">Follow-up <strong className="state-text" aria-label="Follow-up status">{taskState}</strong></span>
    <span className="meta">{snapshot.mission?.label??'Orbital research scenario'}</span>
    <div className="data-actions"><button type="button" disabled={busy} onClick={()=>void run(async()=>{const snapshot=await repository.export('demo');const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='astronaut-health-demo.json';a.click();URL.revokeObjectURL(url);setNotice('Local data exported.');})}>Export local data</button><label className="restore-label">Open exported copy<input type="file" accept="application/json" disabled={busy} onChange={e=>{const file=e.currentTarget.files?.[0];if(file)void run(async()=>onRestore(JSON.parse(await file.text())));}}/></label></div>
   </div>
   <p className={`status-strip${offlineReady?' ready':''}`}>Simulation — crew readings are authored fiction; no diagnosis or medical advice. <span>{offlineReady?'Available offline after installation':'Offline shell is not ready yet'}</span></p>
  </header>
  {snapshot.switchNotice&&<p className="switch-notice" role="status">{snapshot.switchNotice}</p>}
  {(error||snapshot.error)&&<p className="error" role="alert">{error||snapshot.error?.message}</p>}{notice&&<p className="notice" role="status">{notice}</p>}
  <main id="main" className="page-wrap">
   {PAGES.filter(item=>visited.includes(item.id)).map(item=><div className="page" key={item.id} data-page={item.id} hidden={page!==item.id}>{pageContent[item.id]}</div>)}
  </main>
  <footer><span>Local prototype · all four measurement bundles retained</span><span><a href={`${import.meta.env.BASE_URL}third-party-notices.html`}>Third-party notices</a></span></footer>
 </div>;
}
