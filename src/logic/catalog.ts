// Looking up and checking the Leistungskatalog. Every catalog — shipped or imported — goes through
// validateCatalog, so a transcription error is reported instead of silently misjudging a result.
import { parseMeasure } from './measure.ts';
import { GROUPS, MIN_AGE, TRACKS } from './reference.ts';
import type {
  Catalog,
  ClassId,
  Exercise,
  ExerciseDetail,
  Requirement,
  Sex,
  Thresholds,
  Track,
} from './types.ts';

export type Direction = 'higher' | 'lower';

/** Bronze below Gold means more is better (distances, durations); otherwise less is better. */
export function directionOf(thresholds: Thresholds): Direction {
  return thresholds.bronze < thresholds.gold ? 'higher' : 'lower';
}

export function exerciseById(catalog: Catalog, id: string): Exercise | undefined {
  return catalog.exercises.find((exercise) => exercise.id === id);
}

/** Name of the exercise as printed on the card of the given track. */
export function exerciseName(exercise: Exercise, track: Track): string {
  return exercise.trackNames?.[track] ?? exercise.name;
}

/** The help text in its paragraphs, each with its heading („Aufbau“, „Ablauf“, „MmB“) if it has one. */
export function helpParagraphs(text: string): { label: string | null; text: string }[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '')
    .map((paragraph) => {
      const match = /^(Aufbau|Ablauf|MmB):\s*(.*)$/s.exec(paragraph);
      return match
        ? { label: match[1] ?? null, text: match[2] ?? '' }
        : { label: null, text: paragraph };
    });
}

/** The official details of an exercise's variants, in catalog order (none without the package). */
export function exerciseDetails(catalog: Catalog, exerciseId: string): ExerciseDetail[] {
  return (catalog.details ?? []).filter((detail) => detail.exerciseId === exerciseId);
}

/**
 * The name a variant is shown by (Tobias 2026-11-11: the official names, „bei Abweichungen gilt das
 * Amtliche“): the title of its official detail, e.g. „Kopfstand“ for the platform's „Schulterstand“.
 * A label that is the official name plus an addition stays, so „Handstütz-Sprungüberschlag auf
 * Sprungtisch“ and „… auf Weichbodenmatte“ remain apart. The label stays the key in the data.
 */
export function variantName(catalog: Catalog, exerciseId: string, label: string): string {
  const detail = catalog.details?.find((d) => d.exerciseId === exerciseId && d.label === label);
  return !detail || label.startsWith(detail.title) ? label : detail.title;
}

export interface RequirementQuery {
  exerciseId: string;
  track: Track;
  sex: Sex;
  age: number;
  /** null for the regular track. */
  classId: ClassId | null;
}

function coversAge(requirement: Requirement, age: number): boolean {
  return requirement.ageFrom <= age && (requirement.ageTo === null || age <= requirement.ageTo);
}

const caseKey = (exerciseId: string, track: Track, sex: Sex, classId: ClassId | null) =>
  `${exerciseId}|${track}|${sex}|${classId ?? ''}`;

/** The requirements by case, built once per requirement list (17 000 rows; pages ask often). */
const byCase = new WeakMap<readonly Requirement[], Map<string, Requirement[]>>();

function indexOf(requirements: readonly Requirement[]): Map<string, Requirement[]> {
  let index = byCase.get(requirements);
  if (!index) {
    index = new Map();
    for (const r of requirements) {
      const key = caseKey(r.exerciseId, r.track, r.sex, r.classId ?? null);
      index.set(key, [...(index.get(key) ?? []), r]);
    }
    byCase.set(requirements, index);
  }
  return index;
}

/** All requirements matching the query — several are variants to choose (different labels). */
export function findRequirements(catalog: Catalog, query: RequirementQuery): Requirement[] {
  const candidates =
    indexOf(catalog.requirements).get(
      caseKey(query.exerciseId, query.track, query.sex, query.classId),
    ) ?? [];
  return candidates.filter((requirement) => coversAge(requirement, query.age));
}

/** One row of a Leistungstabelle in card notation, e.g. bronze "05:40". */
export interface RequirementRow {
  exerciseId: string;
  track: Track;
  sex: Sex;
  ageFrom: number;
  ageTo: number | null;
  classId?: ClassId;
  label: string;
  bronze?: string;
  silver?: string;
  gold?: string;
}

export type RowResult = { ok: true; requirement: Requirement } | { ok: false; error: string };

/** Turns a transcribed table row into a requirement, parsing the limits like user input. */
export function requirementFromRow(catalog: Catalog, row: RequirementRow): RowResult {
  const exercise = exerciseById(catalog, row.exerciseId);
  if (!exercise) return { ok: false, error: `Unbekannte Übung „${row.exerciseId}“.` };
  const { bronze, silver, gold, ...rest } = row;
  if (exercise.measure === 'level') {
    if (bronze !== undefined || silver !== undefined || gold !== undefined) {
      return {
        ok: false,
        error: `${exercise.name}: wird nach Ausführung bewertet, ohne Grenzwerte.`,
      };
    }
    return { ok: true, requirement: rest };
  }
  const parsed: number[] = [];
  for (const [label, text] of [
    ['Bronze', bronze],
    ['Silber', silver],
    ['Gold', gold],
  ] as const) {
    const result = parseMeasure(exercise.measure, text ?? '');
    if (!result.ok || typeof result.value !== 'number') {
      return {
        ok: false,
        error: `${exercise.name}, ${row.label}, ${label}: ${result.ok ? '' : result.error}`,
      };
    }
    parsed.push(result.value);
  }
  const [b, s, g] = parsed as [number, number, number];
  return { ok: true, requirement: { ...rest, thresholds: { bronze: b, silver: s, gold: g } } };
}

export interface CatalogIssue {
  message: string;
}

function duplicates(ids: readonly string[]): string[] {
  return [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
}

function checkThresholds(exercise: Exercise, requirement: Requirement, where: string): string[] {
  const { thresholds } = requirement;
  if (exercise.measure === 'level') {
    return thresholds
      ? [`${where}: Übung wird nach Ausführung bewertet, Grenzwerte sind falsch.`]
      : [];
  }
  if (!thresholds) return [`${where}: Grenzwerte fehlen.`];
  const values = [thresholds.bronze, thresholds.silver, thresholds.gold];
  if (values.some((value) => !Number.isInteger(value) || value < 0)) {
    return [`${where}: Grenzwerte müssen ganze, nicht negative Zahlen sein.`];
  }
  if (thresholds.bronze === thresholds.gold) return [`${where}: Bronze und Gold sind gleich.`];
  const between =
    directionOf(thresholds) === 'higher'
      ? thresholds.bronze <= thresholds.silver && thresholds.silver <= thresholds.gold
      : thresholds.bronze >= thresholds.silver && thresholds.silver >= thresholds.gold;
  return between ? [] : [`${where}: Silber liegt nicht zwischen Bronze und Gold.`];
}

function overlaps(a: Requirement, b: Requirement): boolean {
  const aTo = a.ageTo ?? Infinity;
  const bTo = b.ageTo ?? Infinity;
  return a.ageFrom <= bTo && b.ageFrom <= aTo;
}

/** Every inconsistency of the catalog; empty when it can be used. */
export function validateCatalog(catalog: Catalog): CatalogIssue[] {
  const issues: string[] = [];
  for (const id of duplicates(catalog.exercises.map((exercise) => exercise.id))) {
    issues.push(`Übung „${id}“ ist mehrfach vorhanden.`);
  }
  for (const id of duplicates(catalog.classes.map((entry) => entry.id))) {
    issues.push(`Behinderungsklasse „${id}“ ist mehrfach vorhanden.`);
  }
  for (const exercise of catalog.exercises) {
    if (exercise.tracks.length === 0) issues.push(`${exercise.name}: keiner Bedingung zugeordnet.`);
    if (exercise.help.source.trim() === '') issues.push(`${exercise.name}: Hilfe ohne Quelle.`);
  }
  const classIds = new Set(catalog.classes.map((entry) => entry.id));
  const mainIds = new Set(
    catalog.classes.filter((entry) => entry.parentId === undefined).map((entry) => entry.id),
  );
  for (const entry of catalog.classes) {
    if (entry.parentId !== undefined && !mainIds.has(entry.parentId)) {
      issues.push(`Behinderungsklasse „${entry.id}“: Hauptklasse „${entry.parentId}“ fehlt.`);
    }
  }
  const cases = new Map<string, number[]>();
  const exercises = new Map(catalog.exercises.map((exercise) => [exercise.id, exercise]));
  catalog.requirements.forEach((requirement, index) => {
    const where = `Anforderung ${index + 1} (${requirement.exerciseId}, ${requirement.label})`;
    const exercise = exercises.get(requirement.exerciseId);
    if (!exercise) {
      issues.push(`${where}: unbekannte Übung.`);
      return;
    }
    if (!exercise.tracks.includes(requirement.track)) {
      issues.push(`${where}: Übung gibt es unter diesen Bedingungen nicht.`);
    }
    if (
      requirement.track === 'mmb' &&
      !(requirement.classId && classIds.has(requirement.classId))
    ) {
      issues.push(`${where}: Behinderungsklasse fehlt oder ist unbekannt.`);
    }
    if (requirement.track === 'regular' && requirement.classId !== undefined) {
      issues.push(`${where}: reguläre Anforderung mit Behinderungsklasse.`);
    }
    if (requirement.ageFrom < MIN_AGE) issues.push(`${where}: Alter unter ${MIN_AGE}.`);
    if (requirement.ageTo !== null && requirement.ageTo < requirement.ageFrom) {
      issues.push(`${where}: Altersspanne ist leer.`);
    }
    issues.push(...checkThresholds(exercise, requirement, where));
    // only the same case and variant can overlap: compare within its bucket (17 000 rows in 2026)
    const key = [
      requirement.exerciseId,
      requirement.track,
      requirement.sex,
      requirement.classId ?? '',
      requirement.label,
    ].join('|');
    const bucket = cases.get(key) ?? [];
    for (const earlierIndex of bucket) {
      const earlier = catalog.requirements[earlierIndex];
      if (earlier && overlaps(earlier, requirement)) {
        issues.push(`${where}: überschneidet sich mit Anforderung ${earlierIndex + 1}.`);
      }
    }
    cases.set(key, [...bucket, index]);
  });
  issues.push(...spazIssues(catalog));
  return issues.map((message) => ({ message }));
}

function spazIssues(catalog: Catalog): string[] {
  if (!catalog.spaz) return [];
  const seen = new Set<string>();
  return catalog.spaz.labels.flatMap((label) => {
    const track = TRACKS.find((entry) => entry.id === label.track)?.short ?? label.track;
    const group = GROUPS.find((entry) => entry.id === label.group)?.label ?? label.group;
    const where = `SpAz „${label.label}“ (${track}, ${group})`;
    const key = `${label.track}|${label.group}|${label.label}`;
    const issues = seen.has(key) ? [`${where} ist mehrfach eingetragen.`] : [];
    seen.add(key);
    if (label.manual) {
      return label.exerciseIds.length > 0
        ? [...issues, `${where}: Ausgleichsbedingung ohne Übungen.`]
        : issues;
    }
    if (label.exerciseIds.length === 0) return [...issues, `${where}: keine Übung zugeordnet.`];
    return [
      ...issues,
      ...label.exerciseIds.flatMap((id) => {
        const exercise = exerciseById(catalog, id);
        if (!exercise) return [`${where}: unbekannte Übung „${id}“.`];
        if (exercise.group !== label.group)
          return [`${where}: „${id}“ gehört zu einer anderen Gruppe.`];
        return exercise.tracks.includes(label.track)
          ? []
          : [`${where}: „${id}“ gilt nicht für ${track}.`];
      }),
    ];
  });
}
