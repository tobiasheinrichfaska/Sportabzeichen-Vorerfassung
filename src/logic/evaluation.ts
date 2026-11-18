// Auswertung: each measurement gets a level from its requirement; per group the decisive result is,
// in this order, the examiner's manual decision (Ausgleichsbedingung, combined classes), the
// measurement chosen in the final profile, or the best result (Sportabzeichen-Digital also takes
// the best values automatically, Kap. 4.4.2). The sum of points gives the award (Kap. 4.3).
// Verbandsabzeichen (Kap. 8.4) are not captured here.
import { combine } from './combinations.ts';
import { directionOf, exerciseById } from './catalog.ts';
import { AWARD_BANDS, GROUPS, LEVELS } from './reference.ts';
import {
  swimProof,
  swimProofStatus,
  type SwimAttempt,
  type SwimProof,
  type SwimStatus,
} from './swim.ts';
import type {
  Athlete,
  Catalog,
  GroupId,
  Level,
  MeasuredValue,
  Measurement,
  Requirement,
  Workbook,
} from './types.ts';

export type NoteCode =
  | 'tooYoung'
  | 'classOpen'
  | 'classUndecided'
  | 'classInactive'
  | 'notInTrack'
  | 'noRequirement'
  | 'ambiguous'
  | 'variantUndecided'
  | 'variantUnknown'
  | 'unknownExercise'
  | 'choiceInvalid'
  | 'manualOpen'
  | 'consentMissing'
  | 'paperCardOnly';

export const NOTE_TEXT: Readonly<Record<NoteCode, string>> = {
  tooYoung: 'Das Sportabzeichen gibt es erst ab dem Jahr, in dem das 6. Lebensjahr vollendet wird.',
  classOpen: 'Noch keine (aktive) Behinderungsklasse angegeben.',
  classUndecided:
    'Die Behinderungsklasse entscheidet über die Bewertung – bitte beim Messwert die Klasse festlegen.',
  classInactive: 'Der Messwert gilt für eine Behinderungsklasse, die deaktiviert ist.',
  notInTrack: 'Diese Übung gibt es unter den gewählten Bedingungen nicht.',
  noRequirement: 'Für dieses Alter, Geschlecht und diese Klasse ist keine Anforderung hinterlegt.',
  ambiguous: 'Der Katalog enthält für diesen Fall dieselbe Variante mehrfach.',
  variantUndecided:
    'Für diesen Fall gibt es mehrere Varianten (z. B. Kegeln Bohle oder Asphalt) – bitte beim Messwert die Variante wählen.',
  variantUnknown: 'Die Variante des Messwerts gibt es für dieses Alter und diese Klasse nicht.',
  unknownExercise: 'Unbekannte Übung.',
  choiceInvalid: 'Der im Prüfungsprofil gewählte Messwert passt nicht zu dieser Gruppe.',
  manualOpen: 'Ausgleichsbedingung bzw. Klassenkombination: die Stufe ist noch nicht festgelegt.',
  consentMissing: 'Die Einwilligung zur Verarbeitung der Gesundheitsdaten fehlt.',
  paperCardOnly:
    'Kombination von Behinderungsklassen oder Ausgleichsbedingung: nur über die Papier-Prüfkarte, Eintrag mit dem Endergebnis.',
};

export interface Note {
  code: NoteCode;
  measurementId?: string;
  manualAssessmentId?: string;
}

const POINTS: Readonly<Record<Level, number>> = Object.fromEntries(
  LEVELS.map((level) => [level.id, level.points]),
) as Record<Level, number>;

/** The level a value reaches under a requirement, or null below Bronze. */
export function levelFor(requirement: Requirement, value: MeasuredValue): Level | null {
  const { thresholds } = requirement;
  if (!thresholds) return typeof value === 'string' ? value : null;
  if (typeof value !== 'number') return null;
  const reached = (limit: number) =>
    directionOf(thresholds) === 'higher' ? value >= limit : value <= limit;
  if (reached(thresholds.gold)) return 'gold';
  if (reached(thresholds.silver)) return 'silver';
  if (reached(thresholds.bronze)) return 'bronze';
  return null;
}

export function pointsFor(level: Level | null): number {
  return level ? POINTS[level] : 0;
}

/** Award for the summed points; null below 4 points. */
export function awardFor(points: number): Level | null {
  return AWARD_BANDS.find((band) => band.from <= points && points <= band.to)?.level ?? null;
}

export type MeasurementResult = { level: Level | null } | { level: null; note: NoteCode };

/** Level of one measurement; with several active classes all must agree unless one is chosen. */
export function measurementLevel(
  measurement: Measurement,
  athlete: Athlete,
  catalog: Catalog,
  year: number,
): MeasurementResult {
  const exercise = exerciseById(catalog, measurement.exerciseId);
  if (!exercise) return { level: null, note: 'unknownExercise' };
  if (measurement.classId !== undefined && athlete.inactiveClassIds.includes(measurement.classId)) {
    return { level: null, note: 'classInactive' };
  }
  const chosen =
    measurement.classId !== undefined
      ? { ...athlete, classIds: [measurement.classId], inactiveClassIds: [] }
      : athlete;
  const combination = combine(chosen, exercise, catalog, year);
  if (combination.status !== 'possible') return { level: null, note: combination.status };
  if (combination.classDecisive) return { level: null, note: 'classUndecided' };
  const options = combination.variants.find((variant) => variant.options.length > 0)?.options ?? [];
  const requirement = chooseOption(options, measurement.variant);
  if ('note' in requirement) return { level: null, note: requirement.note };
  return { level: levelFor(requirement.option, measurement.value) };
}

/** The requirement of a measurement: its variant by label, or the only one there is. */
export function chooseOption(
  options: readonly Requirement[],
  variant: string | undefined,
): { option: Requirement } | { note: 'variantUndecided' | 'variantUnknown' } {
  if (variant !== undefined) {
    const option = options.find((entry) => entry.label === variant);
    return option ? { option } : { note: 'variantUnknown' };
  }
  const [only, ...more] = options;
  if (!only) return { note: 'variantUnknown' };
  return more.length === 0 ? { option: only } : { note: 'variantUndecided' };
}

export type GroupSource = 'none' | 'measurement' | 'manual';

export interface GroupResult {
  group: GroupId;
  level: Level | null;
  /** What decides the group, and the id of that measurement or manual assessment. */
  source: GroupSource;
  sourceId: string | null;
  /** The examiner chose this measurement in the final profile (instead of the best one). */
  chosen: boolean;
}

export interface AthleteEvaluation {
  athleteId: string;
  groups: GroupResult[];
  points: number;
  /** Award by points; null unless every group reaches at least Bronze. */
  award: Level | null;
  swim: SwimStatus;
  /** The swim proof that counts: entered, or a swim recorded as an exercise; null = none. */
  swimProof: SwimProof | null;
  /** At least one group is decided by hand: submit on the paper Prüfkarte with the final result. */
  paperCardOnly: boolean;
  /** Award reached, swim proof valid, consent on file and no manual decision still open. */
  complete: boolean;
  notes: Note[];
}

export function evaluateAthlete(
  athlete: Athlete,
  workbook: Workbook,
  catalog: Catalog,
): AthleteEvaluation {
  const notes: Note[] = [];
  const empty = (group: GroupId): GroupResult => ({
    group,
    level: null,
    source: 'none',
    sourceId: null,
    chosen: false,
  });
  const groups = new Map<GroupId, GroupResult>(GROUPS.map((group) => [group.id, empty(group.id)]));
  const better = (group: GroupId, level: Level | null) =>
    pointsFor(level) > pointsFor(groups.get(group)?.level ?? null);

  // 1. Best result per group
  const levels = new Map<string, Level | null>();
  const swims: SwimAttempt[] = [];
  for (const measurement of workbook.measurements) {
    if (measurement.athleteId !== athlete.id) continue;
    const result = measurementLevel(measurement, athlete, catalog, workbook.year);
    if ('note' in result) notes.push({ code: result.note, measurementId: measurement.id });
    levels.set(measurement.id, result.level);
    swims.push({
      measurementId: measurement.id,
      exerciseId: measurement.exerciseId,
      year: measurement.date ? Number(measurement.date.slice(0, 4)) : workbook.year,
      level: result.level,
    });
    const group = exerciseById(catalog, measurement.exerciseId)?.group;
    if (group && better(group, result.level)) {
      groups.set(group, {
        group,
        level: result.level,
        source: 'measurement',
        sourceId: measurement.id,
        chosen: false,
      });
    }
  }

  // 2. The examiner's choice in the final profile replaces the best result
  for (const choice of workbook.profileChoices) {
    if (choice.athleteId !== athlete.id) continue;
    const measurement = workbook.measurements.find((entry) => entry.id === choice.measurementId);
    const group = measurement && exerciseById(catalog, measurement.exerciseId)?.group;
    if (!measurement || measurement.athleteId !== athlete.id || group !== choice.group) {
      notes.push({ code: 'choiceInvalid', measurementId: choice.measurementId });
      continue;
    }
    groups.set(choice.group, {
      group: choice.group,
      level: levels.get(measurement.id) ?? null,
      source: 'measurement',
      sourceId: measurement.id,
      chosen: true,
    });
  }

  // 3. A manual decision (Ausgleichsbedingung, combined classes) decides the group
  const manual = workbook.manualAssessments.filter((entry) => entry.athleteId === athlete.id);
  for (const assessment of manual) {
    if (assessment.level === null) {
      notes.push({ code: 'manualOpen', manualAssessmentId: assessment.id });
    }
    groups.set(assessment.group, {
      group: assessment.group,
      level: assessment.level,
      source: 'manual',
      sourceId: assessment.id,
      chosen: false,
    });
  }
  if (manual.length > 0) notes.push({ code: 'paperCardOnly' });
  if (athlete.track === 'mmb' && !athlete.consentOnFile) notes.push({ code: 'consentMissing' });

  const results = [...groups.values()];
  const points = results.reduce((sum, result) => sum + pointsFor(result.level), 0);
  const award = results.every((result) => result.level) ? awardFor(points) : null;
  const proof = swimProof(athlete, swims);
  const swim = swimProofStatus(athlete, proof, workbook.year);
  const blocked = notes.some(
    (note) => note.code === 'consentMissing' || note.code === 'manualOpen',
  );
  return {
    athleteId: athlete.id,
    groups: results,
    points,
    award,
    swim,
    swimProof: proof,
    paperCardOnly: manual.length > 0,
    complete: award !== null && swim === 'valid' && !blocked,
    notes,
  };
}
