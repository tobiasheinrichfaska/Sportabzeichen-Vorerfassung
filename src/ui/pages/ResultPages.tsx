import { useState } from 'react';
import { exerciseById, variantName } from '../../logic/catalog';
import { childLabel, groupMembers } from '../../logic/children';
import {
  NOTE_TEXT,
  evaluateAthlete,
  measurementLevel,
  type AthleteEvaluation,
} from '../../logic/evaluation';
import { formatMeasure } from '../../logic/measure';
import { GROUPS, LEVELS } from '../../logic/reference';
import { SWIM_STATUS_TEXT } from '../../logic/swim';
import type { Athlete, Catalog, GroupId, Level, Workbook } from '../../logic/types';
import { GroupSwitch, NoGroup, NoLimits, type BookProps } from './GroupSwitch';

const levelText = (level: Level | null) =>
  level ? (LEVELS.find((entry) => entry.id === level)?.label ?? level) : '–';
const groupLabel = (id: GroupId) => GROUPS.find((group) => group.id === id)?.label ?? id;

/** What decides a group, in words: „800 m Lauf 04:12“ or „Ausgleichsbedingung“. */
function sourceText(
  result: AthleteEvaluation['groups'][number],
  workbook: Workbook,
  catalog: Catalog,
) {
  if (result.source === 'manual') return 'Ausgleichsbedingung / Klassenkombination';
  const measurement = workbook.measurements.find((m) => m.id === result.sourceId);
  const exercise = measurement && exerciseById(catalog, measurement.exerciseId);
  if (!measurement || !exercise) return 'noch kein Wert';
  const name = measurement.variant
    ? variantName(catalog, exercise.id, measurement.variant)
    : exercise.name;
  return `${name} ${formatMeasure(exercise.measure, measurement.value)}${result.chosen ? ' (gewählt)' : ''}`;
}

/** Page „Je Kind“: the evaluation of one child of the shown group. */
export function ChildResultPage({ workbook, dispatch, catalog, group, chooseGroup }: BookProps) {
  const [chosenId, setChosenId] = useState<string | undefined>(undefined);
  if (!group) return <NoGroup />;
  if (!catalog || catalog.requirements.length === 0) return <NoLimits />;
  const members = groupMembers(workbook, group.id);
  const child = members.find((entry) => entry.id === chosenId) ?? members[0];
  if (!child) return <p className="message info">Die Gruppe hat noch keine Kinder.</p>;
  const evaluation = evaluateAthlete(child, workbook, catalog);
  const update = (patch: Partial<Athlete>) =>
    dispatch({ type: 'updateAthlete', athlete: { ...child, ...patch } });

  return (
    <section>
      <h2>Je Kind – {group.name}</h2>
      <GroupSwitch workbook={workbook} group={group} chooseGroup={chooseGroup} />
      <div className="chips" role="group" aria-label="Kind wählen">
        {members.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="chip"
            aria-pressed={entry.id === child.id}
            onClick={() => setChosenId(entry.id)}
          >
            {childLabel(entry, members)}
          </button>
        ))}
      </div>
      <div className="card">
        <h3>
          {childLabel(child, members)}{' '}
          <span className="muted">
            {evaluation.points} Punkte ·{' '}
            {evaluation.award
              ? `Abzeichen ${levelText(evaluation.award)}`
              : 'Abzeichen noch nicht erreicht'}
          </span>
        </h3>
        <table>
          <tbody>
            {evaluation.groups.map((result) => {
              const attempts = workbook.measurements.filter(
                (m) =>
                  m.athleteId === child.id &&
                  exerciseById(catalog, m.exerciseId)?.group === result.group,
              );
              return (
                <tr key={result.group}>
                  <th>{groupLabel(result.group)}</th>
                  <td>
                    <span className={`level level-${result.level ?? 'none'}`}>
                      {levelText(result.level)}
                    </span>{' '}
                    <span className="muted">{sourceText(result, workbook, catalog)}</span>
                    {(() => {
                      const plans = workbook.plans
                        .filter((plan) => plan.athleteId === child.id)
                        .map((plan) => exerciseById(catalog, plan.exerciseId))
                        .filter((exercise) => exercise?.group === result.group);
                      return plans.length > 0 ? (
                        <div className="planned">
                          geplant: {plans.map((exercise) => exercise?.name).join(', ')}
                        </div>
                      ) : null;
                    })()}
                    {attempts.length > 1 && result.source !== 'manual' && (
                      <div className="chips" role="group" aria-label="Zählender Versuch">
                        {attempts.map((attempt) => {
                          const exercise = exerciseById(catalog, attempt.exerciseId);
                          const level = measurementLevel(
                            attempt,
                            child,
                            catalog,
                            workbook.year,
                          ).level;
                          return (
                            <button
                              key={attempt.id}
                              type="button"
                              className="chip"
                              aria-pressed={result.chosen && result.sourceId === attempt.id}
                              onClick={() =>
                                dispatch({
                                  type: 'setProfileChoice',
                                  athleteId: child.id,
                                  group: result.group,
                                  measurementId: attempt.id,
                                })
                              }
                            >
                              {exercise ? formatMeasure(exercise.measure, attempt.value) : '?'} (
                              {levelText(level)})
                            </button>
                          );
                        })}
                        {result.chosen && (
                          <button
                            type="button"
                            className="chip"
                            onClick={() =>
                              dispatch({
                                type: 'setProfileChoice',
                                athleteId: child.id,
                                group: result.group,
                                measurementId: null,
                              })
                            }
                          >
                            Bester zählt
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="entry-row">
          <label className="narrow">
            Schwimmnachweis (Jahr)
            <input
              value={child.swimProofYear ?? ''}
              inputMode="numeric"
              maxLength={4}
              placeholder="JJJJ"
              onChange={(event) => {
                const text = event.target.value.replace(/\D/g, '');
                const { swimProofYear: _drop, ...rest } = child;
                void _drop;
                dispatch({
                  type: 'updateAthlete',
                  athlete: text.length === 4 ? { ...rest, swimProofYear: Number(text) } : rest,
                });
              }}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={child.firstTime}
              onChange={(event) => update({ firstTime: event.target.checked })}
            />
            Erstmaliger Erwerb
          </label>
        </div>
        <p className={evaluation.swim === 'valid' ? 'muted' : 'message error'}>
          {SWIM_STATUS_TEXT[evaluation.swim]}
        </p>
        {evaluation.notes.length > 0 && (
          <ul className="plain">
            {[...new Set(evaluation.notes.map((note) => note.code))].map((code) => (
              <li key={code} className="message info">
                {NOTE_TEXT[code]}
              </li>
            ))}
          </ul>
        )}
        <p className={evaluation.complete ? 'message info' : 'muted'}>
          {evaluation.complete
            ? 'Vollständig: Abzeichen erreicht, Schwimmnachweis gültig.'
            : 'Noch nicht vollständig.'}
        </p>
      </div>
    </section>
  );
}

/** Page „Gruppe“: the whole group as a table — level per Disziplingruppe, points, award, swim proof. */
export function GroupResultPage({ workbook, catalog, group, chooseGroup }: BookProps) {
  if (!group) return <NoGroup />;
  if (!catalog || catalog.requirements.length === 0) return <NoLimits />;
  const members = groupMembers(workbook, group.id);
  const rows = members.map((child) => ({
    child,
    evaluation: evaluateAthlete(child, workbook, catalog),
  }));
  const done = rows.filter((row) => row.evaluation.complete).length;
  return (
    <section>
      <h2>Gruppe – {group.name}</h2>
      <GroupSwitch workbook={workbook} group={group} chooseGroup={chooseGroup} />
      <p className="muted">
        {done} von {members.length} vollständig · B = Bronze, S = Silber, G = Gold
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Kind</th>
              {GROUPS.map((entry) => (
                <th key={entry.id} title={entry.label}>
                  {entry.label.slice(0, 4)}.
                </th>
              ))}
              <th>Pkt.</th>
              <th>Abz.</th>
              <th>Schw.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ child, evaluation }) => (
              <tr key={child.id}>
                <td>{childLabel(child, members)}</td>
                {evaluation.groups.map((result) => (
                  <td key={result.group} className={`level-cell level-${result.level ?? 'none'}`}>
                    {result.level ? levelText(result.level).charAt(0) : '–'}
                  </td>
                ))}
                <td>{evaluation.points}</td>
                <td className={`level-cell level-${evaluation.award ?? 'none'}`}>
                  {evaluation.award ? levelText(evaluation.award) : '–'}
                </td>
                <td title={SWIM_STATUS_TEXT[evaluation.swim]}>
                  {evaluation.swim === 'valid' ? '✓' : '✗'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
