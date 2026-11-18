import { useState } from 'react';
import type { Heat, HeatAction } from '../../logic/heat';
import {
  MILESTONE_EVERY,
  alignToGroup,
  beatLabel,
  completedRepetitions,
  type MetronomePreset,
  type GroupAlignment,
} from '../../logic/metronome';
import { fastPress } from '../fastPress';
import { useBeat } from '../useBeat';

const NO_PATTERN: readonly string[] = [];
const seconds = (value: number) => value.toFixed(1).replace('.', ',');

/** What the last round said about the beat, in words. */
function roundText(last: GroupAlignment, people: number) {
  const who = people === 1 ? 'Letzte Zählung' : `Letzte Runde (alle ${people})`;
  if (last.apart) return `${who} ${seconds(last.spread)} s auseinander – Takt bleibt.`;
  const off = Math.abs(last.deviation);
  if (off < 0.05) return `${who} genau im Takt.`;
  return `${who} ${seconds(off)} s ${last.deviation > 0 ? 'später' : 'früher'} als der Takt${
    last.realigned ? ' – Takt neu ausgerichtet' : ''
  }.`;
}

interface Person {
  id: string;
  label: string;
}

/**
 * A separate count per person (Tobias 2026-11-18: „für Push-Ups oder andere Wiederholungen
 * braucht es getrennte Zählfelder“). With a beat (Push-Ups) one shared beat runs. Counts are taken
 * in rounds — one per person; a full round moves the beat only when it lies together and is off
 * the beat as a whole (`alignToGroup`, Tobias: „nur, wenn alle Teilnehmer des Durchgangs zusammen
 * ausreichend abweichen und nah genug beieinander liegen“). With one person every count is a round.
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
  const [last, setLast] = useState<GroupAlignment | null>(null);
  // the counts of the round under way: the latest per person, on the audio clock
  const [round, setRound] = useState<Readonly<Record<string, number>>>({});

  function count(athleteId: string, at: number) {
    dispatch({ type: 'count', athleteId, delta: 1 });
    const { run } = ticking;
    const tap = ticking.toAudioTime(at);
    if (!run || tap === undefined) return;
    const next = { ...round, [athleteId]: tap };
    if (!people.every((person) => person.id in next)) {
      setRound(next);
      return;
    }
    const alignment = alignToGroup(run.start, run.bpm, pattern, Object.values(next));
    if (alignment.realigned) ticking.realign(alignment.start);
    setLast(alignment);
    setRound({});
  }

  const waiting = people.filter((person) => !(person.id in round)).length;

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
            {last
              ? roundText(last, people.length)
              : 'Bei jeder ganzen Wiederholung zählen; der Takt ist ein Richtwert.'}
            {ticking.running &&
              people.length > 1 &&
              waiting < people.length &&
              ` Runde: noch ${waiting} von ${people.length}.`}
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
