import {
  NOTE_TEXT,
  awardFor,
  chooseOption,
  evaluateAthlete,
  levelFor,
  measurementLevel,
  pointsFor,
  type NoteCode,
} from '../../src/logic/evaluation';
import { parseMeasure } from '../../src/logic/measure';
import { exerciseById } from '../../src/logic/catalog';
import type { Athlete, Measurement, Requirement, Workbook } from '../../src/logic/types';
import { TEST_CATALOG, YEAR, athlete, sampleWorkbook } from '../fixtures/testCatalog';

let next = 0;
function measured(
  athleteId: string,
  exerciseId: string,
  input: string,
  classId?: string,
): Measurement {
  const exercise = exerciseById(TEST_CATALOG, exerciseId);
  const parsed = parseMeasure(exercise?.measure ?? 'points', input);
  if (!parsed.ok) throw new Error(parsed.error);
  const measurement: Measurement = { id: `m${++next}`, athleteId, exerciseId, value: parsed.value };
  return classId === undefined ? measurement : { ...measurement, classId };
}

function evaluate(workbook: Workbook, athleteId: string) {
  const subject = workbook.athletes.find((entry) => entry.id === athleteId);
  if (!subject) throw new Error(`unknown athlete ${athleteId}`);
  return evaluateAthlete(subject, workbook, TEST_CATALOG);
}

const codes = (notes: { code: NoteCode }[]) => notes.map((note) => note.code);

describe('levelFor', () => {
  const lower: Requirement = {
    exerciseId: 'run-endurance',
    track: 'regular',
    sex: 'w',
    ageFrom: 8,
    ageTo: 9,
    label: '800 m',
    thresholds: { bronze: 335, silver: 290, gold: 250 },
  };
  const higher: Requirement = { ...lower, thresholds: { bronze: 600, silver: 900, gold: 1200 } };

  it.each([
    [336, null],
    [335, 'bronze'],
    [291, 'bronze'],
    [290, 'silver'],
    [250, 'gold'],
    [100, 'gold'],
  ])('less is better: %d s → %s', (value, level) => {
    expect(levelFor(lower, value)).toBe(level);
  });

  it.each([
    [599, null],
    [600, 'bronze'],
    [900, 'silver'],
    [1199, 'silver'],
    [1200, 'gold'],
  ])('more is better: %d s → %s', (value, level) => {
    expect(levelFor(higher, value)).toBe(level);
  });

  it('takes the level itself for exercises judged by execution', () => {
    const withoutLimits: Requirement = { ...lower };
    delete withoutLimits.thresholds;
    expect(levelFor(withoutLimits, 'silver')).toBe('silver');
    expect(levelFor(withoutLimits, 3)).toBeNull();
    expect(levelFor(lower, 'gold')).toBeNull();
  });
});

describe('variants of one case (Kegeln Asphalt/Bohle/Bowling/Schere, distance or Dauerschwimmen)', () => {
  const [first] = TEST_CATALOG.requirements;
  if (!first?.thresholds) throw new Error('test catalog needs a measured requirement');
  const other: Requirement = {
    ...first,
    label: 'andere Variante',
    thresholds: { bronze: 1, silver: 2, gold: 3 },
  };
  const both = { ...TEST_CATALOG, requirements: [first, other] };
  const girl = athlete({ id: 'p1' });
  const value = first.thresholds.gold;
  const base: Measurement = { id: 'v1', athleteId: 'p1', exerciseId: first.exerciseId, value };

  it('chooses by the variant, the only one without it, never a guess between several', () => {
    expect(chooseOption([first], undefined)).toEqual({ option: first });
    expect(chooseOption([first, other], other.label)).toEqual({ option: other });
    expect(chooseOption([first, other], undefined)).toEqual({ note: 'variantUndecided' });
    expect(chooseOption([first], 'gibt es nicht')).toEqual({ note: 'variantUnknown' });
  });

  it('judges a measurement under its variant', () => {
    expect(measurementLevel({ ...base, variant: first.label }, girl, both, YEAR)).toEqual({
      level: 'gold',
    });
    expect(measurementLevel(base, girl, both, YEAR)).toEqual({
      level: null,
      note: 'variantUndecided',
    });
    // a single variant needs no choice
    expect(measurementLevel(base, girl, TEST_CATALOG, YEAR)).toEqual({ level: 'gold' });
  });
});

describe('points and award (Kap. 4.3)', () => {
  it('counts 0/1/2/3 points', () => {
    expect([pointsFor(null), pointsFor('bronze'), pointsFor('silver'), pointsFor('gold')]).toEqual([
      0, 1, 2, 3,
    ]);
  });

  it.each([
    [3, null],
    [4, 'bronze'],
    [7, 'bronze'],
    [8, 'silver'],
    [10, 'silver'],
    [11, 'gold'],
    [12, 'gold'],
    [13, null],
  ])('%d points → %s', (points, award) => {
    expect(awardFor(points)).toBe(award);
  });
});

describe('evaluateAthlete — regular', () => {
  function full(): Workbook {
    const workbook = sampleWorkbook();
    return {
      ...workbook,
      measurements: [
        measured('p1', 'run-endurance', '04:10'), // gold
        measured('p1', 'medicine-ball', '4,10'), // silver
        measured('p1', 'sprint', '7,0'), // bronze
        measured('p1', 'zone-long-jump', '30'), // gold
      ],
    };
  }

  it('sums the best level per group to the award', () => {
    const result = evaluate(full(), 'p1');
    expect(result.groups.map((g) => [g.group, g.level])).toEqual([
      ['endurance', 'gold'],
      ['strength', 'silver'],
      ['speed', 'bronze'],
      ['coordination', 'gold'],
    ]);
    expect(result.points).toBe(9);
    expect(result.award).toBe('silver');
    expect(result.swim).toBe('valid');
    expect(result.complete).toBe(true);
    expect(result.notes).toEqual([]);
  });

  it('takes the best of several attempts', () => {
    const workbook = full();
    const better = measured('p1', 'sprint', '6,5');
    const result = evaluate(
      { ...workbook, measurements: [...workbook.measurements, better] },
      'p1',
    );
    const speed = result.groups.find((g) => g.group === 'speed');
    expect(speed).toMatchObject({
      level: 'silver',
      source: 'measurement',
      sourceId: better.id,
      chosen: false,
    });
    expect(result.points).toBe(10);
  });

  it('uses the measurement the examiner chose in the final profile, even a weaker one', () => {
    const workbook = full();
    const weaker = workbook.measurements[2]; // sprint 7,0 = bronze
    const better = measured('p1', 'sprint', '5,5'); // gold
    if (!weaker) throw new Error('fixture');
    const result = evaluate(
      {
        ...workbook,
        measurements: [...workbook.measurements, better],
        profileChoices: [{ athleteId: 'p1', group: 'speed', measurementId: weaker.id }],
      },
      'p1',
    );
    expect(result.groups.find((g) => g.group === 'speed')).toEqual({
      group: 'speed',
      level: 'bronze',
      source: 'measurement',
      sourceId: weaker.id,
      chosen: true,
    });
    expect(result.points).toBe(9);
  });

  it('ignores a choice that does not fit the group and says so', () => {
    const workbook = full();
    const endurance = workbook.measurements[0];
    if (!endurance) throw new Error('fixture');
    const result = evaluate(
      {
        ...workbook,
        profileChoices: [{ athleteId: 'p1', group: 'speed', measurementId: endurance.id }],
      },
      'p1',
    );
    expect(result.notes).toEqual([{ code: 'choiceInvalid', measurementId: endurance.id }]);
    expect(result.groups.find((g) => g.group === 'speed')?.chosen).toBe(false);
  });

  it('gives no award while a group is missing, but still shows the points', () => {
    const workbook = full();
    const result = evaluate({ ...workbook, measurements: workbook.measurements.slice(0, 3) }, 'p1');
    expect(result.points).toBe(6);
    expect(result.award).toBeNull();
    expect(result.complete).toBe(false);
  });

  it('a value below Bronze counts nothing', () => {
    const workbook = full();
    const slow = { ...workbook, measurements: [measured('p1', 'run-endurance', '06:00')] };
    expect(evaluate(slow, 'p1').groups[0]?.level).toBeNull();
  });

  it('is not complete without a valid swim proof', () => {
    const workbook = full();
    const noSwim: Athlete = athlete({ id: 'p1' });
    delete noSwim.swimProofYear;
    const result = evaluate({ ...workbook, athletes: [noSwim] }, 'p1');
    expect(result.award).toBe('silver');
    expect(result.swim).toBe('missing');
    expect(result.complete).toBe(false);
  });

  it('notes exercises outside the track and unknown exercises', () => {
    const workbook = full();
    const result = evaluate(
      {
        ...workbook,
        measurements: [
          ...workbook.measurements,
          measured('p1', 'race-walking', '20,0'),
          { id: 'mx', athleteId: 'p1', exerciseId: 'nope', value: 1 },
        ],
      },
      'p1',
    );
    expect(codes(result.notes)).toEqual(['notInTrack', 'unknownExercise']);
    expect(result.points).toBe(9);
  });
});

describe('evaluateAthlete — MmB', () => {
  it('asks for the class when the possible classes lead to different requirements', () => {
    const workbook: Workbook = {
      ...sampleWorkbook(),
      measurements: [measured('p2', 'run-endurance', '04:45')],
    };
    const result = evaluate(workbook, 'p2');
    expect(result.groups[0]?.level).toBeNull();
    expect(codes(result.notes)).toContain('classUndecided');
  });

  it('judges under the class chosen at the measurement', () => {
    const p2 = sampleWorkbook().athletes[1];
    if (!p2) throw new Error('fixture');
    const underA = measured('p2', 'run-endurance', '04:45', 'A');
    const underH = measured('p2', 'run-endurance', '04:45', 'H');
    expect(measurementLevel(underA, p2, TEST_CATALOG, YEAR)).toEqual({ level: 'bronze' });
    expect(measurementLevel(underH, p2, TEST_CATALOG, YEAR)).toEqual({ level: 'silver' });
  });

  it('needs no class choice when the classes agree', () => {
    const workbook = sampleWorkbook();
    const legs = workbook.athletes.map((entry) =>
      entry.id === 'p2' ? { ...entry, classIds: ['B', 'C'] } : entry,
    );
    const result = evaluate(
      { ...workbook, athletes: legs, measurements: [measured('p2', 'long-jump', '2,60')] },
      'p2',
    );
    expect(result.groups.find((g) => g.group === 'coordination')?.level).toBe('silver');
    expect(result.notes).toEqual([]);
  });

  it('blocks completion without consent', () => {
    const workbook = sampleWorkbook();
    const athletes = workbook.athletes.map((entry) =>
      entry.id === 'p2' ? { ...entry, consentOnFile: false } : entry,
    );
    const result = evaluate({ ...workbook, athletes }, 'p2');
    expect(codes(result.notes)).toEqual(['consentMissing']);
    expect(result.complete).toBe(false);
  });

  it('leaves out a deactivated class: the remaining class decides alone', () => {
    const workbook = sampleWorkbook();
    const athletes = workbook.athletes.map((entry) =>
      entry.id === 'p2' ? { ...entry, inactiveClassIds: ['H'] } : entry,
    );
    const result = evaluate(
      { ...workbook, athletes, measurements: [measured('p2', 'run-endurance', '04:45')] },
      'p2',
    );
    expect(result.groups[0]?.level).toBe('bronze'); // class A only
    expect(result.notes).toEqual([]);
  });

  it('does not count a measurement taken under a deactivated class', () => {
    const workbook = sampleWorkbook();
    const athletes = workbook.athletes.map((entry) =>
      entry.id === 'p2' ? { ...entry, inactiveClassIds: ['H'] } : entry,
    );
    const underH = measured('p2', 'run-endurance', '04:45', 'H');
    const result = evaluate({ ...workbook, athletes, measurements: [underH] }, 'p2');
    expect(result.groups[0]?.level).toBeNull();
    expect(result.notes).toEqual([{ code: 'classInactive', measurementId: underH.id }]);
  });
});

describe('evaluateAthlete — Ausgleichsbedingung / Klassenkombination', () => {
  const assessment = {
    id: 'a1',
    athleteId: 'p2',
    group: 'endurance' as const,
    basis: 'compensation' as const,
    condition: 'Ausdauerschwimmen 400 m statt 800 m',
    performance: '400 m in 11:20',
    setBy: 'Dr. Muster',
  };

  it('decides the group by the examiner and routes the result to the paper card', () => {
    const workbook: Workbook = {
      ...sampleWorkbook(),
      measurements: [measured('p2', 'run-endurance', '04:00', 'A')], // gold under A
      manualAssessments: [{ ...assessment, level: 'silver' }],
    };
    const result = evaluate(workbook, 'p2');
    expect(result.groups[0]).toEqual({
      group: 'endurance',
      level: 'silver',
      source: 'manual',
      sourceId: 'a1',
      chosen: false,
    });
    expect(result.paperCardOnly).toBe(true);
    expect(codes(result.notes)).toEqual(['paperCardOnly']);
  });

  it('counts the manual level towards the award', () => {
    const groups = ['endurance', 'strength', 'speed', 'coordination'] as const;
    const workbook: Workbook = {
      ...sampleWorkbook(),
      manualAssessments: groups.map((group, index) => ({
        ...assessment,
        id: `a${index}`,
        group,
        basis: 'combinedClasses' as const,
        level: 'gold' as const,
      })),
    };
    const result = evaluate(workbook, 'p2');
    expect(result.points).toBe(12);
    expect(result.award).toBe('gold');
    expect(result.complete).toBe(true);
  });

  it('is not complete while the examiner has not decided', () => {
    const workbook: Workbook = {
      ...sampleWorkbook(),
      manualAssessments: [{ ...assessment, level: null }],
    };
    const result = evaluate(workbook, 'p2');
    expect(codes(result.notes)).toEqual(['manualOpen', 'paperCardOnly']);
    expect(result.complete).toBe(false);
  });

  it('reports an open class list', () => {
    const workbook = sampleWorkbook();
    const athletes = workbook.athletes.map((entry) =>
      entry.id === 'p2' ? { ...entry, classIds: [] } : entry,
    );
    const result = evaluate(
      { ...workbook, athletes, measurements: [measured('p2', 'run-endurance', '04:00')] },
      'p2',
    );
    expect(codes(result.notes)).toEqual(['classOpen']);
  });
});

describe('NOTE_TEXT', () => {
  it('has a German text for every note', () => {
    for (const text of Object.values(NOTE_TEXT)) expect(text.length).toBeGreaterThan(10);
  });
});
