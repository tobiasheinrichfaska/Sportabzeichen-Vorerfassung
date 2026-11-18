import { useState } from 'react';
import { captureRows, checkAttempt, variantsFor, type AttemptInput } from '../../logic/capture';
import { exerciseById, variantName } from '../../logic/catalog';
import { childLabel, groupMembers } from '../../logic/children';
import { clipFor } from '../../logic/finishVideo';
import {
  heatResults,
  heatTool,
  withoutResult,
  type Heat,
  type HeatAction,
  type HeatClock,
} from '../../logic/heat';
import { metronomePresetFor } from '../../logic/metronome';
import { isPlanned, offersByExercise } from '../../logic/overview';
import { GROUPS } from '../../logic/reference';
import {
  STOPWATCH_RESET,
  formatStopwatch,
  isRunning,
  readingParts,
  setFinish,
  type StopwatchState,
  type TimedMeasure,
} from '../../logic/stopwatch';
import { newId } from '../../io/ids';
import { FinishPictures } from '../FinishVideo';
import { Stopwatch } from '../Stopwatch';
import type { FinishVideoControl } from '../useFinishVideo';
import { GroupSwitch, NoGroup, NoLimits, type BookProps } from './GroupSwitch';
import { CounterPads, HeatMetronome } from './HeatTools';

export interface HeatProps extends BookProps {
  heat: Heat;
  heatDispatch: (action: HeatAction) => void;
  stopwatch: StopwatchState;
  setStopwatch: (update: (current: StopwatchState) => StopwatchState) => void;
  finishVideo: FinishVideoControl;
}

const clockOf = (stopwatch: StopwatchState): HeatClock => ({
  finishes: stopwatch.finishes,
  stopped: isRunning(stopwatch) ? null : stopwatch.accumulated,
});

/**
 * Page „Durchgang“ (area „Abnahme“): one exercise, the people of this run, the tool that measures
 * it — stopwatch (one „Zieleinlauf“ or a button per name), separate counters, or the metronome
 * with an „Ende“ per person. What is not assigned at once is assigned on „Zuordnen“.
 */
export function HeatPage(props: HeatProps) {
  const { workbook, catalog, group, chooseGroup, heat, heatDispatch, stopwatch, setStopwatch } =
    props;
  const [blocked, setBlocked] = useState(false);
  if (!group) return <NoGroup />;
  if (!catalog || catalog.requirements.length === 0) return <NoLimits />;
  const members = groupMembers(workbook, group.id);
  const offers = offersByExercise(workbook, catalog, group.id);
  const exercise = exerciseById(catalog, heat.exerciseId);
  const offered = offers.some((g) => g.offers.some((o) => o.exercise.id === exercise?.id));
  const rows = exercise && offered ? captureRows(workbook, catalog, members, exercise) : [];
  const label = (id: string) => {
    const child = members.find((m) => m.id === id);
    return child ? childLabel(child, members) : id;
  };
  const people = heat.athleteIds
    .filter((id) => rows.some((row) => row.athlete.id === id))
    .map((id) => ({ id, label: label(id) }));
  const planned = exercise
    ? rows.filter((row) => isPlanned(workbook, row.athlete.id, exercise.id))
    : [];
  const tool = exercise ? heatTool(exercise) : 'none';
  const results = exercise ? heatResults(heat, exercise, clockOf(stopwatch)) : [];
  const open = results.filter((r) => r.athleteId === null).length;
  const unsaved = results.filter((r) => !r.saved).length;

  function again() {
    setStopwatch(() => STOPWATCH_RESET);
    props.finishVideo.clear();
    heatDispatch({ type: 'again' });
  }

  return (
    <section>
      <h2>Durchgang – {group.name}</h2>
      <GroupSwitch workbook={workbook} group={group} chooseGroup={chooseGroup} />
      {/* folded once an exercise is chosen, so the tool stays in reach on a phone */}
      <details className="setup-inline" open={!exercise || !offered}>
        <summary>
          {exercise && offered ? `Übung: ${exercise.name} – ändern` : 'Übung wählen'}
        </summary>
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
                  onClick={() => {
                    if (entry.id === heat.exerciseId) return;
                    // results not saved yet are never dropped by a tap on another exercise
                    if (unsaved > 0) {
                      setBlocked(true);
                      return;
                    }
                    setBlocked(false);
                    again();
                    heatDispatch({ type: 'exercise', exerciseId: entry.id });
                  }}
                >
                  {entry.name}
                </button>
              ))}
            </div>
          ),
        )}
      </details>
      {blocked && unsaved > 0 && (
        <p className="message error" role="alert">
          Dieser Durchgang hat {unsaved} nicht gespeicherte Ergebnisse – erst auf „Zuordnen“
          speichern oder unten „Neuer Durchgang“ (verwirft sie).
        </p>
      )}
      {!exercise || !offered ? (
        <p className="muted">
          Eine Übung wählen, dann die Personen dieses Durchgangs – eine oder mehrere.
        </p>
      ) : (
        <>
          <h3>{exercise.name}</h3>
          <div className="chips" role="group" aria-label="Wer macht mit">
            <span className="muted chip-label">Wer macht mit:</span>
            {rows.map((row) => (
              <button
                key={row.athlete.id}
                type="button"
                className="chip plan"
                aria-pressed={heat.athleteIds.includes(row.athlete.id)}
                onClick={() => heatDispatch({ type: 'toggleAthlete', athleteId: row.athlete.id })}
              >
                {heat.athleteIds.includes(row.athlete.id) ? '✓ ' : ''}
                {label(row.athlete.id)}
              </button>
            ))}
          </div>
          <div className="chips">
            {planned.length > 0 && (
              <button
                type="button"
                className="chip"
                onClick={() =>
                  heatDispatch({
                    type: 'setAthletes',
                    athleteIds: planned.map((row) => row.athlete.id),
                  })
                }
              >
                Geplante ({planned.length})
              </button>
            )}
            <button
              type="button"
              className="chip"
              onClick={() =>
                heatDispatch({ type: 'setAthletes', athleteIds: rows.map((row) => row.athlete.id) })
              }
            >
              Alle ({rows.length})
            </button>
          </div>
          {people.length === 0 ? (
            <p className="muted">Mindestens eine Person wählen.</p>
          ) : (
            <HeatTool {...props} tool={tool} people={people} results={results} />
          )}
          {results.length > 0 && (
            <p className={open > 0 ? 'message info' : 'muted'}>
              {results.length} {results.length === 1 ? 'Ergebnis' : 'Ergebnisse'}
              {open > 0 && `, ${open} noch zuzuordnen`}
              {unsaved > 0
                ? ` – speichern auf „Zuordnen“ (Rad: „Abnahme“).`
                : ' – alle gespeichert.'}
            </p>
          )}
          {(results.length > 0 || stopwatch.accumulated > 0) && (
            <button type="button" onClick={again}>
              Neuer Durchgang (gleiche Personen)
              {unsaved > 0 && ` – verwirft ${unsaved} nicht gespeicherte`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function HeatTool({
  heat,
  heatDispatch,
  stopwatch,
  setStopwatch,
  finishVideo,
  catalog,
  tool,
  people,
  results,
}: HeatProps & {
  tool: ReturnType<typeof heatTool>;
  people: { id: string; label: string }[];
  results: ReturnType<typeof heatResults>;
}) {
  const exercise = catalog ? exerciseById(catalog, heat.exerciseId) : undefined;
  if (!exercise) return null;
  const preset = metronomePresetFor(exercise.id);
  if (tool === 'metronome' && preset) {
    return <HeatMetronome heat={heat} dispatch={heatDispatch} people={people} preset={preset} />;
  }
  if (tool === 'counter') {
    return (
      <CounterPads
        heat={heat}
        dispatch={heatDispatch}
        people={people}
        beat={preset?.station === 'counter' ? preset : undefined}
      />
    );
  }
  if (tool === 'stopwatch') {
    const names = heat.finishMode === 'names' && people.length > 1;
    const running = new Set(withoutResult(heat, results));
    return (
      <>
        {people.length > 1 && (
          <div className="chips" role="group" aria-label="Ziel">
            <button
              type="button"
              className="chip"
              aria-pressed={heat.finishMode === 'one'}
              onClick={() => heatDispatch({ type: 'finishMode', mode: 'one' })}
            >
              Ein Zielknopf
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={heat.finishMode === 'names'}
              onClick={() => heatDispatch({ type: 'finishMode', mode: 'names' })}
            >
              Name als Zielknopf
            </button>
          </div>
        )}
        <Stopwatch
          state={stopwatch}
          setState={setStopwatch}
          compact
          kind={exercise.measure as TimedMeasure}
          video={finishVideo}
          finishNames={names ? people.filter((p) => running.has(p.id)) : undefined}
          onNamedFinish={(athleteId, finishIndex) =>
            heatDispatch({ type: 'assign', finishIndex, athleteId })
          }
          onReset={() => heatDispatch({ type: 'again' })}
          note={
            <p className="muted">
              {people.length === 1
                ? 'Eine Person: „Stopp“ oder „Zieleinlauf“ – die Zeit gehört ihr.'
                : names
                  ? 'Den Namen antippen, wenn die Person die Linie erreicht – gut, wenn sie einzeln ankommen. Bei knappem Einlauf besser „Ein Zielknopf“.'
                  : '„Zieleinlauf“ je Person – am genauesten; zugeordnet wird danach auf „Zuordnen“, bei knappem Einlauf mit dem Zielbild.'}
            </p>
          }
        />
      </>
    );
  }
  return (
    <p className="muted">
      Für diese Übung gibt es kein Werkzeug – die Werte direkt auf „Erfassen“ eintragen.
    </p>
  );
}

/**
 * Page „Zuordnen“: the results of the run — a finish without a person gets one (with its
 * Zielbilder), class and variant are chosen where they decide, and each result is saved as a
 * measurement.
 */
export function AssignPage(props: HeatProps) {
  const { workbook, dispatch, catalog, group, heat, heatDispatch, stopwatch, setStopwatch } = props;
  const [inputs, setInputs] = useState<Record<string, Omit<AttemptInput, 'text'>>>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [showing, setShowing] = useState<number | null>(null);
  if (!group) return <NoGroup />;
  if (!catalog || catalog.requirements.length === 0) return <NoLimits />;
  const exercise = exerciseById(catalog, heat.exerciseId);
  if (!exercise) {
    return (
      <section>
        <h2>Zuordnen</h2>
        <p className="muted">Noch kein Durchgang – Rad: „Abnahme“ › „Durchgang“.</p>
      </section>
    );
  }
  const members = groupMembers(workbook, group.id);
  const rows = captureRows(workbook, catalog, members, exercise);
  const results = heatResults(heat, exercise, clockOf(stopwatch));
  const free = withoutResult(heat, results);
  const label = (id: string) => {
    const child = members.find((m) => m.id === id);
    return child ? childLabel(child, members) : id;
  };
  const choiceOf = (key: string) => inputs[key] ?? { variant: undefined, classId: undefined };
  const kind = exercise.measure as TimedMeasure;

  function save(key: string): boolean {
    const result = results.find((r) => r.key === key);
    const row = rows.find((entry) => entry.athlete.id === result?.athleteId);
    if (!result || !row || !exercise || result.saved) return false;
    const checked = checkAttempt(row, exercise, { text: result.text, ...choiceOf(key) });
    if (!checked.ok) {
      setErrors((current) => ({ ...current, [key]: checked.errors }));
      return false;
    }
    dispatch({
      type: 'addMeasurement',
      measurement: {
        id: newId('m'),
        date: new Date().toISOString().slice(0, 10),
        ...checked.measurement,
      },
    });
    heatDispatch({ type: 'saved', key });
    setErrors((current) => ({ ...current, [key]: [] }));
    return true;
  }

  const ready = results.filter((r) => r.athleteId !== null && !r.saved);

  return (
    <section>
      <h2>Zuordnen – {exercise.name}</h2>
      {results.length === 0 ? (
        <p className="muted">Noch keine Ergebnisse in diesem Durchgang.</p>
      ) : (
        <ul className="rows">
          {results.map((result) => {
            const clip =
              result.finishIndex !== undefined
                ? clipFor(props.finishVideo.video, result.finishIndex)
                : undefined;
            const row = rows.find((entry) => entry.athlete.id === result.athleteId);
            const choice = choiceOf(result.key);
            const variants = row ? variantsFor(row, choice.classId) : [];
            const choose = (patch: Partial<Omit<AttemptInput, 'text'>>) =>
              setInputs((current) => ({ ...current, [result.key]: { ...choice, ...patch } }));
            return (
              <li key={result.key} className="row capture">
                <div className="capture-head">
                  {result.finishIndex !== undefined && <span>{result.finishIndex + 1}) </span>}
                  <strong className="assign-value">{result.text}</strong>{' '}
                  {result.athleteId ? (
                    <>
                      → <strong>{label(result.athleteId)}</strong>{' '}
                      {result.saved ? (
                        <span className="planned"> ✓ gespeichert</span>
                      ) : (
                        result.finishIndex !== undefined &&
                        heat.athleteIds.length > 1 && (
                          <button
                            type="button"
                            className="link-button"
                            onClick={() =>
                              heatDispatch({
                                type: 'assign',
                                finishIndex: result.finishIndex ?? -1,
                                athleteId: null,
                              })
                            }
                          >
                            ändern
                          </button>
                        )
                      )}
                    </>
                  ) : (
                    <span className="muted">wer?</span>
                  )}{' '}
                  {clip && (
                    <button
                      type="button"
                      className="link-button"
                      aria-expanded={showing === result.finishIndex}
                      onClick={() =>
                        setShowing(
                          showing === result.finishIndex ? null : (result.finishIndex ?? null),
                        )
                      }
                    >
                      {showing === result.finishIndex ? 'Zielbilder schließen' : 'Zielbilder'}
                    </button>
                  )}
                </div>
                {clip && showing === result.finishIndex && result.finishIndex !== undefined && (
                  <FinishPictures
                    clip={clip}
                    describe={(ms) => (
                      <>
                        {formatStopwatch(ms)} – {readingParts(kind, ms).card}
                      </>
                    )}
                    onTake={(ms) =>
                      setStopwatch((current) => setFinish(current, result.finishIndex ?? -1, ms))
                    }
                  />
                )}
                {result.athleteId === null && result.finishIndex !== undefined && (
                  <div className="chips" role="group" aria-label={`Zeit ${result.text} für`}>
                    {free.map((id) => (
                      <button
                        key={id}
                        type="button"
                        className="chip"
                        onClick={() =>
                          heatDispatch({
                            type: 'assign',
                            finishIndex: result.finishIndex ?? -1,
                            athleteId: id,
                          })
                        }
                      >
                        {label(id)}
                      </button>
                    ))}
                    {free.length === 0 && (
                      <span className="muted">Alle Personen haben schon eine Zeit.</span>
                    )}
                  </div>
                )}
                {row && !result.saved && (
                  <>
                    {row.classes.length > 0 && (
                      <div className="chips" role="group" aria-label="Klasse">
                        <span className="muted chip-label">Klasse:</span>
                        {row.classes.map((classId) => (
                          <button
                            key={classId}
                            type="button"
                            className="chip"
                            aria-pressed={choice.classId === classId}
                            onClick={() => choose({ classId, variant: undefined })}
                          >
                            {classId}
                          </button>
                        ))}
                      </div>
                    )}
                    {variants.length > 0 && (
                      <div className="chips" role="group" aria-label="Variante">
                        {variants.map((entry) => (
                          <button
                            key={entry}
                            type="button"
                            className="chip"
                            aria-pressed={choice.variant === entry}
                            onClick={() => choose({ variant: entry })}
                          >
                            {variantName(catalog, exercise.id, entry)}
                          </button>
                        ))}
                      </div>
                    )}
                    <button type="button" onClick={() => save(result.key)}>
                      Speichern
                    </button>
                  </>
                )}
                {(errors[result.key] ?? []).length > 0 && (
                  <div className="message error" role="alert">
                    {(errors[result.key] ?? []).map((error) => (
                      <p key={error}>{error}</p>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {ready.length > 1 && (
        <button
          type="button"
          onClick={() => {
            for (const result of ready) save(result.key);
          }}
        >
          Alle zugeordneten speichern ({ready.length})
        </button>
      )}
      <p className="muted">
        Gespeichert wird wie auf „Erfassen“ (mit Datum); danach stehen die Werte bei „Je Kind“ und
        „Gruppe“.
      </p>
    </section>
  );
}
