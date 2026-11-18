// Page „Möglich“: which Abnahmen the children of a group can do (test limits only).
import {
  STATUS_TEXT,
  detailsInUse,
  expectedValues,
  isPlanned,
  offerLabels,
  offerText,
  offersByChild,
  offersByExercise,
  planOverview,
} from '../../src/logic/overview';
import { combine } from '../../src/logic/combinations';
import { exerciseById, exerciseDetails, variantName } from '../../src/logic/catalog';
import { TEST_CATALOG, YEAR, athlete, sampleWorkbook } from '../fixtures/testCatalog';
import { workbookReducer } from '../../src/logic/workbook';

const book = sampleWorkbook();
const ids = (list: { athleteId: string }[]) => list.map((c) => c.athleteId);

describe('offersByExercise', () => {
  const groups = offersByExercise(book, TEST_CATALOG, 'g1');

  it('lists the four Disziplingruppen, each with only the exercises someone can do', () => {
    expect(groups.map((g) => g.group)).toEqual(['endurance', 'strength', 'speed', 'coordination']);
    const endurance = groups[0]?.offers.map((o) => o.exercise.id);
    expect(endurance).toEqual(['run-endurance', 'run-continuous']);
  });

  it('names who can, and who of the same Bedingungen cannot and why', () => {
    const run = groups[0]?.offers.find((o) => o.exercise.id === 'run-endurance');
    expect(ids(run?.possible ?? [])).toEqual(['p1', 'p2']);
    const continuous = groups[0]?.offers.find((o) => o.exercise.id === 'run-continuous');
    expect(ids(continuous?.possible ?? [])).toEqual(['p1']);
    // Max (MmB, 25) has no Dauerlauf requirement in the test limits
    expect(continuous?.notPossible.map((c) => [c.athleteId, c.status])).toEqual([
      ['p2', 'noRequirement'],
    ]);
  });

  it('an exercise of the other Bedingungen is no „cannot“ (no noise for regular children)', () => {
    const walking = groups[2]?.offers.find((o) => o.exercise.id === 'race-walking');
    expect(ids(walking?.possible ?? [])).toEqual(['p2']);
    expect(walking?.notPossible).toEqual([]);
  });

  it('an unknown group offers nothing', () => {
    expect(offersByExercise(book, TEST_CATALOG, 'nope').every((g) => g.offers.length === 0)).toBe(
      true,
    );
  });
});

describe('offersByChild', () => {
  it('per child the possible exercises of each group and the groups still missing', () => {
    const [girl, max] = offersByChild(book, TEST_CATALOG, 'g1', book.athletes);
    expect(girl?.missing).toEqual([]);
    expect(girl?.groups.map((g) => g.possible.map((c) => c.exerciseId))).toEqual([
      ['run-endurance', 'run-continuous'],
      ['medicine-ball'],
      ['sprint'],
      ['zone-long-jump', 'gymnastics-coordination'],
    ]);
    expect(max?.missing).toEqual([]);
    expect(girl?.blocked).toBeNull();
  });

  it('says why nothing is possible: too young or class open', () => {
    const young = athlete({ id: 'p9', birthYear: YEAR - 5 });
    const open = athlete({ id: 'p8', track: 'mmb', classIds: [] });
    const withThem = {
      ...book,
      athletes: [...book.athletes, young, open],
      groups: [{ id: 'g1', name: 'Gruppe 1', athleteIds: ['p1', 'p2', 'p9', 'p8'] }],
    };
    const [, , tooYoung, classOpen] = offersByChild(
      withThem,
      TEST_CATALOG,
      'g1',
      withThem.athletes,
    );
    expect(tooYoung?.blocked).toBe('tooYoung');
    expect(classOpen?.blocked).toBe('classOpen');
    expect(STATUS_TEXT.classOpen).toBe('Behinderungsklasse noch offen');
  });
});

describe('expectedValues (test limits)', () => {
  const run = exerciseById(TEST_CATALOG, 'run-endurance');
  const [girl, max] = book.athletes;
  if (!run || !girl || !max) throw new Error('fixture');

  it('the limits of the child in card notation', () => {
    expect(expectedValues(combine(girl, run, TEST_CATALOG, YEAR), run)).toEqual([
      {
        classId: null,
        label: '800 m',
        limits: { bronze: '05:33', silver: '04:52', gold: '04:12' },
      },
    ]);
  });

  it('per class where the class decides', () => {
    const values = expectedValues(combine(max, run, TEST_CATALOG, YEAR), run);
    expect(values.map((v) => [v.classId, v.label])).toEqual([
      ['A', '800 m'],
      ['H', '800 m Rollstuhl'],
    ]);
  });

  it('judged by execution: no limits; no Bronze in the table: „–“', () => {
    const turnen = exerciseById(TEST_CATALOG, 'gymnastics-coordination');
    if (!turnen) throw new Error('fixture');
    expect(expectedValues(combine(girl, turnen, TEST_CATALOG, YEAR), turnen)[0]?.limits).toBeNull();
    const [first] = TEST_CATALOG.requirements;
    if (!first?.thresholds) throw new Error('fixture');
    const noBronze = {
      ...TEST_CATALOG,
      requirements: [
        { ...first, thresholds: { ...first.thresholds, bronze: first.thresholds.silver } },
      ],
    };
    const exercise = exerciseById(noBronze, first.exerciseId);
    if (!exercise) throw new Error('fixture');
    expect(
      expectedValues(combine(girl, exercise, noBronze, YEAR), exercise)[0]?.limits?.bronze,
    ).toBe('–');
  });
});

describe('detailsInUse (Tobias 2026-11-10: Schrittfolgen und Ausführungsbilder je Kind)', () => {
  const run = exerciseById(TEST_CATALOG, 'run-endurance');
  const [girl, max] = book.athletes;
  if (!run || !girl || !max) throw new Error('fixture');
  const detail = (label: string) => ({
    exerciseId: 'run-endurance',
    label,
    title: `T ${label}`,
    source: 'S',
  });
  const withDetails = {
    ...TEST_CATALOG,
    details: [detail('800 m Rollstuhl'), detail('800 m'), { ...detail('Reck'), exerciseId: 'x' }],
  };
  const both = [combine(girl, run, withDetails, YEAR), combine(max, run, withDetails, YEAR)];

  it('each variant once, in the order the children bring them, with the children it applies to', () => {
    expect(
      detailsInUse(withDetails, 'run-endurance', both).map((u) => [u.detail.label, u.athleteIds]),
    ).toEqual([
      ['800 m', ['p1', 'p2']],
      ['800 m Rollstuhl', ['p2']],
    ]);
  });

  it('only the details of this exercise; none without the local package', () => {
    expect(detailsInUse(withDetails, 'gymnastics-coordination', both)).toEqual([]);
    expect(detailsInUse(TEST_CATALOG, 'run-endurance', both)).toEqual([]);
    expect(exerciseDetails(withDetails, 'run-endurance').map((d) => d.label)).toEqual([
      '800 m Rollstuhl',
      '800 m',
    ]);
  });

  // Tobias 2026-11-11: „ja“ to the official names — the Wegweiser's „Kopfstand“ for the platform's
  // „Schulterstand“, but „Handstütz-Sprungüberschlag auf Sprungtisch“ keeps its distinguishing part
  it('shows the official name of a variant; a label that is that name plus an addition stays', () => {
    expect(variantName(withDetails, 'run-endurance', '800 m')).toBe('T 800 m');
    const vault = {
      ...withDetails,
      details: [{ ...detail('800 m Rollstuhl'), title: '800 m' }],
    };
    expect(variantName(vault, 'run-endurance', '800 m Rollstuhl')).toBe('800 m Rollstuhl');
    // no detail for it, another exercise, or no local package: the label as it is
    expect(variantName(vault, 'run-endurance', '800 m')).toBe('800 m');
    expect(variantName(withDetails, 'gymnastics-coordination', '800 m')).toBe('800 m');
    expect(variantName(TEST_CATALOG, 'run-endurance', '800 m')).toBe('800 m');
  });

  it('a variant without a detail is left out, the others stay', () => {
    const one = { ...withDetails, details: [detail('800 m Rollstuhl')] };
    expect(detailsInUse(one, 'run-endurance', both).map((u) => u.athleteIds)).toEqual([['p2']]);
  });
});

describe('plans (Tobias 2026-11-10: „auswählen, dass die Übung von dem Kind gemacht wird“)', () => {
  it('toggle on and off; unknown children take nothing; removing a child takes its plans', () => {
    let state = workbookReducer(book, {
      type: 'togglePlan',
      athleteId: 'p1',
      exerciseId: 'sprint',
    });
    expect(isPlanned(state, 'p1', 'sprint')).toBe(true);
    expect(isPlanned(state, 'p2', 'sprint')).toBe(false);
    expect(
      workbookReducer(state, { type: 'togglePlan', athleteId: 'zz', exerciseId: 'sprint' }),
    ).toBe(state);
    state = workbookReducer(state, { type: 'removeAthlete', athleteId: 'p1' });
    expect(state.plans).toEqual([]);
    const twice = workbookReducer(
      workbookReducer(book, { type: 'togglePlan', athleteId: 'p1', exerciseId: 'sprint' }),
      { type: 'togglePlan', athleteId: 'p1', exerciseId: 'sprint' },
    );
    expect(twice.plans).toEqual([]);
  });
});

describe('setPlans (page „Planen“: „Alle, die können“ / „Keins“)', () => {
  const set = (state: typeof book, athleteIds: string[], planned: boolean) =>
    workbookReducer(state, { type: 'setPlans', athleteIds, exerciseId: 'run-endurance', planned });

  it('plans several children at once, never twice, unknown children skipped', () => {
    const one = workbookReducer(book, {
      type: 'togglePlan',
      athleteId: 'p2',
      exerciseId: 'run-endurance',
    });
    const all = set(one, ['p1', 'p2', 'zz'], true);
    expect(all.plans).toEqual([
      { athleteId: 'p2', exerciseId: 'run-endurance' },
      { athleteId: 'p1', exerciseId: 'run-endurance' },
    ]);
    expect(set(all, ['p1', 'p2'], true)).toBe(all);
  });

  it('takes the plans of exactly these children for exactly this exercise back', () => {
    let state = set(book, ['p1', 'p2'], true);
    state = workbookReducer(state, { type: 'togglePlan', athleteId: 'p1', exerciseId: 'sprint' });
    state = set(state, ['p1'], false);
    expect(state.plans).toEqual([
      { athleteId: 'p2', exerciseId: 'run-endurance' },
      { athleteId: 'p1', exerciseId: 'sprint' },
    ]);
    expect(set(state, ['p1'], false)).toBe(state);
  });
});

describe('planOverview', () => {
  const plan = (state: typeof book, athleteId: string, exerciseId: string) =>
    workbookReducer(state, { type: 'togglePlan', athleteId, exerciseId });

  it('without plans: no stations, every child lacks every Disziplingruppe it can do', () => {
    const overview = planOverview(book, TEST_CATALOG, 'g1', book.athletes);
    expect(overview.stations).toEqual([]);
    expect(overview.gaps.map((g) => [g.athleteId, g.groups])).toEqual([
      ['p1', ['endurance', 'strength', 'speed', 'coordination']],
      ['p2', ['endurance', 'strength', 'speed', 'coordination']],
    ]);
    expect(overview.stale).toEqual([]);
  });

  it('stations in Disziplingruppe order with who; a planned group is no gap any more', () => {
    let state = plan(book, 'p1', 'sprint');
    state = plan(state, 'p1', 'run-endurance');
    state = plan(state, 'p2', 'run-endurance');
    const overview = planOverview(state, TEST_CATALOG, 'g1', state.athletes);
    expect(overview.stations.map((s) => [s.exercise.id, s.athleteIds])).toEqual([
      ['run-endurance', ['p1', 'p2']],
      ['sprint', ['p1']],
    ]);
    expect(overview.gaps.map((g) => [g.athleteId, g.groups])).toEqual([
      ['p1', ['strength', 'coordination']],
      ['p2', ['strength', 'speed', 'coordination']],
    ]);
  });

  it('a plan the child can no longer do is named, not counted (here: now too young)', () => {
    let state = plan(book, 'p1', 'sprint');
    state = workbookReducer(state, {
      type: 'updateAthlete',
      athlete: athlete({ id: 'p1', birthYear: YEAR - 5 }),
    });
    const overview = planOverview(state, TEST_CATALOG, 'g1', state.athletes);
    expect(overview.stations).toEqual([]);
    expect(overview.stale).toEqual([{ athleteId: 'p1', exerciseId: 'sprint' }]);
    // a child who can do nothing has no gaps — the reason is shown instead
    expect(overview.gaps.map((g) => g.athleteId)).toEqual(['p2']);
    const open = workbookReducer(plan(book, 'p1', 'sprint'), {
      type: 'updateAthlete',
      athlete: athlete({ id: 'p1', track: 'mmb', classIds: [] }),
    });
    expect(planOverview(open, TEST_CATALOG, 'g1', open.athletes).stale).toEqual([
      { athleteId: 'p1', exerciseId: 'sprint' },
    ]);
  });

  it('only the shown group counts', () => {
    const state = plan(book, 'p1', 'sprint');
    const p2 = state.athletes.filter((a) => a.id === 'p2');
    expect(planOverview(state, TEST_CATALOG, 'g1', p2).stations).toEqual([]);
    expect(planOverview(state, TEST_CATALOG, 'g1', p2).stale).toEqual([]);
  });
});

describe('a swim-proof way never stays without its year', () => {
  it('updateAthlete drops the way when the year goes', () => {
    const [girl] = book.athletes;
    if (!girl) throw new Error('fixture');
    const withWay = workbookReducer(book, {
      type: 'updateAthlete',
      athlete: { ...girl, swimProofYear: YEAR, swimProofWay: 'swim50' },
    });
    expect(withWay.athletes[0]?.swimProofWay).toBe('swim50');
    const { swimProofYear: _gone, ...rest } = withWay.athletes[0] ?? girl;
    void _gone;
    const without = workbookReducer(withWay, { type: 'updateAthlete', athlete: rest });
    expect(without.athletes[0]?.swimProofWay).toBeUndefined();
  });
});

describe('offerText', () => {
  it('the variant is what the child does; an element alone gets its exercise in front', () => {
    expect(offerText({ id: 'run-endurance', name: 'Laufen' }, ['800 m Lauf'])).toBe('800 m Lauf');
    expect(offerText({ id: 'bowling', name: 'Kegeln' }, ['Kegeln Asphalt', 'Kegeln Bohle'])).toBe(
      'Kegeln Asphalt / Kegeln Bohle',
    );
    expect(offerText({ id: 'gymnastics-strength', name: 'Gerätturnen' }, ['Stützschwingen'])).toBe(
      'Gerätturnen: Stützschwingen',
    );
    expect(
      offerText({ id: 'coordination-ladder', name: 'Koordinationsleiter (6.4.7.4)' }, [
        'Dreifachschritt',
      ]),
    ).toBe('Koordinationsleiter: Dreifachschritt');
    expect(offerText({ id: 'sprint', name: 'Laufen' }, [])).toBe('Laufen');
  });
});

describe('offerLabels', () => {
  it('each variant once, also over several classes', () => {
    const max = book.athletes[1];
    const run = exerciseById(TEST_CATALOG, 'run-endurance');
    if (!max || !run) throw new Error('fixture');
    expect(offerLabels(combine(max, run, TEST_CATALOG, YEAR))).toEqual([
      '800 m',
      '800 m Rollstuhl',
    ]);
  });
});
