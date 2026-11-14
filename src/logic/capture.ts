// Page „Erfassen“ (Tobias 2026-11-10: „Zeiten bzw. Leistungsdaten in der App erfassen“): one
// exercise, the children of the group who can do it, a value per attempt. A variant is asked where
// a case has several (Kegeln Asphalt/Bohle …), a class where the child's classes lead to different
// requirements — never guessed.
import { combine, type Combination } from './combinations.ts';
import { exerciseById } from './catalog.ts';
import { levelFor, measurementLevel, type MeasurementResult } from './evaluation.ts';
import { parseMeasure } from './measure.ts';
import { metronomePresetFor } from './metronome.ts';
import type {
  Athlete,
  Catalog,
  ClassId,
  Exercise,
  MeasureKindId,
  Measurement,
  Workbook,
} from './types.ts';

export interface CaptureRow {
  athlete: Athlete;
  combination: Combination;
  /** Classes to choose from when the class decides (else empty). */
  classes: ClassId[];
  /** Per class (null = regular or a class that does not decide) the variants to choose from. */
  variantsByClass: { classId: ClassId | null; labels: string[] }[];
  /** This child's attempts at the exercise, oldest first, each with its level. */
  attempts: { measurement: Measurement; result: MeasurementResult }[];
}

/** The children of `members` who can do the exercise, with their attempts so far. */
export function captureRows(
  workbook: Workbook,
  catalog: Catalog,
  members: readonly Athlete[],
  exercise: Exercise,
): CaptureRow[] {
  return members.flatMap((athlete) => {
    const combination = combine(athlete, exercise, catalog, workbook.year);
    if (combination.status !== 'possible') return [];
    const offering = combination.variants.filter((v) => v.options.length > 0);
    return [
      {
        athlete,
        combination,
        classes: combination.classDecisive ? offering.flatMap((v) => v.classId ?? []) : [],
        // not decisive: every class offers the same, so the first one's variants stand for all
        variantsByClass: (combination.classDecisive ? offering : offering.slice(0, 1)).map((v) => ({
          classId: combination.classDecisive ? v.classId : null,
          labels: v.options.map((o) => o.label),
        })),
        attempts: workbook.measurements
          .filter((m) => m.athleteId === athlete.id && m.exerciseId === exercise.id)
          .map((measurement) => ({
            measurement,
            result: measurementLevel(measurement, athlete, catalog, workbook.year),
          })),
      },
    ];
  });
}

export interface AttemptInput {
  text: string;
  variant: string | undefined;
  classId: ClassId | undefined;
}

export type AttemptCheck =
  { ok: true; measurement: Omit<Measurement, 'id' | 'date'> } | { ok: false; errors: string[] };

/** The variants to choose for the chosen class (none: nothing to choose). */
export function variantsFor(row: CaptureRow, classId: ClassId | undefined): string[] {
  const entry =
    row.classes.length > 0
      ? row.variantsByClass.find((v) => v.classId === classId)
      : row.variantsByClass[0];
  return entry && entry.labels.length > 1 ? entry.labels : [];
}

/** Every reason an attempt cannot be saved yet; else the measurement to add. */
export function checkAttempt(
  row: CaptureRow,
  exercise: Exercise,
  input: AttemptInput,
): AttemptCheck {
  const errors: string[] = [];
  const parsed = parseMeasure(exercise.measure, input.text);
  if (!parsed.ok) errors.push(parsed.error);
  const classChosen = !!input.classId && row.classes.includes(input.classId);
  if (row.classes.length > 0 && !classChosen) {
    errors.push(`Die Klasse entscheidet – bitte wählen: ${row.classes.join(', ')}.`);
  }
  const variants = variantsFor(row, input.classId);
  if (variants.length > 0 && !(input.variant && variants.includes(input.variant))) {
    errors.push(`Variante wählen: ${variants.join(', ')}.`);
  }
  if (!parsed.ok || errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    measurement: {
      athleteId: row.athlete.id,
      exerciseId: exercise.id,
      value: parsed.value,
      ...(variants.length > 0 && input.variant ? { variant: input.variant } : {}),
      ...(row.classes.length > 0 && input.classId ? { classId: input.classId } : {}),
    },
  };
}

/** The level an input would reach right now (shown while typing); undefined while incomplete. */
export function previewLevel(
  row: CaptureRow,
  catalog: Catalog,
  year: number,
  input: AttemptInput,
): ReturnType<typeof levelFor> | undefined {
  const exercise = exerciseById(catalog, row.combination.exerciseId);
  if (!exercise) return undefined;
  const checked = checkAttempt(row, exercise, input);
  if (!checked.ok) return undefined;
  const result = measurementLevel(
    { id: 'vorschau', ...checked.measurement },
    row.athlete,
    catalog,
    year,
  );
  return 'note' in result ? undefined : result.level;
}

/** A tool the examiner needs at hand while the exercise runs (Tobias 2026-11-11). */
export type StationTool = 'stopwatch' | 'counter' | 'metronome';

/** Data, not code: a time is stopped, a count is tallied (Seilspringen, Klimmzüge …). */
const TOOL_OF_MEASURE: Readonly<Partial<Record<MeasureKindId, StationTool>>> = {
  minSec: 'stopwatch',
  secTenth: 'stopwatch',
  count: 'counter',
};

/** The tools shown right at the exercise on „Erfassen“, plus the metronome where a beat is set. */
export function stationTools(exercise: Pick<Exercise, 'id' | 'measure'>): StationTool[] {
  const tool = TOOL_OF_MEASURE[exercise.measure];
  return [
    ...(tool ? [tool] : []),
    ...(metronomePresetFor(exercise.id) ? (['metronome'] as const) : []),
  ];
}
