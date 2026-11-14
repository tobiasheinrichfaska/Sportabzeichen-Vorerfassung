import type { KeyboardEvent } from 'react';
import type { CounterAction } from '../logic/counter';
import { fastPress } from './fastPress';

/**
 * The count lives in the app, so it survives a change of page. `compact`: at the exercise on
 * „Erfassen“, without heading and keyboard note.
 */
export function Counter({
  count,
  dispatch,
  compact = false,
}: {
  count: number;
  dispatch: (action: CounterAction) => void;
  compact?: boolean;
}) {
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
        {...fastPress(() => dispatch('increment'))}
      >
        <span className="counter-value">{count}</span>
        <span className="muted">tippen = +1</span>
      </button>
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
