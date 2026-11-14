import {
  drehungen,
  kopfkreis,
  type Getrieberad,
  type Zahnradzug,
} from '../../logic/navigation/getriebe';
import { zahnradPfad } from '../../logic/navigation/rad';
import type { Getriebefarben } from './farben';

// The coupling of the Reibräder as a gear train behind the wheels (Tobias 2026-11-09: „die
// Zahnräder über mehrere Zahnräder im Hintergrund verbinden, verschieden groß … am Ende muss die
// Übersetzung stimmen“): the rings are a little see-through, the train shows behind them like the
// works behind an open dial.

function Rad({
  rad,
  drehung,
  modul,
  farbe,
  rand,
  achse,
}: {
  rad: Getrieberad;
  drehung: number;
  modul: number;
  farbe: string;
  rand: string;
  achse: string;
}) {
  const kopf = kopfkreis(rad, modul);
  const fuss = rad.teilkreis - modul * 1.1;
  return (
    // where the gear stands, for the local checks
    <g data-rad={rad.name} data-x={rad.x} data-y={rad.y} data-kopf={kopf}>
      <path
        transform={`translate(${rad.x} ${rad.y}) rotate(${(drehung * 180) / Math.PI})`}
        d={zahnradPfad(rad.zaehne, fuss, kopf)}
        fill={farbe}
        stroke={rand}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* spokes' ring and axle */}
      <circle
        cx={rad.x}
        cy={rad.y}
        r={fuss * 0.62}
        fill="none"
        stroke={rand}
        strokeWidth={1}
        opacity={0.5}
      />
      <circle cx={rad.x} cy={rad.y} r={Math.max(5, modul * 0.9)} fill={achse} />
    </g>
  );
}

/** The gears behind the wheels (big compound gear, idler, small compound gear). */
export function RaederwerkHinten({
  zug,
  unten,
  farben,
  deckung,
}: {
  zug: Zahnradzug;
  /** Turn of the lower hub gear (= the lower wheel's turn). */
  unten: number;
  farben: Getriebefarben;
  deckung: number;
}) {
  const winkel = drehungen(zug, unten);
  return (
    <g opacity={deckung} style={{ pointerEvents: 'none' }}>
      {zug.raeder.map((rad, i) =>
        rad.name === 'unten' || rad.name === 'oben' ? null : (
          <Rad
            key={rad.name}
            rad={rad}
            drehung={winkel[i] ?? 0}
            modul={zug.modul}
            farbe={rad.name === 'verbundGross' ? farben.dunkel : farben.mittel}
            rand={rad.name === 'verbundGross' ? farben.mittel : farben.dunkel}
            achse={farben.hell}
          />
        ),
      )}
    </g>
  );
}

/** The hub gears, in front: each turns with its wheel. */
export function Nabenraeder({
  zug,
  unten,
  farben,
  deckung,
}: {
  zug: Zahnradzug;
  unten: number;
  farben: Getriebefarben;
  deckung: number;
}) {
  const winkel = drehungen(zug, unten);
  return (
    <g opacity={deckung} style={{ pointerEvents: 'none' }}>
      {zug.raeder.map((rad, i) =>
        rad.name === 'unten' || rad.name === 'oben' ? (
          <Rad
            key={rad.name}
            rad={rad}
            drehung={winkel[i] ?? 0}
            modul={zug.modul}
            farbe={farben.mittel}
            rand={farben.dunkel}
            achse={farben.dunkel}
          />
        ) : null,
      )}
    </g>
  );
}
