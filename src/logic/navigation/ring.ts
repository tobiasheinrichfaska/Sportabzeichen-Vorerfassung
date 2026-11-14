// Wheels with two rings (Tobias 2026-11-09): the areas of a level and their pages. „Strahlen“: the
// pages as a second ring outside their area („die Submenüs als Strahlen weiter nach außen“);
// „Reibräder“: the pages on a wheel of their own above the areas, turned along by friction („dreht
// man unten das Hauptmenü, dreht das oben wie durch Reibung den Kreis der Submenüs“).
//
// One model for both: the level's pages in a row, page k at coordinate k, each area spanning its
// pages. A single position `t` (in pages) turns everything — page k stands at the pointer when
// t = k, an area when t is its middle. A wheel draws page k at angle versatz + richtung·(k − t)·w.

import type { Knoten } from './baum.ts';
import { winkelDiff, type Keil } from './rad.ts';

export interface Gruppe {
  readonly knoten: Knoten;
  /** Coordinate of its first page. */
  readonly start: number;
  readonly anzahl: number;
}

export interface Gliederung {
  readonly gruppen: readonly Gruppe[];
  readonly seiten: readonly { readonly knoten: Knoten; readonly gruppe: number }[];
}

/** Areas = the level's fields; their fields are the pages (a field without any is its own page). */
export function gliederung(ebene: Knoten): Gliederung {
  const gruppen: Gruppe[] = [];
  const seiten: { knoten: Knoten; gruppe: number }[] = [];
  for (const knoten of ebene.kinder ?? []) {
    const teile = knoten.kinder?.length ? knoten.kinder : [knoten];
    gruppen.push({ knoten, start: seiten.length, anzahl: teile.length });
    for (const teil of teile) seiten.push({ knoten: teil, gruppe: gruppen.length - 1 });
  }
  return { gruppen, seiten };
}

/** Angle one page takes. */
export function seitenBreite(gl: Gliederung): number {
  return (2 * Math.PI) / Math.max(1, gl.seiten.length);
}

/** Coordinate of an area's middle. */
export function gruppenMitte(gl: Gliederung, i: number): number {
  const g = gl.gruppen[i];
  return g ? g.start + (g.anzahl - 1) / 2 : 0;
}

/** How a wheel lies: where coordinate t stands (`versatz`, 0 = top) and which way it counts. */
export interface Lage {
  readonly versatz: number;
  readonly richtung: 1 | -1;
}

export const OBEN: Lage = { versatz: 0, richtung: 1 };

export function seitenKeil(gl: Gliederung, k: number, t: number, lage: Lage = OBEN): Keil {
  const w = seitenBreite(gl);
  return { mitte: lage.versatz + lage.richtung * (k - t) * w, breite: w };
}

export function gruppenKeil(gl: Gliederung, i: number, t: number, lage: Lage = OBEN): Keil {
  const w = seitenBreite(gl);
  const g = gl.gruppen[i];
  return {
    mitte: lage.versatz + lage.richtung * (gruppenMitte(gl, i) - t) * w,
    breite: (g?.anzahl ?? 0) * w,
  };
}

const rund = (k: number, n: number) => ((Math.round(k) % n) + n) % n;

/** The page at the pointer. */
export function seiteBei(gl: Gliederung, t: number): number {
  return rund(t, Math.max(1, gl.seiten.length));
}

/** The page under the angle `winkel` of a wheel lying as `lage`. */
export function seiteUnter(gl: Gliederung, winkel: number, t: number, lage: Lage = OBEN): number {
  const k = t + winkelDiff(lage.versatz, winkel) / (lage.richtung * seitenBreite(gl));
  return rund(k, Math.max(1, gl.seiten.length));
}

/** The area under the angle (areas are runs of pages, so: the area of the page under it). */
export function gruppeUnter(gl: Gliederung, winkel: number, t: number, lage: Lage = OBEN): number {
  return gl.seiten[seiteUnter(gl, winkel, t, lage)]?.gruppe ?? 0;
}

/** The position nearest to t at which area i stands at the pointer (the shorter way round). */
export function zuGruppe(gl: Gliederung, i: number, t: number): number {
  const n = Math.max(1, gl.seiten.length);
  const ziel = gruppenMitte(gl, i);
  // Whole turns added to the middle itself, so a settled wheel stands exactly there.
  return ziel + Math.round((t - ziel) / n) * n;
}

/** Where a wheel turned by the areas settles: the nearest area middle. */
export function einrastenGruppe(gl: Gliederung, t: number): number {
  let best = t;
  let abstand = Infinity;
  gl.gruppen.forEach((_, i) => {
    const kandidat = zuGruppe(gl, i, t);
    if (Math.abs(kandidat - t) < abstand) {
      abstand = Math.abs(kandidat - t);
      best = kandidat;
    }
  });
  return best;
}

/** Where a wheel turned by the pages settles: the nearest page. */
export function einrastenSeite(t: number): number {
  return Math.round(t);
}

/**
 * Turning the finger by `winkel` on a wheel lying as `lage` moves t by this much: the pages follow
 * the finger.
 */
export function tFuerDrehung(gl: Gliederung, winkel: number, lage: Lage = OBEN): number {
  return -winkel / (lage.richtung * seitenBreite(gl));
}

/** Where the two coupled wheels stand on a screen `breite` × `hoehe` (px). */
export interface Reibmasse {
  readonly rOben: number;
  readonly rUnten: number;
  /** Height of the contact. */
  readonly kontakt: number;
  readonly obenY: number;
  readonly untenY: number;
}

/**
 * The area wheel is small enough to stand whole on the screen, at its bottom (Tobias 2026-11-09:
 * „das untere Rad so klein, dass es ganz passt“); the page wheel above touches it and shows its
 * pages near the contact. Both turn by the same angle — an area below brings exactly its pages to
 * the contact (the gears in their hubs have equal teeth).
 */
export function reibmasse(breite: number, hoehe: number, rand = 10): Reibmasse {
  const rUnten = Math.max(90, Math.min(breite / 2 - rand, hoehe * 0.21));
  const untenY = hoehe - rUnten - rand;
  const kontakt = untenY - rUnten;
  const rOben = Math.max(150, Math.min(breite * 0.92, hoehe * 0.62));
  return { rOben, rUnten, kontakt, obenY: kontakt - rOben, untenY };
}

/**
 * Rotation (degrees, SVG) of a name written along a ray at `winkel` (Tobias: „Schriftausrichtung
 * nach außen“): it reads outward on the upper half and the right; in the lower left it would stand
 * on its head, so there it reads inward.
 */
export function strahlSchrift(winkel: number): number {
  const grad = (winkel * 180) / Math.PI - 90;
  const normal = ((((grad + 180) % 360) + 360) % 360) - 180;
  if (normal > 135) return normal - 180;
  if (normal < -135) return normal + 180;
  return normal;
}

/** Font size for a name written along a ray of this length (px). */
export function schriftFuerStrahl(name: string, laenge: number, grund = 16): number {
  return Math.min(grund, (laenge - 12) / (0.58 * Math.max(1, name.length)));
}

/**
 * A swipe on a page (Tobias 2026-11-10: „mit links- oder rechtswischen auf benachbarte Seiten in der
 * gleichen Kategorie wechseln“): +1 = the next page of the area (finger to the left), -1 = the one
 * before, 0 = no swipe (too short, too slow, or more up/down than sideways).
 */
export function wischen(dx: number, dy: number, ms: number): -1 | 0 | 1 {
  if (ms > 800 || Math.abs(dx) < 60 || Math.abs(dx) < 2 * Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
}

/** The page beside `seite` in its area, or none at the area's end (no wrap around). */
export function nachbar(bereich: Knoten, seite: Knoten, richtung: -1 | 1): Knoten | undefined {
  const seiten = bereich.kinder ?? [];
  const i = seiten.indexOf(seite);
  return i < 0 ? undefined : seiten[i + richtung];
}
