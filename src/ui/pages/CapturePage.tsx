import { useState } from 'react';
import {
  captureRows,
  checkAttempt,
  previewLevel,
  stationTools,
  variantsFor,
  type AttemptInput,
} from '../../logic/capture';
import type { CounterAction } from '../../logic/counter';
import { exerciseById, exerciseName, variantName } from '../../logic/catalog';
import { childLabel, groupMembers } from '../../logic/children';
import { NOTE_TEXT } from '../../logic/evaluation';
import { formatMeasure } from '../../logic/measure';
import { metronomePresetFor } from '../../logic/metronome';
import { detailsInUse, isPlanned, offersByExercise } from '../../logic/overview';
import { GROUPS, LEVELS, MEASURE_KINDS } from '../../logic/reference';
import {
  isRunning,
  readingParts,
  type StopwatchState,
  type TimedMeasure,
} from '../../logic/stopwatch';
import type { Level } from '../../logic/types';
import { newId } from '../../io/ids';
import { Counter } from '../Counter';
import { Metronome } from '../Metronome';
import { Stopwatch } from '../Stopwatch';
import type { FinishVideoControl } from '../useFinishVideo';
import { GroupSwitch, NoGroup, NoLimits, type BookProps } from './GroupSwitch';
import { ExerciseDetails, ExpectedValues } from './ExerciseBits';
import { SetupText } from './SetupPage';
import { SwimProofEditor } from './SwimProof';

/** Not an exercise: the station „Schwimmnachweis“ (Kap. 4.2), chosen like one. */
export const SWIM_STATION = 'schwimmnachweis';

const EMPTY: AttemptInput = { text: '', variant: undefined, classId: undefined };
const levelLabel = (level: Level | null | undefined) =>
  level === undefined
    ? ''
    : level === null
      ? 'unter Bronze'
      : (LEVELS.find((l) => l.id === level)?.label ?? level);

/** Page „Erfassen“: one exercise, the children who can do it, a value per attempt. */
export function CapturePage({
  workbook,
  dispatch,
  catalog,
  group,
  chooseGroup,
  exerciseId,
  chooseExercise,
  stopwatch,
  setStopwatch,
  finishVideo,
  count,
  countDispatch,
}: BookProps & {
  exerciseId: string | undefined;
  chooseExercise: (id: string) => void;
  stopwatch: StopwatchState;
  setStopwatch: (update: (current: StopwatchState) => StopwatchState) => void;
  finishVideo: FinishVideoControl;
  count: number;
  countDispatch: (action: CounterAction) => void;
}) {
  const [inputs, setInputs] = useState<Record<string, AttemptInput>>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  // which finish time went to which child (index → athlete id), shown on the time buttons
  const [takenBy, setTakenBy] = useState<Record<number, string>>({});
  // with plans for the exercise: only the children who do it, or everyone who could
  const [onlyPlanned, setOnlyPlanned] = useState(true);
  // a new key mounts the station's metronome anew — closing its fold stops the beat
  const [beatKey, setBeatKey] = useState(0);
  // the repetitions the station's metronome counted at „Ende“ (Curl-Up), to take over per child
  const [beatResult, setBeatResult] = useState<number | null>(null);
  if (!group) return <NoGroup />;
  if (!catalog || catalog.requirements.length === 0) return <NoLimits />;
  const members = groupMembers(workbook, group.id);
  const offers = offersByExercise(workbook, catalog, group.id);
  const exercise = exerciseId ? exerciseById(catalog, exerciseId) : undefined;
  const offered = offers.some((g) => g.offers.some((o) => o.exercise.id === exercise?.id));
  const allRows = exercise && offered ? captureRows(workbook, catalog, members, exercise) : [];
  const planned = (athleteId: string) => !!exercise && isPlanned(workbook, athleteId, exercise.id);
  const plannedCount = allRows.filter((row) => planned(row.athlete.id)).length;
  // planned children first; with „nur geplante“ only them
  const rows = [...allRows]
    .sort((a, b) => Number(planned(b.athlete.id)) - Number(planned(a.athlete.id)))
    .filter((row) => !onlyPlanned || plannedCount === 0 || planned(row.athlete.id));
  const timed = exercise?.measure === 'minSec' || exercise?.measure === 'secTenth';
  const tools = exercise ? stationTools(exercise) : [];
  const preset = exercise ? metronomePresetFor(exercise.id) : undefined;
  const beat = tools.includes('metronome') ? preset : undefined;
  const counterBeat = preset?.station === 'counter' ? preset : undefined;
  // the finish times, else the stopped time of a single run
  const stopped = !isRunning(stopwatch) && stopwatch.accumulated > 0 ? [stopwatch.accumulated] : [];
  const times =
    exercise && (exercise.measure === 'minSec' || exercise.measure === 'secTenth')
      ? (stopwatch.finishes.length > 0 ? stopwatch.finishes : stopped).map(
          (ms) => readingParts(exercise.measure as TimedMeasure, ms).card,
        )
      : [];

  const inputOf = (athleteId: string) => inputs[athleteId] ?? EMPTY;
  const setInput = (athleteId: string, patch: Partial<AttemptInput>) =>
    setInputs({ ...inputs, [athleteId]: { ...inputOf(athleteId), ...patch } });

  function save(athleteId: string) {
    const row = rows.find((entry) => entry.athlete.id === athleteId);
    if (!row || !exercise) return;
    const checked = checkAttempt(row, exercise, inputOf(athleteId));
    if (!checked.ok) {
      setErrors({ ...errors, [athleteId]: checked.errors });
      return;
    }
    dispatch({
      type: 'addMeasurement',
      measurement: {
        id: newId('m'),
        date: new Date().toISOString().slice(0, 10),
        ...checked.measurement,
      },
    });
    // keep class and variant for the next attempt, clear the value
    setInput(athleteId, { text: '' });
    setErrors({ ...errors, [athleteId]: [] });
  }

  return (
    <section>
      <h2>Erfassen – {group.name}</h2>
      <GroupSwitch workbook={workbook} group={group} chooseGroup={chooseGroup} />
      {offers.map(({ group: id, offers: list }) =>
        list.length === 0 ? null : (
          <div
            key={id}
            className="chips"
            role="group"
            aria-label={GROUPS.find((g) => g.id === id)?.label}
          >
            <span className="muted chip-label">{GROUPS.find((g) => g.id === id)?.label}</span>
            {list.map(({ exercise: entry }) => (
              <button
                key={entry.id}
                type="button"
                className="chip"
                aria-pressed={entry.id === exercise?.id}
                onClick={() => chooseExercise(entry.id)}
              >
                {entry.name}
                {(() => {
                  const n = members.filter((m) => isPlanned(workbook, m.id, entry.id)).length;
                  return n > 0 ? ` (${n})` : '';
                })()}
              </button>
            ))}
          </div>
        ),
      )}
      <div className="chips" role="group" aria-label="Nachweis">
        <span className="muted chip-label">Nachweis</span>
        <button
          type="button"
          className="chip"
          aria-pressed={exerciseId === SWIM_STATION}
          onClick={() => chooseExercise(SWIM_STATION)}
        >
          Schwimmnachweis
        </button>
      </div>
      {exerciseId === SWIM_STATION ? (
        <>
          <h3>Schwimmnachweis</h3>
          <p className="muted">
            Je Kind antippen, womit es {workbook.year} geschwommen ist (angeboten wird, was zum
            Alter passt). Schwimmen (Ausdauer) oder ab Bronze Schwimmen (Schnelligkeit), hier
            erfasst, zählt von selbst. Frühere Nachweise: „Ergebnis“ › „Je Kind“.
          </p>
          <details className="setup-inline tool">
            <summary>Stoppuhr</summary>
            <Stopwatch
              state={stopwatch}
              setState={setStopwatch}
              compact
              kind="minSec"
              video={finishVideo}
            />
          </details>
          <ul className="rows">
            {members.map((child) => (
              <li key={child.id} className="row capture">
                <strong>{childLabel(child, members)}</strong>
                <SwimProofEditor
                  child={child}
                  workbook={workbook}
                  catalog={catalog}
                  dispatch={dispatch}
                  compact
                />
              </li>
            ))}
          </ul>
        </>
      ) : !exercise || !offered ? (
        <p className="muted">
          Eine Übung wählen – angezeigt werden nur Übungen, die mindestens ein Kind der Gruppe
          ablegen kann.
        </p>
      ) : (
        <>
          <h3>
            {exercise.name}{' '}
            <span className="muted">
              ({MEASURE_KINDS[exercise.measure].label}, z. B.{' '}
              {MEASURE_KINDS[exercise.measure].example})
            </span>
          </h3>
          <details className="setup-inline">
            <summary>Aufbau ansehen</summary>
            <SetupText exercise={exercise} />
          </details>
          <ExerciseDetails
            uses={detailsInUse(
              catalog,
              exercise.id,
              rows.map((row) => row.combination),
            )}
            nameOf={(id) => {
              const child = members.find((m) => m.id === id);
              return child ? childLabel(child, members) : id;
            }}
          />
          {/* the tools of the exercise, open at hand while it runs (Tobias 2026-11-11) */}
          {tools.includes('stopwatch') && (
            <details className="setup-inline tool" open>
              <summary>Stoppuhr</summary>
              <Stopwatch
                state={stopwatch}
                setState={setStopwatch}
                compact
                kind={exercise.measure as TimedMeasure}
                video={finishVideo}
              />
            </details>
          )}
          {tools.includes('counter') && (
            <details className="setup-inline tool" open>
              <summary>Zähler: {count}</summary>
              <Counter count={count} dispatch={countDispatch} compact beat={counterBeat} />
            </details>
          )}
          {beat && (
            <details
              className="setup-inline tool"
              open
              onToggle={(event) => {
                if (!event.currentTarget.open) setBeatKey((key) => key + 1);
              }}
            >
              <summary>
                Metronom: {beat.bpm} Schläge pro Minute (
                {beat.binding === 'required' ? 'Pflichttakt' : 'Richtwert'})
              </summary>
              <Metronome
                key={`${beat.id}-${beatKey}`}
                initialPresetId={beat.id}
                compact
                onResult={setBeatResult}
              />
            </details>
          )}
          {plannedCount > 0 && (
            <div className="chips" role="group" aria-label="Kinder">
              <button
                type="button"
                className="chip"
                aria-pressed={onlyPlanned}
                onClick={() => setOnlyPlanned(true)}
              >
                Geplante ({plannedCount})
              </button>
              <button
                type="button"
                className="chip"
                aria-pressed={!onlyPlanned}
                onClick={() => setOnlyPlanned(false)}
              >
                Alle, die können ({allRows.length})
              </button>
            </div>
          )}
          <ul className="rows">
            {rows.map((row) => {
              const input = inputOf(row.athlete.id);
              const variants = variantsFor(row, input.classId);
              const preview = previewLevel(row, catalog, workbook.year, input);
              return (
                <li key={row.athlete.id} className="row capture">
                  <div className="capture-head">
                    <strong>{childLabel(row.athlete, members)}</strong>
                    {planned(row.athlete.id) && <span className="planned"> ✓ geplant</span>}
                    {row.athlete.track === 'mmb' && (
                      <span className="muted"> {exerciseName(exercise, 'mmb')}</span>
                    )}
                  </div>
                  <ExpectedValues
                    combination={row.combination}
                    exercise={exercise}
                    catalog={catalog}
                  />
                  {row.classes.length > 0 && (
                    <div className="chips" role="group" aria-label="Klasse">
                      <span className="muted chip-label">Klasse:</span>
                      {row.classes.map((classId) => (
                        <button
                          key={classId}
                          type="button"
                          className="chip"
                          aria-pressed={input.classId === classId}
                          onClick={() => setInput(row.athlete.id, { classId, variant: undefined })}
                        >
                          {classId}
                        </button>
                      ))}
                    </div>
                  )}
                  {variants.length > 0 && (
                    <div className="chips" role="group" aria-label="Variante">
                      {variants.map((label) => (
                        <button
                          key={label}
                          type="button"
                          className="chip"
                          aria-pressed={input.variant === label}
                          onClick={() => setInput(row.athlete.id, { variant: label })}
                        >
                          {variantName(catalog, exercise.id, label)}
                        </button>
                      ))}
                    </div>
                  )}
                  <form
                    className="entry-row"
                    onSubmit={(event) => {
                      event.preventDefault();
                      save(row.athlete.id);
                    }}
                  >
                    {exercise.measure === 'level' ? (
                      <div className="chips" role="group" aria-label="Stufe">
                        {LEVELS.map((level) => (
                          <button
                            key={level.id}
                            type="button"
                            className="chip"
                            aria-pressed={input.text === level.id}
                            onClick={() => setInput(row.athlete.id, { text: level.id })}
                          >
                            {level.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input
                        aria-label={`Wert für ${row.athlete.firstName}`}
                        value={input.text}
                        inputMode={
                          exercise.measure === 'count' || exercise.measure === 'points'
                            ? 'numeric'
                            : 'decimal'
                        }
                        placeholder={MEASURE_KINDS[exercise.measure].example}
                        onChange={(event) => setInput(row.athlete.id, { text: event.target.value })}
                      />
                    )}
                    {timed &&
                      times.map((time, index) => {
                        const holder = takenBy[index];
                        return (
                          <button
                            key={index}
                            type="button"
                            className="chip"
                            aria-pressed={holder === row.athlete.id}
                            title="Zeit der Stoppuhr übernehmen"
                            onClick={() => {
                              setInput(row.athlete.id, { text: time });
                              setTakenBy({ ...takenBy, [index]: row.athlete.id });
                            }}
                          >
                            ⏱ {index + 1}) {time}
                            {holder && holder !== row.athlete.id ? ' ✓' : ''}
                          </button>
                        );
                      })}
                    {exercise.measure === 'count' && (
                      <button
                        type="button"
                        onClick={() => setInput(row.athlete.id, { text: String(count) })}
                      >
                        Zähler ({count})
                      </button>
                    )}
                    {beat && beatResult !== null && (
                      <button
                        type="button"
                        onClick={() => setInput(row.athlete.id, { text: String(beatResult) })}
                      >
                        Metronom ({beatResult})
                      </button>
                    )}
                    <button type="submit">Speichern</button>
                    {preview !== undefined && (
                      <span className={`level level-${preview ?? 'none'}`}>
                        {levelLabel(preview)}
                      </span>
                    )}
                  </form>
                  {(errors[row.athlete.id] ?? []).length > 0 && (
                    <div className="message error" role="alert">
                      {(errors[row.athlete.id] ?? []).map((error) => (
                        <p key={error}>{error}</p>
                      ))}
                    </div>
                  )}
                  {row.attempts.length > 0 && (
                    <ul className="plain attempts">
                      {row.attempts.map(({ measurement, result }) => (
                        <li key={measurement.id}>
                          {formatMeasure(exercise.measure, measurement.value)}
                          {measurement.variant &&
                            ` · ${variantName(catalog, exercise.id, measurement.variant)}`}
                          {measurement.classId && ` · Klasse ${measurement.classId}`}{' '}
                          {'note' in result ? (
                            <span className="message error">{NOTE_TEXT[result.note]}</span>
                          ) : (
                            <span className={`level level-${result.level ?? 'none'}`}>
                              {levelLabel(result.level)}
                            </span>
                          )}{' '}
                          <button
                            type="button"
                            className="link-button"
                            aria-label="Versuch löschen"
                            onClick={() => {
                              if (window.confirm('Diesen Versuch löschen?')) {
                                dispatch({
                                  type: 'removeMeasurement',
                                  measurementId: measurement.id,
                                });
                              }
                            }}
                          >
                            löschen
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
