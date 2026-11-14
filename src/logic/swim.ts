// Nachweis der Schwimmfertigkeit, Prüfungswegweiser 2026 Kap. 4.2.
import { ADULT_AGE, ADULT_SWIM_PROOF_YEARS } from './reference.ts';
import type { Athlete } from './types.ts';

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
