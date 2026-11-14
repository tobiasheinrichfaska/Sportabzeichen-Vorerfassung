import { useState, type ReactNode } from 'react';
import { ageInYear } from '../../logic/age';
import { exerciseById, exerciseName, variantName } from '../../logic/catalog';
import { childLabel, groupMembers } from '../../logic/children';
import {
  STATUS_TEXT,
  detailsInUse,
  isPlanned,
  offerLabels,
  offerText,
  offersByChild,
  offersByExercise,
} from '../../logic/overview';
import { GROUPS } from '../../logic/reference';
import type { Athlete } from '../../logic/types';
import { GroupSwitch, NoGroup, NoLimits, type BookProps } from './GroupSwitch';
import { ExerciseDetails, ExpectedValues, PlanToggle } from './ExerciseBits';
import { SetupText } from './SetupPage';

const groupLabel = (id: string) => GROUPS.find((group) => group.id === id)?.label ?? id;

/** Page „Möglich“: which Abnahmen the children of the shown group can do. */
export function PossiblePage({ workbook, dispatch, catalog, group, chooseGroup }: BookProps) {
  const [view, setView] = useState<'exercise' | 'child'>('exercise');
  if (!group) return <NoGroup />;
  if (!catalog || catalog.requirements.length === 0) return <NoLimits />;
  const members = groupMembers(workbook, group.id);
  const name = (athleteId: string) => {
    const child = members.find((entry) => entry.id === athleteId);
    return child ? childLabel(child, members) : athleteId;
  };
  const track = (athleteId: string) =>
    members.find((entry) => entry.id === athleteId)?.track ?? 'regular';
  const toggle = (athleteId: string, exerciseId: string) =>
    dispatch({ type: 'togglePlan', athleteId, exerciseId });

  return (
    <section>
      <h2>Möglich – {group.name}</h2>
      <GroupSwitch workbook={workbook} group={group} chooseGroup={chooseGroup} />
      {members.length === 0 ? (
        <p className="message info">Die Gruppe hat noch keine Kinder (Seite „Kinder“).</p>
      ) : (
        <>
          <div className="chips" role="group" aria-label="Ansicht">
            <button
              type="button"
              className="chip"
              aria-pressed={view === 'exercise'}
              onClick={() => setView('exercise')}
            >
              je Übung
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={view === 'child'}
              onClick={() => setView('child')}
            >
              je Kind
            </button>
          </div>
          {view === 'exercise'
            ? offersByExercise(workbook, catalog, group.id).map(({ group: id, offers }) => (
                <div key={id}>
                  <h3>{groupLabel(id)}</h3>
                  {offers.length === 0 && (
                    <p className="message error">
                      Für keins der Kinder ist hier eine Übung möglich.
                    </p>
                  )}
                  {offers.map(({ exercise, possible, notPossible }) => {
                    const planned = possible.filter((c) =>
                      isPlanned(workbook, c.athleteId, exercise.id),
                    ).length;
                    return (
                      <details key={exercise.id} className="offer">
                        <summary>
                          <strong>{exercise.name}</strong>{' '}
                          <span className="muted">
                            {possible.length} von {members.length}
                            {planned > 0 && ` · ${planned} geplant`}
                          </span>
                        </summary>
                        <ul className="plain">
                          {possible.map((combination) => (
                            <li key={combination.athleteId} className="offer-child">
                              <strong>{name(combination.athleteId)}</strong>{' '}
                              {track(combination.athleteId) === 'mmb' && (
                                <span className="muted">({exerciseName(exercise, 'mmb')}) </span>
                              )}
                              <ExpectedValues
                                combination={combination}
                                exercise={exercise}
                                catalog={catalog}
                              />
                              <PlanToggle
                                planned={isPlanned(workbook, combination.athleteId, exercise.id)}
                                onToggle={() => toggle(combination.athleteId, exercise.id)}
                              />
                            </li>
                          ))}
                        </ul>
                        <details className="setup-inline">
                          <summary>Aufbau</summary>
                          <SetupText exercise={exercise} />
                        </details>
                        <ExerciseDetails
                          uses={detailsInUse(catalog, exercise.id, possible)}
                          nameOf={name}
                        />
                        {notPossible.length > 0 && (
                          <p className="muted">
                            Nicht möglich:{' '}
                            {notPossible
                              .map((c) => `${name(c.athleteId)} (${STATUS_TEXT[c.status]})`)
                              .join(', ')}
                          </p>
                        )}
                      </details>
                    );
                  })}
                </div>
              ))
            : offersByChild(workbook, catalog, group.id, members).map((offer) => (
                <ChildCard
                  key={offer.athlete.id}
                  offer={offer}
                  members={members}
                  year={workbook.year}
                >
                  {offer.blocked ? (
                    <p className="message error">{STATUS_TEXT[offer.blocked]}</p>
                  ) : (
                    offer.groups.map(({ group: id, possible }) => (
                      <div key={id} className="child-group">
                        <p className={possible.length === 0 ? 'message error' : undefined}>
                          <strong>{groupLabel(id)}</strong>
                          {possible.length === 0 && ': keine Übung möglich'}
                        </p>
                        {possible.map((c) => {
                          const exercise = exerciseById(catalog, c.exerciseId);
                          if (!exercise) return null;
                          const planned = isPlanned(workbook, c.athleteId, exercise.id);
                          return (
                            <details key={c.exerciseId} className="offer">
                              <summary>
                                {planned && <strong className="planned">✓ </strong>}
                                {offerText(
                                  exercise,
                                  offerLabels(c).map((l) => variantName(catalog, exercise.id, l)),
                                )}
                                {c.classDecisive && (
                                  <strong className="decisive"> (Klasse entscheidet)</strong>
                                )}
                              </summary>
                              <ExpectedValues
                                combination={c}
                                exercise={exercise}
                                catalog={catalog}
                              />
                              <PlanToggle
                                planned={planned}
                                onToggle={() => toggle(c.athleteId, exercise.id)}
                              />
                              <details className="setup-inline">
                                <summary>Aufbau</summary>
                                <SetupText exercise={exercise} />
                              </details>
                              <ExerciseDetails uses={detailsInUse(catalog, exercise.id, [c])} />
                            </details>
                          );
                        })}
                      </div>
                    ))
                  )}
                </ChildCard>
              ))}
        </>
      )}
    </section>
  );
}

function ChildCard({
  offer,
  members,
  year,
  children,
}: {
  offer: { athlete: Athlete };
  members: readonly Athlete[];
  year: number;
  children: ReactNode;
}) {
  const { athlete } = offer;
  return (
    <div className="card">
      <h3>
        {childLabel(athlete, members)}{' '}
        <span className="muted">
          {athlete.birthYear} · {ageInYear(athlete.birthYear, year)} Jahre ·{' '}
          {athlete.sex === 'w' ? 'Mädchen' : 'Junge'}
          {athlete.track === 'mmb' && ` · MmB ${athlete.classIds.join(', ') || 'Klasse offen'}`}
        </span>
      </h3>
      {children}
    </div>
  );
}
