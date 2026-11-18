// The saved file and the browser draft share one JSON format. Reading checks every field and every
// reference; a broken file is refused with its reasons instead of being loaded half.
import { SWIM_WAY_IDS } from './swim.ts';
import { isIsoDate } from './age.ts';
import { fitsMeasure } from './measure.ts';
import { catalogForYear } from './catalogPackage.ts';
import { GROUPS, LEVELS } from './reference.ts';
import type { Catalog, GroupId, Level, Workbook } from './types.ts';
import { WORKBOOK_FORMAT, WORKBOOK_VERSION } from './types.ts';

export function serializeWorkbook(workbook: Workbook): string {
  return `${JSON.stringify(workbook, null, 2)}\n`;
}

export type ParsedWorkbook = { ok: true; workbook: Workbook } | { ok: false; errors: string[] };

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === 'string';
const isYear = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1900 && value <= 2200;
const isGroup = (value: unknown): value is GroupId => GROUPS.some((group) => group.id === value);
const isLevel = (value: unknown): value is Level => LEVELS.some((level) => level.id === value);

class Checker {
  readonly errors: string[] = [];

  require(condition: boolean, message: string): boolean {
    if (!condition) this.errors.push(message);
    return condition;
  }

  text(entry: Json, key: string, where: string, optional = false): void {
    const value = entry[key];
    if (optional && value === undefined) return;
    this.require(isText(value), `${where}: „${key}“ muss ein Text sein.`);
  }

  list(entry: Json, key: string, where: string): Json[] {
    const value = entry[key];
    if (!this.require(Array.isArray(value), `${where}: „${key}“ muss eine Liste sein.`)) return [];
    const items = value as unknown[];
    items.forEach((item, index) =>
      this.require(isObject(item), `${where}: Eintrag ${index + 1} in „${key}“ ist ungültig.`),
    );
    return items.filter(isObject);
  }

  uniqueIds(items: Json[], where: string): Set<string> {
    const ids = new Set<string>();
    for (const item of items) {
      const id = item.id;
      if (!this.require(isText(id) && id !== '', `${where}: Eintrag ohne „id“.`)) continue;
      this.require(!ids.has(id as string), `${where}: „id“ ${String(id)} ist doppelt.`);
      ids.add(id as string);
    }
    return ids;
  }
}

/** Reads a saved workbook; references are checked against the catalog valid in its exam year. */
export function parseWorkbook(text: string, catalogs: readonly Catalog[]): ParsedWorkbook {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['Die Datei ist kein gültiges JSON.'] };
  }
  if (!isObject(data) || data.format !== WORKBOOK_FORMAT) {
    return { ok: false, errors: ['Die Datei ist keine Sportabzeichen-Vorerfassung.'] };
  }
  if (!READABLE_VERSIONS.includes(data.version as number)) {
    return {
      ok: false,
      errors: [
        `Dateiversion ${String(data.version)} wird nicht unterstützt (lesbar: ${READABLE_VERSIONS.join(', ')}).`,
      ],
    };
  }

  const book = upgradeWorkbook(data);
  if (!isYear(book.year))
    return { ok: false, errors: ['Das Prüfungsjahr fehlt oder ist ungültig.'] };
  const catalog = catalogForYear(catalogs, book.year);
  if (!catalog) {
    return {
      ok: false,
      errors: [`Für das Prüfungsjahr ${book.year} ist kein Leistungskatalog vorhanden.`],
    };
  }
  const check = new Checker();
  if (check.require(isObject(book.organisation), 'Die Organisation fehlt.')) {
    const organisation = book.organisation as Json;
    for (const key of ['name', 'postalCode', 'city']) check.text(organisation, key, 'Organisation');
  }

  const athletes = check.list(book, 'athletes', 'Teilnehmende');
  const athleteIds = check.uniqueIds(athletes, 'Teilnehmende');
  const classIds = new Set(catalog.classes.map((entry) => entry.id));
  const classesOf = new Map<string, unknown>();
  for (const athlete of athletes) {
    const where = `Teilnehmende ${String(athlete.id)}`;
    check.require(
      isText(athlete.firstName) && athlete.firstName.trim() !== '',
      `${where}: Vorname fehlt.`,
    );
    for (const key of ['lastName', 'dsaId', 'postalCode', 'city']) {
      check.text(athlete, key, where, true);
    }
    // a version-1 date the upgrade could not read stays and is named as such
    if (athlete.birthDate !== undefined) check.require(false, `${where}: Geburtsdatum ungültig.`);
    else check.require(isYear(athlete.birthYear), `${where}: Jahrgang ungültig.`);
    check.require(
      athlete.sex === 'w' || athlete.sex === 'm',
      `${where}: Geschlecht muss w oder m sein.`,
    );
    check.require(
      athlete.track === 'regular' || athlete.track === 'mmb',
      `${where}: Bedingungen ungültig.`,
    );
    check.require(
      Array.isArray(athlete.classIds) &&
        athlete.classIds.every((id) => isText(id) && classIds.has(id)),
      `${where}: Behinderungsklassen ungültig.`,
    );
    check.require(
      athlete.track === 'mmb' || (Array.isArray(athlete.classIds) && athlete.classIds.length === 0),
      `${where}: Behinderungsklassen gibt es nur unter MmB-Bedingungen.`,
    );
    check.require(
      Array.isArray(athlete.inactiveClassIds) &&
        Array.isArray(athlete.classIds) &&
        athlete.inactiveClassIds.every((id) => (athlete.classIds as unknown[]).includes(id)),
      `${where}: deaktivierte Klassen müssen zu den möglichen Klassen gehören.`,
    );
    check.require(typeof athlete.consentOnFile === 'boolean', `${where}: Einwilligung fehlt.`);
    check.require(typeof athlete.firstTime === 'boolean', `${where}: Angabe zum Ersterwerb fehlt.`);
    check.require(
      athlete.swimProofYear === undefined || isYear(athlete.swimProofYear),
      `${where}: Jahr des Schwimmnachweises ungültig.`,
    );
    check.require(
      athlete.swimProofWay === undefined ||
        (isText(athlete.swimProofWay) &&
          SWIM_WAY_IDS.includes(athlete.swimProofWay) &&
          athlete.swimProofYear !== undefined),
      `${where}: Art des Schwimmnachweises ungültig.`,
    );
    classesOf.set(String(athlete.id), athlete.classIds);
  }

  const groups = check.list(book, 'groups', 'Gruppen');
  check.uniqueIds(groups, 'Gruppen');
  for (const group of groups) {
    const where = `Gruppe ${String(group.id)}`;
    check.text(group, 'name', where);
    check.require(
      Array.isArray(group.athleteIds) &&
        group.athleteIds.every((id) => isText(id) && athleteIds.has(id)),
      `${where}: verweist auf unbekannte Teilnehmende.`,
    );
  }

  const measurements = check.list(book, 'measurements', 'Messwerte');
  check.uniqueIds(measurements, 'Messwerte');
  // id → owner and Disziplingruppe, to check profile choices below
  const measured = new Map<string, { athleteId: unknown; group: GroupId | undefined }>();
  for (const measurement of measurements) {
    const where = `Messwert ${String(measurement.id)}`;
    check.require(
      isText(measurement.athleteId) && athleteIds.has(measurement.athleteId),
      `${where}: verweist auf unbekannte Teilnehmende.`,
    );
    const exercise = catalog.exercises.find((entry) => entry.id === measurement.exerciseId);
    if (check.require(exercise !== undefined, `${where}: unbekannte Übung.`) && exercise) {
      check.require(fitsMeasure(exercise.measure, measurement.value), `${where}: Wert ungültig.`);
    }
    measured.set(String(measurement.id), {
      athleteId: measurement.athleteId,
      group: exercise?.group,
    });
    const ownClasses = classesOf.get(String(measurement.athleteId));
    check.require(
      measurement.classId === undefined ||
        (Array.isArray(ownClasses) && ownClasses.includes(measurement.classId)),
      `${where}: Behinderungsklasse gehört nicht zur Person.`,
    );
    check.require(
      measurement.date === undefined || (isText(measurement.date) && isIsoDate(measurement.date)),
      `${where}: Datum ungültig.`,
    );
    check.require(
      measurement.variant === undefined ||
        (isText(measurement.variant) && measurement.variant.trim() !== ''),
      `${where}: Variante ungültig.`,
    );
  }

  check.require(
    book.badgeRecords === undefined,
    'Die Datei enthält Verbandsabzeichen; diese werden nicht mehr erfasst. Bitte direkt im Zielsystem eintragen und die Einträge aus der Datei entfernen.',
  );

  const assessments = check.list(book, 'manualAssessments', 'Ausgleich/Kombination');
  check.uniqueIds(assessments, 'Ausgleich/Kombination');
  for (const assessment of assessments) {
    const where = `Ausgleich/Kombination ${String(assessment.id)}`;
    check.require(
      isText(assessment.athleteId) && athleteIds.has(assessment.athleteId),
      `${where}: verweist auf unbekannte Teilnehmende.`,
    );
    check.require(isGroup(assessment.group), `${where}: Gruppe ungültig.`);
    check.require(
      assessment.basis === 'compensation' || assessment.basis === 'combinedClasses',
      `${where}: Art ungültig.`,
    );
    for (const key of ['condition', 'performance', 'setBy']) check.text(assessment, key, where);
    check.require(
      assessment.level === null || isLevel(assessment.level),
      `${where}: Stufe ungültig.`,
    );
    check.require(
      assessment.date === undefined || (isText(assessment.date) && isIsoDate(assessment.date)),
      `${where}: Datum ungültig.`,
    );
  }

  const choices = check.list(book, 'profileChoices', 'Prüfungsprofil');
  const chosenGroups = new Set<string>();
  for (const choice of choices) {
    const where = `Prüfungsprofil ${String(choice.athleteId)}/${String(choice.group)}`;
    const target = measured.get(String(choice.measurementId));
    check.require(
      target !== undefined &&
        target.athleteId === choice.athleteId &&
        target.group === choice.group,
      `${where}: gewählter Messwert passt nicht zu Person und Gruppe.`,
    );
    const key = `${String(choice.athleteId)}|${String(choice.group)}`;
    check.require(!chosenGroups.has(key), `${where}: Gruppe mehrfach gewählt.`);
    chosenGroups.add(key);
  }

  const plans = check.list(book, 'plans', 'Geplante Übungen');
  const planned = new Set<string>();
  for (const plan of plans) {
    const where = `Geplante Übung ${String(plan.athleteId)}/${String(plan.exerciseId)}`;
    check.require(
      isText(plan.athleteId) && athleteIds.has(plan.athleteId),
      `${where}: verweist auf unbekannte Teilnehmende.`,
    );
    check.require(
      catalog.exercises.some((exercise) => exercise.id === plan.exerciseId),
      `${where}: unbekannte Übung.`,
    );
    const key = `${String(plan.athleteId)}|${String(plan.exerciseId)}`;
    check.require(!planned.has(key), `${where}: doppelt.`);
    planned.add(key);
  }

  if (check.errors.length > 0) return { ok: false, errors: check.errors };
  return { ok: true, workbook: { ...book, version: WORKBOOK_VERSION } as unknown as Workbook };
}

/** Version 1 (until 2026-11-10) is read and upgraded; it is written as the current version. */
export const READABLE_VERSIONS: readonly number[] = [1, WORKBOOK_VERSION];

/**
 * Version 1 asked for last name and date of birth; a child is now its first name and birth year.
 * A readable date becomes its year, an unreadable one stays to be named; an empty last name goes,
 * a filled one is kept.
 */
function upgradeAthleteV1(athlete: Json): Json {
  const copy: Json = { ...athlete };
  if (isText(copy.birthDate) && isIsoDate(copy.birthDate)) {
    copy.birthYear = Number(copy.birthDate.slice(0, 4));
    delete copy.birthDate;
  }
  if (copy.lastName === '') delete copy.lastName;
  return copy;
}

/**
 * Brings a workbook of an earlier development state up to date before it is checked: lists and
 * fields added later start empty, retired fields are dropped only while empty — content is never
 * discarded silently.
 */
export function upgradeWorkbook(data: Json): Json {
  const athletes = Array.isArray(data.athletes)
    ? data.athletes.map((athlete: unknown) => {
        if (!isObject(athlete)) return athlete;
        const copy: Json = { inactiveClassIds: [], ...athlete };
        // Field of the first draft, never settable in the UI; replaced by manualAssessments
        delete copy.specialCase;
        return data.version === 1 ? upgradeAthleteV1(copy) : copy;
      })
    : data.athletes;
  const book: Json = { manualAssessments: [], profileChoices: [], plans: [], ...data, athletes };
  // Verbandsabzeichen were removed (2026-11-01); a non-empty list is refused by parseWorkbook
  if (Array.isArray(book.badgeRecords) && book.badgeRecords.length === 0) delete book.badgeRecords;
  return book;
}
