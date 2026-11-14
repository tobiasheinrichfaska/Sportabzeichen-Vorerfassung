// Fixed reference data from the DOSB-Prüfungswegweiser „Gültig ab 2026“ (see docs/quellen.md).
import type { GroupId, Level, MeasureKindId, Track } from './types.ts';

export const GROUPS: readonly { id: GroupId; label: string; chapter: string }[] = [
  { id: 'endurance', label: 'Ausdauer', chapter: '6.1' },
  { id: 'strength', label: 'Kraft', chapter: '6.2' },
  { id: 'speed', label: 'Schnelligkeit', chapter: '6.3' },
  { id: 'coordination', label: 'Koordination', chapter: '6.4' },
];

/** Kap. 4.3: Bronze = 1, Silber = 2, Gold = 3 Punkte. Ordered from lowest to highest. */
export const LEVELS: readonly { id: Level; label: string; points: number }[] = [
  { id: 'bronze', label: 'Bronze', points: 1 },
  { id: 'silver', label: 'Silber', points: 2 },
  { id: 'gold', label: 'Gold', points: 3 },
];

/** Kap. 4.3: Verleihung nach Gesamtpunkten. */
export const AWARD_BANDS: readonly { level: Level; from: number; to: number }[] = [
  { level: 'bronze', from: 4, to: 7 },
  { level: 'silver', from: 8, to: 10 },
  { level: 'gold', from: 11, to: 12 },
];

export const TRACKS: readonly { id: Track; label: string; short: string }[] = [
  { id: 'regular', label: 'Regulär (DOSB)', short: 'regulär' },
  { id: 'mmb', label: 'Menschen mit Behinderung (DBS)', short: 'MmB' },
];

/** Units as printed on the Prüfkarten 2026. */
export const MEASURE_KINDS: Readonly<Record<MeasureKindId, { label: string; example: string }>> = {
  minSec: { label: 'Min., Sek.', example: '05:40' },
  secTenth: { label: 'Sek., 1/10 Sek.', example: '8,4' },
  meterCm: { label: 'm, cm', example: '2,35' },
  points: { label: 'Punkte', example: '24' },
  count: { label: 'Anzahl', example: '15' },
  level: { label: 'Stufe (B/S/G)', example: 'S' },
};

/** Kap. 1: from the calendar year in which the 6th year of life is completed. */
export const MIN_AGE = 6;
/** Kap. 1 / 4.2: adult conditions from the year in which the 18th year is completed. */
export const ADULT_AGE = 18;
/** Kap. 4.2: an adult swim proof covers its issue year and the four following years. */
export const ADULT_SWIM_PROOF_YEARS = 5;
