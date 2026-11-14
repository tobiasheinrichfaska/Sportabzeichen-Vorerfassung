import type { KeyboardEvent } from 'react';
import type { Knoten } from '../../logic/navigation/baum';
import { keilPfad, type Keil } from '../../logic/navigation/rad';
import { schriftFuerStrahl, strahlSchrift } from '../../logic/navigation/ring';
import { OHNE_KASTEN, type Flaechen } from './farben';
import { punkt } from './radZeichnung';

/** A page growing out of its piece over the wheel, or shrinking back into it (no name, no taps). */
export function Ringgeist({
  keil,
  cx,
  cy,
  innen,
  aussen,
  farbe,
  deckung,
}: {
  keil: Keil;
  cx: number;
  cy: number;
  innen: number;
  aussen: number;
  farbe: string;
  deckung: number;
}) {
  return (
    <path
      transform={`translate(${cx} ${cy})`}
      d={keilPfad(keil, aussen, innen)}
      fill={farbe}
      opacity={deckung}
      style={{ pointerEvents: 'none' }}
    />
  );
}

export interface Ringstueck {
  readonly id: string;
  readonly knoten: Knoten;
  readonly keil: Keil;
  readonly farbe: string;
  readonly deckung?: number;
  readonly schrift?: number;
  readonly markiert?: boolean;
  /** Name for screen readers when the piece's name alone is ambiguous (a page in two areas). */
  readonly bezeichnung?: string;
  /** Keyboard and screen readers open it (pointer taps go through the wheel). */
  readonly waehlen?: () => void;
}

/**
 * One ring of a wheel drawn in pixels around (cx, cy): pieces with their names along the ray
 * (Tobias 2026-11-09: „Schriftausrichtung nach außen“). Marked pieces get their outline above the
 * neighbours.
 */
export function Ring({
  stuecke,
  cx,
  cy,
  innen,
  aussen,
  schriftGrund,
  durchsicht = 1,
  f,
}: {
  stuecke: readonly Ringstueck[];
  cx: number;
  cy: number;
  innen: number;
  aussen: number;
  schriftGrund: number;
  /** Fill opacity of the pieces: below 1 something behind the ring shows through. */
  durchsicht?: number;
  f: Flaechen;
}) {
  const mitte = (innen + aussen) / 2;
  return (
    <g transform={`translate(${cx} ${cy})`}>
      {stuecke.map((s) => {
        const text = punkt(s.keil.mitte, mitte);
        const tastatur = s.waehlen
          ? {
              role: 'button',
              tabIndex: 0,
              style: OHNE_KASTEN,
              'aria-label': `${s.bezeichnung ?? s.knoten.name}${s.knoten.geplant ? ' (geplant)' : ''}`,
              onKeyDown: (e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  s.waehlen?.();
                }
              },
              onClick: (e: { detail: number }) => {
                if (e.detail === 0) s.waehlen?.();
              },
            }
          : {};
        return (
          <g key={s.id} {...tastatur} opacity={(s.deckung ?? 1) * (s.knoten.geplant ? 0.5 : 1)}>
            <path
              d={keilPfad(s.keil, aussen, innen)}
              fill={s.farbe}
              fillOpacity={durchsicht}
              stroke={f.grund}
              strokeWidth={s.keil.breite > 6.2 ? 0 : 1.5}
              strokeLinejoin="round"
            />
            {(s.schrift ?? 1) > 0 && (
              <text
                x={text.x}
                y={text.y}
                transform={`rotate(${strahlSchrift(s.keil.mitte)} ${text.x} ${text.y})`}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#fff"
                opacity={s.schrift ?? 1}
                fontSize={schriftFuerStrahl(s.knoten.name, aussen - innen, schriftGrund)}
                fontWeight={s.markiert ? 700 : 600}
                style={{ pointerEvents: 'none' }}
              >
                {s.knoten.name}
              </text>
            )}
          </g>
        );
      })}
      {stuecke
        .filter((s) => s.markiert)
        .map((s) => (
          <path
            key={`rand-${s.id}`}
            d={keilPfad(s.keil, aussen, innen)}
            fill="none"
            stroke={f.text}
            strokeWidth={2.5}
            strokeLinejoin="round"
            style={{ pointerEvents: 'none' }}
          />
        ))}
    </g>
  );
}
