import { useEffect, useState } from 'react';
import {
  MAX_BPM,
  METRONOME_PRESETS,
  MILESTONE_EVERY,
  MIN_BPM,
  beatLabel,
  clampBpm,
  completedRepetitions,
} from '../logic/metronome';
import { useBeat } from './useBeat';

// One shared empty pattern, so the scheduling effect does not restart on every render
const NO_PATTERN: readonly string[] = [];

const BINDING_TEXT = { required: 'Pflichttakt', guide: 'Richtwert' } as const;

/**
 * The metronome: on its own page with every preset to choose, or `compact` at a station of
 * „Erfassen“ with the beat of that exercise.
 */
export function Metronome({
  initialPresetId,
  compact = false,
  onResult,
}: {
  initialPresetId?: string;
  compact?: boolean;
  /** The repetitions at „Ende“ (after correction), for „Erfassen“; null = none (again). */
  onResult?: (repetitions: number | null) => void;
} = {}) {
  const [presetId, setPresetId] = useState(initialPresetId ?? METRONOME_PRESETS[0]?.id ?? 'free');
  const preset = METRONOME_PRESETS.find((entry) => entry.id === presetId) ?? METRONOME_PRESETS[0];
  const pattern = preset ? preset.pattern : NO_PATTERN;
  const [bpm, setBpmValue] = useState(preset?.bpm ?? 60);
  const { running, beat, flash, error, start, stop } = useBeat(pattern);
  // the repetitions at „Ende“, corrected by the examiner where the last one was not clean
  const [result, setResult] = useState<number | null>(null);
  useEffect(() => onResult?.(result), [result, onResult]);

  const beats = beat ? beat.index + 1 : 0;
  const repetitions = completedRepetitions(pattern, beats);

  function setBpm(update: (value: number) => number) {
    const next = clampBpm(update(bpm));
    setBpmValue(next);
    if (running) void start(next);
  }

  async function toggle() {
    if (running) {
      stop();
      if (pattern.length > 0) setResult(repetitions);
      return;
    }
    setResult(null);
    await start(bpm);
  }

  function choose(id: string) {
    const next = METRONOME_PRESETS.find((entry) => entry.id === id);
    if (!next) return;
    setPresetId(next.id);
    setBpmValue(next.bpm);
    setResult(null);
    stop();
  }

  const Wrapper = compact ? 'div' : 'section';
  return (
    <Wrapper className={compact ? 'metronome compact' : 'metronome'}>
      {!compact && <h2>Metronom</h2>}
      <div className="fields">
        {!compact && (
          <label>
            Vorgabe
            <select value={presetId} onChange={(event) => choose(event.target.value)}>
              {METRONOME_PRESETS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Schläge pro Minute
          <span className="bpm">
            <button type="button" onClick={() => setBpm((value) => value - 1)}>
              −
            </button>
            <input
              type="number"
              min={MIN_BPM}
              max={MAX_BPM}
              value={bpm}
              onChange={(event) => setBpm(() => Number(event.target.value))}
            />
            <button type="button" onClick={() => setBpm((value) => value + 1)}>
              +
            </button>
          </span>
        </label>
      </div>
      <div className={flash ? 'beat on' : 'beat'} aria-live="off">
        {beat ? beatLabel(pattern, beat.index) || beats : '–'}
      </div>
      <div className="actions">
        <button type="button" className="big-button" onClick={() => void toggle()}>
          {running ? (pattern.length > 0 ? 'Ende' : 'Stopp') : 'Start'}
        </button>
      </div>
      {error && (
        <p className="message error" role="alert">
          {error}
        </p>
      )}
      <p>
        Schläge: {beats}
        {pattern.length > 0 && ` · Wiederholungen: ${repetitions}`}
      </p>
      {result !== null && (
        <div className="metronome-result">
          <p>
            <strong>Ende: {result} Wiederholungen</strong>{' '}
            <span className="muted">(ganze, bis zum letzten vollen Zyklus)</span>
          </p>
          <div className="actions">
            <button type="button" onClick={() => setResult(Math.max(0, result - 1))}>
              −1 (letzte nicht sauber)
            </button>
            <button type="button" onClick={() => setResult(result + 1)}>
              +1
            </button>
          </div>
          {onResult && (
            <p className="muted">Beim Kind „Metronom ({result})“ antippen übernimmt die Zahl.</p>
          )}
        </div>
      )}
      {preset?.binding && preset.quote && (
        <p>
          <strong>{BINDING_TEXT[preset.binding]}:</strong> {preset.quote}
        </p>
      )}
      <p className="muted">
        Der erste Schlag eines Zyklus klingt höher, nach je {MILESTONE_EVERY} Wiederholungen ein
        tiefer, langer Ton. „Ende“ beim ersten Fehler drücken: die Wiederholung, die da läuft, zählt
        nicht.{preset?.source && ` Quelle: ${preset.source}.`} Auf iPhone/iPad muss der
        Stummschalter aus sein, sonst bleibt das Metronom stumm.
      </p>
    </Wrapper>
  );
}
