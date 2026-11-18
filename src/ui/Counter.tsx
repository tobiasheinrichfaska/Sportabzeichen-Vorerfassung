import { useState, type KeyboardEvent } from 'react';
import type { CounterAction } from '../logic/counter';
import { beatLabel, type MetronomePreset } from '../logic/metronome';
import { fastPress } from './fastPress';
import { useBeat, type HitAlignment } from './useBeat';

// One shared empty pattern, so the beat's effect does not restart on every render
const NO_PATTERN: readonly string[] = [];

const seconds = (value: number) => value.toFixed(1).replace('.', ',');

/** What the last count said about the tempo, in words. */
function deviationText(last: HitAlignment) {
  const off = Math.abs(last.deviation);
  const way = last.deviation > 0 ? 'später' : 'früher';
  if (off < 0.05) return 'Letzte Zählung genau im Takt.';
  return `Letzte Zählung ${seconds(off)} s ${way} als der Takt${
    last.realigned
      ? ' – bestätigt, Takt neu ausgerichtet'
      : last.waiting
        ? ' – noch eine, dann richtet sich der Takt aus'
        : ''
  }.`;
}

/**
 * The count lives in the app, so it survives a change of page. `compact`: at the exercise on
 * „Erfassen“, without heading and keyboard note.
 */
export function Counter({
  count,
  dispatch,
  compact = false,
  beat,
}: {
  count: number;
  dispatch: (action: CounterAction) => void;
  compact?: boolean;
  /**
   * A beat to count along (Push-Ups, Tobias 2026-11-18): it runs at its fixed tempo; two counts in
   * a row a repetition apart, both far off the same way, move the cycle (`confirmedShift` through
   * `useBeat.groupCount`, one person: every count a hit); near ones leave it alone.
   */
  beat?: MetronomePreset | undefined;
}) {
  const pattern = beat?.pattern ?? NO_PATTERN;
  const ticking = useBeat(pattern);
  const [last, setLast] = useState<HitAlignment | null>(null);

  function count1(at: number) {
    dispatch('increment');
    const hit = ticking.groupCount('zaehler', at, 1);
    if (hit) setLast(hit);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'Backspace') {
      event.preventDefault();
      dispatch('decrement');
    }
  }

  const Wrapper = compact ? 'div' : 'section';
  return (
    <Wrapper className={compact ? 'counter compact' : 'counter'}>
      {!compact && <h2>Zähler</h2>}
      <button
        type="button"
        className="counter-pad"
        aria-label={`Zählen, aktuell ${count}`}
        onKeyDown={onKeyDown}
        {...fastPress(count1)}
      >
        <span className="counter-value">{count}</span>
        <span className="muted">tippen = +1</span>
      </button>
      {beat && (
        <div className="counter-beat">
          <span className={ticking.flash ? 'beat-dot on' : 'beat-dot'} aria-hidden="true">
            {ticking.beat ? beatLabel(pattern, ticking.beat.index) : ''}
          </span>
          <button
            type="button"
            onClick={() => {
              if (ticking.running) ticking.stop();
              else {
                setLast(null);
                void ticking.start(beat.bpm);
              }
            }}
          >
            {ticking.running ? 'Takt aus' : `Takt an (${beat.bpm}/min)`}
          </button>
          <span className="muted">
            {last
              ? deviationText(last)
              : 'Bei jeder ganzen Wiederholung zählen; der Takt ist ein Richtwert.'}
          </span>
          {ticking.error && (
            <p className="message error" role="alert">
              {ticking.error}
            </p>
          )}
        </div>
      )}
      <div className="actions">
        <button type="button" {...fastPress(() => dispatch('decrement'))}>
          −1 (Korrektur)
        </button>
        <button type="button" {...fastPress(() => dispatch('reset'))}>
          Zurücksetzen
        </button>
      </div>
      {compact ? (
        <p className="muted">Beim Kind „Zähler“ antippen übernimmt den Stand.</p>
      ) : (
        <p className="muted">
          Zählt beim Berühren, nicht erst beim Loslassen. Tastatur: Leertaste/Enter = +1, Pfeil
          runter = −1.
        </p>
      )}
    </Wrapper>
  );
}
