// Page „Möglich“ (Tobias 2026-11-10: „eine Gruppe Kinder eingeben, und dann sehen, welche Abnahmen
// ich für diese Kinder machen kann“): the combinations of a group, by exercise or by child, per
// Disziplingruppe, with the variants each child does (e.g. „800 m Lauf“, „Schlagball (80 g)“).
import { combinations, type Combination, type CombinationStatus } from './combinations.ts';
import { GROUPS } from './reference.ts';
import { formatMeasure } from './measure.ts';
import { exerciseDetails } from './catalog.ts';
import type {
  Athlete,
  Catalog,
  ClassId,
  Exercise,
  ExerciseDetail,
  GroupId,
  Workbook,
} from './types.ts';

export const STATUS_TEXT: Readonly<Record<CombinationStatus, string>> = {
  possible: 'möglich',
  notInTrack: 'gibt es unter diesen Bedingungen nicht',
  tooYoung: 'zu jung (ab 6 Jahren)',
  classOpen: 'Behinderungsklasse noch offen',
  noRequirement: 'für dieses Alter bzw. diese Klasse nicht vorgesehen',
  ambiguous: 'Katalog enthält diese Variante doppelt',
};

/** The variants of a combination, each once, in catalog order. */
export function offerLabels(combination: Combination): string[] {
  return [
    ...new Set(combination.variants.flatMap((variant) => variant.options.map((o) => o.label))),
  ];
}

/** What a child must reach in one variant (and, where it decides, one class). */
export interface ExpectedValue {
  /** Only when the class decides; else null. */
  classId: ClassId | null;
  label: string;
  /** In card notation; null for exercises judged by execution (Gerätturnen). */
  limits: { bronze: string; silver: string; gold: string } | null;
}

/**
 * The values a child is expected to reach (Tobias 2026-11-10: „für ein Kind auch gleich die Werte,
 * die erwartet werden“). Bronze equal to Silber means the table offers no Bronze („–“, Pull-Ups
 * 85+, see the converter) and is shown as such.
 */
export function expectedValues(combination: Combination, exercise: Exercise): ExpectedValue[] {
  const offering = combination.variants.filter((variant) => variant.options.length > 0);
  const shown = combination.classDecisive ? offering : offering.slice(0, 1);
  return shown.flatMap((variant) =>
    variant.options.map((option) => {
      const t = option.thresholds;
      return {
        classId: combination.classDecisive ? variant.classId : null,
        label: option.label,
        limits: t
          ? {
              bronze: t.bronze === t.silver ? '–' : formatMeasure(exercise.measure, t.bronze),
              silver: formatMeasure(exercise.measure, t.silver),
              gold: formatMeasure(exercise.measure, t.gold),
            }
          : null,
      };
    }),
  );
}

/** An official detail and the children whose variant it describes. */
export interface DetailInUse {
  detail: ExerciseDetail;
  athleteIds: string[];
}

/**
 * The details that apply to these children (each variant once, in the order the children bring
 * them): the ladder step sequence or Gerätturnen element of their age.
 */
export function detailsInUse(
  catalog: Catalog,
  exerciseId: string,
  possible: readonly Combination[],
): DetailInUse[] {
  const details = exerciseDetails(catalog, exerciseId);
  const uses = new Map<string, DetailInUse>();
  for (const combination of possible) {
    for (const label of offerLabels(combination)) {
      const detail = details.find((entry) => entry.label === label);
      if (!detail) continue;
      const use = uses.get(label) ?? { detail, athleteIds: [] };
      if (!use.athleteIds.includes(combination.athleteId))
        use.athleteIds.push(combination.athleteId);
      uses.set(label, use);
    }
  }
  return [...uses.values()];
}

/** The child will do the exercise (a plan, see `Plan`). */
export function isPlanned(workbook: Workbook, athleteId: string, exerciseId: string): boolean {
  return workbook.plans.some((p) => p.athleteId === athleteId && p.exerciseId === exerciseId);
}

/** Exercises whose variant is only the element to do (e.g. „Stützschwingen“), not a full name. */
const NAMED_BY_VARIANT = new Set([
  'gymnastics-strength',
  'gymnastics-speed',
  'gymnastics-coordination',
  'rope-skipping',
  'coordination-ladder',
]);

/** What a child does, in short: „800 m Lauf“, „Gerätturnen: Stützschwingen“, „Kegeln Asphalt / …“. */
export function offerText(
  exercise: Pick<Exercise, 'id' | 'name'>,
  labels: readonly string[],
): string {
  const text = labels.join(' / ');
  if (!NAMED_BY_VARIANT.has(exercise.id)) return text || exercise.name;
  const name = exercise.name.replace(/\s*\(.*\)$/, '');
  return text ? `${name}: ${text}` : name;
}

export interface ExerciseOffer {
  exercise: Exercise;
  /** Children who can do it. */
  possible: Combination[];
  /** Children of the same Bedingungen who cannot, with the reason (not „notInTrack“). */
  notPossible: Combination[];
}

export interface GroupOffers {
  group: GroupId;
  offers: ExerciseOffer[];
}

function all(workbook: Workbook, catalog: Catalog, groupId: string): Combination[] {
  return combinations(workbook, catalog, { kind: 'group', groupId }, { kind: 'all' });
}

/** Per Disziplingruppe the exercises at least one child can do, with who can and who cannot. */
export function offersByExercise(
  workbook: Workbook,
  catalog: Catalog,
  groupId: string,
): GroupOffers[] {
  const list = all(workbook, catalog, groupId);
  return GROUPS.map(({ id }) => ({
    group: id,
    offers: catalog.exercises
      .filter((exercise) => exercise.group === id)
      .map((exercise) => {
        const own = list.filter((c) => c.exerciseId === exercise.id);
        return {
          exercise,
          possible: own.filter((c) => c.status === 'possible'),
          notPossible: own.filter((c) => c.status !== 'possible' && c.status !== 'notInTrack'),
        };
      })
      .filter((offer) => offer.possible.length > 0),
  }));
}

export interface ChildOffers {
  athlete: Athlete;
  groups: { group: GroupId; possible: Combination[] }[];
  /** Disziplingruppen without any possible exercise — the badge cannot be reached yet. */
  missing: GroupId[];
  /** Why nothing at all is possible (too young, class open), when that is so. */
  blocked: CombinationStatus | null;
}

/** Per child the possible exercises of each Disziplingruppe. */
export function offersByChild(
  workbook: Workbook,
  catalog: Catalog,
  groupId: string,
  athletes: readonly Athlete[],
): ChildOffers[] {
  const list = all(workbook, catalog, groupId);
  const groupOf = new Map(catalog.exercises.map((exercise) => [exercise.id, exercise.group]));
  return athletes.map((athlete) => {
    const own = list.filter((c) => c.athleteId === athlete.id);
    const groups = GROUPS.map(({ id }) => ({
      group: id,
      possible: own.filter((c) => c.status === 'possible' && groupOf.get(c.exerciseId) === id),
    }));
    const missing = groups.filter((g) => g.possible.length === 0).map((g) => g.group);
    const reasons = new Set(own.map((c) => c.status));
    const blocked =
      missing.length === GROUPS.length
        ? reasons.has('tooYoung')
          ? 'tooYoung'
          : reasons.has('classOpen')
            ? 'classOpen'
            : 'noRequirement'
        : null;
    return { athlete, groups, missing, blocked };
  });
}

/** An exercise someone of the group does on the day, and who. */
export interface Station {
  exercise: Exercise;
  athleteIds: string[];
}

/** A child's Disziplingruppen with something possible but nothing planned yet. */
export interface PlanGap {
  athleteId: string;
  groups: GroupId[];
}

export interface PlanOverview {
  /** In Disziplingruppe and catalog order; only exercises the planned children can do. */
  stations: Station[];
  /** Children who still lack a plan in a Disziplingruppe where something is possible. */
  gaps: PlanGap[];
  /**
   * Plans of the group's children for an exercise they can no longer do (e.g. the birth year or
   * class was changed after planning) — named, not counted, never dropped silently.
   */
  stale: { athleteId: string; exerciseId: string }[];
}

/**
 * The plan of a group at a glance (page „Planen“): which stations the day needs, and which child
 * still has a Disziplingruppe without a planned exercise.
 */
export function planOverview(
  workbook: Workbook,
  catalog: Catalog,
  groupId: string,
  athletes: readonly Athlete[],
): PlanOverview {
  const byChild = offersByChild(workbook, catalog, groupId, athletes);
  const possible = new Set(
    byChild.flatMap((o) =>
      o.groups.flatMap((g) => g.possible.map((c) => `${c.athleteId} ${c.exerciseId}`)),
    ),
  );
  const mine = new Set(athletes.map((athlete) => athlete.id));
  const plans = workbook.plans.filter((p) => mine.has(p.athleteId));
  const counts = plans.filter((p) => possible.has(`${p.athleteId} ${p.exerciseId}`));
  const order = GROUPS.map((g) => g.id);
  const stations = catalog.exercises
    .map((exercise) => ({
      exercise,
      athleteIds: athletes
        .map((athlete) => athlete.id)
        .filter((id) => counts.some((p) => p.athleteId === id && p.exerciseId === exercise.id)),
    }))
    .filter((station) => station.athleteIds.length > 0)
    .sort((a, b) => order.indexOf(a.exercise.group) - order.indexOf(b.exercise.group));
  const gaps = byChild
    .map((offer) => ({
      athleteId: offer.athlete.id,
      groups: offer.groups
        .filter(
          (g) =>
            g.possible.length > 0 &&
            !g.possible.some((c) =>
              counts.some((p) => p.athleteId === c.athleteId && p.exerciseId === c.exerciseId),
            ),
        )
        .map((g) => g.group),
    }))
    .filter((gap) => gap.groups.length > 0);
  const stale = plans
    .filter((p) => !possible.has(`${p.athleteId} ${p.exerciseId}`))
    .map(({ athleteId, exerciseId }) => ({ athleteId, exerciseId }));
  return { stations, gaps, stale };
}
