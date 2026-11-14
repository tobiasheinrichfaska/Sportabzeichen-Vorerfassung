import { validateCatalog } from '../../src/logic/catalog';
import { activeClassIds, classTree } from '../../src/logic/classes';
import { combine } from '../../src/logic/combinations';
import { exerciseById } from '../../src/logic/catalog';
import { PUBLIC_CATALOG, TEST_CATALOG, YEAR, athlete } from '../fixtures/testCatalog';

const withSubgroups = {
  ...PUBLIC_CATALOG,
  classes: [
    ...PUBLIC_CATALOG.classes,
    { id: 'H I', label: 'Rollstuhl, Untergruppe I', parentId: 'H', description: 'Test' },
    { id: 'H II', label: 'Rollstuhl, Untergruppe II', parentId: 'H' },
  ],
};

describe('activeClassIds', () => {
  it('leaves out the deactivated classes', () => {
    expect(activeClassIds({ classIds: ['A', 'H', 'F'], inactiveClassIds: ['H'] })).toEqual([
      'A',
      'F',
    ]);
    expect(activeClassIds({ classIds: ['A'], inactiveClassIds: [] })).toEqual(['A']);
  });
});

describe('classTree', () => {
  it('lists the ten main classes A–J', () => {
    expect(
      classTree(PUBLIC_CATALOG)
        .map((branch) => branch.main.id)
        .join(''),
    ).toBe('ABCDEFGHIJ');
  });

  it('puts subgroups under their main class', () => {
    const h = classTree(withSubgroups).find((branch) => branch.main.id === 'H');
    expect(h?.subgroups.map((entry) => entry.id)).toEqual(['H I', 'H II']);
    expect(classTree(withSubgroups)).toHaveLength(10);
  });

  it('the catalog check finds a subgroup without its main class', () => {
    expect(validateCatalog(withSubgroups)).toEqual([]);
    const orphan = {
      ...PUBLIC_CATALOG,
      classes: [...PUBLIC_CATALOG.classes, { id: 'K I', label: 'x', parentId: 'K' }],
    };
    expect(validateCatalog(orphan).map((issue) => issue.message)).toEqual([
      'Behinderungsklasse „K I“: Hauptklasse „K“ fehlt.',
    ]);
  });
});

describe('combine with deactivated classes', () => {
  const run = exerciseById(TEST_CATALOG, 'run-endurance');
  const mmb = athlete({
    id: 'p2',
    birthYear: 2001,
    sex: 'm',
    track: 'mmb',
    classIds: ['A', 'H'],
  });

  it('a deactivated class yields no variant, so it can no longer be decisive', () => {
    if (!run) throw new Error('fixture');
    const result = combine({ ...mmb, inactiveClassIds: ['H'] }, run, TEST_CATALOG, YEAR);
    expect(result.variants.map((variant) => variant.classId)).toEqual(['A']);
    expect(result.classDecisive).toBe(false);
  });

  it('with every class deactivated the class is open again', () => {
    if (!run) throw new Error('fixture');
    const result = combine({ ...mmb, inactiveClassIds: ['A', 'H'] }, run, TEST_CATALOG, YEAR);
    expect(result.status).toBe('classOpen');
  });
});
