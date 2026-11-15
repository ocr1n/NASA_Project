import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {EcgStore} from '../../shared/view-models/ecg';
import type {EcgCaptureContent} from '../../shared/contracts';
import {ecgLabels} from '../../shared/contracts/ecg';
import {metricRegistry} from '../../shared/metrics';
import './ecg.css';

export function EcgPanel({store}:{store:EcgStore}){
 const s=useSyncExternalStore(store.subscribe,store.getSnapshot),[open,setOpen]=useState(false),errorRef=useRef<HTMLParagraphElement>(null);
 useEffect(()=>{void store.initialize();return()=>store.dispose();},[store]);
 useEffect(()=>{if(s.error){setOpen(true);errorRef.current?.focus();}},[s.error]);
 const c=s.content,locked=s.busy||!!s.pending,patch=(p:Partial<EcgCaptureContent>)=>store.updateContent(p);
 const optional=(v:string)=>v||null;
 return <section className="ecg-panel" aria-label="ECG reports">
  <div className="ecg-heading"><div><h2>ECG reports</h2><p>Keep one examination with its reported method, lead setup and date.</p></div><span className="data-badge">Demo only</span></div>
  <p className="capture-source">Project-authored fictional input. Premeasured numbers retain their original units. Signal quality is unknown; interpretation is unavailable.</p>
  {s.cacheError&&<div className="cache-error"><p role="alert">{s.cacheError.message}</p><button onClick={()=>store.resetCache()}>Retry ECG draft storage</button><button onClick={()=>store.resetDraft()}>Reset ECG draft</button></div>}
  {s.error&&<p role="alert" className="error" tabIndex={-1} ref={errorRef}>{s.error.message}</p>}
  {s.notice&&<p role="status" className="notice">{s.notice}</p>}
  <button type="button" aria-expanded={open} aria-controls="ecg-entry" onClick={()=>setOpen(!open)}>{open?'Close ECG entry':s.pending?'Open pending ECG save':'Enter numerical ECG report'}</button>
  <div id="ecg-entry" hidden={!open}>
   <form onSubmit={e=>{e.preventDefault();void store.save();}} noValidate>
    <fieldset className="ecg-fields" disabled={locked||!s.crewId}><legend>Examination context</legend><div className="form-grid">
     <label className="input-field">ECG report key<input aria-label="ECG report key" maxLength={128} value={c.reportKey} onChange={e=>patch({reportKey:e.target.value})}/><small>Use the same key only when re-entering the same report.</small></label>
     <label className="input-field">ECG lead setup<input maxLength={200} placeholder="As stated on the report" value={c.lead} onChange={e=>patch({lead:e.target.value})}/></label>
     <label className="input-field">ECG measurement method<input maxLength={200} placeholder="Named report method or algorithm" value={c.method} onChange={e=>patch({method:e.target.value})}/></label>
     <label className="input-field">ECG device<input maxLength={200} placeholder="Unknown unless reported" value={c.deviceId??''} onChange={e=>patch({deviceId:optional(e.target.value)})}/></label>
     <label className="input-field">ECG protocol<input maxLength={200} placeholder="Unknown unless reported" value={c.protocolId??''} onChange={e=>patch({protocolId:optional(e.target.value)})}/></label>
     <label className="input-field">ECG posture<input maxLength={200} placeholder="Unknown unless reported" value={c.posture??''} onChange={e=>patch({posture:optional(e.target.value)})}/></label>
     <label className="input-field">ECG context<select aria-label="ECG context" value={c.context} onChange={e=>patch({context:e.target.value as EcgCaptureContent['context']})}>{['unknown','rest','exercise','sleep','eva','launch','landing','pre_flight','post_flight'].map(v=><option key={v} value={v}>{v.replaceAll('_',' ')}</option>)}</select></label>
     <label className="input-field">ECG mission phase<select aria-label="ECG mission phase" value={c.missionPhase} onChange={e=>patch({missionPhase:e.target.value as EcgCaptureContent['missionPhase']})}>{['unknown','preflight','inflight','postflight'].map(v=><option key={v}>{v}</option>)}</select></label>
     <label className="input-field">ECG time precision<select aria-label="ECG time precision" value={c.time.precision} onChange={e=>patch({time:{precision:e.target.value as 'exact'|'date'|'unknown',text:'',reason:e.target.value==='unknown'?'Not reported':''}})}><option value="unknown">Unknown</option><option value="date">Calendar date only</option><option value="exact">Exact time with offset</option></select></label>
     <label className="input-field">ECG reported time<input disabled={c.time.precision==='unknown'} placeholder={c.time.precision==='date'?'YYYY-MM-DD':'ISO time with Z or offset'} value={c.time.text} onChange={e=>patch({time:{...c.time,text:e.target.value}})}/></label>
     <label className="input-field">ECG time reason<input value={c.time.reason} onChange={e=>patch({time:{...c.time,reason:e.target.value}})}/></label>
    </div></fieldset>
    <fieldset className="ecg-fields" disabled={locked||!s.crewId}><legend>Reported numbers</legend><p className="input-help">Enter values exactly as reported, or keep an explicit missing reason. A single report is an examination reference, not a baseline distribution.</p>
     {c.values.map((v,i)=>{const label=ecgLabels[v.metric];return <div className="ecg-value" key={v.metric}>
      <label>{label} availability<select aria-label={`${label} availability`} value={v.missingReason?'missing':'value'} onChange={e=>patch({values:c.values.map((x,j)=>j===i?{...x,input:'',missingReason:e.target.value==='missing'?'not reported':null}:x)})}><option value="value">Reported value</option><option value="missing">Missing</option></select></label>
      <label>{label} value<input inputMode="decimal" maxLength={200} disabled={!!v.missingReason} value={v.input} onChange={e=>patch({values:c.values.map((x,j)=>j===i?{...x,input:e.target.value}:x)})}/></label>
      <label>{label} unit<select aria-label={`${label} unit`} value={v.unit} onChange={e=>patch({values:c.values.map((x,j)=>j===i?{...x,unit:e.target.value}:x)})}>{metricRegistry[v.metric].allowedInputUnits.map(unit=><option key={unit}>{unit}</option>)}</select></label>
      {v.missingReason&&<label>{label} missing reason<input maxLength={2000} value={v.missingReason} onChange={e=>patch({values:c.values.map((x,j)=>j===i?{...x,missingReason:e.target.value||'not reported'}:x)})}/></label>}
     </div>;})}
     <div className="form-grid ecg-methods">
      <label className="input-field">QTc correction method<input maxLength={200} placeholder="Required when QTc is reported" value={c.qtcCorrection??''} onChange={e=>patch({qtcCorrection:optional(e.target.value)})}/></label>
      <label className="input-field">ECG HRV method<input maxLength={200} placeholder="Required for SDNN or RMSSD" value={c.hrvMethod??''} onChange={e=>patch({hrvMethod:optional(e.target.value)})}/></label>
      <label className="input-field">ECG HRV duration in seconds<input type="number" min="0" step="any" value={c.windowSeconds??''} onChange={e=>patch({windowSeconds:e.target.value?Number(e.target.value):null})}/></label>
      <label className="input-field">ECG HRV artifact handling<input maxLength={200} placeholder="As stated on the report" value={c.artifactHandling??''} onChange={e=>patch({artifactHandling:optional(e.target.value)})}/></label>
     </div><p className="input-help">HRV retains its own method and window. Entering a duration does not establish adequate signal quality or comparability.</p>
    </fieldset>
    <label className="input-field">Reported ECG quality notes<textarea aria-label="Reported ECG quality notes" maxLength={2000} disabled={locked} value={c.qualityNotes} onChange={e=>patch({qualityNotes:e.target.value})}/></label>
    <div className="form-actions"><button className="primary" disabled={s.busy||!s.crewId} type="submit">{s.pending?'Retry ECG save':'Save ECG report'}</button><button disabled={s.busy} type="button" onClick={()=>store.resetDraft()}>Start new ECG draft</button></div>
   </form>
  </div>
  <div className="ecg-retained"><h3>Retained ECG examinations</h3>{!s.loading&&!s.reports.length&&<p>No ECG report is retained for this crew. Enter a numerical report to add an examination.</p>}
   {s.reports.map(({report:r,observations,evidence:e})=><article className="ecg-report" key={r.reportId} aria-label={`ECG report ${e?.content.reportKey??r.reportId}`}>
    <h4>{e?.content.reportKey??'Fictional reference examination'}</h4><p>{r.originalTime??r.timestamp??'Unknown exam time'} ({r.timePrecision}){r.timeReason?` — ${r.timeReason}`:''}</p>
    <dl className="ecg-context"><div><dt>Lead</dt><dd>{r.lead??'Unknown'}</dd></div><div><dt>Method</dt><dd>{r.method}</dd></div><div><dt>Device</dt><dd>{r.deviceId??'Unknown'}</dd></div><div><dt>Phase</dt><dd>{e?.content.missionPhase??'Fixture context'}</dd></div></dl>
    {e&&<p className="input-help">Signal quality: Unknown. Reported quality notes: {e.content.qualityNotes||'Not reported'}</p>}
    <details><summary>Reported values and provenance ({observations.length})</summary><ul>{observations.map(o=><li key={o.observationId}>{ecgLabels[o.metric as keyof typeof ecgLabels]??metricRegistry[o.metric].label}: {o.value===null?`Unknown (${o.missingReason})`:`${o.value} ${o.unit}`}<small>Original: {String(o.provenance.originalValue??'Missing')} {o.provenance.originalUnit} · {o.source.name} · Quality: {o.quality.score??'Unknown'}{o.quality.score!==null?' (fictional fixture)':''} · {o.validation.status}</small><small>Method: {o.measurementContext.method??'Unknown'} · Protocol: {o.measurementContext.protocolId??'Unknown'}{o.metric.startsWith('hrv_')?` · Window: ${o.measurementContext.windowSeconds??'Unknown'} s · Artifact handling: ${o.measurementContext.artifactHandling??'Unknown'}`:''}{o.metric==='ecg_qtc'?` · Correction: ${o.measurementContext.qtcCorrection??'Unknown'}`:''}</small></li>)}</ul></details>
   </article>)}
  </div>
 </section>;
}
