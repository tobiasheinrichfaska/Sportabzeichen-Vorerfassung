import { variantName } from '../../logic/catalog';
import type { Combination } from '../../logic/combinations';
import { expectedValues, type DetailInUse } from '../../logic/overview';
import type { Catalog, Exercise, ExerciseDetail } from '../../logic/types';

const LEVEL_ROWS = [
  ['bronze', 'Bronze'],
  ['silver', 'Silber'],
  ['gold', 'Gold'],
] as const;

/** The values a child is expected to reach: „800 m Lauf: B 05:38 · S 04:58 · G 04:13“ (invented). */
export function ExpectedValues({
  combination,
  exercise,
  catalog,
}: {
  combination: Combination;
  exercise: Exercise;
  catalog: Catalog;
}) {
  const values = expectedValues(combination, exercise);
  return (
    <ul className="plain expected">
      {values.map((value) => (
        <li key={`${value.classId ?? ''}|${value.label}`}>
          {value.classId && <strong>Klasse {value.classId}: </strong>}
          {variantName(catalog, exercise.id, value.label)}
          {values.length > 1 || value.classId ? ': ' : ' – '}
          {value.limits ? (
            <>
              <span className="level level-bronze">B {value.limits.bronze}</span>{' '}
              <span className="level level-silver">S {value.limits.silver}</span>{' '}
              <span className="level level-gold">G {value.limits.gold}</span>
            </>
          ) : (
            <span className="muted">nach Ausführung (leicht = B, mittel = S, schwer = G)</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** One official detail: picture, steps or the task per level, video, source. */
export function DetailBody({ detail }: { detail: ExerciseDetail }) {
  return (
    <div className="setup detail-body">
      {detail.ages && <p className="muted">{detail.ages}</p>}
      {detail.subtitle && (
        <p>
          <strong>{detail.subtitle}</strong>
        </p>
      )}
      {detail.material && (
        <p>
          <strong>Material: </strong>
          {detail.material}
        </p>
      )}
      {detail.image && (
        <div className={`detail-picture ${detail.imageShape ?? 'wide'}`}>
          <img src={detail.image} alt={detail.imageAlt ?? detail.title} loading="lazy" />
        </div>
      )}
      {detail.steps && (
        <ul className="detail-steps">
          {detail.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      )}
      {detail.levels && (
        <dl className="detail-levels">
          {LEVEL_ROWS.map(([level, label]) => (
            <div key={level}>
              <dt>
                <span className={`level level-${level}`}>{label}</span>
              </dt>
              <dd>{detail.levels?.[level]}</dd>
            </div>
          ))}
        </dl>
      )}
      {detail.video && (
        <p>
          <a href={detail.video} target="_blank" rel="noopener noreferrer">
            Videoanleitung (YouTube, braucht Internet)
          </a>
        </p>
      )}
      <p className="muted">Quelle: {detail.source} – Wortlaut und Bilder des DOSB.</p>
    </div>
  );
}

/**
 * „Ausführung: …“ per variant in use (Tobias 2026-11-10: step sequences of the ladder, pictures of
 * the Gerätturnen elements); with `nameOf` the children it applies to are named.
 */
export function ExerciseDetails({
  uses,
  nameOf,
}: {
  uses: readonly DetailInUse[];
  nameOf?: ((athleteId: string) => string) | undefined;
}) {
  return uses.map(({ detail, athleteIds }) => (
    <details key={detail.label} className="setup-inline detail">
      <summary>
        Ausführung: {detail.title}
        {nameOf && athleteIds.length > 0 && (
          <span className="muted"> – {athleteIds.map(nameOf).join(', ')}</span>
        )}
      </summary>
      <DetailBody detail={detail} />
    </details>
  ));
}

/** „Macht diese Übung“: the child's plan for the exercise, on and off. */
export function PlanToggle({ planned, onToggle }: { planned: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="chip plan" aria-pressed={planned} onClick={onToggle}>
      {planned ? '✓ Macht diese Übung' : 'Macht diese Übung'}
    </button>
  );
}
