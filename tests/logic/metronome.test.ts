import {
  MAX_BPM,
  METRONOME_PRESETS,
  MIN_BPM,
  beatInterval,
  beatLabel,
  beatsInWindow,
  clampBpm,
  GROUP_SPREAD_S,
  REALIGN_THRESHOLD_S,
  alignToGroup,
  confirmedShift,
  groupHit,
  type BeatCount,
  alignToTap,
  completedRepetitions,
  isMilestone,
  metronomePresetFor,
} from '../../src/logic/metronome';
import { PUBLIC_CATALOG } from '../fixtures/testCatalog';

describe('metronome', () => {
  it('has the Curl-Up preset at 40 BPM with up/down', () => {
    const curlUp = METRONOME_PRESETS.find((preset) => preset.id === 'curl-up');
    expect(curlUp).toMatchObject({ bpm: 40, pattern: ['hoch', 'runter'] });
  });

  // Tobias 2026-11-10: „Metronom für alle anwendbaren Übungen verfügbar machen“ — every exercise
  // whose official text sets a beat: Curl-Up (rhythm required), Push-Ups (1 s per direction, „ca.“)
  it('every exercise with a beat in its official text has its preset', () => {
    expect(metronomePresetFor('curl-ups')).toMatchObject({ bpm: 40, binding: 'required' });
    expect(metronomePresetFor('push-ups')).toMatchObject({
      bpm: 60,
      pattern: ['hoch', 'runter'],
      binding: 'guide',
    });
    // „kontrolliert“, no tempo in the text
    expect(metronomePresetFor('triceps-dips')).toBeUndefined();
    expect(metronomePresetFor('pull-ups')).toBeUndefined();
  });

  it('a preset of an exercise names the exercise, its source and the sentence; „Frei“ has none', () => {
    const exerciseIds = new Set(PUBLIC_CATALOG.exercises.map((exercise) => exercise.id));
    for (const preset of METRONOME_PRESETS.filter((entry) => entry.exerciseId)) {
      expect(exerciseIds.has(preset.exerciseId ?? '')).toBe(true);
      expect(preset.source).not.toBe('');
      expect(preset.quote).toBeTruthy();
      expect(preset.binding).toBeDefined();
    }
    expect(METRONOME_PRESETS.filter((entry) => !entry.exerciseId).map((p) => p.id)).toEqual([
      'free',
    ]);
  });

  it('keeps presets inside the supported range', () => {
    for (const preset of METRONOME_PRESETS) expect(clampBpm(preset.bpm)).toBe(preset.bpm);
  });

  it.each([
    [40, 40],
    [40.4, 40],
    [5, MIN_BPM],
    [999, MAX_BPM],
    [Number.NaN, MIN_BPM],
  ])('clamps %d BPM to %d', (input, bpm) => {
    expect(clampBpm(input)).toBe(bpm);
  });

  it('40 BPM means one beat every 1.5 s', () => {
    expect(beatInterval(40)).toBe(1.5);
  });

  it('finds the beats in a window, the first one at the start', () => {
    expect(beatsInWindow(10, 40, 10, 14)).toEqual([
      { index: 0, time: 10 },
      { index: 1, time: 11.5 },
      { index: 2, time: 13 },
    ]);
  });

  it('continues seamlessly across consecutive windows', () => {
    const windows = [
      [0, 1.4],
      [1.4, 3.1],
      [3.1, 6],
    ] as const;
    const indices = windows.flatMap(([from, to]) =>
      beatsInWindow(0, 40, from, to).map((beat) => beat.index),
    );
    expect(indices).toEqual([0, 1, 2, 3]);
  });

  it('a window before the start has no beats', () => {
    expect(beatsInWindow(10, 60, 0, 9.9)).toEqual([]);
  });

  it('labels beats along the pattern and counts full cycles as repetitions', () => {
    const pattern = ['hoch', 'runter'];
    expect([0, 1, 2, 3].map((index) => beatLabel(pattern, index))).toEqual([
      'hoch',
      'runter',
      'hoch',
      'runter',
    ]);
    expect(completedRepetitions(pattern, 5)).toBe(2);
    expect(beatLabel([], 3)).toBe('');
    expect(completedRepetitions([], 10)).toBe(0);
  });
});

describe('repetitions, milestone tone and the beat in the counter (2026-11-18)', () => {
  const pattern = ['hoch', 'runter'];

  it('a repetition is done when the next cycle begins, not at its „runter“', () => {
    // beat 1 hoch, beat 2 runter (still moving down), beat 3 hoch = the first one done
    expect([0, 1, 2, 3, 4, 5].map((beats) => completedRepetitions(pattern, beats))).toEqual([
      0, 0, 0, 1, 1, 2,
    ]);
  });

  it('the milestone tone on the beat that completes repetition 10, 20, …', () => {
    const marked = Array.from({ length: 45 }, (_, index) => index).filter((index) =>
      isMilestone(pattern, index),
    );
    expect(marked).toEqual([20, 40]);
    // that beat is the one whose count shows 10 / 20 repetitions
    expect(completedRepetitions(pattern, 21)).toBe(10);
    expect(isMilestone([], 20)).toBe(false);
  });

  it('a tap near a cycle start leaves the beat; further off it moves the phase, not the tempo', () => {
    // 60 BPM, hoch/runter: a cycle of 2 s starting at 10 s
    expect(alignToTap(10, 60, pattern, 14.3)).toEqual({
      start: 10,
      deviation: expect.closeTo(0.3, 6),
      realigned: false,
    });
    expect(alignToTap(10, 60, pattern, 13.7).deviation).toBeCloseTo(-0.3, 6);
    const off = alignToTap(10, 60, pattern, 14.6);
    expect(off.realigned).toBe(true);
    expect(off.start).toBe(14.6);
    expect(off.deviation).toBeCloseTo(0.6, 6);
    // exactly at the threshold: left alone
    expect(alignToTap(0, 60, pattern, 2 + REALIGN_THRESHOLD_S).realigned).toBe(false);
  });
});

describe('alignToGroup (Push-Ups in a group, Tobias 2026-11-18)', () => {
  const pattern = ['hoch', 'runter'];

  it('one person: the same as alignToTap', () => {
    expect(alignToGroup(10, 60, pattern, [14.6])).toMatchObject({ start: 14.6, realigned: true });
    expect(alignToGroup(10, 60, pattern, [14.3])).toMatchObject({ start: 10, realigned: false });
  });

  it('all together and far enough off: the cycle moves to the middle of the round', () => {
    const round = alignToGroup(10, 60, pattern, [14.6, 14.8, 14.7]);
    expect(round.realigned).toBe(true);
    expect(round.start).toBeCloseTo(14.7, 6);
    expect(round.spread).toBeCloseTo(0.2, 6);
    expect(round.apart).toBe(false);
  });

  it('together but near the beat: the beat stays', () => {
    expect(alignToGroup(10, 60, pattern, [14.1, 14.3, 14.2])).toMatchObject({
      start: 10,
      realigned: false,
      apart: false,
    });
  });

  it('too far apart: no common moment, the beat stays even when the middle is off', () => {
    const round = alignToGroup(10, 60, pattern, [14.1, 15.1]);
    expect(round.deviation).toBeCloseTo(0.6, 6);
    expect(round).toMatchObject({ start: 10, realigned: false, apart: true });
    expect(round.spread).toBeCloseTo(1, 6);
  });

  it('exactly at the spread limit still counts as together', () => {
    expect(alignToGroup(0, 60, pattern, [2.4, 2.4 + GROUP_SPREAD_S]).apart).toBe(false);
  });
});

describe('groupHit (Tobias 2026-11-18: „nach zwei Gruppentreffern“, wer nachzieht oder aufhört, hält nicht auf)', () => {
  const c = (who: string, at: number): BeatCount => ({ who, at });

  it('two people close together are a hit; the third, who lags or stopped, is not waited for', () => {
    expect(groupHit([c('a', 10), c('b', 10.2)], 3)).toEqual({
      taps: [10, 10.2],
      first: 10,
      last: 10.2,
    });
    expect(groupHit([c('a', 10)], 3)).toBeNull();
  });

  it('with one person in the run every count is a hit', () => {
    expect(groupHit([c('a', 10)], 1)).toEqual({ taps: [10], first: 10, last: 10 });
  });

  it('counts further apart than the spread are no hit', () => {
    expect(groupHit([c('a', 10), c('b', 11)], 2)).toBeNull();
  });

  it('a count in the corridor before the hit (someone dragging behind) blocks it', () => {
    // a and b within the spread; c just outside the group, 0.2 s before it: no free corridor
    expect(groupHit([c('c', 9.8), c('a', 10), c('b', 10.75)], 3)).toBeNull();
    // c further back than the corridor: the pair is a hit
    expect(groupHit([c('c', 9.5), c('a', 10), c('b', 10.75)], 3)?.taps).toEqual([10, 10.75]);
    // close enough, c simply belongs to the group
    expect(groupHit([c('c', 9.7), c('a', 10), c('b', 10.1)], 3)?.taps).toEqual([9.7, 10, 10.1]);
  });

  it('a hit already used never counts again; one person tapping twice is still one person', () => {
    expect(groupHit([c('a', 10), c('b', 10.2), c('c', 10.4)], 3, 10.2)).toBeNull();
    expect(groupHit([c('a', 10), c('a', 10.3)], 2)).toBeNull();
  });
});

describe('confirmedShift (Tobias 2026-11-18: „zwei Gruppen von Treffern mit realistischem Abstand ohne Treffer dazwischen“)', () => {
  const pattern = ['hoch', 'runter'];
  const mark = (middle: number, deviation: number) => ({ middle, deviation });

  it('one hit alone never moves the beat', () => {
    expect(confirmedShift(null, mark(10, 0.9), 60, pattern)).toBe(false);
  });

  it('two hits a repetition apart, both clearly off: the beat moves', () => {
    expect(confirmedShift(mark(10, 0.6), mark(12.4, 1.0), 60, pattern)).toBe(true);
    expect(confirmedShift(mark(10, -0.7), mark(11.7, -0.9), 60, pattern)).toBe(true);
    // a group falling behind past half a cycle reads as early next: still confirmed
    expect(confirmedShift(mark(10, 0.7), mark(12.4, -0.9), 60, pattern)).toBe(true);
  });

  it('not when one of them is near the beat', () => {
    expect(confirmedShift(mark(10, 0.2), mark(12.4, 0.8), 60, pattern)).toBe(false);
    expect(confirmedShift(mark(10, 0.8), mark(12.1, 0.3), 60, pattern)).toBe(false);
  });

  it('not when the two lie no realistic repetition apart (60 BPM: 1–4 s)', () => {
    expect(confirmedShift(mark(10, 0.7), mark(10.8, 0.8), 60, pattern)).toBe(false);
    expect(confirmedShift(mark(10, 0.7), mark(14.5, 0.8), 60, pattern)).toBe(false);
    expect(confirmedShift(mark(10, 0.7), mark(14, 0.8), 60, pattern)).toBe(true);
  });
});
