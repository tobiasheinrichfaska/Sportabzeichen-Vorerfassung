import { WORKBOOK_FORMAT, WORKBOOK_VERSION, type Workbook } from '../../src/logic/types';
import { emptyWorkbook, workbookReducer } from '../../src/logic/workbook';
import { athlete, sampleWorkbook } from '../fixtures/testCatalog';

function withData(): Workbook {
  return {
    ...sampleWorkbook(),
    measurements: [
      { id: 'm1', athleteId: 'p1', exerciseId: 'sprint', value: 70 },
      { id: 'm2', athleteId: 'p2', exerciseId: 'run-endurance', value: 285, classId: 'H' },
    ],
    manualAssessments: [
      {
        id: 'a1',
        athleteId: 'p2',
        group: 'endurance',
        basis: 'compensation',
        condition: 'Strecke halbiert',
        performance: '400 m in 11:20',
        setBy: 'Dr. Muster',
        level: null,
      },
    ],
    profileChoices: [{ athleteId: 'p1', group: 'speed', measurementId: 'm1' }],
  };
}

describe('emptyWorkbook', () => {
  it('starts empty for the given year', () => {
    expect(emptyWorkbook(2026)).toEqual({
      format: WORKBOOK_FORMAT,
      version: WORKBOOK_VERSION,
      year: 2026,
      organisation: { name: '', postalCode: '', city: '' },
      athletes: [],
      groups: [],
      measurements: [],
      manualAssessments: [],
      profileChoices: [],
      plans: [],
    });
  });
});

describe('workbookReducer — classes, profile, manual decisions', () => {
  it('keeps deactivated classes a subset of the possible ones', () => {
    const state = withData();
    const p2 = state.athletes[1];
    if (!p2) throw new Error('fixture');
    const next = workbookReducer(state, {
      type: 'updateAthlete',
      athlete: { ...p2, classIds: ['A'], inactiveClassIds: ['A', 'H'] },
    });
    expect(next.athletes[1]).toMatchObject({ classIds: ['A'], inactiveClassIds: ['A'] });
  });

  it('clears all classes when the athlete changes to the regular track', () => {
    const state = withData();
    const p2 = state.athletes[1];
    if (!p2) throw new Error('fixture');
    const next = workbookReducer(state, {
      type: 'updateAthlete',
      athlete: { ...p2, track: 'regular', inactiveClassIds: ['H'] },
    });
    expect(next.athletes[1]).toMatchObject({ classIds: [], inactiveClassIds: [] });
  });

  it('keeps the class of a measurement when the class is only deactivated', () => {
    const state = withData();
    const p2 = state.athletes[1];
    if (!p2) throw new Error('fixture');
    const next = workbookReducer(state, {
      type: 'updateAthlete',
      athlete: { ...p2, inactiveClassIds: ['H'] },
    });
    expect(next.measurements.find((m) => m.id === 'm2')?.classId).toBe('H');
  });

  it('sets, replaces and removes the profile choice of a group', () => {
    let state = workbookReducer(withData(), {
      type: 'setProfileChoice',
      athleteId: 'p1',
      group: 'speed',
      measurementId: 'm9',
    });
    expect(state.profileChoices).toEqual([
      { athleteId: 'p1', group: 'speed', measurementId: 'm9' },
    ]);
    state = workbookReducer(state, {
      type: 'setProfileChoice',
      athleteId: 'p1',
      group: 'speed',
      measurementId: null,
    });
    expect(state.profileChoices).toEqual([]);
  });

  it('removing a measurement removes the choice pointing at it', () => {
    const state = workbookReducer(withData(), { type: 'removeMeasurement', measurementId: 'm1' });
    expect(state.profileChoices).toEqual([]);
  });

  it('adds, updates and removes manual decisions', () => {
    const base = withData();
    const [first] = base.manualAssessments;
    if (!first) throw new Error('fixture');
    let state = workbookReducer(base, {
      type: 'updateManualAssessment',
      assessment: { ...first, level: 'silver' },
    });
    expect(state.manualAssessments[0]?.level).toBe('silver');
    state = workbookReducer(state, {
      type: 'addManualAssessment',
      assessment: { ...first, id: 'a2', group: 'speed' },
    });
    state = workbookReducer(state, { type: 'removeManualAssessment', assessmentId: 'a1' });
    expect(state.manualAssessments.map((a) => a.id)).toEqual(['a2']);
  });

  it('removing an athlete removes their manual decisions and profile choices', () => {
    const state = workbookReducer(withData(), { type: 'removeAthlete', athleteId: 'p2' });
    expect(state.manualAssessments).toEqual([]);
    const other = workbookReducer(withData(), { type: 'removeAthlete', athleteId: 'p1' });
    expect(other.profileChoices).toEqual([]);
  });
});

describe('workbookReducer', () => {
  it('never changes the previous state', () => {
    const before = withData();
    const snapshot = JSON.stringify(before);
    workbookReducer(before, { type: 'removeAthlete', athleteId: 'p1' });
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('sets year and organisation', () => {
    const state = workbookReducer(emptyWorkbook(2026), { type: 'setYear', year: 2027 });
    expect(state.year).toBe(2027);
    const organisation = { name: 'Schule', postalCode: '76131', city: 'Karlsruhe' };
    expect(workbookReducer(state, { type: 'setOrganisation', organisation }).organisation).toBe(
      organisation,
    );
  });

  it('adds and updates athletes', () => {
    const added = workbookReducer(emptyWorkbook(2026), {
      type: 'addAthlete',
      athlete: athlete({ id: 'a' }),
    });
    const updated = workbookReducer(added, {
      type: 'updateAthlete',
      athlete: athlete({ id: 'a', firstName: 'Eva' }),
    });
    expect(updated.athletes.map((entry) => entry.firstName)).toEqual(['Eva']);
  });

  it('removing an athlete removes their measurements and memberships', () => {
    const state = workbookReducer(withData(), { type: 'removeAthlete', athleteId: 'p1' });
    expect(state.athletes.map((entry) => entry.id)).toEqual(['p2']);
    expect(state.groups[0]?.athleteIds).toEqual(['p2']);
    expect(state.measurements.map((m) => m.id)).toEqual(['m2']);
  });

  it('keeps a measurement but drops a class the athlete no longer has', () => {
    const state = withData();
    const p2 = state.athletes[1];
    if (!p2) throw new Error('fixture');
    const onlyA = workbookReducer(state, {
      type: 'updateAthlete',
      athlete: { ...p2, classIds: ['A'] },
    });
    expect(onlyA.measurements.find((m) => m.id === 'm2')).toEqual({
      id: 'm2',
      athleteId: 'p2',
      exerciseId: 'run-endurance',
      value: 285,
    });
    const stillH = workbookReducer(state, {
      type: 'updateAthlete',
      athlete: { ...p2, classIds: ['H'] },
    });
    expect(stillH.measurements.find((m) => m.id === 'm2')?.classId).toBe('H');
    const regular = workbookReducer(state, {
      type: 'updateAthlete',
      athlete: { ...p2, track: 'regular', classIds: [] },
    });
    expect(regular.measurements.find((m) => m.id === 'm2')?.classId).toBeUndefined();
  });

  it('adds, updates and removes groups without touching athletes', () => {
    let state = workbookReducer(withData(), {
      type: 'addGroup',
      group: { id: 'g2', name: 'Klasse 3b', athleteIds: ['p1'] },
    });
    state = workbookReducer(state, {
      type: 'updateGroup',
      group: { id: 'g2', name: 'Klasse 3c', athleteIds: [] },
    });
    expect(state.groups.find((g) => g.id === 'g2')).toEqual({
      id: 'g2',
      name: 'Klasse 3c',
      athleteIds: [],
    });
    state = workbookReducer(state, { type: 'removeGroup', groupId: 'g2' });
    expect(state.groups.map((g) => g.id)).toEqual(['g1']);
    expect(state.athletes).toHaveLength(2);
  });

  it('adds and removes measurements', () => {
    let state = workbookReducer(withData(), {
      type: 'addMeasurement',
      measurement: { id: 'm3', athleteId: 'p1', exerciseId: 'sprint', value: 60 },
    });
    state = workbookReducer(state, { type: 'removeMeasurement', measurementId: 'm1' });
    expect(state.measurements.map((m) => m.id)).toEqual(['m2', 'm3']);
  });

  it('replaces the whole workbook', () => {
    const other = emptyWorkbook(2030);
    expect(workbookReducer(withData(), { type: 'replace', workbook: other })).toBe(other);
  });
});
