// State transitions of the workbook. Pure: every action returns a new workbook; ids are created by
// the caller. Removing an athlete cascades to everything that belongs to them; removing a
// measurement drops a profile choice pointing at it.
import type {
  Athlete,
  AthleteGroup,
  GroupId,
  ManualAssessment,
  Measurement,
  Organisation,
  Workbook,
} from './types.ts';
import { WORKBOOK_FORMAT, WORKBOOK_VERSION } from './types.ts';

export function emptyWorkbook(year: number): Workbook {
  return {
    format: WORKBOOK_FORMAT,
    version: WORKBOOK_VERSION,
    year,
    organisation: { name: '', postalCode: '', city: '' },
    athletes: [],
    groups: [],
    measurements: [],
    manualAssessments: [],
    profileChoices: [],
    plans: [],
  };
}

export type WorkbookAction =
  | { type: 'setYear'; year: number }
  | { type: 'setOrganisation'; organisation: Organisation }
  | { type: 'addAthlete'; athlete: Athlete }
  /** A child entered on the page „Kinder“: added and put into the group shown there. */
  | { type: 'addChildToGroup'; athlete: Athlete; groupId: string }
  | { type: 'updateAthlete'; athlete: Athlete }
  | { type: 'removeAthlete'; athleteId: string }
  | { type: 'addGroup'; group: AthleteGroup }
  | { type: 'updateGroup'; group: AthleteGroup }
  | { type: 'removeGroup'; groupId: string }
  /** The group and its children that are in no other group, with everything of theirs. */
  | { type: 'removeGroupWithChildren'; groupId: string }
  | { type: 'addMeasurement'; measurement: Measurement }
  | { type: 'removeMeasurement'; measurementId: string }
  | { type: 'addManualAssessment'; assessment: ManualAssessment }
  | { type: 'updateManualAssessment'; assessment: ManualAssessment }
  | { type: 'removeManualAssessment'; assessmentId: string }
  /** measurementId null removes the choice: the best result counts again. */
  | { type: 'setProfileChoice'; athleteId: string; group: GroupId; measurementId: string | null }
  /** The child will do the exercise — or no longer (a second toggle takes the plan back). */
  | { type: 'togglePlan'; athleteId: string; exerciseId: string }
  | { type: 'replace'; workbook: Workbook };

/** Deactivated classes stay a subset of the possible ones; regular athletes have none. */
function normalizeClasses(athlete: Athlete): Athlete {
  const classIds = athlete.track === 'mmb' ? athlete.classIds : [];
  const inactiveClassIds = athlete.inactiveClassIds.filter((id) => classIds.includes(id));
  return { ...athlete, classIds, inactiveClassIds };
}

/** A measurement keeps its value but loses a class the athlete no longer has. */
function dropStaleClass(measurement: Measurement, athlete: Athlete): Measurement {
  if (measurement.athleteId !== athlete.id || measurement.classId === undefined) return measurement;
  if (athlete.classIds.includes(measurement.classId)) return measurement;
  const copy = { ...measurement };
  delete copy.classId;
  return copy;
}

export function workbookReducer(state: Workbook, action: WorkbookAction): Workbook {
  switch (action.type) {
    case 'setYear':
      return { ...state, year: action.year };
    case 'setOrganisation':
      return { ...state, organisation: action.organisation };
    case 'addAthlete':
      return { ...state, athletes: [...state.athletes, normalizeClasses(action.athlete)] };
    case 'addChildToGroup': {
      if (!state.groups.some((group) => group.id === action.groupId)) return state;
      return {
        ...state,
        athletes: [...state.athletes, normalizeClasses(action.athlete)],
        groups: state.groups.map((group) =>
          group.id === action.groupId
            ? { ...group, athleteIds: [...group.athleteIds, action.athlete.id] }
            : group,
        ),
      };
    }
    case 'updateAthlete': {
      const athlete = normalizeClasses(action.athlete);
      return {
        ...state,
        athletes: state.athletes.map((entry) => (entry.id === athlete.id ? athlete : entry)),
        measurements: state.measurements.map((m) => dropStaleClass(m, athlete)),
      };
    }
    case 'removeAthlete': {
      const other = (entry: { athleteId: string }) => entry.athleteId !== action.athleteId;
      return {
        ...state,
        athletes: state.athletes.filter((athlete) => athlete.id !== action.athleteId),
        groups: state.groups.map((group) => ({
          ...group,
          athleteIds: group.athleteIds.filter((id) => id !== action.athleteId),
        })),
        measurements: state.measurements.filter(other),
        manualAssessments: state.manualAssessments.filter(other),
        profileChoices: state.profileChoices.filter(other),
        plans: state.plans.filter(other),
      };
    }
    case 'addGroup':
      return { ...state, groups: [...state.groups, action.group] };
    case 'updateGroup':
      return {
        ...state,
        groups: state.groups.map((group) => (group.id === action.group.id ? action.group : group)),
      };
    case 'removeGroup':
      return { ...state, groups: state.groups.filter((group) => group.id !== action.groupId) };
    case 'removeGroupWithChildren': {
      const elsewhere = new Set(
        state.groups.filter((g) => g.id !== action.groupId).flatMap((g) => g.athleteIds),
      );
      const leaving =
        state.groups
          .find((group) => group.id === action.groupId)
          ?.athleteIds.filter((id) => !elsewhere.has(id)) ?? [];
      const withoutGroup = workbookReducer(state, { type: 'removeGroup', groupId: action.groupId });
      return leaving.reduce(
        (book, athleteId) => workbookReducer(book, { type: 'removeAthlete', athleteId }),
        withoutGroup,
      );
    }
    case 'addMeasurement':
      return { ...state, measurements: [...state.measurements, action.measurement] };
    case 'removeMeasurement':
      return {
        ...state,
        measurements: state.measurements.filter((m) => m.id !== action.measurementId),
        profileChoices: state.profileChoices.filter(
          (c) => c.measurementId !== action.measurementId,
        ),
      };
    case 'addManualAssessment':
      return { ...state, manualAssessments: [...state.manualAssessments, action.assessment] };
    case 'updateManualAssessment':
      return {
        ...state,
        manualAssessments: state.manualAssessments.map((entry) =>
          entry.id === action.assessment.id ? action.assessment : entry,
        ),
      };
    case 'removeManualAssessment':
      return {
        ...state,
        manualAssessments: state.manualAssessments.filter((e) => e.id !== action.assessmentId),
      };
    case 'setProfileChoice': {
      const others = state.profileChoices.filter(
        (c) => !(c.athleteId === action.athleteId && c.group === action.group),
      );
      const { athleteId, group, measurementId } = action;
      return {
        ...state,
        profileChoices:
          measurementId === null ? others : [...others, { athleteId, group, measurementId }],
      };
    }
    case 'togglePlan': {
      const same = (plan: { athleteId: string; exerciseId: string }) =>
        plan.athleteId === action.athleteId && plan.exerciseId === action.exerciseId;
      if (!state.athletes.some((athlete) => athlete.id === action.athleteId)) return state;
      return {
        ...state,
        plans: state.plans.some(same)
          ? state.plans.filter((plan) => !same(plan))
          : [...state.plans, { athleteId: action.athleteId, exerciseId: action.exerciseId }],
      };
    }
    case 'replace':
      return action.workbook;
  }
}
