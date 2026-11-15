import {useEffect,useState,useSyncExternalStore} from 'react';
import type {BaselineStore,BaselineSnapshot,BaselineConfig} from '../../shared/view-models/baselines';
import type {Observation} from '../../shared/contracts';
import {metricRegistry} from '../../shared/metrics';
import './baselines.css';

const methodNames={preflight_median:'Fixed preflight median',preflight_anchor:'Dated exam anchor',mission_rolling:'Separate rolling reference'};
const date=(o:Observation)=>`${o.originalTime??o.timestamp??'Date unknown'} · ${o.timePrecision} precision`;
const number=(n:number|null)=>n===null?'Unavailable':new Intl.NumberFormat('en',{maximumSignificantDigits:7}).format(n);
const reason=(value:string)=>value.replaceAll('_',' ');

export function BaselinePanel({store}:{store:BaselineStore}){
 const snapshot=useSyncExternalStore(store.subscribe,store.getSnapshot);
 useEffect(()=>{void store.initialize();},[store]);
 return <section className="baseline-panel" aria-labelledby="computed-reference-heading">
  <div className="baseline-heading"><div><h2 id="computed-reference-heading">Computed personal references</h2><p>Inspect a fixed preflight reference, a dated exam or a separate rolling window.</p></div><span className="data-badge">Demo only</span></div>
  <p className="baseline-scope">Descriptive calculations from fictional readings. Support counts and quality settings are demo configuration; medical interpretation is unavailable.</p>
  {snapshot.config?<ReferenceContent key={snapshot.crewId} snapshot={snapshot} store={store}/>:<><p role={snapshot.error?'alert':'status'}>{snapshot.error?.message??'Loading this crew’s recorded references.'}</p>{snapshot.error&&<button type="button" onClick={()=>void store.recompute()}>Retry recorded references</button>}</>}
 </section>;
}

function ReferenceContent({snapshot:s,store}:{snapshot:BaselineSnapshot;store:BaselineStore}){
 const [saveReason,setSaveReason]=useState(''),[exclusionReason,setExclusionReason]=useState('');
 const c=s.config!,b=s.calculation?.baseline,d=s.calculation?.detail;
 const observations=s.observations.filter(o=>o.metric===c.metric&&o.valueKind==='number');
 const anchors=observations.filter(o=>o.measurementContext.missionPhase==='preflight');
 const locked=s.busy||s.pending;
 const configure=(patch:Partial<BaselineConfig>)=>{void store.configure(patch);};
 return <>
  <fieldset className="baseline-controls" disabled={locked}><legend>Reference configuration</legend>
   <label>Reference metric<select value={c.metric} onChange={e=>configure({metric:e.currentTarget.value as Observation['metric']})}>{Object.entries(metricRegistry).filter(([,m])=>m.valueKinds.includes('number')).map(([metric,m])=><option key={metric} value={metric}>{m.label}</option>)}</select></label>
   <label>Reference method<select value={c.method} onChange={e=>configure({method:e.currentTarget.value as BaselineConfig['method']})}>{Object.entries(methodNames).map(([method,label])=><option key={method} value={method}>{label}</option>)}</select></label>
   <label className="baseline-wide">Current measurement / acquisition<select value={c.selectorObservationId} onChange={e=>configure({selectorObservationId:e.currentTarget.value})}>{!observations.length&&<option value="unavailable-selection">No recorded acquisition</option>}{observations.map(o=><option key={o.observationId} value={o.observationId}>{metricRegistry[o.metric].label}: {number(typeof o.value==='number'?o.value:null)} {o.unit} · {o.originalTime??o.timestamp??'Date unknown'} · {o.observationId}</option>)}</select></label>
   {c.method==='preflight_anchor'?<label className="baseline-wide">Preflight exam anchor<select value={c.anchorObservationId} onChange={e=>configure({anchorObservationId:e.currentTarget.value})}>{!anchors.length&&<option value="unavailable-anchor">No recorded preflight exam</option>}{anchors.map(o=><option key={o.observationId} value={o.observationId}>{date(o)} · {o.measurementContext.method??'Method unknown'} · {o.observationId}</option>)}</select></label>:<>
    <label>Reference window start (UTC)<input value={c.from} placeholder="YYYY-MM-DDTHH:mm:ssZ" onChange={e=>configure({from:e.currentTarget.value})}/></label>
    <label>Reference window end, exclusive (UTC)<input value={c.to} placeholder="YYYY-MM-DDTHH:mm:ssZ" onChange={e=>configure({to:e.currentTarget.value})}/></label>
    <label className="baseline-wide">Cadence seconds (optional demo configuration)<input type="number" min="1" step="any" value={c.cadenceSeconds??''} placeholder="Unknown" onChange={e=>configure({cadenceSeconds:e.currentTarget.value===''?null:Number(e.currentTarget.value)})}/></label>
    <p className="baseline-wide baseline-help">Suggested bounds use recorded event dates. Edit them to choose the reference window; the current acquisition and its copies are excluded.</p>
   </>}
  </fieldset>
  {s.error&&<p className="baseline-error" role="alert">{s.error.message}</p>}
  {s.notice&&<p className="baseline-notice" role="status">{s.notice}</p>}
  {s.loading?<p role="status">Calculating from committed readings…</p>:b&&d?<>
   <div className="baseline-result"><div><h3>{methodNames[b.method]}</h3><p className="baseline-value">{b.center===null?'Reference unavailable':`${number(b.center)} ${b.unit}`}</p><p>{b.status==='available'?`${b.sampleCount} ${b.sampleCount===1?'sample':'samples'} included`:reason(b.status)}</p></div>
    <dl><div><dt>Spread</dt><dd>{b.method==='preflight_anchor'?'Single exam: variability is unavailable.':b.spread===null?'Unavailable':`${number(b.spread)} ${b.unit} · raw MAD`}</dd></div><div><dt>Coverage</dt><dd>{d.coverage===null?'Coverage unknown — cadence not supplied.':`${number(d.coverage*100)}% of expected slots`}</dd></div><div><dt>Recorded interval</dt><dd>{b.window.precision==='date'?'Calendar date only — see input evidence':b.window.from?`${b.window.from} to ${b.window.to}`:'Unavailable'}</dd></div></dl>
   </div>
   {b.reasons.length>0&&<ul className="baseline-reasons">{b.reasons.map(r=><li key={r}>{reason(r)}</li>)}</ul>}
   {s.comparison&&<div className="baseline-comparison"><h3>Change from this reference</h3>{s.comparison.availability==='available'?<p>{s.comparison.percentagePointDelta!==null?`${number(s.comparison.percentagePointDelta)} percentage points`:`${number(s.comparison.absoluteDelta)} ${b.unit}`}{s.comparison.relativeDelta!==null&&` · ${number(s.comparison.relativeDelta*100)}% relative change`}</p>:<p>Comparison unavailable: {s.comparison.reasons.map(reason).join('; ')}</p>}</div>}
   <details className="baseline-evidence"><summary>Inspect reference inputs</summary><p>Included measurements and every excluded candidate retain their dates, acquisition context and original source.</p>
    <label>Reason for excluding an input<input value={exclusionReason} maxLength={4000} onChange={e=>setExclusionReason(e.currentTarget.value)} disabled={locked}/></label>
    <ul>{s.inputs.map(({observation:o,included,reason:r})=><li key={o.observationId}><div className="baseline-input-title"><strong>{o.observationId}</strong><span>{included?'Included':`Excluded: ${r?reason(r):'not selected'}`}</span></div><p>{number(typeof o.value==='number'?o.value:null)} {o.unit} · {date(o)}</p><p>{o.source.name} · {o.source.sourceId} · {o.source.version}<br/>{o.measurementContext.modality??'Modality unknown'} · {o.measurementContext.method??'Method unknown'} · {o.measurementContext.deviceId??'Device unknown'}<br/>Protocol: {o.measurementContext.protocolId??'Unknown'} · {o.measurementContext.missionPhase??'Phase unknown'}</p><p className="baseline-id">Raw evidence: {o.provenance.rawRecordId}</p>
     <p>Activity: {o.context} · Posture: {o.measurementContext.posture??'Unknown'}<br/>Lead: {o.measurementContext.lead??'Unknown'} · View: {o.measurementContext.view??'Unknown'}<br/>Site: {o.measurementContext.site??'Unknown'} · Side: {o.measurementContext.laterality??'Unknown'}</p>
     <button type="button" disabled={locked||!c.exclusions.some(e=>e.observationId===o.observationId)&&!exclusionReason.trim()} onClick={()=>configure({exclusions:c.exclusions.some(e=>e.observationId===o.observationId)?c.exclusions.filter(e=>e.observationId!==o.observationId):[...c.exclusions,{observationId:o.observationId,reason:exclusionReason.trim()}]})}>{c.exclusions.some(e=>e.observationId===o.observationId)?'Remove explicit exclusion':'Exclude from reference'}</button>
    </li>)}</ul>
    <p>Minimum support: {d.policy.minimumSamples} independent acquisitions; spread support: {d.policy.minimumSpreadSamples}. Quality score minimum: {d.policy.minimumQualityScore} (fictional configuration).</p>
    <ul>{d.uncertainty.map(r=><li key={r}>{reason(r)}</li>)}</ul><p className="baseline-id">Calculation: {b.algorithmVersion} · {d.inputHash}</p>
   </details>
  </>:<p className="baseline-unavailable">{s.unavailableReason??'Reference unavailable. Check acquisition context and the reference window.'}</p>}
  <div className="baseline-save"><label>Reason for saving reference<input value={saveReason} maxLength={4000} onChange={e=>setSaveReason(e.currentTarget.value)} disabled={locked}/></label><div className="baseline-actions"><button type="button" disabled={s.busy||s.loading||!s.pending&&(!b||!saveReason.trim())} onClick={()=>void store.save(saveReason)}>{s.busy?'Saving reference…':s.pending?'Retry same reference save':'Save reference'}</button><button type="button" disabled={s.busy} onClick={()=>void store.recompute()}>Recompute from recorded inputs</button></div><p>Saving appends calculation evidence. Existing fixed references remain intact.</p></div>
  <details className="baseline-history"><summary>Saved calculation history ({s.history.length})</summary>{s.history.length?<ol>{s.history.map(({raw,evidence:e})=><li key={raw.rawRecordId}><h3>{metricRegistry[e.computation.baseline.metric].label} · {methodNames[e.computation.baseline.method]}</h3><p>{e.reason}</p><p>{number(e.computation.baseline.center)} {e.computation.baseline.unit} · {e.computation.baseline.sampleCount} samples · version {e.sequence}<br/>Saved: {e.savedAt}<br/>Coverage: {e.computation.detail.coverage===null?'Unknown':`${number(e.computation.detail.coverage*100)}%`}</p><p className="baseline-id">Evidence: {raw.rawRecordId}<br/>Prior version: {e.previousRawRecordId??'None'}</p></li>)}</ol>:<p>No computed reference has been saved for this crew.</p>}</details>
 </>;
}
