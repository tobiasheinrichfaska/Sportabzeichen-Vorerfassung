// Which athlete can do which exercise, under which requirement. A selection of athletes (one, a
// group, all) is crossed with a selection of exercises (one, a Disziplingruppe, all); for MmB every
// active Behinderungsklasse of the athlete yields its own variant.
import { ageInYear } from './age.ts';
import { findRequirements } from './catalog.ts';
import { activeClassIds } from './classes.ts';
import { MIN_AGE } from './reference.ts';
import type {
  Athlete,
  Catalog,
  ClassId,
  Exercise,
  GroupId,
  Requirement,
  Workbook,
} from './types.ts';

export type AthleteSelection =
  { kind: 'all' } | { kind: 'athlete'; athleteId: string } | { kind: 'group'; groupId: string };

export type ExerciseSelection =
  | { kind: 'all' }
  | { kind: 'exercise'; exerciseId: string }
  | { kind: 'disciplineGroup'; group: GroupId };

export type CombinationStatus =
  /** At least one variant has a requirement. */
  | 'possible'
  /** The exercise is not offered under the athlete's Bedingungen. */
  | 'notInTrack'
  /** Younger than 6 in the exam year. */
  | 'tooYoung'
  /** MmB without any possible Behinderungsklasse yet. */
  | 'classOpen'
  /** The catalog has no requirement for this age/sex/class. */
  | 'noRequirement'
  /** The catalog has the same variant twice for one case. */
  | 'ambiguous';

/** What a class (or the regular track) offers for the exercise at that age. */
export interface Variant {
  /** null on the regular track. */
  classId: ClassId | null;
  /**
   * The requirements to choose from, by their label (e.g. Kegeln Asphalt, Bohle, Bowling, Schere;
   * a distance or Dauerschwimmen): usually one, none when the class has no requirement.
   */
  options: Requirement[];
}

export interface Combination {
  athleteId: string;
  exerciseId: string;
  age: number;
  status: CombinationStatus;
  variants: Variant[];
  /** The athlete's possible classes lead to different requirements — the class decides. */
  classDecisive: boolean;
}

export function resolveAthletes(workbook: Workbook, selection: AthleteSelection): Athlete[] {
  switch (selection.kind) {
    case 'all':
      return [...workbook.athletes];
    case 'athlete':
      return workbook.athletes.filter((athlete) => athlete.id === selection.athleteId);
    case 'group': {
      const group = workbook.groups.find((entry) => entry.id === selection.groupId);
      if (!group) return [];
      return workbook.athletes.filter((athlete) => group.athleteIds.includes(athlete.id));
    }
  }
}

export function resolveExercises(catalog: Catalog, selection: ExerciseSelection): Exercise[] {
  switch (selection.kind) {
    case 'all':
      return [...catalog.exercises];
    case 'exercise':
      return catalog.exercises.filter((exercise) => exercise.id === selection.exerciseId);
    case 'disciplineGroup':
      return catalog.exercises.filter((exercise) => exercise.group === selection.group);
  }
}

/** Equal offers count as one outcome, so a class that changes nothing is not decisive. */
function outcomeKey(options: readonly Requirement[]): string {
  return JSON.stringify(
    options
      .map(({ label, thresholds }) => [
        label,
        thresholds?.bronze,
        thresholds?.silver,
        thresholds?.gold,
      ])
      .sort(),
  );
}

export function combine(
  athlete: Athlete,
  exercise: Exercise,
  catalog: Catalog,
  year: number,
): Combination {
  const age = ageInYear(athlete.birthYear, year);
  const base = { athleteId: athlete.id, exerciseId: exercise.id, age };
  const none = (status: CombinationStatus): Combination => ({
    ...base,
    status,
    variants: [],
    classDecisive: false,
  });
  if (!exercise.tracks.includes(athlete.track)) return none('notInTrack');
  if (age < MIN_AGE) return none('tooYoung');
  // Deactivated classes are left out: the examiner decided against them despite the match
  const classes: (ClassId | null)[] = athlete.track === 'mmb' ? activeClassIds(athlete) : [null];
  if (classes.length === 0) return none('classOpen');

  let ambiguous = false;
  const variants = classes.map((classId): Variant => {
    const options = findRequirements(catalog, {
      exerciseId: exercise.id,
      track: athlete.track,
      sex: athlete.sex,
      age,
      classId,
    });
    if (new Set(options.map((option) => option.label)).size < options.length) ambiguous = true;
    return { classId, options };
  });
  const status: CombinationStatus = ambiguous
    ? 'ambiguous'
    : variants.some((variant) => variant.options.length > 0)
      ? 'possible'
      : 'noRequirement';
  const classDecisive =
    variants.length > 1 && new Set(variants.map((v) => outcomeKey(v.options))).size > 1;
  return { ...base, status, variants, classDecisive };
}

export function combinations(
  workbook: Workbook,
  catalog: Catalog,
  athletes: AthleteSelection,
  exercises: ExerciseSelection,
): Combination[] {
  const chosen = resolveExercises(catalog, exercises);
  return resolveAthletes(workbook, athletes).flatMap((athlete) =>
    chosen.map((exercise) => combine(athlete, exercise, catalog, workbook.year)),
  );
}

/** Groups combinations by athlete or by exercise, keeping the order of first appearance. */
export function groupCombinations(
  list: readonly Combination[],
  by: 'athlete' | 'exercise',
): Map<string, Combination[]> {
  const grouped = new Map<string, Combination[]>();
  for (const combination of list) {
    const key = by === 'athlete' ? combination.athleteId : combination.exerciseId;
    grouped.set(key, [...(grouped.get(key) ?? []), combination]);
  }
  return grouped;
}
