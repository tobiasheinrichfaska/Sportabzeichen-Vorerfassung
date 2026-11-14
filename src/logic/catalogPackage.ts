// A catalog is a data package per "gültig ab" year: public structure files (exercises, classes,
// SpAz names) plus local files with the limit tables, which never enter the repository (rights of
// DOSB/DBS). This module checks the raw JSON and assembles one Catalog; reading the files is the
// caller's job (vite.config.ts at build time).
import { requirementFromRow, validateCatalog, type RequirementRow } from './catalog.ts';
import { GROUPS, MEASURE_KINDS } from './reference.ts';
import type {
  Catalog,
  DisabilityClass,
  Exercise,
  ExerciseDetail,
  Help,
  Requirement,
  SpazLabel,
  SpazMapping,
  Track,
} from './types.ts';

export interface CatalogFiles {
  /** catalog.json — required. */
  catalog: unknown;
  /** spaz.json */
  spaz?: unknown;
  /** Local, not versioned: limit rows and class details (subgroups, descriptions). */
  localRequirements?: unknown;
  localClasses?: unknown;
  /** Local, not versioned: official details per variant, pictures already inlined. */
  localDetails?: unknown;
}

export type AssembleResult = { ok: true; catalog: Catalog } | { ok: false; errors: string[] };

type Json = Record<string, unknown>;

const TRACK_IDS: readonly Track[] = ['regular', 'mmb'];
const GROUP_IDS = GROUPS.map((group) => group.id);
const MEASURE_IDS = Object.keys(MEASURE_KINDS) as (keyof typeof MEASURE_KINDS)[];

/** Collects every problem instead of stopping at the first one. */
class Reader {
  readonly errors: string[] = [];

  object(value: unknown, where: string): Json | null {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value as Json;
    this.errors.push(`${where}: Objekt erwartet.`);
    return null;
  }

  list(owner: Json, key: string, where: string): unknown[] {
    const value = owner[key];
    if (Array.isArray(value)) return value;
    this.errors.push(`${where}: „${key}“ muss eine Liste sein.`);
    return [];
  }

  text(owner: Json, key: string, where: string): string {
    const value = owner[key];
    if (typeof value === 'string') return value;
    this.errors.push(`${where}: „${key}“ muss ein Text sein.`);
    return '';
  }

  optionalText(owner: Json, key: string, where: string): string | undefined {
    return owner[key] === undefined ? undefined : this.text(owner, key, where);
  }

  whole(owner: Json, key: string, where: string): number {
    const value = owner[key];
    if (typeof value === 'number' && Number.isInteger(value)) return value;
    this.errors.push(`${where}: „${key}“ muss eine ganze Zahl sein.`);
    return 0;
  }

  oneOf<T extends string>(owner: Json, key: string, allowed: readonly T[], where: string): T {
    const value = owner[key];
    if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
      return value as T;
    }
    this.errors.push(`${where}: „${key}“ muss einer von ${allowed.join(', ')} sein.`);
    return allowed[0] as T;
  }

  texts(owner: Json, key: string, where: string): string[] {
    const list = this.list(owner, key, where);
    if (list.every((item) => typeof item === 'string')) return list as string[];
    this.errors.push(`${where}: „${key}“ darf nur Texte enthalten.`);
    return [];
  }

  help(owner: Json, where: string): Help {
    const help = this.object(owner.help, `${where}, help`);
    if (!help) return { text: '', source: '' };
    return { text: this.text(help, 'text', where), source: this.text(help, 'source', where) };
  }
}

function readClass(read: Reader, raw: unknown, where: string): DisabilityClass | null {
  const entry = read.object(raw, where);
  if (!entry) return null;
  const result: DisabilityClass = {
    id: read.text(entry, 'id', where),
    label: read.text(entry, 'label', where),
  };
  const parentId = read.optionalText(entry, 'parentId', where);
  const description = read.optionalText(entry, 'description', where);
  if (parentId !== undefined) result.parentId = parentId;
  if (description !== undefined) result.description = description;
  return result;
}

function readExercise(read: Reader, raw: unknown, where: string): Exercise | null {
  const entry = read.object(raw, where);
  if (!entry) return null;
  const exercise: Exercise = {
    id: read.text(entry, 'id', where),
    name: read.text(entry, 'name', where),
    group: read.oneOf(entry, 'group', GROUP_IDS, where),
    measure: read.oneOf(entry, 'measure', MEASURE_IDS, where),
    tracks: read.texts(entry, 'tracks', where).filter((track): track is Track => {
      const known = (TRACK_IDS as readonly string[]).includes(track);
      if (!known) read.errors.push(`${where}: unbekannte Bedingung „${track}“.`);
      return known;
    }),
    help: read.help(entry, where),
  };
  if (entry.trackNames !== undefined) {
    const names = read.object(entry.trackNames, `${where}, trackNames`);
    if (names) {
      exercise.trackNames = {};
      for (const track of TRACK_IDS) {
        const name = read.optionalText(names, track, `${where}, trackNames`);
        if (name !== undefined) exercise.trackNames[track] = name;
      }
    }
  }
  return exercise;
}

function readSpaz(read: Reader, raw: unknown): SpazMapping | null {
  const file = read.object(raw, 'spaz.json');
  if (!file) return null;
  const labels = read.list(file, 'labels', 'spaz.json').flatMap((item, index): SpazLabel[] => {
    const where = `spaz.json, Eintrag ${index + 1}`;
    const entry = read.object(item, where);
    if (!entry) return [];
    const label: SpazLabel = {
      track: read.oneOf(entry, 'track', TRACK_IDS, where),
      group: read.oneOf(entry, 'group', GROUP_IDS, where),
      label: read.text(entry, 'label', where),
      exerciseIds: read.texts(entry, 'exerciseIds', where),
    };
    if (entry.manual === true) label.manual = true;
    const note = read.optionalText(entry, 'note', where);
    if (note !== undefined) label.note = note;
    return [label];
  });
  return {
    source: read.text(file, 'source', 'spaz.json'),
    complete: file.complete === true,
    labels,
  };
}

function readRequirements(read: Reader, raw: unknown, catalog: Catalog): Requirement[] {
  const file = read.object(raw, 'Grenzwerte (lokal)');
  if (!file) return [];
  return read.list(file, 'rows', 'Grenzwerte (lokal)').flatMap((item, index) => {
    const where = `Grenzwerte (lokal), Zeile ${index + 1}`;
    const entry = read.object(item, where);
    if (!entry) return [];
    const row: RequirementRow = {
      exerciseId: read.text(entry, 'exerciseId', where),
      track: read.oneOf(entry, 'track', TRACK_IDS, where),
      sex: read.oneOf(entry, 'sex', ['w', 'm'] as const, where),
      ageFrom: read.whole(entry, 'ageFrom', where),
      ageTo: entry.ageTo === null ? null : read.whole(entry, 'ageTo', where),
      label: read.text(entry, 'label', where),
    };
    for (const key of ['classId', 'bronze', 'silver', 'gold'] as const) {
      const value = read.optionalText(entry, key, where);
      if (value !== undefined) row[key] = value;
    }
    const result = requirementFromRow(catalog, row);
    if (!result.ok) {
      read.errors.push(`${where}: ${result.error}`);
      return [];
    }
    return [result.requirement];
  });
}

const DETAIL_TEXTS = ['subtitle', 'ages', 'material', 'imageAlt'] as const;

/** Details must describe a variant the limits know, once each, with an inlined picture. */
function readDetails(read: Reader, raw: unknown, catalog: Catalog): ExerciseDetail[] {
  const file = read.object(raw, 'Details (lokal)');
  if (!file) return [];
  const variants = new Set(catalog.requirements.map((r) => `${r.exerciseId}|${r.label}`));
  const seen = new Set<string>();
  return read.list(file, 'details', 'Details (lokal)').flatMap((item, index) => {
    const where = `Details (lokal), Eintrag ${index + 1}`;
    const entry = read.object(item, where);
    if (!entry) return [];
    const detail: ExerciseDetail = {
      exerciseId: read.text(entry, 'exerciseId', where),
      label: read.text(entry, 'label', where),
      title: read.text(entry, 'title', where),
      source: read.text(entry, 'source', where),
    };
    const key = `${detail.exerciseId}|${detail.label}`;
    if (!catalog.exercises.some((e) => e.id === detail.exerciseId)) {
      read.errors.push(`${where}: unbekannte Übung „${detail.exerciseId}“.`);
    } else if (!variants.has(key)) {
      read.errors.push(
        `${where}: „${detail.label}“ ist keine Variante von „${detail.exerciseId}“.`,
      );
    }
    if (seen.has(key)) read.errors.push(`${where}: „${detail.label}“ ist doppelt beschrieben.`);
    seen.add(key);
    if (!detail.title.trim() || !detail.source.trim()) {
      read.errors.push(`${where}: Titel und Quelle dürfen nicht leer sein.`);
    }
    for (const name of DETAIL_TEXTS) {
      const value = read.optionalText(entry, name, where);
      if (value !== undefined) detail[name] = value;
    }
    if (entry.steps !== undefined) {
      const steps = read.texts(entry, 'steps', where);
      if (steps.length === 0 || steps.some((step) => !step.trim())) {
        read.errors.push(`${where}: „steps“ braucht Schritte ohne leere Einträge.`);
      }
      detail.steps = steps;
    }
    if (entry.levels !== undefined) {
      const levels = read.object(entry.levels, `${where}, levels`);
      if (levels) {
        const text = (name: string) => read.text(levels, name, `${where}, levels`);
        const result = { bronze: text('bronze'), silver: text('silver'), gold: text('gold') };
        if (Object.values(result).some((value) => !value.trim())) {
          read.errors.push(`${where}: jede Stufe braucht ihre Aufgabe.`);
        }
        detail.levels = result;
      }
    }
    const image = read.optionalText(entry, 'image', where);
    if (image !== undefined) {
      if (!image.startsWith('data:image/')) {
        read.errors.push(`${where}: Bild „${image.slice(0, 40)}“ ist nicht eingebettet.`);
      }
      detail.image = image;
    }
    if (entry.imageShape !== undefined) {
      detail.imageShape = read.oneOf(entry, 'imageShape', ['tall', 'wide'] as const, where);
    }
    const video = read.optionalText(entry, 'video', where);
    if (video !== undefined) {
      if (!/^https:\/\/\S+$/.test(video))
        read.errors.push(`${where}: Video muss eine https-Adresse sein.`);
      detail.video = video;
    }
    return [detail];
  });
}

/** Local class details replace label/description of known classes and add subgroups. */
function mergeClasses(read: Reader, base: DisabilityClass[], raw: unknown): DisabilityClass[] {
  const file = read.object(raw, 'Klassen (lokal)');
  if (!file) return base;
  const extra = read
    .list(file, 'classes', 'Klassen (lokal)')
    .flatMap((item, index) => readClass(read, item, `Klassen (lokal), Eintrag ${index + 1}`) ?? []);
  const merged = base.map((entry) => ({ ...entry, ...extra.find((e) => e.id === entry.id) }));
  return [...merged, ...extra.filter((entry) => !base.some((known) => known.id === entry.id))];
}

/** Checks all files of one year and builds the catalog; every problem is listed. */
export function assembleCatalog(files: CatalogFiles): AssembleResult {
  const read = new Reader();
  const main = read.object(files.catalog, 'catalog.json');
  if (!main) return { ok: false, errors: read.errors };
  const at = 'catalog.json';
  let catalog: Catalog = {
    validFrom: read.whole(main, 'validFrom', at),
    sources: read.texts(main, 'sources', at),
    classes: read
      .list(main, 'classes', at)
      .flatMap((item, i) => readClass(read, item, `${at}, Klasse ${i + 1}`) ?? []),
    exercises: read
      .list(main, 'exercises', at)
      .flatMap((item, i) => readExercise(read, item, `${at}, Übung ${i + 1}`) ?? []),
    requirements: [],
    spaz: files.spaz === undefined ? null : readSpaz(read, files.spaz),
  };
  if (files.localClasses !== undefined) {
    catalog = { ...catalog, classes: mergeClasses(read, [...catalog.classes], files.localClasses) };
  }
  if (files.localRequirements !== undefined) {
    catalog = {
      ...catalog,
      requirements: readRequirements(read, files.localRequirements, catalog),
    };
  }
  if (files.localDetails !== undefined) {
    catalog = { ...catalog, details: readDetails(read, files.localDetails, catalog) };
  }
  const errors = [...read.errors, ...validateCatalog(catalog).map((issue) => issue.message)];
  return errors.length > 0 ? { ok: false, errors } : { ok: true, catalog };
}

/** The catalog valid in `year`: the one with the latest "gültig ab" not after that year. */
export function catalogForYear(catalogs: readonly Catalog[], year: number): Catalog | undefined {
  return [...catalogs]
    .filter((catalog) => catalog.validFrom <= year)
    .sort((a, b) => b.validFrom - a.validFrom)[0];
}
