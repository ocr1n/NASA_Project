import type {CrewSnapshot} from '../../shared/view-models';
import {selectLogEvents,MISSION_DAYS,type MissionProgress as Progress,type SavedReference} from '../../shared/view-models/mission';
import {selectMissionProgress} from '../../shared/view-models/mission';
import './mission.css';

const STATE_LABEL = {capture: 'Capture', reference: 'Reference', finding: 'Finding', task: 'Follow-up'} as const;

/** Overview card: scenario day, honest recording streak, milestones and the next objective. */
export function MissionProgress({snapshot,references}: {snapshot: CrewSnapshot; references: SavedReference[]}) {
  const p: Progress = selectMissionProgress(snapshot, references);
  const earned = p.milestones.filter(m => m.earned).length;
  const percent = p.day === null ? 0 : Math.max(0, Math.min(1, p.day / MISSION_DAYS));
  const state = p.task?.state === 'completed' ? 'Completed' : p.task ? 'Due' : 'Loading';
  return <section className="card progress-card" aria-labelledby="mission-progress-heading">
    <div className="card-head">
      <div><h2 id="mission-progress-heading">Mission progress</h2><p>Recording milestones, not a health score.</p></div>
      <span className="meta">{earned}/{p.milestones.length} earned</span>
    </div>
    <div className="progress-body">
      <div className="dial-wrap">
        <svg className="dial" viewBox="0 0 120 120" role="img" aria-label={`Scenario day ${p.day ?? 'unknown'} of ${MISSION_DAYS}`}>
          <circle className="dial-track" cx="60" cy="60" r="52"/>
          <circle className="dial-value" cx="60" cy="60" r="52" pathLength="100" style={{strokeDasharray: `${percent * 100} 100`}}/>
          <text className="dial-day" x="60" y="58">{p.day ?? '—'}</text>
          <text className="dial-caption" x="60" y="76">OF {MISSION_DAYS} DAYS</text>
        </svg>
        <p className="dial-note"><strong>{p.streak}</strong> {p.streak === 1 ? 'day' : 'days'} recorded in a row</p>
      </div>
      <div className="week-strip">
        <span className="meta">Last seven scenario days</span>
        <ol className="week" aria-label="Last seven scenario days">{p.week.map((slot, index) => <li key={slot.date ?? `slot-${index}`} className={slot.recorded ? 'on' : undefined} data-today={slot.today || undefined}>
          <span aria-hidden>{slot.recorded ? '●' : '○'}</span><small>{slot.date?.slice(8) ?? '—'}</small>
          <span className="sr-only">{slot.date ?? 'unknown date'}: {slot.recorded ? 'check-in recorded' : 'no check-in'}</span>
        </li>)}</ol>
      </div>
    </div>
    <div className="objective">
      <span className="meta">Next objective</span>
      <strong className="objective-state">{state}</strong>
      <p>{p.task?.explanation ?? 'Committed follow-up state is loading.'}</p>
    </div>
    <ul className="milestones">{p.milestones.map(m => <li key={m.id} className={m.earned ? 'earned' : undefined}>
      <span className="check" aria-hidden>{m.earned ? '✓' : '·'}</span>
      <span><strong>{m.label}</strong><small>{m.earned ? 'Earned' : m.hint}</small></span>
      <span className="sr-only">{m.earned ? 'earned' : 'not earned'}</span>
    </li>)}</ul>
  </section>;
}

/** The connected chain, rebuilt from committed local records. */
export function FlightLog({snapshot,references,limit,title='Flight log',headingId='log-heading'}: {snapshot: CrewSnapshot; references: SavedReference[]; limit: number; title?: string; headingId?: string}) {
  const events = selectLogEvents(snapshot, references).slice(0, limit);
  return <section className="card log-card" aria-labelledby={headingId}>
    <div className="card-head"><div><h2 id={headingId}>{title}</h2><p>Capture → reference → finding → follow-up, with evidence kept.</p></div></div>
    {events.length
      ? <ol className="log-list">{events.map(e => <li key={e.id} className={`log-${e.kind}`}>
          <span className="log-dot" aria-hidden/>
          <div><span className="meta">{STATE_LABEL[e.kind]}</span><strong>{e.title}</strong><small>{e.detail}</small></div>
          <time dateTime={e.at}>{e.at.slice(0, 16).replace('T', ' ')}<small>UTC</small></time>
        </li>)}</ol>
      : <p className="empty">Nothing committed yet. Save a daily check-in and its chain appears here.</p>}
  </section>;
}
