// The gear train behind the Reibräder (Tobias 2026-11-09: „lass uns die Zahnräder über mehrere
// Zahnräder im Hintergrund verbinden, verschieden groß, am Ende sind dann auch die Zahnräder unserer
// zwei Original-Räder unterschiedlich groß, aber am Ende muss die Übersetzung stimmen“).
//
// Lower hub gear → compound gear (two gears on one axle) → idler → upper hub gear. All gears have
// the same module (tooth size), so meshing gears stand pitch radius + pitch radius apart. The ratio
// of the train is (10/20)·(36/14)·(14/18) = 1 and three meshes reverse the turn: the upper wheel
// turns by the same angle the other way — exactly what the wheels' model does.
// Angles in radians, clockwise from the top, like the wheels.

import { radWinkel } from './rad.ts';

export interface Punkt {
  readonly x: number;
  readonly y: number;
}

export const ZAHNZAHLEN = {
  unten: 10,
  verbundKlein: 20,
  verbundGross: 36,
  zwischen: 14,
  oben: 18,
} as const;

export interface Getrieberad {
  readonly name: 'unten' | 'verbundKlein' | 'verbundGross' | 'zwischen' | 'oben';
  readonly x: number;
  readonly y: number;
  readonly zaehne: number;
  /** Pitch radius: module · teeth / 2. */
  readonly teilkreis: number;
}

export interface Zahnradzug {
  readonly modul: number;
  /** In drawing order from the back: big compound gear, idler, small compound gear, hub gears. */
  readonly raeder: readonly Getrieberad[];
}

const teilkreis = (modul: number, z: number) => (modul * z) / 2;

/** The two points at distance ra from a and rb from b (none if the circles do not meet). */
function schnitt(a: Punkt, ra: number, b: Punkt, rb: number): [Punkt, Punkt] | undefined {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  if (d === 0 || d > ra + rb || d < Math.abs(ra - rb)) return undefined;
  const l = (ra * ra - rb * rb + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, ra * ra - l * l));
  const mx = a.x + (l * (b.x - a.x)) / d;
  const my = a.y + (l * (b.y - a.y)) / d;
  const ox = (-h * (b.y - a.y)) / d;
  const oy = (h * (b.x - a.x)) / d;
  return [
    { x: mx + ox, y: my + oy },
    { x: mx - ox, y: my - oy },
  ];
}

/**
 * The train from the lower hub `unten` to the upper hub `oben`: the module makes the chain a little
 * longer than the way (`zickzack`), so it bends — compound gear to the right, idler to the left.
 */
export function zahnradzug(unten: Punkt, oben: Punkt, zickzack = 1.12): Zahnradzug {
  const z = ZAHNZAHLEN;
  const abstand = Math.hypot(oben.x - unten.x, oben.y - unten.y);
  const glieder = (z.unten + z.verbundKlein + z.verbundGross + 2 * z.zwischen + z.oben) / 2;
  const modul = (abstand * zickzack) / glieder;
  const d1 = teilkreis(modul, z.unten) + teilkreis(modul, z.verbundKlein);
  const d2 = teilkreis(modul, z.verbundGross) + teilkreis(modul, z.zwischen);
  const d3 = teilkreis(modul, z.zwischen) + teilkreis(modul, z.oben);
  const richtung = radWinkel(oben.x, oben.y, unten.x, unten.y);
  // Turn the first link away from the straight way until the rest of the chain closes.
  let verbund: Punkt = { x: unten.x, y: unten.y - d1 };
  let zwischen: Punkt | undefined;
  for (let grad = 5; grad <= 85 && !zwischen; grad += 1) {
    const w = richtung + (grad * Math.PI) / 180;
    verbund = { x: unten.x + d1 * Math.sin(w), y: unten.y - d1 * Math.cos(w) };
    const loesungen = schnitt(verbund, d2, oben, d3);
    if (loesungen) {
      // the one on the other side of the way: a zigzag, not a hook
      zwischen = loesungen[0].x < loesungen[1].x ? loesungen[0] : loesungen[1];
    }
  }
  const rad = (name: Getrieberad['name'], p: Punkt): Getrieberad => ({
    name,
    x: p.x,
    y: p.y,
    zaehne: z[name],
    teilkreis: teilkreis(modul, z[name]),
  });
  const z2 = zwischen ?? { x: (verbund.x + oben.x) / 2, y: (verbund.y + oben.y) / 2 };
  return {
    modul,
    raeder: [
      rad('verbundGross', verbund),
      rad('zwischen', z2),
      rad('verbundKlein', verbund),
      rad('unten', unten),
      rad('oben', oben),
    ],
  };
}

/** Tip radius of a gear: pitch radius plus a little less than one module. */
export function kopfkreis(rad: Getrieberad, modul: number): number {
  return rad.teilkreis + modul * 0.9;
}

/** How far a gear turns when the lower hub gear turns by 1 (the sign: its direction). */
export function verhaeltnis(name: Getrieberad['name']): number {
  const z = ZAHNZAHLEN;
  const verbund = -z.unten / z.verbundKlein;
  const zwischen = verbund * -(z.verbundGross / z.zwischen);
  const werte: Record<Getrieberad['name'], number> = {
    unten: 1,
    verbundKlein: verbund,
    verbundGross: verbund,
    zwischen,
    oben: zwischen * -(z.zwischen / z.oben),
  };
  return werte[name];
}

/**
 * The gear behind the wheels under the point (x, y) — the one drawn last if several overlap — or
 * none (Tobias 2026-11-09: „lass mich die Räder im Hintergrund auch drehen, dort wo sie erreichbar
 * sind“). Whether the wheels in front cover the point is for the caller to decide.
 */
export function hintergrundradAn(zug: Zahnradzug, x: number, y: number): Getrieberad | undefined {
  return zug.raeder
    .filter((r) => r.name !== 'unten' && r.name !== 'oben')
    .filter((r) => Math.hypot(x - r.x, y - r.y) <= kopfkreis(r, zug.modul))
    .at(-1);
}

/** Overall ratio upper / lower hub gear (−1 = same angle, other way). */
export function uebersetzung(): number {
  const z = ZAHNZAHLEN;
  return -(z.unten / z.verbundKlein) * -(z.verbundGross / z.zwischen) * -(z.zwischen / z.oben);
}

/**
 * Turn of `b` meshing with `a` turned by `drehungA`: their pitch circles roll on each other and a
 * tooth of one stands in a gap of the other where they meet.
 */
export function eingriff(a: Getrieberad, drehungA: number, b: Getrieberad): number {
  const richtung = radWinkel(b.x, b.y, a.x, a.y);
  const teilung = (2 * Math.PI * a.teilkreis) / a.zaehne;
  const bogenA = a.teilkreis * (richtung - drehungA);
  return richtung + Math.PI - (teilung / 2 - bogenA) / b.teilkreis;
}

/** The turn of every gear of the train (same order) when the lower hub gear is turned by `unten`. */
export function drehungen(zug: Zahnradzug, unten: number): number[] {
  const finde = (name: Getrieberad['name']) => zug.raeder.find((r) => r.name === name);
  const u = finde('unten');
  const vk = finde('verbundKlein');
  const vg = finde('verbundGross');
  const zw = finde('zwischen');
  const ob = finde('oben');
  if (!u || !vk || !vg || !zw || !ob) return zug.raeder.map(() => 0);
  const verbund = eingriff(u, unten, vk);
  const zwischen = eingriff(vg, verbund, zw);
  const oben = eingriff(zw, zwischen, ob);
  const werte: Record<Getrieberad['name'], number> = {
    unten,
    verbundKlein: verbund,
    verbundGross: verbund,
    zwischen,
    oben,
  };
  return zug.raeder.map((r) => werte[r.name]);
}
