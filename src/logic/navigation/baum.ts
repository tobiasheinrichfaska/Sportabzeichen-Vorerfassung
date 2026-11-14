// The app's pages as a tree for the Reibräder, taken over from TKD-Trainerbuch (German identifiers
// kept, so the navigation stays comparable with its origin). Planned with Tobias 2026-11-10: six
// areas of three pages, the most used one in the middle (it stands at the contact with its area);
// a page needed in several situations stands in several areas, back leads where one came from.

export type SeitenId =
  | 'gruppen'
  | 'kinder'
  | 'moeglich'
  | 'aufbau'
  | 'klassen'
  | 'stoppuhr'
  | 'erfassen'
  | 'zaehler'
  | 'metronom'
  | 'je-kind'
  | 'gruppe'
  | 'datei'
  | 'uebertragen'
  | 'pruefungstag';

export interface Seite {
  readonly name: string;
  /** Shown greyed with „Diese Seite ist geplant und kommt noch.“ */
  readonly geplant?: true;
}

export const SEITEN: Readonly<Record<SeitenId, Seite>> = {
  gruppen: { name: 'Gruppen' },
  kinder: { name: 'Kinder' },
  moeglich: { name: 'Möglich' },
  aufbau: { name: 'Aufbau' },
  klassen: { name: 'Klassen' },
  stoppuhr: { name: 'Stoppuhr' },
  erfassen: { name: 'Erfassen' },
  zaehler: { name: 'Zähler' },
  metronom: { name: 'Metronom' },
  'je-kind': { name: 'Je Kind' },
  gruppe: { name: 'Gruppe' },
  datei: { name: 'Datei' },
  // Tobias 2026-11-10: foreseen, „diese Funktionen können aber vorerst leer bleiben“
  uebertragen: { name: 'Übertragen', geplant: true },
  pruefungstag: { name: 'Prüfungstag', geplant: true },
};

/** A distributing page (`kinder`) or a page (`seite`). Ids are unique in the tree. */
export interface Knoten {
  readonly id: string;
  readonly name: string;
  readonly kinder?: readonly Knoten[];
  readonly seite?: SeitenId;
  readonly geplant?: true;
}

const verteiler = (id: string, name: string, kinder: readonly Knoten[]): Knoten => ({
  id,
  name,
  kinder,
  ...(kinder.every((k) => k.geplant) ? { geplant: true as const } : {}),
});
/** An area of pages; a page standing in several areas gets the area in its node id. */
const bereich = (id: string, name: string, seiten: readonly SeitenId[]) =>
  verteiler(
    id,
    name,
    seiten.map((seite) => ({
      id: `${id}/${seite}`,
      name: SEITEN[seite].name,
      seite,
      ...(SEITEN[seite].geplant ? { geplant: true as const } : {}),
    })),
  );

export type BereichId =
  'vorbereiten' | 'uebungen' | 'abnahme' | 'werkzeuge' | 'ergebnis' | 'geraete';

/** Clockwise from the top: before, at and after the exam, then the device. */
export const BAUM: Knoten = verteiler('start', 'Start', [
  bereich('vorbereiten', 'Vorbereiten', ['gruppen', 'kinder', 'moeglich']),
  bereich('uebungen', 'Übungen', ['aufbau', 'moeglich', 'klassen']),
  bereich('abnahme', 'Abnahme', ['stoppuhr', 'erfassen', 'zaehler']),
  bereich('werkzeuge', 'Werkzeuge', ['zaehler', 'stoppuhr', 'metronom']),
  bereich('ergebnis', 'Ergebnis', ['je-kind', 'gruppe', 'erfassen']),
  bereich('geraete', 'Geräte', ['datei', 'uebertragen', 'pruefungstag']),
]);

/** The area the wheels open on when the app does not remember a page. */
export const START_BEREICH: BereichId = 'vorbereiten';

/** The pages at the ends of a tree, in order (a page standing in several areas once each). */
export function seitenIn(baum: Knoten): SeitenId[] {
  if (baum.seite) return [baum.seite];
  return (baum.kinder ?? []).flatMap(seitenIn);
}

/** Every node that shows this page (one per area it stands in). */
export function knotenMitSeite(baum: Knoten, seite: SeitenId): Knoten[] {
  return [
    ...(baum.seite === seite ? [baum] : []),
    ...(baum.kinder ?? []).flatMap((k) => knotenMitSeite(k, seite)),
  ];
}

/** The nodes from the root to the node with this id (empty if absent). */
export function wegZu(baum: Knoten, id: string): Knoten[] {
  if (baum.id === id) return [baum];
  for (const kind of baum.kinder ?? []) {
    const weg = wegZu(kind, id);
    if (weg.length > 0) return [baum, ...weg];
  }
  return [];
}

/** The root child a node belongs to (its area), the root itself for the root. */
export function bereichVon(baum: Knoten, id: string): Knoten {
  return wegZu(baum, id)[1] ?? baum;
}

/** Every page's node id in a tree. */
export function seitenKnoten(baum: Knoten): Set<string> {
  const ids = new Set<string>();
  const gehe = (k: Knoten) => {
    if (k.seite) ids.add(k.id);
    k.kinder?.forEach(gehe);
  };
  gehe(baum);
  return ids;
}

/**
 * Where the app was (as in TKD-Trainerbuch: a home-screen app is sometimes restarted by the phone
 * and should open where it was): the open page's node id, null = the wheel.
 */
export interface Ort {
  readonly knoten: string | null;
  readonly zeit: number;
}

/** Back at the place within this time; later the wheel opens on the start area again. */
export const ORT_GILT_MS = 4 * 60 * 60 * 1000;

/** The stored place, strictly read; undefined when too old, foreign or the page no longer exists. */
export function ortLesen(
  raw: unknown,
  jetzt: number,
  knoten: ReadonlySet<string>,
): Ort | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
  const { knoten: k, zeit } = raw as Record<string, unknown>;
  if (typeof zeit !== 'number' || !Number.isFinite(zeit)) return undefined;
  if (jetzt - zeit > ORT_GILT_MS || zeit - jetzt > 60_000) return undefined;
  return { knoten: typeof k === 'string' && knoten.has(k) ? k : null, zeit };
}
