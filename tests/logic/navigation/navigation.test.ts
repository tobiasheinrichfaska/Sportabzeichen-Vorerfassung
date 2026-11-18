// Navigation (Reibräder, taken over from TKD-Trainerbuch): the app's pages as planned with Tobias
// 2026-11-10 — six areas of three; where the app was; and, copied with the code, the wheel
// geometry, the gear train and the names along the rays (tree-independent tests of the origin).
import {
  BAUM,
  ORT_GILT_MS,
  SEITEN,
  START_BEREICH,
  bereichVon,
  knotenMitSeite,
  ortLesen,
  seitenIn,
  seitenKnoten,
  wegZu,
  type Knoten,
  type SeitenId,
} from '../../../src/logic/navigation/baum';
import {
  abwurf,
  entfalten,
  feldBreite,
  feldKeil,
  keilPfad,
  radWinkel,
  sanft,
  schwung,
  winkelDiff,
  zahnradPfad,
  type Keil,
} from '../../../src/logic/navigation/rad';
import {
  ZAHNZAHLEN,
  drehungen,
  hintergrundradAn,
  kopfkreis,
  uebersetzung,
  verhaeltnis,
  zahnradzug,
  type Getrieberad,
} from '../../../src/logic/navigation/getriebe';
import {
  OBEN,
  einrastenGruppe,
  einrastenSeite,
  gliederung,
  gruppeUnter,
  gruppenKeil,
  gruppenMitte,
  nachbar,
  reibmasse,
  schriftFuerStrahl,
  seiteUnter,
  seitenBreite,
  seitenKeil,
  strahlSchrift,
  tFuerDrehung,
  wischen,
  zuGruppe,
  type Lage,
} from '../../../src/logic/navigation/ring';

const alleKnoten = (k: Knoten): Knoten[] => [k, ...(k.kinder ?? []).flatMap(alleKnoten)];
const bereich = (id: string): Knoten => {
  const k = BAUM.kinder?.find((b) => b.id === id);
  if (!k) throw new Error(`kein Bereich ${id}`);
  return k;
};
const namen = (k: Knoten) => (k.kinder ?? []).map((s) => s.name);

describe('Seitenbaum (Tobias 2026-11-10: „So bauen“)', () => {
  it('six areas of three pages in the agreed order', () => {
    expect(BAUM.kinder?.map((b) => [b.name, namen(b)])).toEqual([
      ['Vorbereiten', ['Gruppen', 'Kinder', 'Planen']],
      ['Übungen', ['Aufbau', 'Möglich', 'Klassen']],
      ['Abnahme', ['Erfassen', 'Durchgang', 'Zuordnen']],
      ['Werkzeuge', ['Zähler', 'Stoppuhr', 'Metronom']],
      ['Ergebnis', ['Je Kind', 'Gruppe', 'Erfassen']],
      ['Geräte', ['Datei', 'Übertragen', 'Prüfungstag']],
    ]);
  });

  it('every page stands in the tree, a page twice only in different areas, ids unique', () => {
    const ids = alleKnoten(BAUM).map((k) => k.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(seitenIn(BAUM))).toEqual(new Set(Object.keys(SEITEN)));
    for (const seite of Object.keys(SEITEN) as SeitenId[]) {
      const bereiche = knotenMitSeite(BAUM, seite).map((k) => bereichVon(BAUM, k.id).id);
      expect(new Set(bereiche).size, seite).toBe(bereiche.length);
    }
  });

  it('a name means one page: the same name is the same page', () => {
    const seiten = alleKnoten(BAUM).filter((k) => k.seite);
    for (const a of seiten) {
      for (const b of seiten) if (a.name === b.name) expect(a.seite).toBe(b.seite);
    }
  });

  it('transfer and exam day are foreseen but planned (Tobias: „vorerst leer“)', () => {
    expect(SEITEN.uebertragen.geplant).toBe(true);
    expect(SEITEN.pruefungstag.geplant).toBe(true);
    expect(knotenMitSeite(BAUM, 'uebertragen')[0]?.geplant).toBe(true);
    // an area is planned only when everything below it is
    expect(bereich('geraete').geplant).toBeUndefined();
  });

  it('the wheels open on „Vorbereiten“; way and area of a page', () => {
    expect(bereich(START_BEREICH).name).toBe('Vorbereiten');
    expect(wegZu(BAUM, 'abnahme/erfassen').map((k) => k.name)).toEqual([
      'Start',
      'Abnahme',
      'Erfassen',
    ]);
    expect(bereichVon(BAUM, 'ergebnis/erfassen').name).toBe('Ergebnis');
    expect(wegZu(BAUM, 'nirgends')).toEqual([]);
  });

  it('the coupled wheels: 18 pages, each area as wide as its pages above', () => {
    const gl = gliederung(BAUM);
    expect(gl.seiten).toHaveLength(18);
    expect(gl.gruppen.map((g) => [g.start, g.anzahl])).toEqual([
      [0, 3],
      [3, 3],
      [6, 3],
      [9, 3],
      [12, 3],
      [15, 3],
    ]);
    expect(gruppenMitte(gl, 2)).toBe(7);
    // since 2026-11-18 the run is the most used page at the station („Erfassen“ also stands in
    // „Ergebnis“)
    expect(gl.seiten[7]?.knoten.name).toBe('Durchgang');
  });
});

describe('where the app was', () => {
  const knoten = seitenKnoten(BAUM);
  const JETZT = 1_770_000_000_000;

  it('knows every page of the tree by its node id, a page in two areas twice', () => {
    expect(knoten.has('abnahme/erfassen')).toBe(true);
    expect(knoten.has('ergebnis/erfassen')).toBe(true);
    expect(knoten.has('abnahme')).toBe(false);
    expect(knoten.size).toBe(18);
  });

  it('gives back the open page or the wheel while fresh', () => {
    expect(ortLesen({ knoten: 'abnahme/erfassen', zeit: JETZT - 60_000 }, JETZT, knoten)).toEqual({
      knoten: 'abnahme/erfassen',
      zeit: JETZT - 60_000,
    });
    expect(ortLesen({ knoten: null, zeit: JETZT }, JETZT, knoten)).toEqual({
      knoten: null,
      zeit: JETZT,
    });
  });

  it('later or from the future nothing; a page that is gone means the wheel', () => {
    expect(
      ortLesen({ knoten: null, zeit: JETZT - ORT_GILT_MS - 1 }, JETZT, knoten),
    ).toBeUndefined();
    expect(ortLesen({ knoten: null, zeit: JETZT + 120_000 }, JETZT, knoten)).toBeUndefined();
    expect(ortLesen({ knoten: 'weg/seite', zeit: JETZT }, JETZT, knoten)).toEqual({
      knoten: null,
      zeit: JETZT,
    });
    expect(ortLesen({ zeit: 'gestern' }, JETZT, knoten)).toBeUndefined();
    expect(ortLesen(null, JETZT, knoten)).toBeUndefined();
    expect(ortLesen([], JETZT, knoten)).toBeUndefined();
  });
});

describe('swiping between the pages of an area', () => {
  it('a quick sideways swipe goes on; short, slow or up/down ones do not', () => {
    expect(wischen(-120, 10, 250)).toBe(1);
    expect(wischen(120, -20, 250)).toBe(-1);
    expect(wischen(-40, 0, 200)).toBe(0);
    expect(wischen(-120, 0, 900)).toBe(0);
    expect(wischen(-100, 70, 200)).toBe(0);
  });

  it('the page beside in the same area, none past its ends', () => {
    const abnahme = bereich('abnahme');
    const [stoppuhr, erfassen, zaehler] = abnahme.kinder ?? [];
    if (!stoppuhr || !erfassen || !zaehler) throw new Error('Abnahme hat nicht drei Seiten');
    expect(nachbar(abnahme, erfassen, 1)).toBe(zaehler);
    expect(nachbar(abnahme, erfassen, -1)).toBe(stoppuhr);
    expect(nachbar(abnahme, zaehler, 1)).toBeUndefined();
    expect(nachbar(abnahme, stoppuhr, -1)).toBeUndefined();
  });
});

describe('Reibräder', () => {
  const gl = gliederung(BAUM);
  const nah = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-9);

  it('what lies under an angle, on a wheel at the top and on the page wheel', () => {
    const w = seitenBreite(gl);
    expect(seiteUnter(gl, 0, 7)).toBe(7);
    expect(seiteUnter(gl, w * 1.2, 7)).toBe(8);
    expect(gruppeUnter(gl, -w * 2, 7)).toBe(1);
    const oben: Lage = { versatz: Math.PI, richtung: -1 };
    expect(seiteUnter(gl, Math.PI, 7, oben)).toBe(7);
    expect(seiteUnter(gl, Math.PI + w, 7, oben)).toBe(6);
  });

  it('friction: turning the area wheel turns the page wheel the other way, same angle', () => {
    const oben: Lage = { versatz: Math.PI, richtung: -1 };
    const dt = tFuerDrehung(gl, 0.3, OBEN);
    nah(gruppenKeil(gl, 2, 6 + dt).mitte - gruppenKeil(gl, 2, 6).mitte, 0.3);
    nah(seitenKeil(gl, 7, 6 + dt, oben).mitte - seitenKeil(gl, 7, 6, oben).mitte, -0.3);
  });

  it('settles on an area middle or a page, the shorter way round', () => {
    expect(einrastenGruppe(gl, 5.2)).toBe(4);
    expect(einrastenGruppe(gl, 5.6)).toBe(7);
    expect(einrastenGruppe(gl, -1.4)).toBe(-2); // Geräte (16) the short way round
    expect(einrastenSeite(5.6)).toBe(6);
    expect(zuGruppe(gl, 5, 1)).toBe(-2);
  });

  it('the area wheel stands whole on the screen, touching the page wheel', () => {
    for (const [b, h] of [
      [390, 792],
      [360, 640],
      [820, 1100],
    ] as const) {
      const m = reibmasse(b, h);
      expect(m.rUnten).toBeLessThan(m.rOben);
      expect(2 * m.rUnten).toBeLessThanOrEqual(b);
      expect(m.untenY + m.rUnten).toBeLessThanOrEqual(h);
      expect(m.obenY + m.rOben).toBeCloseTo(m.kontakt, 9);
      expect(m.untenY - m.rUnten).toBeCloseTo(m.kontakt, 9);
    }
  });

  it('every page name fits its ray at a readable size on a small phone', () => {
    const m = reibmasse(360, 640);
    for (const s of gl.seiten) {
      expect(schriftFuerStrahl(s.knoten.name, m.rOben * 0.58, 16), s.knoten.name).toBeGreaterThan(
        10,
      );
    }
  });
  it('a gear: every tooth four corners, root and tip radius, one tooth at the top', () => {
    const pfad = zahnradPfad(12, 30, 38);
    expect(pfad.match(/[ML]/g)).toHaveLength(48);
    expect(pfad.endsWith('Z')).toBe(true);
    const punkte = [...pfad.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) =>
      Math.hypot(Number(m[1]), Number(m[2])),
    );
    for (const r of punkte) expect([30, 38].some((x) => Math.abs(r - x) < 0.01)).toBe(true);
    // the tip of the first tooth straddles the top (x of its two tip corners opposite)
    const [, spitzeLinks, spitzeRechts] = [...pfad.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(
      (m) => Number(m[1]),
    );
    expect(spitzeLinks).toBeCloseTo(-(spitzeRechts ?? 0), 3);
  });

  it('gear train: the ratio is right — same angle, the other way (Tobias: „die Übersetzung muss stimmen“)', () => {
    expect(uebersetzung()).toBeCloseTo(-1, 12);
    // the hub gears differ in size
    expect(ZAHNZAHLEN.unten).not.toBe(ZAHNZAHLEN.oben);
    const zug = zahnradzug({ x: 195, y: 616 }, { x: 195, y: 91 });
    const name = (n: string) => zug.raeder.findIndex((r) => r.name === n);
    for (const eingang of [0, 0.3, -1.7, 5]) {
      const d = drehungen(zug, eingang);
      const d0 = drehungen(zug, 0);
      // the upper hub gear turns by exactly the lower one's angle, the other way
      nah((d[name('oben')] ?? 0) - (d0[name('oben')] ?? 0), -eingang);
      // the compound gear's two wheels turn together
      expect(d[name('verbundKlein')]).toBe(d[name('verbundGross')]);
    }
  });

  it('gear train: each gear turns by its ratio to the lower hub gear (turning one turns all)', () => {
    const zug = zahnradzug({ x: 195, y: 616 }, { x: 195, y: 91 });
    const d0 = drehungen(zug, 0);
    const d1 = drehungen(zug, 0.5);
    zug.raeder.forEach((rad, i) => {
      nah((d1[i] ?? 0) - (d0[i] ?? 0), 0.5 * verhaeltnis(rad.name));
    });
    expect(verhaeltnis('oben')).toBeCloseTo(uebersetzung(), 12);
    expect(verhaeltnis('verbundKlein')).toBe(-0.5);
  });

  it('gear train: the gear behind under a point, the one drawn last on top', () => {
    const zug = zahnradzug({ x: 195, y: 616 }, { x: 195, y: 91 });
    const rad = (n: string) => zug.raeder.find((r) => r.name === n) as Getrieberad;
    const zw = rad('zwischen');
    expect(hintergrundradAn(zug, zw.x, zw.y)?.name).toBe('zwischen');
    // on the compound axle the small gear lies in front of the big one
    const vk = rad('verbundKlein');
    expect(hintergrundradAn(zug, vk.x, vk.y)?.name).toBe('verbundKlein');
    const aussen = kopfkreis(rad('verbundGross'), zug.modul) - 1;
    expect(hintergrundradAn(zug, vk.x + aussen, vk.y)?.name).toBe('verbundGross');
    // the hub gears are no background gears (behind the lower hub lies the big compound gear)
    expect(hintergrundradAn(zug, 195, 616)?.name).toBe('verbundGross');
    expect(hintergrundradAn(zug, -5000, -5000)).toBeUndefined();
  });

  it('gear train: meshing gears stand pitch radius + pitch radius apart, the chain closes', () => {
    const unten = { x: 195, y: 616 };
    const oben = { x: 195, y: 91 };
    const zug = zahnradzug(unten, oben);
    const r = (n: string) => zug.raeder.find((x) => x.name === n) as Getrieberad;
    const abstand = (a: Getrieberad, b: Getrieberad) => Math.hypot(a.x - b.x, a.y - b.y);
    const paare = [
      ['unten', 'verbundKlein'],
      ['verbundGross', 'zwischen'],
      ['zwischen', 'oben'],
    ] as const;
    for (const [a, b] of paare) {
      expect(abstand(r(a), r(b))).toBeCloseTo(r(a).teilkreis + r(b).teilkreis, 6);
    }
    expect([r('unten').x, r('unten').y]).toEqual([195, 616]);
    expect([r('oben').x, r('oben').y]).toEqual([195, 91]);
    // one tooth size for all: pitch radius / teeth is the same
    for (const rad of zug.raeder) expect(rad.teilkreis / rad.zaehne).toBeCloseTo(zug.modul / 2, 9);
    // zigzag: compound gear to the right of the way, idler to the left
    expect(r('verbundKlein').x).toBeGreaterThan(195);
    expect(r('zwischen').x).toBeLessThan(r('verbundKlein').x);
  });

  it('gear train: where two gears meet, a tooth of one stands in a gap of the other', () => {
    const zug = zahnradzug({ x: 195, y: 616 }, { x: 195, y: 91 });
    const i = (n: string) => zug.raeder.findIndex((x) => x.name === n);
    for (const eingang of [0, 0.41, 2.2]) {
      const d = drehungen(zug, eingang);
      for (const [a, b] of [
        ['unten', 'verbundKlein'],
        ['verbundGross', 'zwischen'],
        ['zwischen', 'oben'],
      ] as const) {
        const ra = zug.raeder[i(a)] as Getrieberad;
        const rb = zug.raeder[i(b)] as Getrieberad;
        const richtung = Math.atan2(rb.x - ra.x, ra.y - rb.y);
        const teilung = (2 * Math.PI * ra.teilkreis) / ra.zaehne;
        const sa = ra.teilkreis * (richtung - (d[i(a)] ?? 0));
        const sb = rb.teilkreis * (richtung + Math.PI - (d[i(b)] ?? 0));
        const rest = ((((sa + sb - teilung / 2) % teilung) + teilung) % teilung) / teilung;
        expect(Math.min(rest, 1 - rest)).toBeLessThan(1e-6);
      }
    }
  });

  it('names along a ray read outward, never on their head', () => {
    expect(strahlSchrift(0)).toBe(-90); // top: reads upward
    expect(strahlSchrift(Math.PI / 2)).toBe(0); // right: reads to the right
    expect(strahlSchrift(Math.PI)).toBe(90); // bottom: reads downward
    expect(strahlSchrift(-0.2)).toBeCloseTo(-101.46, 1); // just left of the top: still upward
    // lower left: turned round to read inward
    expect(strahlSchrift((5 * Math.PI) / 4 + 0.1)).toBeCloseTo(-39.27, 1);
    for (let a = 0; a < 2 * Math.PI; a += 0.05) {
      expect(Math.abs(strahlSchrift(a))).toBeLessThanOrEqual(135);
    }
    expect(schriftFuerStrahl('Veranstaltungen', 150) * 0.58 * 15).toBeLessThanOrEqual(138);
    expect(schriftFuerStrahl('QR', 150)).toBe(16);
  });
});

describe('Radgeometrie', () => {
  const nah = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-9);

  it('angles: 0 at the top, clockwise', () => {
    nah(radWinkel(0, -10, 0, 0), 0);
    nah(radWinkel(10, 0, 0, 0), Math.PI / 2);
    nah(radWinkel(-10, 0, 0, 0), -Math.PI / 2);
    nah(Math.abs(radWinkel(0, 10, 0, 0)), Math.PI);
  });

  it('shortest turn across the top', () => {
    nah(winkelDiff(0.1, -0.1), -0.2);
    nah(winkelDiff(3, -3), 2 * Math.PI - 6);
    nah(winkelDiff(0, 7 * Math.PI), Math.PI);
  });

  it('a flick runs on and stops', () => {
    let lauf = { dreh: 0, v: 0.01 };
    let schritte = 0;
    while (lauf.v !== 0 && schritte < 1000) {
      lauf = schwung(lauf.dreh, lauf.v, 16);
      schritte += 1;
    }
    expect(lauf.v).toBe(0);
    expect(lauf.dreh).toBeGreaterThan(2);
    expect(lauf.dreh).toBeLessThan(0.01 / 0.004);
    expect(schwung(1, 0, 16)).toEqual({ dreh: 1, v: 0 });
  });

  it('morph: the fields unfold out of the field opened, side by side, into the wheel', () => {
    const quelle = feldKeil(5, 0.3, 8);
    const start = entfalten(quelle, 3, 0, 0);
    // p = 0: three equal pieces that fill the source field exactly.
    nah(start[0]?.mitte ?? 0, quelle.mitte - quelle.breite / 3);
    nah(start[2]?.mitte ?? 0, quelle.mitte + quelle.breite / 3);
    nah(
      start.reduce((s, k) => s + k.breite, 0),
      quelle.breite,
    );
    // p = 1: the wheel turned by `dreh`.
    entfalten(quelle, 3, 0.2, 1).forEach((k, j) => {
      nah(winkelDiff(k.mitte, feldKeil(j, 0.2, 3).mitte), 0);
      nah(k.breite, feldBreite(3));
    });
    // In between they touch and keep their order.
    const mitten = entfalten(quelle, 4, 0, 0.5);
    for (let j = 1; j < 4; j += 1) {
      const a = mitten[j - 1] as Keil;
      const b = mitten[j] as Keil;
      nah(b.mitte - a.mitte, (a.breite + b.breite) / 2);
    }
    // A page opening: one field growing over the whole ring around its own centre.
    const voll = entfalten(quelle, 1, quelle.mitte, 1)[0] as Keil;
    nah(winkelDiff(voll.mitte, quelle.mitte), 0);
    nah(voll.breite, 2 * Math.PI);
    expect(sanft(0)).toBe(0);
    expect(sanft(1)).toBe(1);
    expect(sanft(0.5)).toBe(0.5);
    expect(sanft(2)).toBe(1);
  });

  it('a field path never draws an arc of half a turn or more (regression: curves flipping)', () => {
    const boegen = (pfad: string) => pfad.match(/A[^A-Z]+/g) ?? [];
    for (const breite of [0.3, Math.PI / 2, Math.PI, Math.PI + 1e-12, 4, 2 * Math.PI]) {
      const pfad = keilPfad({ mitte: 1.1, breite }, 96, 36);
      // every arc: small-arc flag 0, at most a quarter turn
      for (const bogen of boegen(pfad)) expect(bogen).toMatch(/^A\d+ \d+ 0 0 [01] /);
      const stuecke = Math.ceil(breite / (Math.PI / 2) - 1e-9);
      expect(boegen(pfad)).toHaveLength(2 * stuecke);
    }
    // A half circle (wheel with two fields) is drawn as two quarter arcs per side.
    expect(boegen(keilPfad({ mitte: 0, breite: Math.PI }, 96, 36))).toHaveLength(4);
    expect(keilPfad({ mitte: 0, breite: 0 }, 96, 36)).toBe('');
    // Ends where it should: outer start at the left edge of the field.
    expect(
      keilPfad({ mitte: 0, breite: Math.PI / 2 }, 100, 40).startsWith('M-70.711 -70.711'),
    ).toBe(true);
  });

  it('letting go after a rest throws nothing (regression: the wheel ran on)', () => {
    // A quarter turn in 480 ms, the last sample at 480 ms.
    const proben = Array.from({ length: 13 }, (_, i) => ({ t: i * 40, dreh: (i / 12) * 1.5708 }));
    const imZug = proben.filter((p) => p.t >= 400);
    expect(abwurf(imZug, 490)).toBeGreaterThan(0.003);
    // The finger rested 150 ms, then let go: no speed.
    expect(abwurf(imZug, 630)).toBe(0);
    // The old way (moves counted whenever they were) would have thrown it on.
    expect(abwurf(imZug, 630, Infinity)).toBeGreaterThan(0.003);
    expect(abwurf([], 10)).toBe(0);
    expect(abwurf([{ t: 5, dreh: 1 }], 10)).toBe(0);
  });
});
