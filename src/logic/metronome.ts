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

/** Completed repetitions after `beats` beats: one repetition per full pattern cycle. */
export function completedRepetitions(pattern: readonly string[], beats: number): number {
  return pattern.length === 0 ? 0 : Math.floor(beats / pattern.length);
}
