// Children entered with first name and birth year (Tobias 2026-11-10), grouped.
import {
  checkChild,
  checkGroupName,
  childLabel,
  childrenWithoutGroup,
  exampleChildren,
  currentGroup,
  groupMembers,
  inputOf,
  newChild,
  onlyInGroup,
  twinHint,
  type ChildInput,
} from '../../src/logic/children';
import { emptyWorkbook, workbookReducer } from '../../src/logic/workbook';
import type { Workbook } from '../../src/logic/types';
import { athlete } from '../fixtures/testCatalog';

const input = (patch: Partial<ChildInput> = {}): ChildInput => ({
  firstName: 'Lena',
  birthYear: '2017',
  sex: 'w',
  track: 'regular',
  ...patch,
});
const errorsOf = (patch: Partial<ChildInput>, year = 2026) => {
  const result = checkChild(input(patch), year);
  return result.ok ? [] : result.errors;
};

describe('checkChild', () => {
  it('takes first name, birth year and sex, tidying the name', () => {
    expect(checkChild(input({ firstName: '  Anna  Lena ' }), 2026)).toEqual({
      ok: true,
      value: { firstName: 'Anna Lena', birthYear: 2017, sex: 'w', track: 'regular' },
    });
  });

  it('names every missing or wrong field at once', () => {
    expect(errorsOf({ firstName: ' ', birthYear: '17', sex: null })).toEqual([
      'Vorname fehlt.',
      'Jahrgang vierstellig eintragen, z. B. 2017.',
      'Mädchen oder Junge wählen (Wertung w/m).',
    ]);
    expect(errorsOf({ firstName: 'x'.repeat(41) })[0]).toContain('zu lang');
  });

  it('is 6 in the exam year at the youngest — the birthday does not matter (Jahrgangsprinzip)', () => {
    expect(errorsOf({ birthYear: '2020' })).toEqual([]);
    expect(errorsOf({ birthYear: '2021' })[0]).toBe(
      'Jahrgang 2021 ist im Prüfungsjahr 2026 erst 5 – das Sportabzeichen gibt es ab 6 Jahren (Jahrgang 2020 oder früher).',
    );
    // born after the exam year: never a negative age in the text
    expect(errorsOf({ birthYear: '2027' })[0]).toContain('erst 0');
    expect(errorsOf({ birthYear: '1900' })[0]).toContain('nicht plausibel');
  });
});

describe('exampleChildren', () => {
  it('four invented children, two girls and two boys, 8 to 11 — every one passes the check', () => {
    const children = exampleChildren(2026);
    expect(children.map((c) => [c.firstName, 2026 - c.birthYear, c.sex])).toEqual([
      ['Mia', 9, 'w'],
      ['Paul', 10, 'm'],
      ['Emma', 11, 'w'],
      ['Jonas', 8, 'm'],
    ]);
    for (const child of children) {
      const checked = checkChild({ ...child, birthYear: String(child.birthYear) }, 2026);
      expect(checked.ok, child.firstName).toBe(true);
    }
  });
});

describe('a new child', () => {
  it('starts regular or MmB without classes, consent or swim proof', () => {
    const result = checkChild(input({ track: 'mmb' }), 2026);
    if (!result.ok) throw new Error('not taken');
    expect(newChild(result.value, 'k1')).toEqual({
      id: 'k1',
      firstName: 'Lena',
      birthYear: 2017,
      sex: 'w',
      track: 'mmb',
      classIds: [],
      inactiveClassIds: [],
      consentOnFile: false,
      firstTime: false,
    });
  });

  it('fills the form again to change it', () => {
    expect(inputOf(athlete({ id: 'p1', firstName: 'Max', birthYear: 2015, sex: 'm' }))).toEqual({
      firstName: 'Max',
      birthYear: '2015',
      sex: 'm',
      track: 'regular',
    });
  });
});

function book(): Workbook {
  let state = emptyWorkbook(2026);
  state = workbookReducer(state, {
    type: 'addGroup',
    group: { id: 'g1', name: '3b', athleteIds: [] },
  });
  state = workbookReducer(state, {
    type: 'addGroup',
    group: { id: 'g2', name: 'AG', athleteIds: [] },
  });
  for (const [id, firstName, birthYear] of [
    ['k1', 'Mia', 2017],
    ['k2', 'ben', 2016],
    ['k3', 'Mia', 2016],
  ] as const) {
    state = workbookReducer(state, {
      type: 'addChildToGroup',
      groupId: 'g1',
      athlete: athlete({ id, firstName, birthYear }),
    });
  }
  // Ben is in the AG as well
  return workbookReducer(state, {
    type: 'updateGroup',
    group: { id: 'g2', name: 'AG', athleteIds: ['k2'] },
  });
}

describe('groups', () => {
  it('a child entered on „Kinder“ joins the group shown; an unknown group takes nothing', () => {
    const state = book();
    expect(state.groups[0]?.athleteIds).toEqual(['k1', 'k2', 'k3']);
    const unchanged = workbookReducer(state, {
      type: 'addChildToGroup',
      groupId: 'nope',
      athlete: athlete({ id: 'k9' }),
    });
    expect(unchanged).toBe(state);
  });

  it('members by first name, then birth year', () => {
    expect(groupMembers(book(), 'g1').map((a) => a.id)).toEqual(['k2', 'k3', 'k1']);
    expect(groupMembers(book(), undefined)).toEqual([]);
  });

  it('the birth year tells children of the same name apart', () => {
    const members = groupMembers(book(), 'g1');
    expect(members.map((a) => childLabel(a, members))).toEqual(['ben', 'Mia (2016)', 'Mia (2017)']);
  });

  it('warns when a name and year are already in the group', () => {
    const members = groupMembers(book(), 'g1');
    expect(twinHint(members, { firstName: 'MIA', birthYear: 2017 })).toContain('schon Mia (2017)');
    expect(twinHint(members, { firstName: 'Mia', birthYear: 2017 }, 'k1')).toBeNull();
    expect(twinHint(members, { firstName: 'Mia', birthYear: 2018 })).toBeNull();
  });

  it('shows the remembered group, else the first, else none', () => {
    expect(currentGroup(book(), 'g2')?.name).toBe('AG');
    expect(currentGroup(book(), 'gone')?.name).toBe('3b');
    expect(currentGroup(emptyWorkbook(2026), undefined)).toBeUndefined();
  });

  it('deleting a group takes the children that are only there, with their values', () => {
    let state = book();
    state = workbookReducer(state, {
      type: 'addMeasurement',
      measurement: { id: 'm1', athleteId: 'k1', exerciseId: 'sprint', value: 70 },
    });
    expect(onlyInGroup(state, 'g1').map((a) => a.id)).toEqual(['k3', 'k1']);
    const after = workbookReducer(state, { type: 'removeGroupWithChildren', groupId: 'g1' });
    expect(after.groups.map((g) => g.id)).toEqual(['g2']);
    // Ben stays: he is in the AG too
    expect(after.athletes.map((a) => a.id)).toEqual(['k2']);
    expect(after.measurements).toEqual([]);
  });

  it('children in no group are found (older files)', () => {
    const state = workbookReducer(book(), { type: 'removeGroup', groupId: 'g1' });
    expect(childrenWithoutGroup(state).map((a) => a.id)).toEqual(['k3', 'k1']);
  });

  it('a group name is trimmed, needed and unique', () => {
    expect(checkGroupName(book(), '  Klasse   4a ')).toEqual({ ok: true, name: 'Klasse 4a' });
    expect(checkGroupName(book(), ' ')).toEqual({ ok: false, error: 'Name der Gruppe fehlt.' });
    expect(checkGroupName(book(), '3B')).toEqual({
      ok: false,
      error: 'Eine Gruppe „3B“ gibt es schon.',
    });
    expect(checkGroupName(book(), '3b', 'g1')).toEqual({ ok: true, name: '3b' });
  });
});
