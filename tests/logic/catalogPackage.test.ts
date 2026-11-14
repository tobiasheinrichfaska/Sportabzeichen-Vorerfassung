import { assembleCatalog, catalogForYear } from '../../src/logic/catalogPackage';
import type { Catalog } from '../../src/logic/types';
import { PUBLIC_CATALOG, PUBLIC_FILES } from '../fixtures/testCatalog';

const row = {
  exerciseId: 'run-endurance',
  track: 'regular',
  sex: 'w',
  ageFrom: 6,
  ageTo: 7,
  label: '800 m',
  bronze: '05:38',
  silver: '04:58',
  gold: '04:13',
};

function errorsOf(files: Parameters<typeof assembleCatalog>[0]): string {
  const result = assembleCatalog(files);
  return result.ok ? '' : result.errors.join(' | ');
}

/** The public catalog.json with one part replaced. */
function withMain(patch: Record<string, unknown>) {
  return { ...PUBLIC_FILES, catalog: { ...(PUBLIC_FILES.catalog as object), ...patch } };
}

describe('assembleCatalog', () => {
  it('assembles the public 2026 package without limits', () => {
    expect(PUBLIC_CATALOG.validFrom).toBe(2026);
    expect(PUBLIC_CATALOG.requirements).toEqual([]);
    const tracks = new Set(PUBLIC_CATALOG.spaz?.labels.map((label) => label.track));
    expect(tracks).toEqual(new Set(['regular', 'mmb']));
  });

  it('reads local limit rows in card notation', () => {
    const result = assembleCatalog({ ...PUBLIC_FILES, localRequirements: { rows: [row] } });
    expect(result.ok && result.catalog.requirements).toEqual([
      {
        exerciseId: 'run-endurance',
        track: 'regular',
        sex: 'w',
        ageFrom: 6,
        ageTo: 7,
        label: '800 m',
        thresholds: { bronze: 338, silver: 298, gold: 253 },
      },
    ]);
  });

  it('accepts an open age band (null)', () => {
    const open = { ...row, exerciseId: 'run-10k', ageFrom: 90, ageTo: null };
    expect(assembleCatalog({ ...PUBLIC_FILES, localRequirements: { rows: [open] } }).ok).toBe(true);
  });

  it('merges local class details and adds subgroups', () => {
    const result = assembleCatalog({
      ...PUBLIC_FILES,
      localClasses: {
        classes: [
          { id: 'H', label: 'Rollstuhl', description: 'Kriterien' },
          { id: 'H II', parentId: 'H', label: 'Untergruppe II' },
        ],
      },
    });
    if (!result.ok) throw new Error(result.errors.join('\n'));
    expect(result.catalog.classes.find((entry) => entry.id === 'H')).toEqual({
      id: 'H',
      label: 'Rollstuhl',
      description: 'Kriterien',
    });
    expect(result.catalog.classes.map((entry) => entry.id)).toContain('H II');
  });

  it.each<[string, Parameters<typeof assembleCatalog>[0], string]>([
    ['a missing catalog.json', { catalog: undefined }, 'catalog.json: Objekt erwartet'],
    [
      'an unknown group',
      withMain({
        exercises: [
          {
            id: 'x',
            name: 'x',
            group: 'balance',
            measure: 'count',
            tracks: ['regular'],
            help: { text: '', source: 'q' },
          },
        ],
      }),
      '„group“ muss einer von',
    ],
    [
      'an unknown measure kind',
      withMain({
        exercises: [
          {
            id: 'x',
            name: 'x',
            group: 'speed',
            measure: 'furlongs',
            tracks: ['regular'],
            help: { text: '', source: 'q' },
          },
        ],
      }),
      '„measure“ muss einer von',
    ],
    [
      'an unknown track',
      withMain({
        exercises: [
          {
            id: 'x',
            name: 'x',
            group: 'speed',
            measure: 'count',
            tracks: ['other'],
            help: { text: '', source: 'q' },
          },
        ],
      }),
      'unbekannte Bedingung',
    ],
    [
      'an unreadable limit',
      { ...PUBLIC_FILES, localRequirements: { rows: [{ ...row, gold: '4.1' }] } },
      'Zeile 1',
    ],
    [
      'a limit row for an unknown exercise',
      { ...PUBLIC_FILES, localRequirements: { rows: [{ ...row, exerciseId: 'nope' }] } },
      'Unbekannte Übung',
    ],
    [
      'overlapping age bands',
      { ...PUBLIC_FILES, localRequirements: { rows: [row, { ...row, ageFrom: 7, ageTo: 8 }] } },
      'überschneidet',
    ],
    [
      'a subgroup without main class',
      { ...PUBLIC_FILES, localClasses: { classes: [{ id: 'K I', parentId: 'K', label: 'x' }] } },
      'Hauptklasse „K“ fehlt',
    ],
    [
      'a SpAz label pointing to another group',
      {
        ...PUBLIC_FILES,
        spaz: {
          source: 'x',
          complete: false,
          labels: [
            { track: 'regular', group: 'speed', label: 'Weitsprung', exerciseIds: ['long-jump'] },
          ],
        },
      },
      'anderen Gruppe',
    ],
    [
      'a SpAz label without exercises',
      {
        ...PUBLIC_FILES,
        spaz: {
          source: 'x',
          complete: false,
          labels: [{ track: 'regular', group: 'speed', label: 'X', exerciseIds: [] }],
        },
      },
      'keine Übung zugeordnet',
    ],
    [
      'a SpAz label without its Laufzettel',
      {
        ...PUBLIC_FILES,
        spaz: {
          source: 'x',
          complete: false,
          labels: [{ group: 'speed', label: 'X', exerciseIds: ['sprint'] }],
        },
      },
      'spaz.json, Eintrag 1: „track“ muss einer von regular, mmb sein',
    ],
  ])('reports %s', (_name, files, fragment) => {
    expect(errorsOf(files)).toContain(fragment);
  });
});

// Local details (Tobias 2026-11-10: Schrittfolgen der Koordinationsleiter, Ausführungsbilder) —
// invented texts; the real ones are the DOSB's and stay in the local package.
describe('assembleCatalog: local details', () => {
  const picture = 'data:image/webp;base64,AAAA';
  const detail = {
    exerciseId: 'run-endurance',
    label: '800 m',
    title: 'Erfundener Titel',
    ages: 'Altersgruppe: 6 – 7',
    material: 'Kreide',
    steps: ['Erst links.', 'Dann rechts.'],
    levels: { bronze: 'leicht', silver: 'mittel', gold: 'schwer' },
    image: picture,
    imageAlt: 'Bild',
    imageShape: 'tall',
    video: 'https://example.org/v',
    source: 'Testquelle, S. 1',
  };
  const withDetails = (...details: unknown[]) => ({
    ...PUBLIC_FILES,
    localRequirements: { rows: [row] },
    localDetails: { details },
  });

  it('reads a detail of a known variant with all its parts', () => {
    const result = assembleCatalog(withDetails(detail));
    expect(result.ok && result.catalog.details).toEqual([detail]);
  });

  it('without the local file there are none (the public build)', () => {
    const result = assembleCatalog({ ...PUBLIC_FILES, localRequirements: { rows: [row] } });
    expect(result.ok && result.catalog.details).toBeUndefined();
  });

  it.each([
    [{ ...detail, exerciseId: 'nope' }, 'unbekannte Übung „nope“'],
    [{ ...detail, label: '3000 m' }, '„3000 m“ ist keine Variante von „run-endurance“'],
    [{ ...detail, image: 'leiter-1.webp' }, 'Bild „leiter-1.webp“ ist nicht eingebettet'],
    [
      { ...detail, levels: { bronze: 'a', silver: '', gold: 'c' } },
      'jede Stufe braucht ihre Aufgabe',
    ],
    [{ ...detail, steps: [] }, '„steps“ braucht Schritte'],
    [{ ...detail, video: 'http://example.org' }, 'Video muss eine https-Adresse sein'],
    [{ ...detail, imageShape: 'round' }, '„imageShape“ muss einer von tall, wide sein'],
    [{ ...detail, title: ' ' }, 'Titel und Quelle dürfen nicht leer sein'],
  ])('refuses a broken detail: %#', (broken, fragment) => {
    expect(errorsOf(withDetails(broken))).toContain(fragment);
  });

  it('refuses the same variant described twice', () => {
    expect(errorsOf(withDetails(detail, { ...detail, title: 'Zweiter' }))).toContain(
      '„800 m“ ist doppelt beschrieben',
    );
  });
});

describe('catalogForYear', () => {
  const at = (validFrom: number): Catalog => ({ ...PUBLIC_CATALOG, validFrom });

  it('takes the newest catalog valid in the exam year', () => {
    const catalogs = [at(2026), at(2028), at(2027)];
    expect(catalogForYear(catalogs, 2026)?.validFrom).toBe(2026);
    expect(catalogForYear(catalogs, 2027)?.validFrom).toBe(2027);
    expect(catalogForYear(catalogs, 2031)?.validFrom).toBe(2028);
  });

  it('has none for a year before the first catalog', () => {
    expect(catalogForYear([at(2026)], 2025)).toBeUndefined();
  });
});
