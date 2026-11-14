// TEST DATA ONLY — limits shaped like the official tables but not to be used for real evaluations.
// The catalog structure itself is the real public data package (catalog/2026), assembled exactly
// as the build does it.
import catalogJson from '../../catalog/2026/catalog.json';
import spazJson from '../../catalog/2026/spaz.json';
import type { RequirementRow } from '../../src/logic/catalog';
import { assembleCatalog, type CatalogFiles } from '../../src/logic/catalogPackage';
import type { Athlete, Catalog, Workbook } from '../../src/logic/types';
import { emptyWorkbook } from '../../src/logic/workbook';

export const PUBLIC_FILES: CatalogFiles = {
  catalog: catalogJson,
  spaz: spazJson,
};

function assemble(files: CatalogFiles): Catalog {
  const result = assembleCatalog(files);
  if (!result.ok) throw new Error(result.errors.join('\n'));
  return result.catalog;
}

/** The public package of 2026 without any limits. */
export const PUBLIC_CATALOG: Catalog = assemble(PUBLIC_FILES);

const ROWS: RequirementRow[] = [
  // regular, w, 8–9
  {
    exerciseId: 'run-endurance',
    track: 'regular',
    sex: 'w',
    ageFrom: 8,
    ageTo: 9,
    label: '800 m',
    bronze: '05:33',
    silver: '04:52',
    gold: '04:12',
  },
  {
    exerciseId: 'run-continuous',
    track: 'regular',
    sex: 'w',
    ageFrom: 8,
    ageTo: 9,
    label: 'Dauerlauf',
    bronze: '11:00',
    silver: '16:00',
    gold: '21:00',
  },
  {
    exerciseId: 'medicine-ball',
    track: 'regular',
    sex: 'w',
    ageFrom: 8,
    ageTo: 9,
    label: 'Medizinball (1 kg)',
    bronze: '3,10',
    silver: '4,10',
    gold: '5,10',
  },
  {
    exerciseId: 'sprint',
    track: 'regular',
    sex: 'w',
    ageFrom: 8,
    ageTo: 9,
    label: '30 m',
    bronze: '7,3',
    silver: '6,7',
    gold: '5,8',
  },
  {
    exerciseId: 'zone-long-jump',
    track: 'regular',
    sex: 'w',
    ageFrom: 8,
    ageTo: 9,
    label: 'Zonenweitsprung',
    bronze: '24',
    silver: '27',
    gold: '30',
  },
  {
    exerciseId: 'gymnastics-coordination',
    track: 'regular',
    sex: 'w',
    ageFrom: 8,
    ageTo: 9,
    label: 'Reck',
  },
  // regular, open age band
  {
    exerciseId: 'run-10k',
    track: 'regular',
    sex: 'm',
    ageFrom: 90,
    ageTo: null,
    label: '10 km',
    bronze: '1:30:00',
    silver: '1:20:00',
    gold: '1:10:00',
  },
  // MmB, m, 18–29 — class A and H differ, B and C are identical
  {
    exerciseId: 'run-endurance',
    track: 'mmb',
    sex: 'm',
    ageFrom: 18,
    ageTo: 29,
    classId: 'A',
    label: '800 m',
    bronze: '05:00',
    silver: '04:30',
    gold: '04:00',
  },
  {
    exerciseId: 'run-endurance',
    track: 'mmb',
    sex: 'm',
    ageFrom: 18,
    ageTo: 29,
    classId: 'H',
    label: '800 m Rollstuhl',
    bronze: '06:00',
    silver: '05:00',
    gold: '04:00',
  },
  {
    exerciseId: 'long-jump',
    track: 'mmb',
    sex: 'm',
    ageFrom: 18,
    ageTo: 29,
    classId: 'B',
    label: 'Weitsprung',
    bronze: '2,00',
    silver: '2,50',
    gold: '3,00',
  },
  {
    exerciseId: 'long-jump',
    track: 'mmb',
    sex: 'm',
    ageFrom: 18,
    ageTo: 29,
    classId: 'C',
    label: 'Weitsprung',
    bronze: '2,00',
    silver: '2,50',
    gold: '3,00',
  },
  {
    exerciseId: 'shot-put',
    track: 'mmb',
    sex: 'm',
    ageFrom: 18,
    ageTo: 29,
    classId: 'A',
    label: 'Kugel (5 kg)',
    bronze: '5,20',
    silver: '6,20',
    gold: '7,20',
  },
  {
    exerciseId: 'race-walking',
    track: 'mmb',
    sex: 'm',
    ageFrom: 18,
    ageTo: 29,
    classId: 'A',
    label: '100 m Gehen',
    bronze: '30,0',
    silver: '25,0',
    gold: '20,0',
  },
  {
    exerciseId: 'target-throw',
    track: 'mmb',
    sex: 'm',
    ageFrom: 18,
    ageTo: 29,
    classId: 'A',
    label: 'Zielwurf',
    bronze: '10',
    silver: '15',
    gold: '20',
  },
];

/** The public package plus the test limits, passed in as a local requirements file. */
export const TEST_CATALOG: Catalog = assemble({
  ...PUBLIC_FILES,
  localRequirements: { rows: ROWS },
});

export const YEAR = 2026;

export function athlete(patch: Partial<Athlete> & Pick<Athlete, 'id'>): Athlete {
  return {
    firstName: 'Erika',
    birthYear: 2017,
    sex: 'w',
    track: 'regular',
    classIds: [],
    inactiveClassIds: [],
    consentOnFile: false,
    firstTime: false,
    swimProofYear: 2025,
    ...patch,
  };
}

/** A regular girl (9 in 2026) and an MmB man (25 in 2026) with possible classes A and H. */
export function sampleWorkbook(): Workbook {
  return {
    ...emptyWorkbook(YEAR),
    organisation: { name: 'TSV Musterstadt', postalCode: '76131', city: 'Karlsruhe' },
    athletes: [
      athlete({ id: 'p1' }),
      athlete({
        id: 'p2',
        firstName: 'Max',
        birthYear: 2001,
        sex: 'm',
        track: 'mmb',
        classIds: ['A', 'H'],
        consentOnFile: true,
        swimProofYear: 2024,
      }),
    ],
    groups: [{ id: 'g1', name: 'Gruppe 1', athleteIds: ['p1', 'p2'] }],
  };
}
