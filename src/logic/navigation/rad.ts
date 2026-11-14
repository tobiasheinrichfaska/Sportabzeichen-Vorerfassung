// Wheel geometry for the navigation (Tobias 2026-11-09: „eine Navi zum Drehen, wie ein Glücksrad“,
// grown into the Reibräder): angles, field pieces and their paths, unfolding, running on after a
// flick, gears. Angles in radians, 0 = top, clockwise positive; `dreh` = how far a wheel is turned.

const VOLL = 2 * Math.PI;

/** Angle of the point (x, y) seen from the centre (cx, cy): 0 at the top, clockwise, (-π, π]. */
export function radWinkel(x: number, y: number, cx: number, cy: number): number {
  return Math.atan2(x - cx, cy - y);
}

/** The shortest signed turn from `von` to `nach`, in (-π, π]. */
export function winkelDiff(von: number, nach: number): number {
  const d = (((nach - von) % VOLL) + VOLL) % VOLL;
  return d > Math.PI ? d - VOLL : d;
}

/** Width of one field. */
export function feldBreite(n: number): number {
  return VOLL / n;
}

/** Centre angle of field `i` when the wheel is turned by `dreh`. */
export function feldMitte(i: number, dreh: number, n: number): number {
  return i * feldBreite(n) + dreh;
}

/** One field as drawn: centre angle and width. */
export interface Keil {
  readonly mitte: number;
  readonly breite: number;
}

export function feldKeil(i: number, dreh: number, n: number): Keil {
  return { mitte: feldMitte(i, dreh, n), breite: feldBreite(n) };
}

/** Ease in and out (cubic) for the morphing between levels. */
export function sanft(p: number): number {
  const q = Math.min(1, Math.max(0, p));
  return q < 0.5 ? 4 * q ** 3 : 1 - (-2 * q + 2) ** 3 / 2;
}

/**
 * The `n` fields of a level unfolding out of the field `quelle` it was opened from (Tobias
 * 2026-11-09: „lass die Navigation fließend übergehen, eine Art morphen“): at p = 0 they share
 * `quelle` in order, at p = 1 they stand as the wheel turned by `dreh`. They stay side by side all
 * the way, the group turns the shorter way.
 */
export function entfalten(quelle: Keil, n: number, dreh: number, p: number): Keil[] {
  const breiteZiel = feldBreite(n);
  const mitteZiel = dreh + ((n - 1) / 2) * breiteZiel;
  const gruppe = quelle.mitte + winkelDiff(quelle.mitte, mitteZiel) * p;
  const breite = quelle.breite / n + (breiteZiel - quelle.breite / n) * p;
  return Array.from({ length: n }, (_, j) => ({
    mitte: gruppe + (j - (n - 1) / 2) * breite,
    breite,
  }));
}

const zahl = (x: number) => (Math.abs(x) < 5e-4 ? '0' : x.toFixed(3).replace(/\.?0+$/, ''));

/**
 * SVG path of a field: a ring piece between `innen` and `aussen`. Arcs are drawn in pieces of at
 * most a quarter turn — a half circle as one arc lets a renderer pick either side when rounding
 * puts the ends a hair past 180°, and a full ring (a field growing over the wheel) has no arc at all.
 */
export function keilPfad(k: Keil, aussen: number, innen: number): string {
  const breite = Math.min(k.breite, 2 * Math.PI);
  if (breite <= 0) return '';
  const stuecke = Math.max(1, Math.ceil(breite / (Math.PI / 2) - 1e-9));
  const schritt = breite / stuecke;
  const von = k.mitte - breite / 2;
  const xy = (winkel: number, r: number) =>
    `${zahl(r * Math.sin(winkel))} ${zahl(-r * Math.cos(winkel))}`;
  const teile = [`M${xy(von, aussen)}`];
  for (let s = 1; s <= stuecke; s += 1) {
    teile.push(`A${aussen} ${aussen} 0 0 1 ${xy(von + s * schritt, aussen)}`);
  }
  teile.push(`L${xy(von + breite, innen)}`);
  for (let s = stuecke - 1; s >= 0; s -= 1) {
    teile.push(`A${innen} ${innen} 0 0 0 ${xy(von + s * schritt, innen)}`);
  }
  return `${teile.join(' ')}Z`;
}

/**
 * SVG path of a gear around (0, 0) with `zaehne` teeth from `fuss` (root) to `kopf` (tip) radius,
 * one tooth centred at the top (Tobias 2026-11-09: „innen drin Zahnradzähne zeigen … jeweils gleich
 * viel Zähne“ — equal teeth, equal turn).
 */
export function zahnradPfad(zaehne: number, fuss: number, kopf: number): string {
  const teilung = (2 * Math.PI) / zaehne;
  const xy = (winkel: number, r: number) =>
    `${zahl(r * Math.sin(winkel))} ${zahl(-r * Math.cos(winkel))}`;
  const teile: string[] = [];
  for (let i = 0; i < zaehne; i += 1) {
    const mitte = i * teilung;
    // a tooth a little narrower at its tip than at its root, the gap as wide as the tooth
    teile.push(
      `${i === 0 ? 'M' : 'L'}${xy(mitte - teilung * 0.27, fuss)}`,
      `L${xy(mitte - teilung * 0.17, kopf)}`,
      `L${xy(mitte + teilung * 0.17, kopf)}`,
      `L${xy(mitte + teilung * 0.27, fuss)}`,
    );
  }
  return `${teile.join(' ')}Z`;
}

/**
 * Speed (rad/ms) at the moment the finger lets go, from the turns of the last `fenster` ms. A
 * finger that rested before letting go throws nothing (regression 2026-11-09: the wheel ran on with
 * the speed of moves made before the rest).
 */
export function abwurf(
  proben: readonly { readonly t: number; readonly dreh: number }[],
  los: number,
  fenster = 100,
): number {
  const frisch = proben.filter((p) => los - p.t <= fenster);
  const erste = frisch[0];
  const letzte = frisch[frisch.length - 1];
  if (!erste || !letzte || letzte.t - erste.t <= 0) return 0;
  return (letzte.dreh - erste.dreh) / (letzte.t - erste.t);
}

/**
 * One step of the wheel running on after a flick: speed `v` (rad/ms) falls by `reibung` per ms.
 * Returns the new turn and speed; speed 0 once below `stop`.
 */
export function schwung(
  dreh: number,
  v: number,
  ms: number,
  reibung = 0.004,
  stop = 0.0004,
): { dreh: number; v: number } {
  const weiter = v * Math.exp(-reibung * ms);
  return { dreh: dreh + (v - weiter) / reibung, v: Math.abs(weiter) < stop ? 0 : weiter };
}
