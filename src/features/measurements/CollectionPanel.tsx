import {useEffect,useRef,useSyncExternalStore} from 'react';
import type {CollectionStore,CollectionReportView} from '../../shared/view-models/collection';
import type {CollectionDraft} from '../../shared/view-models/collection-draft';
import {collectionGroups,groupLabel,type CollectionGroup} from '../../shared/metrics/collection';
import {metricRegistry} from '../../shared/metrics';
import {measurementBundles,measurementScales} from '../../shared/metrics/bundles';
import type {Observation} from '../../shared/contracts';
const reading=(o:Observation)=>o.value===null?`Missing: ${o.missingReason}`:`${o.value} ${o.unit??''}`;
const outcomeLabel={recorded:'Recorded',missing:'Missing',skipped:'Skipped',device_failed:'Device failed'};
function ReportEvidence({item}:{item:CollectionReportView}){
 const {report:r}=item;
 return <details id={`evidence-${r.reportId}`} className="report-evidence"><summary>{r.type==='ecg'?'ECG':'Echo'} report · {r.originalTime??r.timestamp??'Unknown acquisition date'}</summary>
  <p>{item.source?.name??'Unknown source'} · {r.dataOrigin} · {r.timePrecision} precision{r.timeReason?` · ${r.timeReason}`:''}</p>
  <dl><div><dt>Report identity</dt><dd>{r.reportId}</dd></div><div><dt>Method / device</dt><dd>{r.method} / {r.deviceId??'Unknown'}</dd></div><div><dt>Lead / view / site</dt><dd>{r.lead??'Unknown'} / {r.view??'Unknown'} / {r.site??'Unknown'}</dd></div></dl>
  {item.observations.map(o=><p key={o.observationId}><strong>{metricRegistry[o.metric].label}: {reading(o)}</strong><br/>{o.context} · {o.measurementContext.method??'Unknown method'} · {o.measurementContext.lead??o.measurementContext.view??'Unknown lead/view'}<br/>Quality {o.quality.score??'unknown'} · {o.validation.status} · {o.validation.admission}<br/>Original: {String(o.provenance.originalValue??'missing')} {o.provenance.originalUnit??''} · {o.originalTime??o.timestamp??'Unknown time'}</p>)}
  <details><summary>Retained original report evidence</summary><p>{item.raw?.mediaType??'Unknown format'} · SHA-256 {item.raw?.contentHash??'Unavailable'}</p><pre>{item.raw?.payload??'Original payload unavailable'}</pre></details>
 </details>;
}
/** All inputs delegate to the crew-scoped shared store/capture; no component repository writes. */
export function CollectionPanel({store}:{store:CollectionStore}){
 const s=useSyncExternalStore(store.subscribe,store.getSnapshot),d=s.draft,form=useRef<HTMLFormElement>(null);
 useEffect(()=>{void store.initialize();return()=>store.dispose();},[store]);
 useEffect(()=>{if(s.error)form.current?.querySelector<HTMLElement>('[role="alert"]')?.focus();},[s.error]);
 const reportPath=d.scheduleId.includes('ecg')||d.scheduleId.includes('echo'),unavailable=['skipped','device_failed'].includes(d.outcome),locked=s.busy||!!s.pending||s.loading;
 const patch=(field:keyof CollectionDraft,value:string)=>store.update({[field]:value});
 const selected=s.slots.find(slot=>slot.scheduleId===d.scheduleId),closed=selected?.attempts.at(-1)?.evidence.outcome==='recorded';
 const text=(field:keyof CollectionDraft,label:string,placeholder='')=><label>{label}<input value={String(d[field])} placeholder={placeholder} onChange={e=>patch(field,e.currentTarget.value)}/></label>;
 return <section className="collection-panel" aria-labelledby="collection-heading">
  <div className="history-heading"><div><h2 id="collection-heading">Measurements and collection plan</h2><p>One available acquisition or report at a time. Fictional data only.</p></div><span className="data-badge">Demo only</span></div>
  <div className="collection-body">
   <p>Daily check-in stays above; exercise is recorded per session. The optional plan below is project-authored: seven-day context collection and thirty-day ECG/echo review. It is not a NASA schedule or medical advice.</p>
   <ul className="collection-slots" aria-label="Fictional collection slots">{s.slots.map(slot=><li key={slot.scheduleId}>
    <strong>{slot.label}</strong><span>{slot.slot?`Mission day ${slot.slot.missionDay} · due ${slot.slot.dueAt}`:'Schedule unavailable: mission clock or configuration is unknown'}</span>
    <span>{slot.attempts.length?outcomeLabel[slot.attempts.at(-1)!.evidence.outcome]:'No attempt recorded'}</span>
    {slot.attempts.map(a=><small key={a.raw.rawRecordId}>Attempt {a.evidence.sequence}: {outcomeLabel[a.evidence.outcome]}{a.evidence.reason?` · ${a.evidence.reason}`:''} · reported {a.evidence.time.text||'unknown time'} ({a.evidence.time.precision}) · entered {a.evidence.recordedAt}</small>)}
    <button type="button" disabled={locked||!slot.slot||slot.attempts.at(-1)?.evidence.outcome==='recorded'} onClick={()=>{store.selectSchedule(slot.scheduleId);document.getElementById('collection-outcome')?.focus();}}>Use this collection slot</button>
   </li>)}</ul>
   <form ref={form} onSubmit={e=>{e.preventDefault();void store.save();}} aria-label="Additional measurement capture">
    {s.error&&<p className="error" role="alert" tabIndex={-1}>{s.error.message}</p>}{s.notice&&<p className="notice" role="status">{s.notice}</p>}
    {s.cacheError&&<p className="error" role="alert">Draft cache: {s.cacheError.message} <button type="button" onClick={()=>store.retryCache()}>Retry collection draft cache</button></p>}
    {s.pending&&<p>Retained save awaiting acknowledgement. Retry keeps the same operation and evidence.</p>}
    <fieldset disabled={locked}>
     <div className="capture-grid">
      <label>Collection slot<select value={d.scheduleId} onChange={e=>store.selectSchedule(e.currentTarget.value)}><option value="">Save without a schedule</option>{s.slots.map(slot=><option key={slot.scheduleId} value={slot.scheduleId}>{slot.label}</option>)}</select></label>
      <label>Collection outcome<select id="collection-outcome" value={d.outcome} onChange={e=>patch('outcome',e.currentTarget.value)}><option value="recorded">Recorded acquisition</option><option value="missing">Missing acquisition / report</option><option value="skipped">Skipped collection slot</option><option value="device_failed">Device failed</option></select></label>
      {d.outcome!=='recorded'&&<label>Missing / skip / failure reason<textarea value={d.reason} maxLength={4000} onChange={e=>patch('reason',e.currentTarget.value)}/></label>}
      {d.outcome==='missing'&&d.values.some(v=>v.input)&&<button type="button" onClick={()=>store.update({values:d.values.map(v=>({...v,input:''}))})}>Clear numbers for missing acquisition</button>}
     </div>
     {closed&&<p>This slot is already recorded. Its evidence is retained; choose another slot or save without a schedule.</p>}
     {!reportPath&&!unavailable&&<>
      <label>Measurement group<select value={d.group} onChange={e=>store.selectGroup(e.currentTarget.value as CollectionGroup)}>{Object.keys(collectionGroups).map(g=><option key={g} value={g}>{groupLabel(g as CollectionGroup)}</option>)}</select></label>
      <div className="capture-grid">{d.values.map((v,index)=><div key={v.metric}><label>{metricRegistry[v.metric].label}<input value={v.input} inputMode="decimal" disabled={d.outcome==='missing'} onChange={e=>store.update({values:d.values.map((x,i)=>i===index?{...x,input:e.currentTarget.value}:x)})}/></label><label>Original unit for {metricRegistry[v.metric].label}<select value={v.unit} onChange={e=>store.update({values:d.values.map((x,i)=>i===index?{...x,unit:e.currentTarget.value}:x)})}>{metricRegistry[v.metric].allowedInputUnits.map(unit=><option key={unit}>{unit}</option>)}</select></label></div>)}</div>
      {d.values.slice(0,1).map(v=>{const f=measurementBundles.flatMap(b=>b.fields).find(f=>f.metric===v.metric),scale=measurementScales[v.metric as keyof typeof measurementScales];return <p className="field-guidance" key={v.metric}>{f?.purpose}. {f?.sourcePath}. {f?.missingPath}{scale&&<><br/>{scale.scaleId} v{scale.version}: {scale.low} = {scale.lowLabel}; {scale.high} = {scale.highLabel}</>}</p>;})}
     </>}
     {reportPath&&d.outcome==='recorded'&&<label>Existing {d.scheduleId.includes('ecg')?'ECG':'echo'} report<select value={d.reportId} onChange={e=>patch('reportId',e.currentTarget.value)}><option value="">Choose a retained report</option>{s.reports.filter(r=>r.report.type===(d.scheduleId.includes('ecg')?'ecg':'echo')).map(r=><option key={r.report.reportId} value={r.report.reportId}>{r.report.reportId} · {r.report.originalTime??r.report.timestamp??'Unknown date'}</option>)}</select></label>}
     {reportPath&&d.reportId&&<p>Uses the report's original acquisition date. Review and due dates remain separate. <a href={`#evidence-${d.reportId}`}>Inspect retained report</a></p>}
     {!(reportPath&&d.outcome==='recorded')&&<div className="capture-grid"><label>Measurement time precision<select value={d.precision} onChange={e=>patch('precision',e.currentTarget.value)}><option value="unknown">Unknown</option><option value="date">Calendar date only</option><option value="exact">Exact time with offset</option></select></label>{text('time','Reported measurement date / time','2026-01-10 or 2026-01-10T11:00:00Z')}{text('timeReason','Time precision reason')}</div>}
     {!reportPath&&!unavailable&&<details className="acquisition-fields" open><summary>Reported acquisition context · quality remains unknown</summary><div className="capture-grid">
      <label>Activity context<select value={d.context} onChange={e=>patch('context',e.currentTarget.value)}>{['rest','exercise','sleep','pre_flight','post_flight','unknown'].map(x=><option key={x}>{x}</option>)}</select></label>
      {text('modality','Modality','e.g. dxa, report, thermometer')}{text('device','Device / report identity')}{text('method','Acquisition method','e.g. labeled_mass_report')}{text('protocol','Protocol identity')}{text('posture','Posture')}{text('site','Measurement site')}
      {d.group==='glucose'&&text('meal','Reported meal context')}{d.group==='spo2'&&text('oxygen','Oxygen context')}
      {d.group==='mass'&&<label>Gravity condition<select value={d.gravity} onChange={e=>patch('gravity',e.currentTarget.value)}><option value="">Unknown</option><option value="earth">Earth</option><option value="microgravity">Microgravity</option></select></label>}
      {d.group.startsWith('vo2')&&<label>Result basis<select value={d.basis} onChange={e=>patch('basis',e.currentTarget.value)}><option value="">Unknown</option><option value="measured">Measured</option><option value="estimated">Estimated</option></select></label>}
      {text('interval','Observation interval (seconds, if reported)')}
     </div></details>}
     <label>Acquisition notes<textarea value={d.notes} maxLength={4000} onChange={e=>patch('notes',e.currentTarget.value)}/></label>
    </fieldset>
    <div className="capture-actions"><button className="primary" disabled={s.busy||s.loading||(!s.pending&&closed)} type="submit">{s.pending?'Retry collection save':s.busy?'Saving collection…':'Save collection'}</button><button type="button" disabled={s.busy} onClick={()=>store.reset()}>Reset collection draft</button></div>
   </form>
   <details><summary>Saved additional acquisitions ({s.readings.length})</summary>{s.readings.map(o=><p key={o.observationId}><strong>{metricRegistry[o.metric].label}: {reading(o)}</strong><br/>{o.source.name} · {o.context} · {o.originalTime??o.timestamp??'Unknown time'} ({o.timePrecision})<br/>Original: {String(o.provenance.originalValue??'missing')} {o.provenance.originalUnit??''} · method {o.measurementContext.method??'unknown'} · device {o.measurementContext.deviceId??'unknown'}<br/>Quality unknown · {o.validation.status} · {o.validation.admission}</p>)}</details>
   <h3>Cardiac report evidence</h3><p>Link a report already retained for this crew. New report entry is not available yet.</p>
   {s.reports.length?s.reports.map(item=><ReportEvidence key={item.report.reportId} item={item}/>):<p>No ECG or echo report is retained for this crew. Select a report collection slot and record the missing reason.</p>}
   <details><summary>Collection paths for all four bundles</summary>{measurementBundles.map(b=><div key={b.id}><h3>{b.label}</h3>{b.fields.map(f=><div key={f.metric} className="catalogue-field"><strong>{metricRegistry[f.metric].label} · {f.canonicalUnit??'report'}</strong><p>{f.purpose}<br/>Source: {f.sourcePath}<br/>Methods: {f.collectionMethods.join(', ')} · original units: {f.inputUnits.join(', ')}<br/>Timing: {f.timing}<br/>Unavailable: {f.missingPath}</p>{f.references.map(url=><a key={url} href={url} target="_blank" rel="noreferrer">NASA collection context</a>)}</div>)}</div>)}</details>
  </div>
 </section>;
}
