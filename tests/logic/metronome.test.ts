import {
  MAX_BPM,
  METRONOME_PRESETS,
  MIN_BPM,
  beatInterval,
  beatLabel,
  beatsInWindow,
  clampBpm,
  completedRepetitions,
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
