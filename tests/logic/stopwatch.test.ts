import {
  STOPWATCH_RESET,
  elapsed,
  elapsedAs,
  finishStopwatch,
  formatStopwatch,
  isRunning,
  PRESS_TIME_TRUST_MS,
  pressTime,
  readingParts,
  startStopwatch,
  stopStopwatch,
} from '../../src/logic/stopwatch';
import { formatMeasure } from '../../src/logic/measure';
import { counterReducer } from '../../src/logic/counter';

describe('stopwatch', () => {
  it('measures from start to stop', () => {
    const running = startStopwatch(STOPWATCH_RESET, 1000);
    expect(isRunning(running)).toBe(true);
    expect(elapsed(running, 9430)).toBe(8430);
    const stopped = stopStopwatch(running, 9430);
    expect(isRunning(stopped)).toBe(false);
    expect(elapsed(stopped, 99_999)).toBe(8430);
  });

  it('continues after a pause', () => {
    let state = startStopwatch(STOPWATCH_RESET, 0);
    state = stopStopwatch(state, 2000);
    state = startStopwatch(state, 5000);
    expect(elapsed(state, 6500)).toBe(3500);
  });

  it('ignores a second start or stop', () => {
    const running = startStopwatch(STOPWATCH_RESET, 100);
    expect(startStopwatch(running, 500)).toBe(running);
    expect(stopStopwatch(STOPWATCH_RESET, 500)).toBe(STOPWATCH_RESET);
  });

  it('records one finish time per athlete of a group start', () => {
    let state = startStopwatch(STOPWATCH_RESET, 0);
    state = finishStopwatch(state, 7810);
    state = finishStopwatch(state, 8120);
    expect(state.finishes).toEqual([7810, 8120]);
    expect(isRunning(state)).toBe(true);
    expect(finishStopwatch(stopStopwatch(state, 9000), 9500).finishes).toEqual([7810, 8120]);
  });

  it('never counts negative time when the clock jumps back', () => {
    expect(elapsed(startStopwatch(STOPWATCH_RESET, 5000), 4000)).toBe(0);
  });

  // Prüfungswegweiser 2026: "auf Zehntelsekunde (eine Nachkommastelle) abgelesen" (6.3) and
  // "auf Sekunden abgelesen" (6.1) — reading off cuts the finer digits (Tobias, 2026-11-01).
  it.each([
    [8400, 84],
    [8401, 84],
    [8430, 84],
    [8499, 84],
    [8500, 85],
    [8399.9999999, 84],
  ])('cuts %d ms to tenths: %d', (ms, tenths) => {
    expect(elapsedAs('secTenth', ms)).toBe(tenths);
  });

  it.each([
    [340_000, 340],
    [340_999, 340],
    [339_500, 339],
  ])('cuts %d ms to seconds: %d', (ms, seconds) => {
    expect(elapsedAs('minSec', ms)).toBe(seconds);
  });

  // Card value cut off, the next digit shown lighter (Tobias, 2026-11-01)
  it.each([
    ['secTenth', 8430, '8,4', '3'],
    ['secTenth', 8499, '8,4', '9'],
    ['secTenth', 8500, '8,5', '0'],
    ['secTenth', 75_310, '75,3', '1'],
    ['minSec', 340_700, '05:40', ',7'],
    ['minSec', 3_750_250, '62:30', ',2'],
  ] as const)('splits %s %d ms into %s + %s', (kind, ms, card, finer) => {
    expect(readingParts(kind, ms)).toEqual({ card, finer });
  });

  it('the card part is always the cut-off value', () => {
    for (const ms of [0, 999, 8_430, 59_999, 340_700, 3_750_250]) {
      for (const kind of ['secTenth', 'minSec'] as const) {
        expect(readingParts(kind, ms).card).toBe(formatMeasure(kind, elapsedAs(kind, ms)));
      }
    }
  });

  it.each([
    [0, '0,00'],
    [8430, '8,43'],
    [65_432, '1:05,43'],
    [3_725_000, '62:05,00'],
    [-5, '0,00'],
  ])('shows %d ms as %s', (ms, text) => {
    expect(formatStopwatch(ms)).toBe(text);
  });

  // 2026-11-11, Zielvideo check: fractional milliseconds showed „2,51 – Schnelligkeit: 2,5|2“
  it.each([2_519.6, 8_429.5, 8_399.9999, 65_439.7])(
    'display and reading agree on the hundredth for %d ms',
    (ms) => {
      // tenth and hundredth: the last two digits of the display, the card's tenth + the finer digit
      const { card, finer } = readingParts('secTenth', ms);
      expect(formatStopwatch(ms).slice(-2)).toBe(`${card.slice(-1)}${finer}`);
    },
  );
});

// regression: the pressed time was read when the handler ran – with the camera busy on the same
// phone a late handler made the finish late (Tobias: „ohne Verfälschung der Messung“)
describe('pressTime – the moment of the touch, not of the handler', () => {
  it('a busy page does not make the finish late', () => {
    let state = startStopwatch(STOPWATCH_RESET, pressTime(1_000, 1_000));
    // touched at 9 430, the handler only ran 300 ms later
    state = finishStopwatch(state, pressTime(9_430, 9_730));
    expect(state.finishes).toEqual([8_430]);
  });

  it('a busy page does not make the start late either', () => {
    let state = startStopwatch(STOPWATCH_RESET, pressTime(1_000, 1_250));
    state = stopStopwatch(state, pressTime(9_430, 9_430));
    expect(elapsed(state, 0)).toBe(8_430);
  });

  it('an event time on another clock or implausibly old falls back to the handler time', () => {
    // older browsers: epoch milliseconds
    expect(pressTime(1_762_000_000_000, 5_000)).toBe(5_000);
    // after the handler: not this clock
    expect(pressTime(5_010, 5_000)).toBe(5_000);
    expect(pressTime(5_000 - PRESS_TIME_TRUST_MS - 1, 5_000)).toBe(5_000);
    expect(pressTime(0, 5_000)).toBe(5_000);
    expect(pressTime(5_000 - PRESS_TIME_TRUST_MS, 5_000)).toBe(5_000 - PRESS_TIME_TRUST_MS);
  });
});

describe('counterReducer', () => {
  it('counts up, undoes and resets, never below zero', () => {
    expect(counterReducer(0, 'increment')).toBe(1);
    expect(counterReducer(5, 'decrement')).toBe(4);
    expect(counterReducer(0, 'decrement')).toBe(0);
    expect(counterReducer(17, 'reset')).toBe(0);
  });
});
