// Data model of the Vorerfassung. Identifiers are English; the German domain term is noted where
// it is not obvious. Reference data (catalog) and user data (workbook) are kept strictly apart.
import type { SwimWay } from './swim.ts';

/** Bedingungen: DOSB (regular) or DBS conditions for Menschen mit Behinderung — never mixed. */
export type Track = 'regular' | 'mmb';

/** Wertungskategorie w/m; non-binary people choose one of the two (Prüfungswegweiser 2026). */
export type Sex = 'w' | 'm';

/** Leistungsstufe. */
export type Level = 'bronze' | 'silver' | 'gold';

/** Disziplingruppe. */
export type GroupId = 'endurance' | 'strength' | 'speed' | 'coordination';

/** Behinderungsklasse id as listed in the catalog ('A'–'J'; subgroups may follow). */
export type ClassId = string;

/** How a value is entered and stored (smallest unit, so comparisons stay integer). */
export type MeasureKindId = 'minSec' | 'secTenth' | 'meterCm' | 'points' | 'count' | 'level';

/** Numbers in the measure's base unit, or a level for exercises judged by execution. */
export type MeasuredValue = number | Level;

export interface Help {
  /** Explanation in our own words; empty until written. */
  text: string;
  /** Where the official rules for this exercise are, e.g. "Prüfungswegweiser 2026, Kap. 6.1.1". */
  source: string;
}

/** Übung — one row of the Prüfkarte. */
export interface Exercise {
  id: string;
  name: string;
  /** Wording on the card of another track, e.g. "Laufen / Rollstuhlfahren" for MmB. */
  trackNames?: Partial<Record<Track, string>>;
  group: GroupId;
  measure: MeasureKindId;
  tracks: readonly Track[];
  help: Help;
}

/** Bronze/Silber/Gold limits in the exercise's base unit. Direction follows from their order. */
export interface Thresholds {
  bronze: number;
  silver: number;
  gold: number;
}

/** Leistungsanforderung for one exercise, track, sex, age band and (MmB) class. */
export interface Requirement {
  exerciseId: string;
  track: Track;
  sex: Sex;
  ageFrom: number;
  /** null = open upwards (e.g. 90+). */
  ageTo: number | null;
  /** Only for track 'mmb'. */
  classId?: ClassId;
  /** The concrete variant for this age, e.g. "800 m", "Schlagball (80 g)". */
  label: string;
  /** Absent for exercises judged by execution level (measure 'level'). */
  thresholds?: Thresholds;
}

/** Behinderungsklasse (A–J) or one of its subgroups (e.g. "H II" under "H"). */
export interface DisabilityClass {
  id: ClassId;
  label: string;
  /** Main class of a subgroup. */
  parentId?: ClassId;
  /** Criteria for the classification (Einstufung), from the DBS handbook. */
  description?: string;
}

/** One discipline entry as SpAz names it, and the exercises it stands for. */
export interface SpazLabel {
  /** SpAz keeps one list per Laufzettel: „Normal“ (regular) and „Behindertensport“ (MmB). */
  track: Track;
  group: GroupId;
  label: string;
  exerciseIds: readonly string[];
  /** The "Ausgleichsbedingung" entry: decided by hand, no exercise behind it. */
  manual?: boolean;
  note?: string;
}

export interface SpazMapping {
  source: string;
  /** False while only part of SpAz's list is known. */
  complete: boolean;
  labels: readonly SpazLabel[];
}

export interface Catalog {
  validFrom: number;
  sources: readonly string[];
  classes: readonly DisabilityClass[];
  exercises: readonly Exercise[];
  requirements: readonly Requirement[];
  spaz: SpazMapping | null;
  /** Official detail of a variant (local package only, rights of DOSB); absent without it. */
  details?: readonly ExerciseDetail[];
}

/**
 * How one variant is done, from the official text (Tobias 2026-11-10: „die einzelnen Schrittarten
 * im Koordinationsleiterlauf, die Ausführungsbilder zum Bodenturnen/Gerätturnen“): a ladder step
 * sequence or a Gerätturnen element with its task per level. Verbatim, so only in the local package.
 */
export interface ExerciseDetail {
  exerciseId: string;
  /** The variant it describes — a Requirement.label of that exercise. */
  label: string;
  /** Name in the source (may differ from the platform's label). */
  title: string;
  subtitle?: string;
  /** Ages as the source states them, e.g. „Altersgruppe: 6 – 7 und 70 und älter“. */
  ages?: string;
  material?: string;
  /** The steps of the sequence, in order. */
  steps?: readonly string[];
  /** The task per level (Gerätturnen: every level is its own task). */
  levels?: Readonly<Record<'bronze' | 'silver' | 'gold', string>>;
  /** Picture inlined at build time as data: URL. */
  image?: string;
  imageAlt?: string;
  /** 'tall' (ladder) is shown by height, 'wide' (a strip of pictures) scrolls sideways on a phone. */
  imageShape?: 'tall' | 'wide';
  /** Official video instructions (opens outside the app, needs internet). */
  video?: string;
  source: string;
}

/** Teilnehmer*in — a child is entered with first name and birth year (Tobias 2026-11-10). */
export interface Athlete {
  id: string;
  firstName: string;
  /** Only from files of version 1, which asked for it; the app no longer does. */
  lastName?: string;
  /** Jahrgang: the age that counts is exam year − birth year (Jahrgangsprinzip, Kap. 1). */
  birthYear: number;
  sex: Sex;
  track: Track;
  /** Possible Behinderungsklassen (MmB) — every class that matches; empty for regular or open. */
  classIds: readonly ClassId[];
  /** Matching classes the examiner deliberately does not use; a subset of classIds. */
  inactiveClassIds: readonly ClassId[];
  /** MmB: the separate consent for health data is on file. */
  consentOnFile: boolean;
  dsaId?: string;
  postalCode?: string;
  city?: string;
  /** Year of the last Nachweis der Schwimmfertigkeit entered by the examiner (a swim recorded as an
   * exercise counts by itself, see `swimProof`). */
  swimProofYear?: number;
  /** How that proof was given (Kap. 4.2); absent = only the year is known. Needs `swimProofYear`. */
  swimProofWay?: SwimWay;
  /** Erstmaliger Erwerb: the swim proof must be from the exam year. */
  firstTime: boolean;
}

/** Personengruppe, e.g. a class or a training group. */
export interface AthleteGroup {
  id: string;
  name: string;
  athleteIds: readonly string[];
}

/** Messwert — one recorded attempt. */
export interface Measurement {
  id: string;
  athleteId: string;
  exerciseId: string;
  value: MeasuredValue;
  /** MmB with several possible classes: the class this value is to be judged under. */
  classId?: ClassId;
  /** The variant done, by its requirement label (e.g. „Kegeln Bohle“); needed when there are several. */
  variant?: string;
  /** ISO date YYYY-MM-DD. */
  date?: string;
}

/**
 * Why the examiner decides a group by hand. Both can only be submitted on the paper Prüfkarte with
 * the final result (DOSB info sheet MmB; DBS-Handbuch 4.8 for Ausgleichsbedingungen).
 */
export type ManualBasis = 'compensation' | 'combinedClasses';

/** A group decided by the examiner: Ausgleichsbedingung or combination of classes, as free text. */
export interface ManualAssessment {
  id: string;
  athleteId: string;
  group: GroupId;
  basis: ManualBasis;
  /** The condition as set, e.g. "Ausdauerschwimmen 400 m statt 800 m (Hautverbrennungen)". */
  condition: string;
  /** What was achieved, e.g. "400 m in 11:20". */
  performance: string;
  /** Prüfer*in or Arzt*Ärztin who set the condition. */
  setBy: string;
  /** The examiner's decision; null while still open. */
  level: Level | null;
  /** ISO date YYYY-MM-DD. */
  date?: string;
}

/** Endgültiges Prüfungsprofil: the measurement the examiner takes over for a group. */
export interface ProfileChoice {
  athleteId: string;
  group: GroupId;
  measurementId: string;
}

/**
 * Vorhaben: the child will do this exercise (Tobias 2026-11-10: „auswählen, dass die Übung von dem
 * Kind gemacht werden wird“) — plans the stations; the evaluation does not depend on it.
 */
export interface Plan {
  athleteId: string;
  exerciseId: string;
}

export interface Organisation {
  name: string;
  postalCode: string;
  city: string;
}

export const WORKBOOK_FORMAT = 'sportabzeichen-vorerfassung';
/** 2 since 2026-11-10: `birthYear` instead of `birthDate`, `lastName` optional. */
export const WORKBOOK_VERSION = 2;

/** Root of the persisted file and of the browser draft. */
export interface Workbook {
  format: typeof WORKBOOK_FORMAT;
  version: typeof WORKBOOK_VERSION;
  /** Sportabzeichenjahr (Prüfungsjahr). */
  year: number;
  /** Fallback address when an athlete has none (required by the official import). */
  organisation: Organisation;
  athletes: readonly Athlete[];
  groups: readonly AthleteGroup[];
  measurements: readonly Measurement[];
  manualAssessments: readonly ManualAssessment[];
  /** At most one per athlete and group; without a choice the best result counts. */
  profileChoices: readonly ProfileChoice[];
  /** Exercises the children will do (added 2026-11-10; older files get an empty list). */
  plans: readonly Plan[];
}
