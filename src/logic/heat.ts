// Durchgang (Tobias 2026-11-18: „bei der Abnahme Menschen auswählen, für die abgenommen wird –
// entweder einen oder mehrere“ – „Durchgang würde das passende Werkzeug zeigen und Zuordnen die
// Ergebnisse zuordnen, falls nicht per Knopf geschehen“ – „Sowohl Stoppuhr als auch Metronom haben
// einen Durchgang … für Push-Ups oder andere Wiederholungen braucht es getrennte Zählfelder“).
// One exercise, the people of this run, and their results until they are saved as measurements.
import { stationTools } from './capture.ts';
import { metronomePresetFor } from './metronome.ts';
import { readingParts } from './stopwatch.ts';
import type { Exercise } from './types.ts';

/** What the run is measured with. */
export type HeatTool = 'stopwatch' | 'counter' | 'metronome' | 'none';

export function heatTool(exercise: Pick<Exercise, 'id' | 'measure'>): HeatTool {
  if (metronomePresetFor(exercise.id)?.station === 'metronome') return 'metronome';
  const tools = stationTools(exercise);
  if (tools.includes('stopwatch')) return 'stopwatch';
  if (tools.includes('counter')) return 'counter';
  return 'none';
}

export interface Heat {
  exerciseId: string;
  /** The people of this run, in the order they were chosen. */
  athleteIds: readonly string[];
  /**
   * Stopwatch: 'one' — a single big „Zieleinlauf“, the times assigned afterwards (most exact);
   * 'names' — a finish button per person, the time assigned at the press (runners who arrive apart).
   */
  finishMode: 'one' | 'names';
  /** Finish index → person. */
  assigned: Readonly<Record<number, string>>;
  /** Counter: a count per person (separate fields). */
  counts: Readonly<Record<string, number>>;
  /** Metronome: the repetitions at the person's „Ende“, as corrected. */
  ended: Readonly<Record<string, number>>;
  /** Results already saved as measurements (`HeatResult.key`). */
  saved: readonly string[];
}

export function newHeat(exerciseId: string, athleteIds: readonly string[] = []): Heat {
  return {
    exerciseId,
    athleteIds: [...athleteIds],
    finishMode: 'one',
    assigned: {},
    counts: {},
    ended: {},
    saved: [],
  };
}

export type HeatAction =
  /** Another exercise: a new run (nobody chosen yet). */
  | { type: 'exercise'; exerciseId: string }
  | { type: 'toggleAthlete'; athleteId: string }
  | { type: 'setAthletes'; athleteIds: readonly string[] }
  | { type: 'finishMode'; mode: Heat['finishMode'] }
  /** null takes the assignment back. A person has one finish: assigning moves it. */
  | { type: 'assign'; finishIndex: number; athleteId: string | null }
  | { type: 'count'; athleteId: string; delta: 1 | -1 }
  /** Metronome: the person stops at this many whole repetitions. */
  | { type: 'end'; athleteId: string; repetitions: number }
  | { type: 'correct'; athleteId: string; delta: 1 | -1 }
  | { type: 'saved'; key: string }
  /** Same exercise and people, results gone (with a stopwatch reset). */
  | { type: 'again' };

function without<T>(record: Readonly<Record<string, T>>, key: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([entry]) => entry !== key));
}

export function heatReducer(heat: Heat, action: HeatAction): Heat {
  switch (action.type) {
    case 'exercise':
      return action.exerciseId === heat.exerciseId ? heat : newHeat(action.exerciseId);
    case 'toggleAthlete': {
      const { athleteId } = action;
      if (!heat.athleteIds.includes(athleteId)) {
        return { ...heat, athleteIds: [...heat.athleteIds, athleteId] };
      }
      // leaving the run takes the person's open results along (saved ones are measurements)
      const assigned = Object.fromEntries(
        Object.entries(heat.assigned).filter(([, id]) => id !== athleteId),
      );
      return {
        ...heat,
        athleteIds: heat.athleteIds.filter((id) => id !== athleteId),
        assigned,
        counts: without(heat.counts, athleteId),
        ended: without(heat.ended, athleteId),
      };
    }
    case 'setAthletes':
      return { ...heat, athleteIds: [...new Set(action.athleteIds)] };
    case 'finishMode':
      return { ...heat, finishMode: action.mode };
    case 'assign': {
      const { finishIndex, athleteId } = action;
      if (athleteId !== null && !heat.athleteIds.includes(athleteId)) return heat;
      const others = Object.entries(heat.assigned).filter(
        ([index, id]) => Number(index) !== finishIndex && id !== athleteId,
      );
      return {
        ...heat,
        assigned: Object.fromEntries(
          athleteId === null ? others : [...others, [String(finishIndex), athleteId]],
        ),
      };
    }
    case 'count': {
      if (!heat.athleteIds.includes(action.athleteId)) return heat;
      const next = Math.max(0, (heat.counts[action.athleteId] ?? 0) + action.delta);
      return { ...heat, counts: { ...heat.counts, [action.athleteId]: next } };
    }
    case 'end':
      if (!heat.athleteIds.includes(action.athleteId) || action.athleteId in heat.ended)
        return heat;
      return {
        ...heat,
        ended: { ...heat.ended, [action.athleteId]: Math.max(0, action.repetitions) },
      };
    case 'correct': {
      const current = heat.ended[action.athleteId];
      if (current === undefined) return heat;
      return {
        ...heat,
        ended: { ...heat.ended, [action.athleteId]: Math.max(0, current + action.delta) },
      };
    }
    case 'saved':
      return heat.saved.includes(action.key)
        ? heat
        : { ...heat, saved: [...heat.saved, action.key] };
    case 'again':
      return { ...newHeat(heat.exerciseId, heat.athleteIds), finishMode: heat.finishMode };
  }
}

/** One result of the run: a value in card notation, for a person or still to assign. */
export interface HeatResult {
  key: string;
  athleteId: string | null;
  /** In card notation, as typed on „Erfassen“ („2,5“, „04:12“, „17“). */
  text: string;
  /** The stopwatch finish it comes from (for the Zielbilder). */
  finishIndex?: number;
  saved: boolean;
}

/** What the stopwatch holds for the run. */
export interface HeatClock {
  finishes: readonly number[];
  /** The stopped time when there is no finish; null while running or never started. */
  stopped: number | null;
}

/**
 * The results of the run in finish order (stopwatch) or in the order of the people. With one person
 * the single finish — or the stopped time — is theirs without assigning.
 */
export function heatResults(
  heat: Heat,
  exercise: Pick<Exercise, 'id' | 'measure'>,
  clock: HeatClock,
): HeatResult[] {
  const tool = heatTool(exercise);
  const result = (key: string, athleteId: string | null, text: string, finishIndex?: number) => ({
    key,
    athleteId,
    text,
    ...(finishIndex === undefined ? {} : { finishIndex }),
    saved: heat.saved.includes(key),
  });
  if (tool === 'stopwatch') {
    if (exercise.measure !== 'minSec' && exercise.measure !== 'secTenth') return [];
    const kind = exercise.measure;
    const only = heat.athleteIds.length === 1 ? (heat.athleteIds[0] ?? null) : null;
    if (clock.finishes.length === 0) {
      return only && clock.stopped !== null && clock.stopped > 0
        ? [result('stop', only, readingParts(kind, clock.stopped).card)]
        : [];
    }
    return clock.finishes.map((ms, index) =>
      result(
        `f${index}`,
        heat.assigned[index] ?? (only && clock.finishes.length === 1 ? only : null),
        readingParts(kind, ms).card,
        index,
      ),
    );
  }
  if (tool === 'counter') {
    return heat.athleteIds
      .filter((id) => (heat.counts[id] ?? 0) > 0)
      .map((id) => result(`c${id}`, id, String(heat.counts[id] ?? 0)));
  }
  if (tool === 'metronome') {
    return heat.athleteIds
      .filter((id) => id in heat.ended)
      .map((id) => result(`m${id}`, id, String(heat.ended[id] ?? 0)));
  }
  return [];
}

/** The people of a timed run who have no finish yet (for the name buttons and the assigning). */
export function withoutResult(heat: Heat, results: readonly HeatResult[]): string[] {
  const done = new Set(results.flatMap((r) => (r.athleteId ? [r.athleteId] : [])));
  return heat.athleteIds.filter((id) => !done.has(id));
}
