// Page „Erfassen“: who can do the exercise, what must be chosen, what an input reaches (test limits).
import {
  captureRows,
  checkAttempt,
  previewLevel,
  stationTools,
  variantsFor,
} from '../../src/logic/capture';
import { formatMeasure } from '../../src/logic/measure';
import { exerciseById } from '../../src/logic/catalog';
import type { Catalog, Exercise, Requirement } from '../../src/logic/types';
import { TEST_CATALOG, YEAR, sampleWorkbook } from '../fixtures/testCatalog';

const book = sampleWorkbook();
const exercise = (id: string, catalog: Catalog = TEST_CATALOG): Exercise => {
  const found = exerciseById(catalog, id);
  if (!found) throw new Error(id);
  return found;
};
const rows = (id: string, catalog: Catalog = TEST_CATALOG, workbook = book) =>
  captureRows(workbook, catalog, workbook.athletes, exercise(id, catalog));

describe('captureRows', () => {
  it('only the children who can do the exercise', () => {
    expect(rows('sprint').map((r) => r.athlete.id)).toEqual(['p1']);
    expect(rows('run-endurance').map((r) => r.athlete.id)).toEqual(['p1', 'p2']);
  });

  it('asks for the class where it decides, for nothing where one requirement applies', () => {
    const [girl, max] = rows('run-endurance');
    expect(girl?.classes).toEqual([]);
    expect(girl && variantsFor(girl, undefined)).toEqual([]);
    expect(max?.classes).toEqual(['A', 'H']);
    // the variants belong to a class: chosen class, its variant only (one each here)
    expect(max?.variantsByClass).toEqual([
      { classId: 'A', labels: ['800 m'] },
      { classId: 'H', labels: ['800 m Rollstuhl'] },
    ]);
  });

  it('lists the attempts so far with their level', () => {
    const withAttempt = {
      ...book,
      measurements: [{ id: 'm1', athleteId: 'p1', exerciseId: 'run-endurance', value: 240 }],
    };
    const [girl] = rows('run-endurance', TEST_CATALOG, withAttempt);
    expect(girl?.attempts.map((a) => a.result)).toEqual([{ level: 'gold' }]);
  });
});

describe('checkAttempt', () => {
  it('a value in card notation becomes a measurement', () => {
    const [girl] = rows('run-endurance');
    if (!girl) throw new Error('row');
    expect(
      checkAttempt(girl, exercise('run-endurance'), {
        text: '4:20',
        variant: undefined,
        classId: undefined,
      }),
    ).toEqual({
      ok: true,
      measurement: { athleteId: 'p1', exerciseId: 'run-endurance', value: 260 },
    });
  });

  it('names the wrong value and the missing class at once', () => {
    const [, max] = rows('run-endurance');
    if (!max) throw new Error('row');
    const result = checkAttempt(max, exercise('run-endurance'), {
      text: '4,2',
      variant: undefined,
      classId: undefined,
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors).toEqual([
      'Bitte als Minuten:Sekunden eingeben, z. B. 05:40 (oder 5,40) bzw. 75:00.',
      'Die Klasse entscheidet – bitte wählen: A, H.',
    ]);
    const chosen = checkAttempt(max, exercise('run-endurance'), {
      text: '3:10',
      variant: undefined,
      classId: 'H',
    });
    expect(chosen.ok && chosen.measurement.classId).toBe('H');
  });

  it('asks for the variant where a case has several (Kegeln Asphalt/Bohle …)', () => {
    const [first] = TEST_CATALOG.requirements;
    if (!first) throw new Error('fixture');
    const other: Requirement = { ...first, label: 'zweite Variante' };
    const both = { ...TEST_CATALOG, requirements: [...TEST_CATALOG.requirements, other] };
    const [row] = rows(first.exerciseId, both);
    if (!row || !first.thresholds) throw new Error('row');
    expect(variantsFor(row, undefined)).toEqual([first.label, 'zweite Variante']);
    const text = formatMeasure(exercise(first.exerciseId).measure, first.thresholds.gold);
    const missing = checkAttempt(row, exercise(first.exerciseId, both), {
      text,
      variant: undefined,
      classId: undefined,
    });
    expect(!missing.ok && missing.errors[0]).toContain('Variante wählen');
    const taken = checkAttempt(row, exercise(first.exerciseId, both), {
      text,
      variant: 'zweite Variante',
      classId: undefined,
    });
    expect(taken.ok && taken.measurement.variant).toBe('zweite Variante');
  });
});

describe('previewLevel', () => {
  it('shows the level while typing, nothing while the input is incomplete', () => {
    const [girl] = rows('run-endurance');
    if (!girl) throw new Error('row');
    const at = (text: string) =>
      previewLevel(girl, TEST_CATALOG, YEAR, { text, variant: undefined, classId: undefined });
    expect(at('4:00')).toBe('gold');
    expect(at('9:59')).toBeNull();
    expect(at('4:')).toBeUndefined();
  });
});

// Tobias 2026-11-11: „Während einer Durchführung sollte die Stoppuhr oder der Zähler, ggf. mit
// Metronom, direkt verfügbar sein.“
describe('stationTools', () => {
  it.each([
    ['sprint', 'secTenth', ['stopwatch']],
    ['run-endurance', 'minSec', ['stopwatch']],
    ['rope-skipping', 'count', ['counter']],
    ['curl-ups', 'count', ['counter', 'metronome']],
    // Push-Ups: the counter carries the beat (Tobias 2026-11-18)
    ['push-ups', 'count', ['counter']],
    ['long-jump', 'meterCm', []],
    ['target-throw', 'points', []],
    ['gymnastics-strength', 'level', []],
  ] as const)('%s (%s) → %j', (id, measure, tools) => {
    expect(stationTools({ id, measure })).toEqual(tools);
  });

  it('every exercise of the catalog gets the tool of its measure', () => {
    for (const entry of TEST_CATALOG.exercises) {
      const tools = stationTools(entry);
      const timed = entry.measure === 'minSec' || entry.measure === 'secTenth';
      expect(tools.includes('stopwatch')).toBe(timed);
      expect(tools.includes('counter')).toBe(entry.measure === 'count');
    }
  });
});
