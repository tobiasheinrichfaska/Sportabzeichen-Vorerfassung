import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { Knoten, SeitenId } from '../../logic/navigation/baum';
import { abwurf, radWinkel, schwung, winkelDiff } from '../../logic/navigation/rad';
import {
  gliederung,
  gruppenMitte,
  seiteBei,
  tFuerDrehung,
  zuGruppe,
  type Gliederung,
  type Lage,
} from '../../logic/navigation/ring';

/** A step of the way: a level shown as rings, an area on it, or a page. */
export interface Stufe {
  readonly knoten: Knoten;
  readonly art: 'ring' | 'gruppe' | 'seite';
}

/**
 * The way through a tree shown as rings: a tap opens a page of the ring shown (its area joins the
 * way, so the way at the top reads „Start › Training › Heute“); a page with pages of its own is
 * shown as rings in turn. Back to an area shows its ring turned to it.
 */
export function useRingWeg(
  baum: Knoten,
  lage: ReturnType<typeof useLage>,
  onSchritt: () => void,
  onSeite: (seite: SeitenId) => void,
  /** A page (index in the top ring's row) open from the start — where the app was. */
  startSeite?: number,
) {
  const [weg, setWeg] = useState<readonly Stufe[]>(() => {
    const gl0 = gliederung(baum);
    const s = startSeite === undefined ? undefined : gl0.seiten[startSeite];
    if (!s || s.knoten.kinder) return [{ knoten: baum, art: 'ring' }];
    const g = gl0.gruppen[s.gruppe];
    return [
      { knoten: baum, art: 'ring' },
      ...(g && g.knoten !== s.knoten ? [{ knoten: g.knoten, art: 'gruppe' as const }] : []),
      { knoten: s.knoten, art: 'seite' },
    ];
  });
  // Where each ring was turned when a deeper one opened — back there it stands as it was.
  const tStapel = useRef<number[]>([]);
  let ringIndex = 0;
  weg.forEach((s, i) => {
    if (s.art === 'ring') ringIndex = i;
  });
  const ring = weg[ringIndex]?.knoten ?? baum;
  const gl = useMemo(() => gliederung(ring), [ring]);
  const hier = weg[weg.length - 1] ?? { knoten: baum, art: 'ring' as const };

  const oeffnen = (k: number) => {
    const s = gl.seiten[k];
    if (!s) return;
    const g = gl.gruppen[s.gruppe];
    const neu: Stufe[] = weg.slice(0, ringIndex + 1);
    if (g && g.knoten !== s.knoten) neu.push({ knoten: g.knoten, art: 'gruppe' });
    neu.push({ knoten: s.knoten, art: s.knoten.kinder ? 'ring' : 'seite' });
    if (s.knoten.kinder) {
      tStapel.current[ringIndex] = lage.jetzt.current;
      lage.setT(gruppenMitte(gliederung(s.knoten), 0));
    }
    setWeg(neu);
    onSchritt();
    if (s.knoten.seite) onSeite(s.knoten.seite);
  };

  /**
   * Back to step `i`; returns the page left behind when coming back from it to its own ring (it
   * shrinks into its piece).
   */
  const zurueckBis = (i: number): number | undefined => {
    const ziel = weg[i];
    if (!ziel || i >= weg.length - 1) return undefined;
    const bisRing = ziel.art === 'gruppe' ? i - 1 : i;
    const neuerRing = weg[bisRing]?.knoten ?? baum;
    const glNeu = gliederung(neuerRing);
    if (bisRing < ringIndex) lage.setT(tStapel.current[bisRing] ?? gruppenMitte(glNeu, 0));
    const seite =
      hier.art === 'seite' && bisRing === ringIndex
        ? glNeu.seiten.findIndex((s) => s.knoten === hier.knoten)
        : -1;
    setWeg(weg.slice(0, bisRing + 1));
    onSchritt();
    if (ziel.art === 'gruppe') {
      const gi = glNeu.gruppen.findIndex((g) => g.knoten === ziel.knoten);
      const steht = glNeu.seiten[seiteBei(glNeu, lage.jetzt.current)]?.gruppe === gi;
      if (gi >= 0 && !steht) lage.gleiten(zuGruppe(glNeu, gi, lage.jetzt.current));
    }
    return seite >= 0 ? seite : undefined;
  };

  /** Another page of the same area in place of the open one (a swipe); the wheel turns along. */
  const wechseln = (knoten: Knoten) => {
    const k = gl.seiten.findIndex((s) => s.knoten === knoten);
    if (k < 0 || hier.art !== 'seite') return;
    lage.setT(k);
    setWeg([...weg.slice(0, -1), { knoten, art: 'seite' }]);
    onSchritt();
    if (knoten.seite) onSeite(knoten.seite);
  };

  return { weg, hier, ring, ringIndex, gl, oeffnen, zurueckBis, wechseln };
}

/**
 * Position `t` (in pages) of the wheels with two rings: glide to a place, run on after a flick and
 * settle. One position turns both rings — and both coupled wheels.
 */
export function useLage(wenigBewegung: boolean, anfang = 0) {
  const [t, setTZustand] = useState(anfang);
  const jetzt = useRef(anfang);
  const lauf = useRef<number | undefined>(undefined);
  const setT = useCallback((wert: number) => {
    jetzt.current = wert;
    setTZustand(wert);
  }, []);
  const anhalten = useCallback(() => {
    if (lauf.current !== undefined) cancelAnimationFrame(lauf.current);
    lauf.current = undefined;
  }, []);
  useEffect(() => anhalten, [anhalten]);

  const gleiten = (ziel: number, ms = 200) => {
    anhalten();
    if (wenigBewegung) {
      setT(ziel);
      return;
    }
    const von = jetzt.current;
    let beginn: number | undefined;
    const schritt = (zeit: number) => {
      beginn ??= zeit;
      const anteil = Math.min(1, (zeit - beginn) / ms);
      setT(von + (ziel - von) * (1 - (1 - anteil) ** 3));
      lauf.current = anteil < 1 ? requestAnimationFrame(schritt) : undefined;
    };
    lauf.current = requestAnimationFrame(schritt);
  };

  /** Runs on with `v` (pages/ms, at most `vMax`), then settles where `einrasten` says. */
  const auslaufen = (v: number, vMax: number, einrasten: (t: number) => number) => {
    anhalten();
    if (wenigBewegung) {
      gleiten(einrasten(jetzt.current));
      return;
    }
    let tempo = Math.max(-vMax, Math.min(vMax, v));
    let zuletzt: number | undefined;
    const schritt = (zeit: number) => {
      const s = schwung(jetzt.current, tempo, zuletzt === undefined ? 16 : zeit - zuletzt);
      zuletzt = zeit;
      tempo = s.v;
      setT(s.dreh);
      if (tempo === 0) gleiten(einrasten(jetzt.current), 160);
      else lauf.current = requestAnimationFrame(schritt);
    };
    lauf.current = requestAnimationFrame(schritt);
  };

  return { t, jetzt, setT, anhalten, gleiten, auslaufen };
}

/** A change between page and wheel in progress: what `m` describes, how far (`p`, 0 … 1). */
export function useVerlauf<M>(wenigBewegung: boolean) {
  const [stand, setStand] = useState<{ m: M; p: number } | null>(null);
  const lauf = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      if (lauf.current !== undefined) cancelAnimationFrame(lauf.current);
    },
    [],
  );
  const starte = (m: M, ms: number, danach?: () => void) => {
    if (lauf.current !== undefined) cancelAnimationFrame(lauf.current);
    if (wenigBewegung) {
      setStand(null);
      danach?.();
      return;
    }
    setStand({ m, p: 0 });
    let beginn: number | undefined;
    const schritt = (zeit: number) => {
      beginn ??= zeit;
      const p = Math.min(1, (zeit - beginn) / ms);
      if (p < 1) {
        setStand({ m, p });
        lauf.current = requestAnimationFrame(schritt);
        return;
      }
      lauf.current = undefined;
      setStand(null);
      danach?.();
    };
    lauf.current = requestAnimationFrame(schritt);
  };
  return { stand, starte };
}

/** One wheel a finger may hold: centre, how it lies, where it settles, what a tap does. */
export interface Griffrad {
  readonly cx: number;
  readonly cy: number;
  readonly lage: Lage;
  readonly einrasten: (t: number) => number;
  readonly tippen: (winkel: number, abstand: number) => void;
  /** How far t moves for a turn of the finger by `winkel` (a gear behind turns at its ratio). */
  readonly dt?: (winkel: number) => number;
}

interface Griff {
  readonly id: number;
  readonly rad: Griffrad;
  letzter: number;
  readonly x: number;
  readonly y: number;
  readonly seit: number;
  weit: boolean;
  proben: { t: number; dreh: number }[];
}

/**
 * Pointer handling for wheels in one SVG drawn in pixels: `radAn` says which wheel a finger at
 * (x, y) holds. Turning moves t with the finger, a short touch is a tap.
 */
export function useGriff(
  gl: Gliederung,
  lage: ReturnType<typeof useLage>,
  radAn: (x: number, y: number) => Griffrad | undefined,
  gesperrt: boolean,
) {
  const griff = useRef<Griff | null>(null);
  const punkt = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  return {
    onPointerDown: (e: PointerEvent<SVGSVGElement>) => {
      if (gesperrt) return;
      const { x, y } = punkt(e);
      const rad = radAn(x, y);
      if (!rad) return;
      lage.anhalten();
      const g: Griff = {
        id: e.pointerId,
        rad,
        letzter: radWinkel(x, y, rad.cx, rad.cy),
        x,
        y,
        seit: e.timeStamp,
        weit: false,
        proben: [{ t: e.timeStamp, dreh: lage.jetzt.current }],
      };
      griff.current = g;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: PointerEvent<SVGSVGElement>) => {
      const g = griff.current;
      if (!g || g.id !== e.pointerId) return;
      const { x, y } = punkt(e);
      if (Math.hypot(x - g.x, y - g.y) > 8) g.weit = true;
      const winkel = radWinkel(x, y, g.rad.cx, g.rad.cy);
      // Near a centre the angle jumps: turn only with the finger well away from it.
      if (g.weit && Math.hypot(x - g.rad.cx, y - g.rad.cy) > 30) {
        const d = winkelDiff(g.letzter, winkel);
        lage.setT(lage.jetzt.current + (g.rad.dt ? g.rad.dt(d) : tFuerDrehung(gl, d, g.rad.lage)));
      }
      g.letzter = winkel;
      g.proben = [
        ...g.proben.filter((p) => e.timeStamp - p.t < 100),
        { t: e.timeStamp, dreh: lage.jetzt.current },
      ];
    },
    onPointerUp: (e: PointerEvent<SVGSVGElement>) => {
      const g = griff.current;
      griff.current = null;
      if (!g || g.id !== e.pointerId) return;
      const { x, y } = punkt(e);
      if (!g.weit && e.timeStamp - g.seit < 500) {
        g.rad.tippen(radWinkel(x, y, g.rad.cx, g.rad.cy), Math.hypot(x - g.rad.cx, y - g.rad.cy));
        return;
      }
      const v = abwurf(g.proben, e.timeStamp);
      const w = (2 * Math.PI) / Math.max(1, gl.seiten.length);
      // At most about half a turn of running on: a menu, not a game of chance.
      if (Math.abs(v) * w < 0.0008) lage.gleiten(g.rad.einrasten(lage.jetzt.current), 160);
      else lage.auslaufen(v, 0.015 / w, g.rad.einrasten);
    },
    onPointerCancel: () => {
      const g = griff.current;
      griff.current = null;
      if (g) lage.gleiten(g.rad.einrasten(lage.jetzt.current), 160);
    },
  };
}
