import { useEffect, useRef, useState } from 'react';
import {
  MAX_BPM,
  METRONOME_PRESETS,
  MIN_BPM,
  beatLabel,
  beatsInWindow,
  clampBpm,
  completedRepetitions,
  type Beat,
} from '../logic/metronome';

// Look-ahead scheduling: every 25 ms the beats of the next 100 ms are handed to the audio clock,
// which plays them exactly on time even when the page is busy.
const TICK_MS = 25;
const AHEAD_S = 0.1;
// One shared empty pattern, so the scheduling effect does not restart on every render
const NO_PATTERN: readonly string[] = [];

function click(context: AudioContext, time: number, accent: boolean) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = accent ? 1320 : 880;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(0.6, time + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(time);
  oscillator.stop(time + 0.1);
}

const BINDING_TEXT = { required: 'Pflichttakt', guide: 'Richtwert' } as const;

/**
 * The metronome: on its own page with every preset to choose, or `compact` at a station of
 * „Erfassen“ with the beat of that exercise.
 */
export function Metronome({
  initialPresetId,
  compact = false,
}: { initialPresetId?: string; compact?: boolean } = {}) {
  const [presetId, setPresetId] = useState(initialPresetId ?? METRONOME_PRESETS[0]?.id ?? 'free');
  const preset = METRONOME_PRESETS.find((entry) => entry.id === presetId) ?? METRONOME_PRESETS[0];
  const pattern = preset ? preset.pattern : NO_PATTERN;
  const [bpm, setBpm] = useState(preset?.bpm ?? 60);
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState<Beat | null>(null);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState('');
  const context = useRef<AudioContext | null>(null);

  useEffect(() => {
    const audio = context.current;
    if (!running || !audio) return;
    const start = audio.currentTime + 0.05;
    let scheduledUntil = start;
    const pending: Beat[] = [];
    const timer = window.setInterval(() => {
      const until = audio.currentTime + AHEAD_S;
      for (const next of beatsInWindow(start, bpm, scheduledUntil, until)) {
        click(audio, next.time, pattern.length > 0 && next.index % pattern.length === 0);
        pending.push(next);
      }
      scheduledUntil = until;
    }, TICK_MS);
    let frame = requestAnimationFrame(function show() {
      while (pending.length > 0 && (pending[0]?.time ?? Infinity) <= audio.currentTime) {
        const due = pending.shift();
        if (due) {
          setBeat(due);
          setFlash(true);
          window.setTimeout(() => setFlash(false), 120);
        }
      }
      frame = requestAnimationFrame(show);
    });
    return () => {
      window.clearInterval(timer);
      cancelAnimationFrame(frame);
    };
  }, [running, bpm, pattern]);

  // Started by a plain click: touch browsers only allow audio after a completed tap.
  async function toggle() {
    if (running) {
      setRunning(false);
      return;
    }
    try {
      context.current ??= new AudioContext();
      await context.current.resume();
      setBeat(null);
      setError('');
      setRunning(true);
    } catch (reason) {
      setError(`Ton nicht verfügbar: ${String(reason)}`);
    }
  }

  function choose(id: string) {
    const next = METRONOME_PRESETS.find((entry) => entry.id === id);
    if (!next) return;
    setPresetId(next.id);
    setBpm(next.bpm);
    setRunning(false);
  }

  const beats = beat ? beat.index + 1 : 0;

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
            <button type="button" onClick={() => setBpm((value) => clampBpm(value - 1))}>
              −
            </button>
            <input
              type="number"
              min={MIN_BPM}
              max={MAX_BPM}
              value={bpm}
              onChange={(event) => setBpm(clampBpm(Number(event.target.value)))}
            />
            <button type="button" onClick={() => setBpm((value) => clampBpm(value + 1))}>
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
          {running ? 'Stopp' : 'Start'}
        </button>
      </div>
      {error && (
        <p className="message error" role="alert">
          {error}
        </p>
      )}
      <p>
        Schläge: {beats}
        {pattern.length > 0 && ` · Wiederholungen: ${completedRepetitions(pattern, beats)}`}
      </p>
      {preset?.binding && preset.quote && (
        <p>
          <strong>{BINDING_TEXT[preset.binding]}:</strong> {preset.quote}
        </p>
      )}
      <p className="muted">
        Der erste Schlag eines Zyklus klingt höher.{preset?.source && ` Quelle: ${preset.source}.`}{' '}
        Auf iPhone/iPad muss der Stummschalter aus sein, sonst bleibt das Metronom stumm.
      </p>
    </Wrapper>
  );
}
