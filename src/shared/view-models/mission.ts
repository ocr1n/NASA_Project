import type {CrewSnapshot} from './index';
import type {Repository} from '../repositories/repository';
import {BASELINE_MEDIA,baselineEvidence} from '../contracts/baselines';
import {checkInSchedule} from '../metrics/check-in';
import {missionDay} from '../contracts/clock';

/** Derived mission progress. Nothing here is a health score: milestones count committed records. */
export const MISSION_DAYS = 30;

export interface SavedReference {
  baselineId: string;
  savedAt: string;
  metric: string;
  method: string;
  sampleCount: number;
  center: number | null;
  unit: string;
}

/** Saved personal references come from their immutable baseline evidence, scoped to one crew. */
export async function selectSavedReferences(repo: Repository, crewId: string): Promise<SavedReference[]> {
  const {records} = await repo.export('demo');
  const saved: SavedReference[] = [];
  for (const raw of records) {
    if (raw.recordType !== 'RawRecord' || raw.mediaType !== BASELINE_MEDIA) continue;
    let evidence;
    try { evidence = baselineEvidence(raw); } catch { continue; }
    const computation = evidence.computation;
    const savedAt = evidence.savedAt;
    if (computation.baseline.astronautId !== crewId || !savedAt) continue;
    saved.push({
      baselineId: computation.baseline.baselineId,
      savedAt,
      metric: computation.baseline.metric,
      method: computation.baseline.method,
      sampleCount: computation.baseline.sampleCount,
      center: computation.baseline.center,
      unit: computation.baseline.unit ?? ''
    });
  }
  return saved.sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt) || a.baselineId.localeCompare(b.baselineId));
}

export interface MissionProgress {
  clock: string | null;
  day: number | null;
  days: Set<string>;
  streak: number;
  week: {date: string | null; recorded: boolean; today: boolean}[];
  checkInProtocol: string;
  checkIns: CrewSnapshot['observations'];
  task: CrewSnapshot['tasks'][number] | undefined;
  references: number;
  milestones: {id: string; label: string; hint: string; earned: boolean}[];
}

function currentStreak(days: Set<string>, clock: string | null) {
  let cursor = clock ? Date.parse(clock) : NaN, count = 0;
  if (!Number.isFinite(cursor)) return 0;
  for (let index = 0; index <= MISSION_DAYS; index++) {
    if (!days.has(new Date(cursor).toISOString().slice(0, 10))) break;
    count++;
    cursor -= 86400000;
  }
  return count;
}

export function selectMissionProgress(snapshot: CrewSnapshot, references: SavedReference[]): MissionProgress {
  const clock = snapshot.mission?.scenarioClock ?? null;
  const start = snapshot.crew?.missionStart ?? null;
  // A daily check-in is identified by the shared schedule it was captured against, not by a record ID.
  const checkIns = snapshot.observations.filter(o => o.measurementContext.protocolId === checkInSchedule.scheduleId);
  const days = new Set(checkIns.filter(o => o.value !== null).map(o => (o.timestamp ?? o.originalTime)?.slice(0, 10)).filter((d): d is string => !!d));
  const streak = currentStreak(days, clock);
  const task = snapshot.tasks.find(t => t.type === 'repeat_measurement');
  // Seeded fixtures carry no evidence links; only evaluations that actually used a reference count.
  const chainInspected = snapshot.assessments.some(a => a.baselineIds.length > 0);
  return {
    clock, day: start && clock ? missionDay(start, clock) : null, days, streak,
    week: Array.from({length: 7}, (_, index) => {
      const instant = clock ? Date.parse(clock) - index * 86400000 : NaN;
      const date = Number.isFinite(instant) ? new Date(instant).toISOString().slice(0, 10) : null;
      return {date, recorded: !!date && days.has(date), today: index === 0};
    }).reverse(),
    checkInProtocol: checkInSchedule.scheduleId,
    checkIns, task, references: references.length,
    milestones: [
      {id: 'first', label: 'First transmission', hint: 'Save one daily check-in.', earned: checkIns.some(o => o.value !== null)},
      {id: 'streak', label: 'Three days on watch', hint: 'Check in on three consecutive scenario days.', earned: streak >= 3},
      {id: 'reference', label: 'Personal reference saved', hint: 'Save a computed reference in Trends.', earned: references.length > 0},
      {id: 'followup', label: 'Follow-up closed', hint: 'Complete the fictional repeat reading.', earned: snapshot.tasks.some(t => t.state === 'completed')},
      {id: 'chain', label: 'Chain inspected', hint: 'Retain an evaluation that used a saved reference.', earned: chainInspected}
    ]
  };
}

export interface LogEvent {id: string; at: string; kind: 'capture' | 'reference' | 'finding' | 'task'; title: string; detail: string;}

export function selectLogEvents(snapshot: CrewSnapshot, references: SavedReference[]): LogEvent[] {
  const grouped = new Map<string, number>();
  for (const o of snapshot.observations.filter(o => o.measurementContext.protocolId === checkInSchedule.scheduleId)) {
    const at = o.receivedAt ?? o.timestamp ?? '';
    if (at) grouped.set(at, (grouped.get(at) ?? 0) + 1);
  }
  const events: LogEvent[] = [...grouped].map(([at, count]) => ({
    id: `capture:${at}`, at, kind: 'capture', title: 'Daily check-in recorded',
    detail: `${count} committed ${count === 1 ? 'reading' : 'readings'}`
  }));
  for (const reference of references) events.push({
    id: `reference:${reference.baselineId}@${reference.savedAt}`, at: reference.savedAt, kind: 'reference',
    title: 'Personal reference saved',
    detail: `${reference.method.replaceAll('_', ' ')} · n=${reference.sampleCount}${reference.center === null ? '' : ` · ${reference.center} ${reference.unit}`}`
  });
  for (const a of snapshot.assessments.filter(a => a.baselineIds.length > 0 || a.observationIds.length > 0)) events.push({
    id: `assessment:${a.assessmentId}`, at: a.evaluatedAt, kind: 'finding', title: a.finding,
    detail: `${a.availability.replaceAll('_', ' ')} · ${a.lifecycle} · rule ${a.ruleVersion}`
  });
  for (const t of snapshot.tasks.filter(t => t.assessmentIds.length > 0 || t.state === 'completed')) events.push({
    id: `task:${t.taskId}:${t.updatedAt}`, at: t.updatedAt, kind: 'task',
    title: t.state === 'completed' ? 'Follow-up closed' : 'Follow-up due',
    detail: `${t.requiredMeasurement.metric.replaceAll('_', ' ')} · ${t.state.replaceAll('_', ' ')}`
  });
  return events.filter(e => Number.isFinite(Date.parse(e.at))).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}
