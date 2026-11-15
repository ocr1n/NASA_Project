import {useRef} from 'react';
import type {CrewSnapshot,SelectedCrewStore} from '../../shared/view-models';
import type {CheckInDraft} from '../../shared/view-models/check-in-draft';
import {checkInScales} from '../../shared/metrics/check-in';
import './check-in.css';

interface Props {snapshot:CrewSnapshot;store:SelectedCrewStore}
const statusOptions=[['value','Value provided'],['skipped','Skipped'],['unknown','Unknown'],['device_issue','Device issue']];
const fieldForError:Record<string,string>={heart_rate:'heartRate',sleep_duration:'sleepDuration',time:'measuredTime',fatigue_rating:'fatigue',mood_rating:'mood',stress_rating:'stress',body_height:'height',body_mass:'mass','body_height:time':'profileDate','body_mass:time':'profileDate','body_height:method':'profileMethod','body_mass:method':'profileMethod','body_mass:gravity':'gravity'};
export function CheckInForm({snapshot:s,store}:Props){
 const d=s.draft,error=s.captureError,feedback=useRef<HTMLParagraphElement>(null);
 const set=(key:keyof CheckInDraft,value:string)=>store.updateDraft({[key]:value});
 const field=(key:keyof CheckInDraft,label:string,metric='',placeholder='',numeric=false)=>{const invalid=!!error&&(fieldForError[error.path]===key||error.path===metric);return <div className="input-field"><label htmlFor={`checkin-${key}`}>{label}</label><input id={`checkin-${key}`} value={d[key]} inputMode={numeric?'decimal':'text'} maxLength={4096} placeholder={placeholder} aria-invalid={invalid||undefined} aria-describedby={invalid?`error-${key}`:undefined} onChange={e=>set(key,e.currentTarget.value)}/>{invalid&&<small id={`error-${key}`} className="field-error">{error!.message}</small>}</div>;};
 const select=(key:keyof CheckInDraft,label:string,options:readonly (readonly string[])[])=><div className="input-field"><label htmlFor={`checkin-${key}`}>{label}</label><select id={`checkin-${key}`} value={d[key]} onChange={e=>{const value=e.currentTarget.value;if(key==='heartRateStatus')store.updateDraft({heartRateStatus:value,...value!=='value'?{heartRate:''}:{}});else if(key==='sleepStatus')store.updateDraft({sleepStatus:value,...value!=='value'?{sleepDuration:''}:{}});else set(key,value);}}>{options.map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></div>;
 async function submit(){
  if(await store.saveCheckIn())return;
  const path=store.getSnapshot().captureError?.path??'',key=fieldForError[path];
  const target=(key?document.getElementById(`checkin-${key}`):null)??feedback.current;
  if(target){for(let ancestor=target.parentElement;ancestor;ancestor=ancestor.parentElement)if(ancestor instanceof HTMLDetailsElement)ancestor.open=true;target.focus();}
 }
 return <section className="check-in-panel" aria-labelledby="checkin-heading">
  <div className="check-in-toolbar"><p className="capture-source">Fictional input · manual entry · quality and interpretation stay explicit</p><span className="draft-badge">{s.busy?'Saving…':s.dirty?'Unsaved draft':'Ready for input'}</span></div>
  {error&&<p className="error" role="alert" tabIndex={-1} ref={feedback}>{error.message} Your draft is retained.</p>}
  {s.captureNotice&&<p className="notice" role="status">{s.captureNotice}</p>}
  {s.cacheError&&<div className="cache-error"><p role="alert">Draft storage needs attention: {s.cacheError.message} Edits remain in memory; reload may lose them.</p><button onClick={()=>store.retryDraftCache()}>Retry draft storage</button></div>}
  <form onSubmit={e=>{e.preventDefault();void submit();}} noValidate>
   <fieldset disabled={s.busy||s.loading}>
    <legend className="sr-only">Check-in for {s.crew?.alias??'selected crew'}</legend>
    <div className="measurement-grid">
     <div className="measurement-input"><h3>Heart rate</h3>{select('heartRateStatus','Heart rate availability',statusOptions)}{d.heartRateStatus==='value'&&field('heartRate','Heart rate (bpm)','heart_rate','Reported value',true)}{select('hrContext','Heart rate context',[['unknown','Context unknown'],['rest','Taken at rest'],['exercise','After or during exercise']])}</div>
     <div className="measurement-input"><h3>Sleep</h3>{select('sleepStatus','Sleep availability',statusOptions)}{d.sleepStatus==='value'&&<>{field('sleepDuration',`Sleep duration (${d.sleepUnit==='h'?'hours':'minutes'})`,'sleep_duration','Reported duration',true)}{select('sleepUnit','Sleep input unit',[['h','Hours'],['min','Minutes']])}</>}<p className="input-help">Self-reported duration within the preceding 24-hour interval. Missing stays missing.</p></div>
    </div>
    <div className="form-grid time-inputs">{select('timePrecision','Reported time precision',[['unknown','Time unknown'],['date','Calendar date only'],['exact','Exact time with offset']])}{d.timePrecision!=='unknown'?field('measuredTime',d.timePrecision==='date'?'Reported date':'Measured time with offset','time',d.timePrecision==='date'?'2026-01-10':'2026-01-10T12:00:00Z'):field('timeReason','Reason time is unknown')}</div>
    <div className="field-quick"><button type="button" onClick={()=>store.updateDraft({timePrecision:'exact',measuredTime:s.mission?.scenarioClock??''})}>Use the scenario clock</button><button type="button" onClick={()=>store.updateDraft({timePrecision:'unknown',measuredTime:'',timeReason:'Not reported'})}>Time unknown</button></div>
    <p className="input-help">Measurement time belongs to the fictional scenario; entry time is recorded separately. An exact time needs Z or its reported offset.</p>
    <details className="form-details"><summary>Acquisition and confidence</summary><div className="form-grid">{field('device','Device or report identifier','','Fictional device or report')}{select('posture','Reported posture',[['unknown','Posture unknown'],['seated','Seated'],['standing','Standing'],['supine','Supine']])}{select('confidence','Signal quality',[['unknown','Quality unknown'],['low','Low confidence'],['fictional_passed','Fictional passed quality check']])}</div><p className="input-help">The passed check is a demo parameter. It is not independent acquisition evidence or clinical validation.</p></details>
    <details className="form-details"><summary>Optional fatigue, mood and stress</summary><p className="input-help">Three distinct fictional scales, version 1. Leave blank to omit; zero is a reported answer. No clinical interpretation.</p><div className="form-grid">{([['fatigue','fatigue_rating','Fatigue'],['mood','mood_rating','Mood'],['stress','stress_rating','Stress']] as const).map(([key,metric,label])=>{const scale=checkInScales[metric]!;return <div key={key}>{field(key,`${label} (fictional 0–4)`,metric,'Optional',true)}<p className="input-help">{scale.scaleId} v{scale.version}: {scale.low} = {scale.lowLabel}; {scale.high} = {scale.highLabel}.</p></div>;})}</div></details>
    <details className="form-details"><summary>Optional dated profile context</summary><p className="input-help">Record a reported measurement and acquisition method. These values do not personalize the reference anatomy. In microgravity an ordinary Earth scale cannot establish mass.</p><div className="form-grid">{field('height','Reported height (cm)','body_height','Optional',true)}{field('mass','Reported mass (kg)','body_mass','Optional',true)}{field('profileDate','Profile measurement date','','YYYY-MM-DD')}{field('profileMethod','Profile acquisition method','','Report or appropriate measurement method')}{field('gravity','Mass gravity/device context','','Reported gravity and appropriate mass device')}</div></details>
    <div className="input-field"><label htmlFor="checkin-notes">Optional notes</label><textarea id="checkin-notes" rows={2} maxLength={4096} value={d.notes} onChange={e=>set('notes',e.currentTarget.value)}/></div>
    <div className="form-actions"><button className="primary" type="submit">{s.busy?'Saving check-in…':error?'Retry check-in':'Save check-in'}</button><button type="button" onClick={()=>store.resetDraft()}>Reset draft</button></div>
   </fieldset>
  </form>
 </section>;
}
