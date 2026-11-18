import { useState } from 'react';
import type { Heat, HeatAction } from '../../logic/heat';
import {
  MILESTONE_EVERY,
  alignToTap,
  beatLabel,
  completedRepetitions,
  type MetronomePreset,
  type TapAlignment,
} from '../../logic/metronome';
import { fastPress } from '../fastPress';
import { useBeat } from '../useBeat';

const NO_PATTERN: readonly string[] = [];
const seconds = (value: number) => value.toFixed(1).replace('.', ',');

interface Person {
  id: string;
  label: string;
}

/**
 * A separate count per person (Tobias 2026-11-18: „für Push-Ups oder andere Wiederholungen
 * braucht es getrennte Zählfelder“). With a beat (Push-Ups) one shared beat runs; it is realigned
 * to a count only while one person counts — with several, whose count would it follow?
 */
export function CounterPads({
  heat,
  dispatch,
  people,
  beat,
}: {
  heat: Heat;
  dispatch: (action: HeatAction) => void;
  people: readonly Person[];
  beat: MetronomePreset | undefined;
}) {
  const pattern = beat?.pattern ?? NO_PATTERN;
  const ticking = useBeat(pattern);
  const [last, setLast] = useState<TapAlignment | null>(null);
  const alone = people.length === 1;

  function count(athleteId: string, at: number) {
    dispatch({ type: 'count', athleteId, delta: 1 });
    const { run } = ticking;
    const tap = ticking.toAudioTime(at);
    if (!run || tap === undefined || !alone) return;
    const alignment = alignToTap(run.start, run.bpm, pattern, tap);
    if (alignment.realigned) ticking.realign(alignment.start);
    setLast(alignment);
  }

  return (
    <div className="heat-counter">
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
            {!alone
              ? 'Der Takt läuft fest (mehrere zählen gleichzeitig).'
              : last
                ? `Letzte Zählung ${seconds(Math.abs(last.deviation))} s ${
                    last.deviation > 0 ? 'später' : 'früher'
                  } als der Takt${last.realigned ? ' – Takt neu ausgerichtet' : ''}.`
                : 'Bei jeder ganzen Wiederholung zählen; der Takt ist ein Richtwert.'}
          </span>
          {ticking.error && (
            <p className="message error" role="alert">
              {ticking.error}
            </p>
          )}
        </div>
      )}
      <div className="pads">
        {people.map((person) => (
          <div key={person.id} className="pad">
            <button
              type="button"
              className="counter-pad small"
              aria-label={`${person.label} zählen, aktuell ${heat.counts[person.id] ?? 0}`}
              {...fastPress((at) => count(person.id, at))}
            >
              <span className="pad-name">{person.label}</span>
              <span className="counter-value">{heat.counts[person.id] ?? 0}</span>
            </button>
            <button
              type="button"
              {...fastPress(() => dispatch({ type: 'count', athleteId: person.id, delta: -1 }))}
            >
              −1
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The metronome of a run (Curl-Up): one beat for everybody; each person gets an „Ende“ button
 * that keeps their whole repetitions at that moment. When the last one has ended, the beat stops.
 */
export function HeatMetronome({
  heat,
  dispatch,
  people,
  preset,
}: {
  heat: Heat;
  dispatch: (action: HeatAction) => void;
  people: readonly Person[];
  preset: MetronomePreset;
}) {
  const ticking = useBeat(preset.pattern);
  const beats = ticking.beat ? ticking.beat.index + 1 : 0;
  const repetitions = completedRepetitions(preset.pattern, beats);
  const open = people.filter((person) => !(person.id in heat.ended));

  return (
    <div className="metronome compact">
      <div className={ticking.flash ? 'beat on' : 'beat'} aria-live="off">
        {ticking.beat ? beatLabel(preset.pattern, ticking.beat.index) : '–'}
      </div>
      <p>
        <strong>{repetitions}</strong> Wiederholungen · {preset.bpm} Schläge pro Minute (
        {preset.binding === 'required' ? 'Pflichttakt' : 'Richtwert'})
      </p>
      <div className="actions">
        {ticking.running ? (
          open.map((person) => (
            <button
              key={person.id}
              type="button"
              className="big-button finish-name"
              {...fastPress(() => {
                dispatch({ type: 'end', athleteId: person.id, repetitions });
                if (open.length === 1) ticking.stop();
              })}
            >
              Ende {person.label}
            </button>
          ))
        ) : (
          <button
            type="button"
            className="big-button"
            disabled={people.length === 0 || open.length === 0}
            onClick={() => void ticking.start(preset.bpm)}
          >
            Start
          </button>
        )}
        {ticking.running && (
          <button type="button" onClick={() => ticking.stop()}>
            Abbrechen
          </button>
        )}
      </div>
      {ticking.error && (
        <p className="message error" role="alert">
          {ticking.error}
        </p>
      )}
      {Object.keys(heat.ended).length > 0 && (
        <ul className="plain">
          {people
            .filter((person) => person.id in heat.ended)
            .map((person) => (
              <li key={person.id}>
                {person.label}: <strong>{heat.ended[person.id]}</strong>{' '}
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'correct', athleteId: person.id, delta: -1 })}
                >
                  −1
                </button>{' '}
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'correct', athleteId: person.id, delta: 1 })}
                >
                  +1
                </button>
              </li>
            ))}
        </ul>
      )}
      <p className="muted">
        „Ende …“ beim ersten Fehler der Person: die Wiederholung, die da läuft, zählt nicht. Nach je{' '}
        {MILESTONE_EVERY} Wiederholungen ein tiefer, langer Ton. Auf iPhone/iPad muss der
        Stummschalter aus sein.
      </p>
    </div>
  );
}
