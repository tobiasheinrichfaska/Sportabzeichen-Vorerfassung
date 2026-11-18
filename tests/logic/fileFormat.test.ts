import { parseWorkbook, serializeWorkbook } from '../../src/logic/fileFormat';
import { emptyWorkbook } from '../../src/logic/workbook';
import type { Workbook } from '../../src/logic/types';
import { PUBLIC_CATALOG, sampleWorkbook } from '../fixtures/testCatalog';

const parse = (text: string) => parseWorkbook(text, [PUBLIC_CATALOG]);

function full(): Workbook {
  return {
    ...sampleWorkbook(),
    measurements: [
      { id: 'm1', athleteId: 'p1', exerciseId: 'sprint', value: 70, date: '2026-06-12' },
      { id: 'm2', athleteId: 'p2', exerciseId: 'run-endurance', value: 285, classId: 'H' },
      { id: 'm3', athleteId: 'p1', exerciseId: 'gymnastics-coordination', value: 'silver' },
    ],
    manualAssessments: [
      {
        id: 'a1',
        athleteId: 'p2',
        group: 'endurance',
        basis: 'combinedClasses',
        condition: 'Klassen A und H kombiniert',
        performance: '800 m Rollstuhl in 05:10',
        setBy: 'Prüferin Muster',
        level: 'silver',
        date: '2026-06-12',
      },
    ],
    profileChoices: [{ athleteId: 'p1', group: 'speed', measurementId: 'm1' }],
  };
}

type Raw = Record<string, unknown>;

const isRaw = (value: unknown): value is Raw =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The `index`-th entry of the list `key` in the raw file data. */
function entry(data: Raw, key: string, index: number): Raw {
  const list = data[key];
  const item = Array.isArray(list) ? (list as unknown[])[index] : undefined;
  if (!isRaw(item)) throw new Error(`test data has no ${key}[${index}]`);
  return item;
}

/** Serializes, lets the test damage the raw data, and parses again. */
function damaged(change: (data: Raw) => void) {
  const data = JSON.parse(serializeWorkbook(full())) as Raw;
  change(data);
  return parse(JSON.stringify(data));
}

function errorsOf(result: ReturnType<typeof parseWorkbook>): string {
  return result.ok ? '' : result.errors.join(' | ');
}

describe('serializeWorkbook / parseWorkbook', () => {
  it('round-trips a full workbook', () => {
    const workbook = full();
    expect(parse(serializeWorkbook(workbook))).toEqual({ ok: true, workbook });
  });

  it('round-trips an empty workbook', () => {
    const workbook = emptyWorkbook(2026);
    expect(parse(serializeWorkbook(workbook))).toEqual({ ok: true, workbook });
  });

  it('refuses text that is not JSON', () => {
    expect(parse('{ kaputt')).toEqual({
      ok: false,
      errors: ['Die Datei ist kein gültiges JSON.'],
    });
  });

  it('refuses other files', () => {
    expect(errorsOf(parse('{"format":"etwas-anderes"}'))).toContain(
      'keine Sportabzeichen-Vorerfassung',
    );
    expect(errorsOf(parse('[]'))).toContain('keine Sportabzeichen-Vorerfassung');
  });

  it('refuses a newer file version', () => {
    expect(errorsOf(damaged((data) => (data.version = 3)))).toContain('Dateiversion 3');
  });

  describe('version 1 (last name and date of birth, until 2026-11-10)', () => {
    const v1 = (patch: (athlete: Raw) => void = () => undefined) =>
      damaged((data) => {
        data.version = 1;
        for (const index of [0, 1]) {
          const athlete = entry(data, 'athletes', index);
          athlete.birthDate = `${String(athlete.birthYear)}-05-01`;
          athlete.lastName = 'Muster';
          delete athlete.birthYear;
        }
        patch(entry(data, 'athletes', 0));
      });

    it('is read: the date becomes the birth year, the file is written as version 2', () => {
      const result = v1();
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.workbook.version).toBe(2);
      expect(result.workbook.athletes.map((a) => a.birthYear)).toEqual([2017, 2001]);
      expect(result.workbook.athletes[0]).not.toHaveProperty('birthDate');
      // a last name that was there is kept, never dropped unseen
      expect(result.workbook.athletes[0]?.lastName).toBe('Muster');
    });

    it('an empty last name goes, an unreadable date is named', () => {
      const empty = v1((athlete) => (athlete.lastName = ''));
      expect(empty.ok && empty.workbook.athletes[0]).not.toHaveProperty('lastName');
      expect(errorsOf(v1((athlete) => (athlete.birthDate = '31.02.2017')))).toContain(
        'Geburtsdatum ungültig',
      );
    });
  });

  it('plans: an older file gets an empty list; a plan must point to a child and an exercise', () => {
    const older = damaged((data) => delete data.plans);
    expect(older.ok && older.workbook.plans).toEqual([]);
    const planned = damaged((data) => (data.plans = [{ athleteId: 'p1', exerciseId: 'sprint' }]));
    expect(planned.ok && planned.workbook.plans).toHaveLength(1);
    expect(
      errorsOf(damaged((data) => (data.plans = [{ athleteId: 'zz', exerciseId: 'sprint' }]))),
    ).toContain('unbekannte Teilnehmende');
    expect(
      errorsOf(damaged((data) => (data.plans = [{ athleteId: 'p1', exerciseId: 'nope' }]))),
    ).toContain('unbekannte Übung');
    const twice = { athleteId: 'p1', exerciseId: 'sprint' };
    expect(errorsOf(damaged((data) => (data.plans = [twice, twice])))).toContain('doppelt');
  });

  it('a swim-proof way must be known and needs its year', () => {
    const way = damaged((data) => (entry(data, 'athletes', 0).swimProofWay = 'swim50'));
    expect(way.ok && way.workbook.athletes[0]?.swimProofWay).toBe('swim50');
    expect(
      errorsOf(damaged((data) => (entry(data, 'athletes', 0).swimProofWay = 'seepferdchen'))),
    ).toContain('Art des Schwimmnachweises ungültig');
    expect(
      errorsOf(
        damaged((data) => {
          const child = entry(data, 'athletes', 0);
          delete child.swimProofYear;
          child.swimProofWay = 'swim50';
        }),
      ),
    ).toContain('Art des Schwimmnachweises ungültig');
  });

  it('a child needs a first name and a birth year', () => {
    expect(errorsOf(damaged((data) => (entry(data, 'athletes', 0).firstName = ' ')))).toContain(
      'Vorname fehlt',
    );
    expect(errorsOf(damaged((data) => (entry(data, 'athletes', 0).birthYear = '2017')))).toContain(
      'Jahrgang ungültig',
    );
  });

  it('refuses an exam year without catalog, and picks the catalog by year', () => {
    expect(errorsOf(damaged((data) => (data.year = 2025)))).toBe(
      'Für das Prüfungsjahr 2025 ist kein Leistungskatalog vorhanden.',
    );
    // A later year still uses the newest catalog that is valid then
    expect(damaged((data) => (data.year = 2027)).ok).toBe(true);
  });

  it.each<[string, (data: Raw) => void, string]>([
    ['a missing year', (data) => delete data.year, 'Prüfungsjahr'],
    ['a missing organisation', (data) => delete data.organisation, 'Organisation fehlt'],
    ['a duplicate athlete id', (data) => (entry(data, 'athletes', 1).id = 'p1'), 'doppelt'],
    [
      'an invalid birth date',
      (data) => (entry(data, 'athletes', 0).birthYear = 17),
      'Jahrgang ungültig',
    ],
    ['an invalid sex', (data) => (entry(data, 'athletes', 0).sex = 'x'), 'Geschlecht'],
    [
      'an unknown class',
      (data) => (entry(data, 'athletes', 1).classIds = ['Z']),
      'Behinderungsklassen ungültig',
    ],
    [
      'classes on the regular track',
      (data) => (entry(data, 'athletes', 0).classIds = ['A']),
      'nur unter MmB',
    ],
    [
      'a missing consent flag',
      (data) => delete entry(data, 'athletes', 0).consentOnFile,
      'Einwilligung',
    ],
    [
      'a deactivated class that is not a possible class',
      (data) => (entry(data, 'athletes', 1).inactiveClassIds = ['B']),
      'deaktivierte Klassen',
    ],
    [
      'a manual decision with an unknown group',
      (data) => (entry(data, 'manualAssessments', 0).group = 'balance'),
      'Gruppe ungültig',
    ],
    [
      'a manual decision with an invalid level',
      (data) => (entry(data, 'manualAssessments', 0).level = 'platin'),
      'Stufe ungültig',
    ],
    [
      'a manual decision without condition text',
      (data) => delete entry(data, 'manualAssessments', 0).condition,
      '„condition“ muss ein Text sein',
    ],
    [
      'a profile choice of a measurement from another group',
      (data) => (entry(data, 'profileChoices', 0).group = 'endurance'),
      'passt nicht zu Person und Gruppe',
    ],
    [
      'two choices for the same group',
      (data) =>
        (data.profileChoices = [
          { athleteId: 'p1', group: 'speed', measurementId: 'm1' },
          { athleteId: 'p1', group: 'speed', measurementId: 'm1' },
        ]),
      'mehrfach gewählt',
    ],
    [
      'a group with an unknown member',
      (data) => (entry(data, 'groups', 0).athleteIds = ['p1', 'p9']),
      'Gruppe g1',
    ],
    [
      'a measurement of an unknown athlete',
      (data) => (entry(data, 'measurements', 0).athleteId = 'p9'),
      'Messwert m1',
    ],
    [
      'a measurement of an unknown exercise',
      (data) => (entry(data, 'measurements', 0).exerciseId = 'nope'),
      'unbekannte Übung',
    ],
    [
      'a value of the wrong shape',
      (data) => (entry(data, 'measurements', 2).value = 2),
      'Wert ungültig',
    ],
    [
      'a measurement class the athlete does not have',
      (data) => (entry(data, 'measurements', 1).classId = 'B'),
      'gehört nicht zur Person',
    ],
    [
      'an invalid measurement date',
      (data) => (entry(data, 'measurements', 0).date = '12.06.2026'),
      'Datum ungültig',
    ],
    ['a list that is not a list', (data) => (data.groups = {}), '„groups“ muss eine Liste sein'],
  ])('refuses %s', (_name, change, fragment) => {
    expect(errorsOf(damaged(change))).toContain(fragment);
  });

  it('upgrades a draft of the first development state instead of refusing it', () => {
    const data = JSON.parse(serializeWorkbook(full())) as Raw;
    delete data.manualAssessments;
    delete data.profileChoices;
    const first = entry(data, 'athletes', 1);
    delete first.inactiveClassIds;
    first.specialCase = 'compensation';
    const result = parse(JSON.stringify(data));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.workbook.manualAssessments).toEqual([]);
    expect(result.workbook.profileChoices).toEqual([]);
    expect(result.workbook.athletes[1]).toMatchObject({ inactiveClassIds: [] });
    expect(result.workbook.athletes[1]).not.toHaveProperty('specialCase');
  });

  it('drops the empty Verbandsabzeichen list of files saved before their removal', () => {
    const result = damaged((data) => (data.badgeRecords = []));
    expect(result.ok).toBe(true);
    expect(result.ok && result.workbook).not.toHaveProperty('badgeRecords');
  });

  it('refuses a file that still holds Verbandsabzeichen instead of dropping them unseen', () => {
    const badge = { id: 'b1', athleteId: 'p1', badgeId: 'dtb-kinderturnen', year: 2026 };
    expect(errorsOf(damaged((data) => (data.badgeRecords = [badge])))).toContain(
      'enthält Verbandsabzeichen',
    );
  });

  it('reports all problems at once', () => {
    const result = damaged((data) => {
      entry(data, 'athletes', 0).sex = 'x';
      entry(data, 'athletes', 1).birthYear = null;
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.length).toBeGreaterThanOrEqual(2);
  });
});
