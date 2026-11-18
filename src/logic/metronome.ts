// Metronome as pure timing: which beats fall into a time window, how a beat is labelled, how many
// repetitions are done. The UI schedules sound and light from these numbers; times are seconds on
// whatever clock the caller uses (the audio clock in the app).

export interface MetronomePreset {
  id: string;
  label: string;
  bpm: number;
  /** Labels cycling with the beats, e.g. up/down; one repetition = one full cycle. */
  pattern: readonly string[];
  source: string;
  /** The exercise whose official text sets this beat; none for „Frei“. */
  exerciseId?: string;
  /** 'required': the rhythm is part of the rules; 'guide': the text names a tempo („ca.“). */
  binding?: 'required' | 'guide';
  /** What the source says about the beat, in our own words (no verbatim DOSB/DBS text). */
  quote?: string;
  /**
   * Where the beat runs at the station (Tobias 2026-11-18): 'metronome' — the metronome counts and
   * its end gives the value (the rhythm is the rule); 'counter' — the examiner counts by hand and
   * the counter carries the beat as a guide, realigned to the taps (`alignToTap`).
   */
  station?: 'metronome' | 'counter';
}

// Every exercise whose official text sets a beat (Tobias 2026-11-10: „Metronom für alle
// anwendbaren Übungen“). Searched: ELK 2026, Prüfungswegweiser 2026, DBS-Handbuch MmB — only these
// two; Triceps-Dips and Pull-Ups say „kontrolliert“, no tempo.
export const METRONOME_PRESETS: readonly MetronomePreset[] = [
  {
    id: 'curl-up',
    label: 'Curl-Up-Test / Crunches (6.2.6.2)',
    bpm: 40,
    // up on one signal, down on the next
    pattern: ['hoch', 'runter'],
    source: 'DOSB Erweiterter Leistungskatalog Kraft und Koordination 2026, 6.2.6.2',
    exerciseId: 'curl-ups',
    binding: 'required',
    quote: 'Der Takt von 40 Schlägen pro Minute kommt vom Metronom und ist einzuhalten.',
    station: 'metronome',
  },
  {
    id: 'push-ups',
    label: 'Push-Ups / Liegestützen (6.2.6.1)',
    // about two seconds per push-up: one second each way
    bpm: 60,
    pattern: ['hoch', 'runter'],
    source: 'DOSB Erweiterter Leistungskatalog Kraft und Koordination 2026, 6.2.6.1',
    exerciseId: 'push-ups',
    binding: 'guide',
    quote:
      'Etwa zwei Sekunden je Push-Up, also rund eine Sekunde hin und eine zurück – ein Richtwert.',
    station: 'counter',
  },
  { id: 'free', label: 'Frei', bpm: 60, pattern: [], source: '' },
];

/** The beat an exercise's official text sets, if any. */
export function metronomePresetFor(exerciseId: string): MetronomePreset | undefined {
  return METRONOME_PRESETS.find((preset) => preset.exerciseId === exerciseId);
}

export const MIN_BPM = 20;
export const MAX_BPM = 240;

/** BPM as a whole number inside the supported range; anything unreadable becomes the minimum. */
export function clampBpm(bpm: number): number {
  if (!Number.isFinite(bpm)) return MIN_BPM;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));
}

export function beatInterval(bpm: number): number {
  return 60 / clampBpm(bpm);
}

export interface Beat {
  /** 0 for the first beat at the start time. */
  index: number;
  time: number;
}

/** Beats of a metronome started at `start` that fall into [from, to). */
export function beatsInWindow(start: number, bpm: number, from: number, to: number): Beat[] {
  const interval = beatInterval(bpm);
  const first = Math.max(0, Math.ceil((from - start) / interval - 1e-9));
  const beats: Beat[] = [];
  for (let index = first; start + index * interval < to; index += 1) {
    beats.push({ index, time: start + index * interval });
  }
  return beats;
}

/** Label of a beat in the pattern, empty without a pattern. */
export function beatLabel(pattern: readonly string[], index: number): string {
  return pattern.length === 0 ? '' : (pattern[index % pattern.length] ?? '');
}

/**
 * Completed repetitions after `beats` beats: one full pattern cycle is done when the cycle after it
 * begins — „hoch“ on beat 1, „runter“ on beat 2, back at the start on beat 3. So beat 2 has done
 * none yet, beat 3 one (until 2026-11-18 the count ran half a cycle early).
 */
export function completedRepetitions(pattern: readonly string[], beats: number): number {
  return pattern.length === 0 || beats < 1 ? 0 : Math.floor((beats - 1) / pattern.length);
}

/** A tone of its own every ten repetitions (Tobias 2026-11-18: „Zwischenton alle 10“). */
export const MILESTONE_EVERY = 10;

/** The beat (0-based index) that completes repetition 10, 20, … — it gets the milestone tone. */
export function isMilestone(
  pattern: readonly string[],
  index: number,
  every: number = MILESTONE_EVERY,
): boolean {
  if (pattern.length === 0 || index <= 0 || index % pattern.length !== 0) return false;
  return (index / pattern.length) % every === 0;
}

/**
 * Beyond this offset a tap realigns the beat (counter with beat, Push-Ups). Simulated 2026-11-18
 * with a tap scatter of 0.12 s: realigning on every tap made the beat jump audibly on about every
 * second repetition even for an athlete exactly at 2 s; with 0.5 s it moved on about 5 % only. A
 * different tempo is not followed — the tempo is the guide; `deviation` tells the examiner.
 */
export const REALIGN_THRESHOLD_S = 0.5;

export interface TapAlignment {
  /** The start (time of a cycle's first beat) the beat runs from after this tap. */
  start: number;
  /** Tap minus the nearest cycle start, in seconds: > 0 later (slower), < 0 earlier (faster). */
  deviation: number;
  realigned: boolean;
}

/**
 * A count tapped at the end of a repetition is meant to fall on a cycle's first beat. Near enough
 * it leaves the beat alone; further off it moves the cycle to the tap (phase only, never the tempo).
 */
export function alignToTap(
  start: number,
  bpm: number,
  pattern: readonly string[],
  tap: number,
  threshold: number = REALIGN_THRESHOLD_S,
): TapAlignment {
  const cycle = beatInterval(bpm) * Math.max(1, pattern.length);
  const nearest = start + Math.round((tap - start) / cycle) * cycle;
  const deviation = tap - nearest;
  return Math.abs(deviation) > threshold
    ? { start: tap, deviation, realigned: true }
    : { start, deviation, realigned: false };
}
