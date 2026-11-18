import { exerciseById } from '../../logic/catalog';
import { childLabel, groupMembers } from '../../logic/children';
import {
  STATUS_TEXT,
  isPlanned,
  offersByChild,
  offersByExercise,
  planOverview,
} from '../../logic/overview';
import { GROUPS } from '../../logic/reference';
import type { GroupId } from '../../logic/types';
import { GroupSwitch, NoGroup, NoLimits, type BookProps } from './GroupSwitch';

const groupLabel = (id: GroupId) => GROUPS.find((group) => group.id === id)?.label ?? id;

/**
 * Page „Planen“ (area „Vorbereiten“): who of the shown group does which exercise. Quick to tap —
 * „Alle, die können“ per exercise, a chip per child — with the stations of the day and the gaps
 * on top. Expected values, setup and Ausführung stay on „Möglich“ (area „Übungen“).
 */
export function PlanPage({ workbook, dispatch, catalog, group, chooseGroup }: BookProps) {
  if (!group) return <NoGroup />;
  if (!catalog || catalog.requirements.length === 0) return <NoLimits />;
  const members = groupMembers(workbook, group.id);
  const name = (athleteId: string) => {
    const child = members.find((entry) => entry.id === athleteId);
    return child ? childLabel(child, members) : athleteId;
  };
  const { stations, gaps, stale } = planOverview(workbook, catalog, group.id, members);
  const blocked = offersByChild(workbook, catalog, group.id, members).filter((o) => o.blocked);
  const gapOf = (athleteId: string, id: GroupId) =>
    gaps.some((gap) => gap.athleteId === athleteId && gap.groups.includes(id));
  const setPlans = (athleteIds: string[], exerciseId: string, planned: boolean) =>
    dispatch({ type: 'setPlans', athleteIds, exerciseId, planned });

  return (
    <section>
      <h2>Planen – {group.name}</h2>
      <GroupSwitch workbook={workbook} group={group} chooseGroup={chooseGroup} />
      {members.length === 0 ? (
        <p className="message info">Die Gruppe hat noch keine Kinder (Seite „Kinder“).</p>
      ) : (
        <>
          <div className="card plan-summary">
            <h3>Stationen am Tag ({stations.length})</h3>
            {stations.length === 0 ? (
              <p className="muted">Noch nichts geplant.</p>
            ) : (
              <ul className="plain">
                {stations.map(({ exercise, athleteIds }) => (
                  <li key={exercise.id}>
                    <strong>{exercise.name}</strong>{' '}
                    <span className="muted">
                      ({groupLabel(exercise.group)}) · {athleteIds.length}{' '}
                      {athleteIds.length === 1 ? 'Kind' : 'Kinder'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {gaps.length > 0 ? (
              <div className="message error">
                <p>
                  <strong>Noch nichts geplant in:</strong>
                </p>
                {gaps.map((gap) => (
                  <p key={gap.athleteId}>
                    {name(gap.athleteId)} – {gap.groups.map(groupLabel).join(', ')}
                  </p>
                ))}
              </div>
            ) : (
              blocked.length < members.length && (
                <p className="message info">
                  Jedes Kind hat in jeder Disziplingruppe eine Übung geplant.
                </p>
              )
            )}
            {blocked.length > 0 && (
              <p className="muted">
                Kann noch nichts:{' '}
                {blocked
                  .map(
                    (o) => `${name(o.athlete.id)} (${STATUS_TEXT[o.blocked ?? 'noRequirement']})`,
                  )
                  .join(', ')}
              </p>
            )}
            {stale.length > 0 && (
              <div className="message error">
                <p>Geplant, aber nicht mehr möglich (Alter oder Klasse geändert):</p>
                {stale.map(({ athleteId, exerciseId }) => (
                  <p key={`${athleteId} ${exerciseId}`}>
                    {name(athleteId)} – {exerciseById(catalog, exerciseId)?.name ?? exerciseId}{' '}
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => setPlans([athleteId], exerciseId, false)}
                    >
                      Plan entfernen
                    </button>
                  </p>
                ))}
              </div>
            )}
          </div>
          {offersByExercise(workbook, catalog, group.id).map(({ group: id, offers }) => (
            <div key={id}>
              <h3>{groupLabel(id)}</h3>
              {offers.length === 0 && (
                <p className="message error">Für keins der Kinder ist hier eine Übung möglich.</p>
              )}
              {offers.map(({ exercise, possible }) => {
                const able = possible.map((c) => c.athleteId);
                const planned = able.filter((athleteId) =>
                  isPlanned(workbook, athleteId, exercise.id),
                );
                return (
                  <details key={exercise.id} className="offer">
                    <summary>
                      <strong>{exercise.name}</strong>{' '}
                      <span className="muted">
                        {planned.length > 0 ? `${planned.length} geplant · ` : ''}
                        {able.length} von {members.length} können
                      </span>
                    </summary>
                    <div className="chips">
                      {planned.length < able.length && (
                        <button
                          type="button"
                          className="chip"
                          onClick={() => setPlans(able, exercise.id, true)}
                        >
                          Alle, die können ({able.length})
                        </button>
                      )}
                      {planned.length > 0 && (
                        <button
                          type="button"
                          className="chip"
                          onClick={() => setPlans(able, exercise.id, false)}
                        >
                          Keins
                        </button>
                      )}
                    </div>
                    <div
                      className="chips"
                      role="group"
                      aria-label={`${exercise.name}: wer macht sie`}
                    >
                      {able.map((athleteId) => {
                        const on = planned.includes(athleteId);
                        return (
                          <button
                            key={athleteId}
                            type="button"
                            className={`chip plan${!on && gapOf(athleteId, id) ? ' gap' : ''}`}
                            aria-pressed={on}
                            onClick={() =>
                              dispatch({ type: 'togglePlan', athleteId, exerciseId: exercise.id })
                            }
                          >
                            {on ? '✓ ' : ''}
                            {name(athleteId)}
                          </button>
                        );
                      })}
                    </div>
                  </details>
                );
              })}
            </div>
          ))}
          <p className="muted">
            Erwartete Werte, Aufbau und Ausführung: Rad „Übungen“ › „Möglich“. Rot umrandet: Kind
            hat in dieser Disziplingruppe noch nichts geplant.
          </p>
        </>
      )}
    </section>
  );
}
