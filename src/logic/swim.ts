// Nachweis der Schwimmfertigkeit, Prüfungswegweiser 2026 Kap. 4.2. The DBS handbook (4.1, 4.10 and
// the MmB Prüfkarten) refers to the Wegweiser, names the same ways and the same validity, and frees
// nobody from the proof (swimming aids only after asking the DBS) — so one rule set for both tracks.
import { exerciseById } from './catalog.ts';
import { ADULT_AGE, ADULT_SWIM_PROOF_YEARS, GROUPS } from './reference.ts';
import type { Athlete, Catalog, Level, Workbook } from './types.ts';

/**
 * The ways of Kap. 4.2 besides a Sportabzeichen exercise, entered by the examiner (in our own
 * words). `forAge` follows the Wegweiser's split at 12 (age in the year of the proof).
 */
export const SWIM_WAYS = [
  { id: 'continuous15', label: '15 min Dauerschwimmen', forAge: () => true },
  { id: 'swim50', label: '50 m am Stück, ohne Zeitlimit', forAge: (age: number) => age < 12 },
  {
    id: 'swim200',
    label: '200 m am Stück in höchstens 11 min',
    forAge: (age: number) => age >= 12,
  },
  {
    id: 'clothes100',
    label: '100 m Kleiderschwimmen in höchstens 4 min, danach im Wasser entkleiden',
    forAge: () => true,
  },
  { id: 'badgeSwim', label: 'Deutsches Schwimmabzeichen', forAge: () => true },
  { id: 'badgeJuniorRescue', label: 'Junior-Retter', forAge: () => true },
  {
    id: 'badgeRescue',
    label: 'Deutsches Rettungsschwimmabzeichen',
    forAge: (age: number) => age >= 12,
  },
  { id: 'badgeTriathlonYouth', label: 'Deutsches Triathlonabzeichen Jugend', forAge: () => true },
  {
    id: 'badgePentathlon',
    label: 'Deutsches Fünfkampfabzeichen',
    forAge: (age: number) => age >= 12,
  },
] as const;

export type SwimWay = (typeof SWIM_WAYS)[number]['id'];

export const SWIM_WAY_IDS: readonly string[] = SWIM_WAYS.map((way) => way.id);

export const swimWayLabel = (id: SwimWay): string =>
  SWIM_WAYS.find((way) => way.id === id)?.label ?? id;

/** The ways open to a child of this age (Jahrgangsprinzip) in the year of the proof. */
export function swimWaysFor(age: number): SwimWay[] {
  return SWIM_WAYS.filter((way) => way.forAge(age)).map((way) => way.id);
}

/** Ab 12: the Wegweiser accepts these badges only when DLRG, DSV, Wasserwacht, DRK or ASB took them. */
export const BADGE_TAKERS_FROM_12 = 'abgenommen durch DLRG, DSV, Wasserwacht, DRK oder ASB';

/**
 * Sportabzeichen exercises that are a swim proof when done (Kap. 4.2): the swim of the Ausdauer
 * group swum completely — no time needed, so every recorded value counts —, the swim of the
 * Schnelligkeit group only from Bronze. MmB Dauerschwimmen is a variant of `swim-endurance`.
 */
export const SWIM_PROOF_EXERCISES: Readonly<Record<string, 'any' | 'bronze'>> = {
  'swim-endurance': 'any',
  'swim-sprint': 'bronze',
  'swim-sprint-minutes': 'bronze',
};

/** One recorded attempt, as far as the swim proof needs it. */
export interface SwimAttempt {
  measurementId: string;
  exerciseId: string;
  /** The year it was swum (its date, else the workbook's year). */
  year: number;
  level: Level | null;
}

/** Where the proof that counts comes from. */
export type SwimProof =
  | { from: 'measurement'; year: number; measurementId: string; exerciseId: string }
  /** Entered by the examiner; `way` absent = only the year is known (e.g. from the Prüfkarte). */
  | { from: 'entered'; year: number; way?: SwimWay };

/**
 * The proof that counts: the latest of the entered one and the swims recorded as exercises. At the
 * same year the recorded swim wins (it carries its own evidence).
 */
export function swimProof(
  athlete: Pick<Athlete, 'swimProofYear' | 'swimProofWay'>,
  attempts: readonly SwimAttempt[],
): SwimProof | null {
  const proving = attempts
    .filter((attempt) => {
      const rule = SWIM_PROOF_EXERCISES[attempt.exerciseId];
      return rule === 'any' || (rule === 'bronze' && attempt.level !== null);
    })
    .sort((a, b) => b.year - a.year);
  const best = proving[0];
  const entered = athlete.swimProofYear;
  if (best && (entered === undefined || best.year >= entered)) {
    const { measurementId, exerciseId, year } = best;
    return { from: 'measurement', year, measurementId, exerciseId };
  }
  if (entered === undefined) return null;
  return athlete.swimProofWay === undefined
    ? { from: 'entered', year: entered }
    : { from: 'entered', year: entered, way: athlete.swimProofWay };
}

export type SwimStatus =
  | 'valid'
  | 'missing'
  /** Proof dated after the exam year. */
  | 'future'
  /** Erstmaliger Erwerb: the proof must be from the exam year itself. */
  | 'firstTimeMustSwim'
  /** An adult may not use a proof from before the year of the 18th birthday. */
  | 'childProof'
  /** Adult proof older than its five years (issue year included). */
  | 'expired';

export const SWIM_STATUS_TEXT: Readonly<Record<SwimStatus, string>> = {
  valid: 'Schwimmnachweis gültig.',
  missing: 'Schwimmnachweis fehlt.',
  future: 'Das Jahr des Schwimmnachweises liegt nach dem Prüfungsjahr.',
  firstTimeMustSwim: 'Erstmaliger Erwerb: Im Prüfungsjahr muss geschwommen werden.',
  childProof:
    'Ein Nachweis aus der Kinder- und Jugendzeit gilt nicht für Erwachsene – im Jahr des 18. Geburtstags erneut schwimmen.',
  expired: 'Schwimmnachweis abgelaufen (für Erwachsene fünf Jahre gültig).',
};

type SwimFacts = Pick<Athlete, 'birthYear' | 'swimProofYear' | 'firstTime'>;

/** The status of the proof that counts (see `swimProof`). */
export function swimProofStatus(
  athlete: Pick<Athlete, 'birthYear' | 'firstTime'>,
  proof: SwimProof | null,
  year: number,
): SwimStatus {
  const facts: SwimFacts = { birthYear: athlete.birthYear, firstTime: athlete.firstTime };
  return swimStatus(proof ? { ...facts, swimProofYear: proof.year } : facts, year);
}

export function swimStatus(athlete: SwimFacts, year: number): SwimStatus {
  const proofYear = athlete.swimProofYear;
  if (proofYear === undefined) return 'missing';
  if (proofYear > year) return 'future';
  if (athlete.firstTime && proofYear !== year) return 'firstTimeMustSwim';
  const { birthYear } = athlete;
  if (year - birthYear >= ADULT_AGE) {
    if (proofYear - birthYear < ADULT_AGE) return 'childProof';
    if (year - proofYear >= ADULT_SWIM_PROOF_YEARS) return 'expired';
  }
  return 'valid';
}

/** Where the proof that counts comes from, in words. */
export function swimProofText(
  proof: SwimProof | null,
  workbook: Pick<Workbook, 'measurements'>,
  catalog: Catalog,
): string {
  if (!proof) return 'kein Nachweis eingetragen oder erfasst';
  if (proof.from === 'entered') {
    return proof.way
      ? `${proof.year}: ${swimWayLabel(proof.way)}`
      : `${proof.year} (nur das Jahr eingetragen)`;
  }
  const exercise = exerciseById(catalog, proof.exerciseId);
  const group = GROUPS.find((entry) => entry.id === exercise?.group)?.label;
  const measurement = workbook.measurements.find((m) => m.id === proof.measurementId);
  return `${proof.year}: ${exercise?.name ?? proof.exerciseId}${group ? ` (${group})` : ''} erfasst${
    measurement?.date ? ` am ${measurement.date.split('-').reverse().join('.')}` : ''
  }`;
}
