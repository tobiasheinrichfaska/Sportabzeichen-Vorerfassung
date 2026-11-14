// Stopwatch as a pure state machine; the caller passes the current time in milliseconds, so the
// logic runs and is tested without a clock. One start, several finish times: a group that starts
// together gets one time per athlete crossing the line.
import { formatMeasure } from './measure.ts';
import type { MeasureKindId } from './types.ts';

export interface StopwatchState {
  /** Time of the last start while running, else null. */
  startedAt: number | null;
  /** Milliseconds from earlier running phases (after a pause). */
  accumulated: number;
  /** Elapsed milliseconds at each finish, in order. */
  finishes: readonly number[];
}

export const STOPWATCH_RESET: StopwatchState = { startedAt: null, accumulated: 0, finishes: [] };

/** An input event's time is trusted only this far before its handler runs. */
export const PRESS_TIME_TRUST_MS = 1000;

/**
 * When a button was really pressed: the input event's own time (set when the touch happened, on the
 * same clock as performance.now()), not the moment the handler gets to run – a busy phone (camera,
 * drawing) would otherwise make every pressed time late. A time on another clock (older browsers:
 * epoch milliseconds) or implausibly old falls back to the handler's time.
 */
export function pressTime(eventTimeStamp: number, handlerNow: number): number {
  const delay = handlerNow - eventTimeStamp;
  return eventTimeStamp > 0 && delay >= 0 && delay <= PRESS_TIME_TRUST_MS
    ? eventTimeStamp
    : handlerNow;
}

export function isRunning(state: StopwatchState): boolean {
  return state.startedAt !== null;
}

export function elapsed(state: StopwatchState, now: number): number {
  return state.accumulated + (state.startedAt === null ? 0 : Math.max(0, now - state.startedAt));
}

export function startStopwatch(state: StopwatchState, now: number): StopwatchState {
  return isRunning(state) ? state : { ...state, startedAt: now };
}

export function stopStopwatch(state: StopwatchState, now: number): StopwatchState {
  return isRunning(state) ? { ...state, startedAt: null, accumulated: elapsed(state, now) } : state;
}

/** Records a finish time; only while running. */
export function finishStopwatch(state: StopwatchState, now: number): StopwatchState {
  return isRunning(state)
    ? { ...state, finishes: [...state.finishes, elapsed(state, now)] }
    : state;
}

/** Replaces one finish time, e.g. by the time of the Zielvideo frame where the athlete crosses. */
export function setFinish(
  state: StopwatchState,
  index: number,
  milliseconds: number,
): StopwatchState {
  if (index < 0 || index >= state.finishes.length) return state;
  return {
    ...state,
    finishes: state.finishes.map((finish, i) => (i === index ? Math.max(0, milliseconds) : finish)),
  };
}

/** Stopwatch kinds the stopwatch can deliver. */
export type TimedMeasure = Extract<MeasureKindId, 'minSec' | 'secTenth'>;

/**
 * The value for the Prüfkarte. The Prüfungswegweiser 2026 only says the results are "abgelesen" —
 * Ausdauer "auf Sekunden" (6.1), Schnelligkeit "auf Zehntelsekunde" (6.3) — so finer digits are
 * cut off. formatFiner shows the next digit, leaving borderline cases to the examiner.
 */
export function elapsedAs(kind: TimedMeasure, milliseconds: number): number {
  // Whole milliseconds first, so float noise like 8399.9999 cannot cut a tenth
  const whole = Math.max(0, Math.round(milliseconds));
  return kind === 'secTenth' ? Math.floor(whole / 100) : Math.floor(whole / 1000);
}

/**
 * A reading split for display: `card` is the value for the Prüfkarte (cut off), `finer` the next
 * digit, shown in a lighter colour so the examiner can judge borderline cases — "8,4" + "3",
 * "05:40" + ",7".
 */
export function readingParts(
  kind: TimedMeasure,
  milliseconds: number,
): { card: string; finer: string } {
  const whole = Math.max(0, Math.round(milliseconds));
  const card = formatMeasure(kind, elapsedAs(kind, whole));
  return kind === 'secTenth'
    ? { card, finer: String(Math.floor(whole / 10) % 10) }
    : { card, finer: `,${Math.floor(whole / 100) % 10}` };
}

/** Display with hundredths, e.g. "1:05,43" or "8,43". */
export function formatStopwatch(milliseconds: number): string {
  // whole milliseconds first, like readingParts — else „2,51 – 2,5|2“ for 2 519,6 ms
  const hundredths = Math.floor(Math.max(0, Math.round(milliseconds)) / 10);
  const minutes = Math.floor(hundredths / 6000);
  const seconds = Math.floor((hundredths % 6000) / 100);
  const fraction = String(hundredths % 100).padStart(2, '0');
  return minutes > 0
    ? `${minutes}:${String(seconds).padStart(2, '0')},${fraction}`
    : `${seconds},${fraction}`;
}
