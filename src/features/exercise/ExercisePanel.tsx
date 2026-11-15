import {useEffect,useRef,useSyncExternalStore} from 'react';
import type {ExerciseStore} from '../../shared/view-models/exercise';
import type {ExerciseCaptureContent} from '../../shared/contracts';
import {metricRegistry} from '../../shared/metrics';
import sample from '../../shared/capture/fixtures/fictional-exercise-v1.csv?raw';
import {measurementScales} from '../../shared/metrics/bundles';
import './exercise.css';
const labels={exercise_duration:'Duration',perceived_exertion:'Perceived effort',exercise_mean_hr:'Mean exercise HR',exercise_peak_hr:'Peak exercise HR',cycling_power:'Cycling power'};
export function ExercisePanel({store}:{store:ExerciseStore}){
 const s=useSyncExternalStore(store.subscribe,store.getSnapshot),errorRef=useRef<HTMLParagraphElement>(null);
 useEffect(()=>{void store.initialize();return()=>store.dispose();},[store]);
 useEffect(()=>{if(s.error)errorRef.current?.focus();},[s.error]);
 const content=s.content,locked=!!s.csv||s.busy||!!s.pending;
 const patch=(p:Partial<ExerciseCaptureContent>)=>store.updateContent(p);
 return <section className="exercise-panel" aria-label="Exercise sessions">
  <div className="exercise-heading"><div><h2>Exercise sessions</h2><p>Log one workout, or preview a fictional CSV to fill it. Resting readings stay in the check-in.</p></div><span className="data-badge">Demo only</span></div>
  <p className="capture-source">Project-authored fictional input. Reported summaries, unknown quality; interpretation pending. Original units, times and source remain attached to each session.</p>
  {s.cacheError&&<div className="cache-error"><p role="alert">{s.cacheError.message}</p><button onClick={()=>store.retryCache()}>Retry exercise draft storage</button></div>}
  {s.error&&<p className="error" role="alert" tabIndex={-1} ref={errorRef}>{s.error.message}</p>}{s.notice&&<p className="notice" role="status">{s.notice}</p>}
  <div className="exercise-import"><label>Exercise CSV<input type="file" accept=".csv,text/csv" disabled={s.busy||!!s.pending} onChange={async e=>{const input=e.currentTarget,file=input.files?.[0],id=s.crewId;if(file){await store.preview(await file.text(),id);input.value='';}}}/></label><button disabled={s.busy||!!s.pending} onClick={()=>void store.preview(sample.replaceAll('crew-a',s.crewId??'crew-a'))}>Preview fictional sample</button>{s.csv&&!s.preview&&!s.error&&<button onClick={()=>void store.preview(s.csv)}>Preview retained CSV</button>}</div>
  {s.preview&&<div className="exercise-preview"><strong>{s.preview.action==='create'?'Preview: one session':s.preview.action==='duplicate'?'Duplicate workout':'Conflicting workout'}</strong><p>{s.preview.message}</p><details><summary>CSV mapping and retained input</summary><p>session_key identifies the workout; crew_id must match the selected crew. Each metric/value/unit/missing_reason row maps through the shared registry. Time precision and reported_time retain their original meaning. Device, posture, protocol and workload stay separate.</p><pre>{s.csv}</pre></details></div>}
  <form onSubmit={e=>{e.preventDefault();void store.save();}}>
   <fieldset disabled={locked||!s.crewId} className="exercise-fields"><legend>Session context</legend><div className="form-grid">
    <label className="input-field">Workout key<input value={content.sessionKey} onChange={e=>patch({sessionKey:e.target.value})}/></label>
    <label className="input-field">Exercise activity<input value={content.activity} onChange={e=>patch({activity:e.target.value})}/></label>
    <label className="input-field">Reported workload<input placeholder="Unknown unless reported" value={content.workload??''} onChange={e=>patch({workload:e.target.value||null})}/></label>
    <label className="input-field">Exercise protocol<input value={content.protocolId} onChange={e=>patch({protocolId:e.target.value})}/></label>
    <label className="input-field">Exercise device or report<input placeholder="Unknown unless reported" value={content.deviceId??''} onChange={e=>patch({deviceId:e.target.value||null})}/></label>
    <label className="input-field">Exercise posture<input placeholder="Unknown unless reported" value={content.posture??''} onChange={e=>patch({posture:e.target.value||null})}/></label>
    <label className="input-field">Exercise time precision<select aria-label="Exercise time precision" value={content.time.precision} onChange={e=>patch({time:{precision:e.target.value as 'exact'|'date'|'unknown',text:'',reason:e.target.value==='unknown'?'Not reported':''}})}><option value="unknown">Unknown</option><option value="date">Calendar date only</option><option value="exact">Exact time with offset</option></select></label>
    <label className="input-field">Exercise reported time<input disabled={content.time.precision==='unknown'} placeholder={content.time.precision==='date'?'YYYY-MM-DD':'ISO time with Z or offset'} value={content.time.text} onChange={e=>patch({time:{...content.time,text:e.target.value}})}/></label>
    <label className="input-field">Exercise time reason<input value={content.time.reason} onChange={e=>patch({time:{...content.time,reason:e.target.value}})}/></label>
   </div></fieldset>
   <fieldset disabled={locked||!s.crewId} className="exercise-fields"><legend>Reported values</legend><p className="input-help">Duration is required for this format. Leave unavailable values explicitly missing. Effort uses fictional-effort v1: {measurementScales.perceived_exertion.low} ({measurementScales.perceived_exertion.lowLabel}) to {measurementScales.perceived_exertion.high} ({measurementScales.perceived_exertion.highLabel}).</p>
    {content.values.map((v,i)=><div className="exercise-value" key={v.metric}>
     <label>{labels[v.metric]} availability<select aria-label={`${labels[v.metric]} availability`} value={v.missingReason?'missing':'value'} disabled={v.metric==='exercise_duration'} onChange={e=>patch({values:content.values.map((x,j)=>j===i?{...x,input:'',missingReason:e.target.value==='missing'?'not reported':null}:x)})}><option value="value">Reported value</option><option value="missing">Missing</option></select></label>
     <label>{labels[v.metric]} value<input inputMode="decimal" disabled={!!v.missingReason} value={v.input} onChange={e=>patch({values:content.values.map((x,j)=>j===i?{...x,input:e.target.value}:x)})}/></label>
     <label>{labels[v.metric]} unit<select aria-label={`${labels[v.metric]} unit`} value={v.unit} onChange={e=>patch({values:content.values.map((x,j)=>j===i?{...x,unit:e.target.value}:x)})}>{metricRegistry[v.metric].allowedInputUnits.map(unit=><option key={unit}>{unit}</option>)}</select></label>
     {v.missingReason&&<label>{labels[v.metric]} missing reason<input value={v.missingReason} onChange={e=>patch({values:content.values.map((x,j)=>j===i?{...x,missingReason:e.target.value||'not reported'}:x)})}/></label>}
    </div>)}
   </fieldset>
   <label className="input-field">Manual session notes<textarea aria-label="Manual session notes" maxLength={4000} disabled={s.busy||!!s.pending} value={s.notes} onChange={e=>store.updateNotes(e.target.value)}/></label>
   <div className="form-actions"><button className="primary" disabled={s.busy||!s.crewId||s.preview?.action==='conflict'||(!!s.csv&&!s.preview)} type="submit">{s.pending?'Retry exercise save':s.preview?.action==='duplicate'?'Confirm duplicate workout':s.preview?'Import previewed exercise':'Save exercise session'}</button><button type="button" disabled={s.busy} onClick={()=>store.resetDraft()}>Start new exercise draft</button></div>
  </form>
  <div className="exercise-retained"><h3>Retained workouts</h3>{s.sessions.length===0&&!s.loading&&<p>No exercise sessions recorded for this crew.</p>}{s.sessions.map(({session,observations,notes})=><article key={session.sessionId} className="retained-session" aria-label={`Workout ${session.sourceSessionId}`}>
   <h4>{session.activity} · {session.sourceSessionId}</h4><p>{session.durationMinutes??'Unknown'} min · Workload: {session.workload??'Unknown'} · Protocol: {session.protocolId}</p>
   <ul>{observations.map(o=><li key={o.observationId}>{metricRegistry[o.metric].label}: {o.value===null?`Unknown (${o.missingReason})`:`${o.value} ${o.unit}`}<small>{o.deliveryMode} · {o.source.name} · {o.originalTime??o.timestamp??'Unknown time'} ({o.timePrecision}) · Original: {String(o.provenance.originalValue??'Missing')} {o.provenance.originalUnit} · Quality: {o.quality.score??'Unknown'} · {o.validation.status}</small></li>)}</ul>
   <p className="session-notes">Notes: {notes.text||'None reported'}</p><button disabled={s.busy||!!s.pending} onClick={()=>store.beginNotes(session.sessionId)}>Edit session notes</button>
   {notes.history.length>0&&<details><summary>Note history ({notes.history.length})</summary><ul>{notes.history.map(n=><li key={n.rawRecordId}>{n.recordedAt}: {n.text||'Notes cleared'}</li>)}</ul></details>}
  </article>)}</div>
  {s.edit&&<form className="exercise-note-editor" onSubmit={e=>{e.preventDefault();void store.save('note');}}><label className="input-field">Retained session notes<textarea aria-label="Retained session notes" maxLength={4000} disabled={s.busy||!!s.pending} value={s.edit.text} onChange={e=>store.editNotes(e.target.value)}/></label><button className="primary" disabled={s.busy}>Save session notes</button><p className="input-help">A note edit retains earlier notes and does not change imported measurements. Empty text records a clear action.</p></form>}
 </section>;
}
