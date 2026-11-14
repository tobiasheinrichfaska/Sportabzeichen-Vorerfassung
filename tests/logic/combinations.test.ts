import {
  combinations,
  combine,
  groupCombinations,
  resolveAthletes,
  resolveExercises,
} from '../../src/logic/combinations';
import { exerciseById } from '../../src/logic/catalog';
import type { Exercise } from '../../src/logic/types';
import { TEST_CATALOG, YEAR, athlete, sampleWorkbook } from '../fixtures/testCatalog';

function exercise(id: string): Exercise {
  const found = exerciseById(TEST_CATALOG, id);
  if (!found) throw new Error(`unknown exercise ${id}`);
  return found;
}

const girl = athlete({ id: 'p1' });
const mmb = athlete({
  id: 'p2',
  birthYear: 2001,
  sex: 'm',
  track: 'mmb',
  classIds: ['A', 'H'],
});

describe('combine — regular', () => {
  it('offers the requirement for age and sex', () => {
    const result = combine(girl, exercise('run-endurance'), TEST_CATALOG, YEAR);
    expect(result.status).toBe('possible');
    expect(result.age).toBe(9);
    expect(result.variants).toHaveLength(1);
    expect(result.variants[0]?.classId).toBeNull();
    expect(result.variants[0]?.options.map((option) => option.label)).toEqual(['800 m']);
    expect(result.classDecisive).toBe(false);
  });

  it('says when the catalog has nothing for the case', () => {
    expect(combine(girl, exercise('high-jump'), TEST_CATALOG, YEAR).status).toBe('noRequirement');
  });

  it('refuses MmB-only exercises', () => {
    const result = combine(girl, exercise('race-walking'), TEST_CATALOG, YEAR);
    expect(result.status).toBe('notInTrack');
    expect(result.variants).toEqual([]);
  });

  it('refuses athletes younger than 6 in the exam year', () => {
    const young = athlete({ id: 'p9', birthYear: 2021 });
    expect(combine(young, exercise('run-endurance'), TEST_CATALOG, YEAR).status).toBe('tooYoung');
  });

  it('reports an ambiguous catalog: the same variant twice for one case', () => {
    const [first] = TEST_CATALOG.requirements;
    if (!first) throw new Error('empty test catalog');
    const doubled = { ...TEST_CATALOG, requirements: [first, first] };
    expect(combine(girl, exercise(first.exerciseId), doubled, YEAR).status).toBe('ambiguous');
  });

  it('offers every variant of a case to choose from (e.g. Kegeln Asphalt, Bohle …)', () => {
    const [first] = TEST_CATALOG.requirements;
    if (!first) throw new Error('empty test catalog');
    const other = { ...first, label: `${first.label} (andere Variante)` };
    const both = { ...TEST_CATALOG, requirements: [first, other] };
    const result = combine(girl, exercise(first.exerciseId), both, YEAR);
    expect(result.status).toBe('possible');
    expect(result.variants[0]?.options.map((option) => option.label)).toEqual([
      first.label,
      other.label,
    ]);
  });
});

describe('combine — MmB', () => {
  it('needs at least one possible class', () => {
    const open = { ...mmb, classIds: [] };
    expect(combine(open, exercise('run-endurance'), TEST_CATALOG, YEAR).status).toBe('classOpen');
  });

  it('gives one variant per possible class and marks the class as decisive when they differ', () => {
    const result = combine(mmb, exercise('run-endurance'), TEST_CATALOG, YEAR);
    expect(result.status).toBe('possible');
    expect(result.variants.map((v) => [v.classId, v.options[0]?.label])).toEqual([
      ['A', '800 m'],
      ['H', '800 m Rollstuhl'],
    ]);
    expect(result.classDecisive).toBe(true);
  });

  it('is decisive when the exercise exists for only one of the classes', () => {
    const result = combine(mmb, exercise('shot-put'), TEST_CATALOG, YEAR);
    expect(result.status).toBe('possible');
    expect(result.variants.map((v) => v.options.length > 0)).toEqual([true, false]);
    expect(result.classDecisive).toBe(true);
  });

  it('is not decisive when all classes lead to the same requirement', () => {
    const legs = { ...mmb, classIds: ['B', 'C'] };
    const result = combine(legs, exercise('long-jump'), TEST_CATALOG, YEAR);
    expect(result.status).toBe('possible');
    expect(result.classDecisive).toBe(false);
  });

  it('is never decisive with a single class', () => {
    const single = { ...mmb, classIds: ['H'] };
    expect(combine(single, exercise('run-endurance'), TEST_CATALOG, YEAR).classDecisive).toBe(
      false,
    );
  });

  it('no requirement under any class', () => {
    expect(combine(mmb, exercise('high-jump'), TEST_CATALOG, YEAR).status).toBe('noRequirement');
  });
});

describe('selections', () => {
  const workbook = sampleWorkbook();

  it('resolves athletes: all, one, a group, unknown', () => {
    expect(resolveAthletes(workbook, { kind: 'all' }).map((a) => a.id)).toEqual(['p1', 'p2']);
    expect(
      resolveAthletes(workbook, { kind: 'athlete', athleteId: 'p2' }).map((a) => a.id),
    ).toEqual(['p2']);
    expect(resolveAthletes(workbook, { kind: 'group', groupId: 'g1' })).toHaveLength(2);
    expect(resolveAthletes(workbook, { kind: 'group', groupId: 'nope' })).toEqual([]);
  });

  it('resolves exercises: all, one, a Disziplingruppe', () => {
    expect(resolveExercises(TEST_CATALOG, { kind: 'all' })).toHaveLength(
      TEST_CATALOG.exercises.length,
    );
    expect(resolveExercises(TEST_CATALOG, { kind: 'exercise', exerciseId: 'sprint' })).toHaveLength(
      1,
    );
    const speed = resolveExercises(TEST_CATALOG, { kind: 'disciplineGroup', group: 'speed' });
    expect(speed.map((e) => e.id)).toEqual([
      'sprint',
      'swim-sprint',
      'swim-sprint-minutes',
      'cycle-sprint',
      'handbike-sprint',
      'race-walking',
      'gymnastics-speed',
    ]);
  });

  it('crosses both selections and groups the result by athlete or by exercise', () => {
    const list = combinations(
      workbook,
      TEST_CATALOG,
      { kind: 'group', groupId: 'g1' },
      { kind: 'disciplineGroup', group: 'speed' },
    );
    expect(list).toHaveLength(14);

    const byAthlete = groupCombinations(list, 'athlete');
    expect([...byAthlete.keys()]).toEqual(['p1', 'p2']);
    expect(byAthlete.get('p1')?.find((c) => c.exerciseId === 'sprint')?.status).toBe('possible');
    expect(byAthlete.get('p1')?.find((c) => c.exerciseId === 'race-walking')?.status).toBe(
      'notInTrack',
    );

    const byExercise = groupCombinations(list, 'exercise');
    expect(byExercise.size).toBe(7);
    expect(byExercise.get('race-walking')?.map((c) => [c.athleteId, c.status])).toEqual([
      ['p1', 'notInTrack'],
      ['p2', 'possible'],
    ]);
  });
});
