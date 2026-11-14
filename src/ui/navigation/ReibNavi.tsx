import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useZurueckGeste } from './useZurueckGeste';
import { hintergrundradAn, verhaeltnis, zahnradzug } from '../../logic/navigation/getriebe';
import { entfalten, sanft } from '../../logic/navigation/rad';
import {
  OBEN,
  reibmasse,
  gliederung,
  gruppenMitte,
  einrastenSeite,
  gruppeUnter,
  gruppenKeil,
  seiteBei,
  seiteUnter,
  seitenBreite,
  seitenKeil,
  zuGruppe,
  nachbar,
  wischen,
  type Lage,
} from '../../logic/navigation/ring';
import {
  OHNE_KASTEN,
  farbeIn,
  flaechen,
  getriebeFarben,
  useDunkel,
  useWenigBewegung,
  type Flaechen,
} from './farben';
import { Nabenraeder, RaederwerkHinten } from './Getriebe';
import { useGriff, useLage, useRingWeg, useVerlauf } from './lage';
import { MiniRad } from './MiniRad';
import type { Knoten, SeitenId } from '../../logic/navigation/baum';
import { Ring, Ringgeist, type Ringstueck } from './Ring';
import { Einblenden, Platzhalter, Rahmen } from './Rahmen';

const AUF_MS = 260;
const ZU_MS = 280;
/** The page wheel touches the area wheel with its bottom and turns the other way. */
const SEITENRAD: Lage = { versatz: Math.PI, richtung: -1 };

type Uebergang = { readonly art: 'auf' | 'zu'; readonly k: number };

export interface ReibNaviProps {
  readonly baum: Knoten;
  /** The area the wheels open on. */
  readonly startBereich: string;
  /** Node id of a page open from the start (where the app was); wins over `startBereich`. */
  readonly startKnoten?: string | undefined;
  /** The open page changed (node id, null = the wheel): kept so a restarted app opens there. */
  readonly onOrt?: ((knoten: string | null) => void) | undefined;
  /** The real page for this page id, or none (then the placeholder shows). */
  readonly seiteZeigen: (seite: SeitenId) => ReactNode | undefined;
  /** A short line in the top bar. */
  readonly status?: string | undefined;
  /** When given, the status line is a button. */
  readonly onStatus?: (() => void) | undefined;
}

/**
 * Two wheels coupled by friction, as in TKD-Trainerbuch: below the areas on a smaller wheel, above
 * all pages; they touch low on the screen. Turning the lower wheel brings the area's pages to the
 * contact; the upper wheel then turns page by page (and the lower one along). A tap on a page opens
 * it, on an area brings it to the contact. The middles have no function here (as in the
 * Arbeitszeitplaner): the hub gears stay in sight.
 */
export function ReibNavi({
  baum,
  startBereich,
  startKnoten,
  onOrt,
  seiteZeigen,
  status,
  onStatus,
}: ReibNaviProps) {
  const wenigBewegung = useWenigBewegung();
  const dunkel = useDunkel();
  const f = flaechen(dunkel);
  const getriebe = getriebeFarben(dunkel, f.grund);
  const [startSeite] = useState(() => {
    const k = gliederung(baum).seiten.findIndex((s) => s.knoten.id === startKnoten);
    return k >= 0 ? k : undefined;
  });
  // The start area stands at the pointer (the contact) on the start.
  const lage = useLage(
    wenigBewegung,
    (() => {
      if (startSeite !== undefined) return startSeite;
      const start = gliederung(baum);
      const i = start.gruppen.findIndex((g) => g.knoten.id === startBereich);
      return einrastenSeite(gruppenMitte(start, Math.max(0, i)));
    })(),
  );
  const { stand, starte } = useVerlauf<Uebergang>(wenigBewegung);
  const { weg, hier, ringIndex, gl, oeffnen, zurueckBis, wechseln } = useRingWeg(
    baum,
    lage,
    () => undefined,
    () => undefined,
    startSeite,
  );
  const offen = hier.art === 'seite' ? hier.knoten.id : null;
  useEffect(() => onOrt?.(offen), [offen, onOrt]);
  const flaeche = useRef<HTMLDivElement>(null);
  const [groesse, setGroesse] = useState({ b: 390, h: 700 });
  useEffect(() => {
    const el = flaeche.current;
    if (!el) return;
    const beobachter = new ResizeObserver(([eintrag]) => {
      if (eintrag) setGroesse({ b: eintrag.contentRect.width, h: eintrag.contentRect.height });
    });
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, [hier.art]);

  const { rOben, rUnten, kontakt, obenY, untenY } = reibmasse(groesse.b, groesse.h);
  const innenOben = rOben * 0.42;
  const innenUnten = rUnten * 0.42;
  const cx = groesse.b / 2;
  // The gear train from hub to hub (its geometry only changes with the screen).
  const zug = useMemo(
    () => zahnradzug({ x: cx, y: untenY }, { x: cx, y: obenY }),
    [cx, untenY, obenY],
  );
  const t = lage.t;
  const seiteJetzt = seiteBei(gl, t);

  const seiteOeffnen = (k: number) => {
    if (stand || !gl.seiten[k]) return;
    lage.anhalten();
    if (gl.seiten[k]?.knoten.kinder) {
      oeffnen(k);
      return;
    }
    // The page turns to the contact while it grows — back from it, it stands there.
    const n = gl.seiten.length;
    lage.gleiten(k + Math.round((lage.jetzt.current - k) / n) * n, AUF_MS);
    starte({ art: 'auf', k }, AUF_MS, () => oeffnen(k));
  };
  const zurueck = (i: number) => {
    if (stand) return;
    const k = zurueckBis(i);
    if (k !== undefined) starte({ art: 'zu', k }, ZU_MS);
  };
  const eineEbene = () => zurueck(weg.length - 2);
  useZurueckGeste(offen, eineEbene);

  const griff = useGriff(
    gl,
    lage,
    (x, y) => {
      // Gears behind, where neither wheel covers them, turn too.
      const frei = Math.hypot(x - cx, y - untenY) > rUnten && Math.hypot(x - cx, y - obenY) > rOben;
      const hinten = frei ? hintergrundradAn(zug, x, y) : undefined;
      if (hinten) {
        const w = seitenBreite(gl);
        return {
          cx: hinten.x,
          cy: hinten.y,
          lage: OBEN,
          // its turn → the lower hub gear's turn (−t·w) → t
          dt: (winkel: number) => -winkel / (verhaeltnis(hinten.name) * w),
          einrasten: einrastenSeite,
          tippen: () => undefined,
        };
      }
      return y < kontakt
        ? {
            cx,
            cy: obenY,
            lage: SEITENRAD,
            einrasten: einrastenSeite,
            tippen: (winkel, abstand) => {
              if (abstand >= innenOben && abstand <= rOben) {
                seiteOeffnen(seiteUnter(gl, winkel, lage.jetzt.current, SEITENRAD));
              }
            },
          }
        : {
            cx,
            cy: untenY,
            lage: OBEN,
            // Both wheels settle on every page of the upper one, not only on the areas' middles.
            einrasten: einrastenSeite,
            tippen: (winkel, abstand) => {
              if (abstand >= innenUnten && abstand <= rUnten) {
                const i = gruppeUnter(gl, winkel, lage.jetzt.current);
                lage.gleiten(einrastenSeite(zuGruppe(gl, i, lage.jetzt.current)));
              }
            },
          };
    },
    !!stand,
  );

  if (hier.art === 'seite') {
    const ebene = weg[ringIndex]?.knoten ?? baum;
    const bereich = weg[ringIndex + 1]?.knoten ?? hier.knoten;
    const echt = hier.knoten.seite ? seiteZeigen(hier.knoten.seite) : undefined;
    const vorige = nachbar(bereich, hier.knoten, -1);
    const naechste = nachbar(bereich, hier.knoten, 1);
    return (
      <Rahmen weg={weg.map((s) => s.knoten)} onSprung={zurueck} status={status} onStatus={onStatus}>
        <Wischflaeche
          key={hier.knoten.id}
          onWisch={(r) => {
            const ziel = r === 1 ? naechste : vorige;
            if (ziel) wechseln(ziel);
          }}
        >
          <Nachbarn vorige={vorige} naechste={naechste} onWechseln={wechseln} f={f} />
          <div style={{ flex: 1, minHeight: 0 }}>
            <Einblenden>
              {echt ? (
                // The real page scrolls inside; room at the bottom for the small wheel. Its colours
                // follow the app's own light/dark scheme (styles.css).
                <div
                  data-seitenscroll=""
                  style={{ height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
                >
                  <div
                    className="blatt"
                    style={{
                      maxWidth: 760,
                      minHeight: '100%',
                      boxSizing: 'border-box',
                      margin: '0 auto',
                      padding: '4px 12px 112px',
                      background: 'var(--bg)',
                      color: 'var(--fg)',
                      borderRadius: '12px 12px 0 0',
                    }}
                  >
                    {echt}
                  </div>
                </div>
              ) : (
                <Platzhalter knoten={hier.knoten} farbe={farbeIn(baum, hier.knoten)} />
              )}
            </Einblenden>
          </div>
        </Wischflaeche>
        <MiniRad baum={baum} eltern={ebene} hier={bereich} onZurueck={eineEbene} />
      </Rahmen>
    );
  }

  const q = stand ? sanft(stand.p) : 1;
  const bewegt = stand?.m.k;
  const deckung = stand ? (stand.m.art === 'auf' ? 1 - q : q) : 1;
  const bereiche: Ringstueck[] = gl.gruppen.map((g, i) => ({
    id: `bereich-${g.knoten.id}`,
    knoten: g.knoten,
    keil: gruppenKeil(gl, i, t),
    farbe: farbeIn(baum, g.knoten),
    deckung,
    waehlen: () => lage.gleiten(einrastenSeite(zuGruppe(gl, i, lage.jetzt.current))),
  }));
  const seiten: Ringstueck[] = gl.seiten.map((s, k) => ({
    id: `seite-${s.knoten.id}`,
    knoten: s.knoten,
    keil: seitenKeil(gl, k, t, SEITENRAD),
    farbe: farbeIn(baum, s.knoten),
    deckung: k === bewegt ? 0 : deckung,
    markiert: !stand && k === seiteJetzt,
    waehlen: () => seiteOeffnen(k),
    // a page standing in two areas: say which one
    bezeichnung: `${s.knoten.name} · ${gl.gruppen[s.gruppe]?.knoten.name ?? ''}`,
  }));
  const geist = (() => {
    if (!stand || bewegt === undefined) return undefined;
    const s = gl.seiten[bewegt];
    if (!s) return undefined;
    const a = stand.m.art === 'auf' ? q : 1 - q;
    const keil = seitenKeil(gl, bewegt, t, SEITENRAD);
    return {
      keil: entfalten(keil, 1, keil.mitte, a)[0] ?? keil,
      innen: innenOben * (1 - a),
      farbe: farbeIn(baum, s.knoten),
    };
  })();

  return (
    <Rahmen weg={weg.map((s) => s.knoten)} onSprung={zurueck} status={status} onStatus={onStatus}>
      <div ref={flaeche} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <svg
          width={groesse.b}
          height={groesse.h}
          viewBox={`0 0 ${groesse.b} ${groesse.h}`}
          style={{
            display: 'block',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
          }}
          // where the wheels stand, for the local checks
          data-kontakt={kontakt}
          data-unten-y={untenY}
          data-unten-r={rUnten}
          data-oben-y={obenY}
          data-oben-r={rOben}
          {...griff}
        >
          {/* the works behind the wheels, seen through the rings */}
          <RaederwerkHinten
            zug={zug}
            unten={-t * seitenBreite(gl)}
            farben={getriebe}
            deckung={deckung}
          />
          <Ring
            stuecke={bereiche}
            cx={cx}
            cy={untenY}
            innen={innenUnten}
            aussen={rUnten}
            schriftGrund={15}
            durchsicht={0.84}
            f={f}
          />
          <Ring
            stuecke={seiten}
            cx={cx}
            cy={obenY}
            innen={innenOben}
            aussen={rOben}
            schriftGrund={16}
            durchsicht={0.84}
            f={f}
          />
          {/* the hub gears, different in size; the train between them makes the ratio right */}
          <Nabenraeder
            zug={zug}
            unten={-t * seitenBreite(gl)}
            farben={getriebe}
            deckung={deckung}
          />
          {/* where the wheels touch: the page there and its area are the chosen ones */}
          <path
            d={`M${cx - 10} ${kontakt}h20M${cx} ${kontakt - 10}v20`}
            stroke={f.text}
            strokeWidth={2}
            opacity={stand ? 0 : 0.5}
            style={{ pointerEvents: 'none' }}
          />
          {geist && (
            <Ringgeist
              keil={geist.keil}
              cx={cx}
              cy={obenY}
              innen={geist.innen}
              aussen={rOben}
              farbe={geist.farbe}
              deckung={1}
            />
          )}
        </svg>
      </div>
    </Rahmen>
  );
}

/**
 * A page's area for swiping to the page beside it. Not when the finger starts on something that
 * scrolls sideways itself (a wide table) or takes text.
 */
function Wischflaeche({
  onWisch,
  children,
}: {
  onWisch: (richtung: -1 | 1) => void;
  children: ReactNode;
}) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  return (
    <div
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      onTouchStart={(e) => {
        const p = e.touches[0];
        start.current =
          e.touches.length === 1 && p && !eigeneGeste(e.target, e.currentTarget)
            ? { x: p.clientX, y: p.clientY, t: e.timeStamp }
            : null;
      }}
      onTouchEnd={(e) => {
        const s = start.current;
        const p = e.changedTouches[0];
        start.current = null;
        if (!s || !p) return;
        const r = wischen(p.clientX - s.x, p.clientY - s.y, e.timeStamp - s.t);
        if (r !== 0) onWisch(r);
      }}
    >
      {children}
    </div>
  );
}

/** The target scrolls sideways itself, is a field to type in or a tool pad: its own gesture. */
function eigeneGeste(ziel: EventTarget, bis: Element): boolean {
  for (let el = ziel instanceof Element ? ziel : null; el && el !== bis; el = el.parentElement) {
    if (el.matches('input, textarea, select, canvas, video, .counter-pad, .big-button'))
      return true;
    // the page's own scroll box scrolls up and down only
    if (el.hasAttribute('data-seitenscroll')) continue;
    const x = getComputedStyle(el).overflowX;
    if ((x === 'auto' || x === 'scroll') && el.scrollWidth > el.clientWidth) return true;
  }
  return false;
}

/** The pages beside this one in its area, to tap as well as to swipe to. */
function Nachbarn({
  vorige,
  naechste,
  onWechseln,
  f,
}: {
  vorige: Knoten | undefined;
  naechste: Knoten | undefined;
  onWechseln: (k: Knoten) => void;
  f: Flaechen;
}) {
  if (!vorige && !naechste) return null;
  const knopf = (k: Knoten | undefined, text: string, rechts: boolean) => (
    <button
      type="button"
      disabled={!k}
      aria-label={k ? `Nebenan: ${k.name}` : undefined}
      onClick={() => k && onWechseln(k)}
      style={{
        ...OHNE_KASTEN,
        background: 'none',
        border: 'none',
        color: k ? f.text : 'transparent',
        fontSize: 14,
        padding: '6px 4px',
        textAlign: rechts ? 'right' : 'left',
        flex: 1,
        minWidth: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {text}
    </button>
  );
  return (
    <div style={{ display: 'flex', maxWidth: 760, width: '100%', margin: '0 auto', flexShrink: 0 }}>
      {knopf(vorige, vorige ? `‹ ${vorige.name}` : '', false)}
      {knopf(naechste, naechste ? `${naechste.name} ›` : '', true)}
    </div>
  );
}
