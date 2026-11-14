// Entering a group of children (Tobias 2026-11-10: „Die Kinder werden mit Vornamen und Geburtsjahr
// angelegt“). The sex is asked too: every table has w/m columns. Pure: ids come from the caller.
import { ageInYear } from './age.ts';
import { MIN_AGE } from './reference.ts';
import type { Athlete, AthleteGroup, Sex, Track, Workbook } from './types.ts';

export const MAX_FIRST_NAME = 40;
/** Older than this in the exam year is taken for a typing error. */
const MAX_AGE = 110;

/** What the entry form holds — text as typed. */
export interface ChildInput {
  firstName: string;
  birthYear: string;
  sex: Sex | null;
  track: Track;
}

export interface ChildValues {
  firstName: string;
  birthYear: number;
  sex: Sex;
  track: Track;
}

export type ChildCheck = { ok: true; value: ChildValues } | { ok: false; errors: string[] };

/** Every reason the entry cannot be taken, in the order of the fields. */
export function checkChild(input: ChildInput, examYear: number): ChildCheck {
  const errors: string[] = [];
  const firstName = input.firstName.trim().replace(/\s+/g, ' ');
  if (firstName === '') errors.push('Vorname fehlt.');
  else if (firstName.length > MAX_FIRST_NAME) {
    errors.push(`Vorname zu lang (höchstens ${MAX_FIRST_NAME} Zeichen).`);
  }
  const yearText = input.birthYear.trim();
  const birthYear = Number(yearText);
  if (!/^\d{4}$/.test(yearText)) errors.push('Jahrgang vierstellig eintragen, z. B. 2017.');
  else {
    const age = ageInYear(birthYear, examYear);
    if (age < MIN_AGE) {
      errors.push(
        `Jahrgang ${birthYear} ist im Prüfungsjahr ${examYear} erst ${Math.max(0, age)} – das Sportabzeichen gibt es ab ${MIN_AGE} Jahren (Jahrgang ${examYear - MIN_AGE} oder früher).`,
      );
    } else if (age > MAX_AGE) errors.push(`Jahrgang ${birthYear} ist nicht plausibel.`);
  }
  if (input.sex === null) errors.push('Mädchen oder Junge wählen (Wertung w/m).');
  if (errors.length > 0 || input.sex === null) return { ok: false, errors };
  return { ok: true, value: { firstName, birthYear, sex: input.sex, track: input.track } };
}

/**
 * Four invented children to try the app without typing (Tobias 2026-11-10: „auf dem Handy so viel
 * wie möglich testen“): two girls, two boys, 8 to 11 years old in the exam year.
 */
export function exampleChildren(examYear: number): ChildValues[] {
  return [
    { firstName: 'Mia', birthYear: examYear - 9, sex: 'w', track: 'regular' },
    { firstName: 'Paul', birthYear: examYear - 10, sex: 'm', track: 'regular' },
    { firstName: 'Emma', birthYear: examYear - 11, sex: 'w', track: 'regular' },
    { firstName: 'Jonas', birthYear: examYear - 8, sex: 'm', track: 'regular' },
  ];
}

/** A new child with everything else at its start values. */
export function newChild(values: ChildValues, id: string): Athlete {
  return {
    id,
    ...values,
    classIds: [],
    inactiveClassIds: [],
    consentOnFile: false,
    firstTime: false,
  };
}

/** The entry form filled from a child, to change it. */
export function inputOf(athlete: Athlete): ChildInput {
  return {
    firstName: athlete.firstName,
    birthYear: String(athlete.birthYear),
    sex: athlete.sex,
    track: athlete.track,
  };
}

const byName = (a: Athlete, b: Athlete) =>
  a.firstName.localeCompare(b.firstName, 'de', { sensitivity: 'base' }) ||
  a.birthYear - b.birthYear ||
  a.id.localeCompare(b.id);

/** The children of a group, by first name (then birth year). */
export function groupMembers(workbook: Workbook, groupId: string | undefined): Athlete[] {
  const group = workbook.groups.find((entry) => entry.id === groupId);
  if (!group) return [];
  return workbook.athletes.filter((athlete) => group.athleteIds.includes(athlete.id)).sort(byName);
}

/** Children in no group (from older files or after a group was dissolved). */
export function childrenWithoutGroup(workbook: Workbook): Athlete[] {
  const grouped = new Set(workbook.groups.flatMap((group) => group.athleteIds));
  return workbook.athletes.filter((athlete) => !grouped.has(athlete.id)).sort(byName);
}

const sameName = (a: string, b: string) => a.localeCompare(b, 'de', { sensitivity: 'base' }) === 0;

/** The name shown in lists: the birth year added where another child bears the same name. */
export function childLabel(athlete: Athlete, among: readonly Athlete[]): string {
  const twin = among.some(
    (other) => other.id !== athlete.id && sameName(other.firstName, athlete.firstName),
  );
  return twin ? `${athlete.firstName} (${athlete.birthYear})` : athlete.firstName;
}

/** A hint when the group already has a child of that name and year — likely entered twice. */
export function twinHint(
  members: readonly Athlete[],
  values: Pick<ChildValues, 'firstName' | 'birthYear'>,
  exceptId?: string,
): string | null {
  const twin = members.find(
    (other) =>
      other.id !== exceptId &&
      sameName(other.firstName, values.firstName) &&
      other.birthYear === values.birthYear,
  );
  return twin
    ? `In der Gruppe gibt es schon ${twin.firstName} (${twin.birthYear}). Zum Unterscheiden z. B. „${values.firstName} M.“ eintragen.`
    : null;
}

/** The group to show: the remembered one if it still exists, else the first, else none. */
export function currentGroup(
  workbook: Workbook,
  rememberedId: string | undefined,
): AthleteGroup | undefined {
  return (
    workbook.groups.find((group) => group.id === rememberedId) ?? workbook.groups[0] ?? undefined
  );
}

/** Children of the group that belong to no other group — they go when the group goes. */
export function onlyInGroup(workbook: Workbook, groupId: string): Athlete[] {
  const elsewhere = new Set(
    workbook.groups.filter((group) => group.id !== groupId).flatMap((group) => group.athleteIds),
  );
  return groupMembers(workbook, groupId).filter((athlete) => !elsewhere.has(athlete.id));
}

/** A group name: trimmed, not empty, not twice. */
export function checkGroupName(
  workbook: Workbook,
  name: string,
  exceptId?: string,
): { ok: true; name: string } | { ok: false; error: string } {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (clean === '') return { ok: false, error: 'Name der Gruppe fehlt.' };
  if (workbook.groups.some((group) => group.id !== exceptId && sameName(group.name, clean))) {
    return { ok: false, error: `Eine Gruppe „${clean}“ gibt es schon.` };
  }
  return { ok: true, name: clean };
}
