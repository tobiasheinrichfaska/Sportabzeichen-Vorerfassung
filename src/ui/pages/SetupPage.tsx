import { useState } from 'react';
import { exerciseDetails, helpParagraphs } from '../../logic/catalog';
import { childLabel, groupMembers } from '../../logic/children';
import { detailsInUse, offersByExercise, type DetailInUse } from '../../logic/overview';
import { GROUPS } from '../../logic/reference';
import type { Exercise } from '../../logic/types';
import { ExerciseDetails } from './ExerciseBits';
import type { BookProps } from './GroupSwitch';

/** How an exercise is set up and run, in our own words, with its official source. */
export function SetupText({ exercise }: { exercise: Exercise }) {
  const paragraphs = helpParagraphs(exercise.help.text);
  return (
    <div className="setup">
      {paragraphs.length === 0 ? (
        <p className="muted">Noch keine Beschreibung.</p>
      ) : (
        paragraphs.map((paragraph, index) => (
          <p key={index}>
            {paragraph.label && <strong>{paragraph.label}: </strong>}
            {paragraph.text}
          </p>
        ))
      )}
      <p className="muted">Quelle: {exercise.help.source}</p>
    </div>
  );
}

/** Page „Aufbau“: the setup of every exercise, or of those the shown group can do. */
export function SetupPage({ workbook, catalog, group }: BookProps) {
  const members = group ? groupMembers(workbook, group.id) : [];
  const canFilter = !!group && members.length > 0 && !!catalog && catalog.requirements.length > 0;
  const [onlyGroup, setOnlyGroup] = useState(true);
  if (!catalog)
    return <p className="message error">Kein Leistungskatalog für dieses Prüfungsjahr.</p>;
  // what the group can do, with the children per exercise (for the details of their variant)
  const ofGroup =
    canFilter && group
      ? new Map(
          offersByExercise(workbook, catalog, group.id).flatMap((g) =>
            g.offers.map((o) => [o.exercise.id, o.possible] as const),
          ),
        )
      : null;
  const filtered = onlyGroup && !!ofGroup;
  const shown = (exercise: Exercise) => !filtered || !!ofGroup?.has(exercise.id);
  const name = (athleteId: string) => {
    const child = members.find((entry) => entry.id === athleteId);
    return child ? childLabel(child, members) : athleteId;
  };
  // for the group: the variants its children do; for all exercises: every variant
  const uses = (exercise: Exercise): DetailInUse[] =>
    filtered
      ? detailsInUse(catalog, exercise.id, ofGroup?.get(exercise.id) ?? [])
      : exerciseDetails(catalog, exercise.id).map((detail) => ({ detail, athleteIds: [] }));

  return (
    <section>
      <h2>Übungsaufbau</h2>
      {canFilter && group && (
        <div className="chips" role="group" aria-label="Auswahl">
          <button
            type="button"
            className="chip"
            aria-pressed={onlyGroup}
            onClick={() => setOnlyGroup(true)}
          >
            Für {group.name}
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={!onlyGroup}
            onClick={() => setOnlyGroup(false)}
          >
            Alle Übungen
          </button>
        </div>
      )}
      {GROUPS.map((entry) => {
        const exercises = catalog.exercises.filter((e) => e.group === entry.id && shown(e));
        if (exercises.length === 0) return null;
        return (
          <div key={entry.id}>
            <h3>{entry.label}</h3>
            {exercises.map((exercise) => (
              <details key={exercise.id} className="offer">
                <summary>
                  <strong>{exercise.name}</strong>{' '}
                  <span className="muted">
                    {exercise.tracks.length === 2
                      ? 'regulär und MmB'
                      : exercise.tracks[0] === 'mmb'
                        ? 'nur MmB'
                        : 'regulär'}
                  </span>
                </summary>
                <SetupText exercise={exercise} />
                <ExerciseDetails uses={uses(exercise)} nameOf={filtered ? name : undefined} />
              </details>
            ))}
          </div>
        );
      })}
      <p className="muted">
        In eigenen Worten zusammengefasst; maßgeblich sind der DOSB-Prüfungswegweiser, der
        Erweiterte Leistungskatalog und das DBS-Handbuch. Was dort offen bleibt, steht nicht im
        Text. „Ausführung: …“ (Schrittfolgen der Koordinationsleiter, Elemente des Gerätturnens)
        gibt den DOSB wörtlich mit seinen Bildern wieder.
      </p>
    </section>
  );
}
