import { useEffect, useState } from 'react';
import { bereichVon, wegZu, type Knoten } from '../../logic/navigation/baum';

// Light or dark follows the phone (Tobias 2026-11-09: „Ja, folgt dem Handy“).
function useMedia(query: string): boolean {
  const [treffer, setTreffer] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const liste = window.matchMedia?.(query);
    if (!liste) return;
    const wechsel = (event: MediaQueryListEvent) => setTreffer(event.matches);
    liste.addEventListener('change', wechsel);
    return () => liste.removeEventListener('change', wechsel);
  }, [query]);
  return treffer;
}

export const useDunkel = () => useMedia('(prefers-color-scheme: dark)');
export const useWenigBewegung = () => useMedia('(prefers-reduced-motion: reduce)');

/** One colour per area (nine), in the order of the tree — neighbours on the wheel differ. */
const BEREICHE = [
  '#e0481f',
  '#2563c9',
  '#7a4fc9',
  '#1a7f37',
  '#b45309',
  '#0e7490',
  '#a21caf',
  '#4d7c0f',
  '#4338ca',
] as const;

export function bereichsfarbe(index: number): string {
  return BEREICHE[((index % BEREICHE.length) + BEREICHE.length) % BEREICHE.length] ?? BEREICHE[0];
}

/** Fields below an area: the area's colour, a little darker for each further field. */
export function feldfarbe(farbe: string, index: number): string {
  const anteil = [100, 84, 70][index % 3] ?? 100;
  return anteil === 100 ? farbe : `color-mix(in srgb, ${farbe} ${anteil}%, black)`;
}

export interface Flaechen {
  readonly grund: string;
  readonly linie: string;
  readonly leer: string;
  readonly zurueck: string;
  readonly text: string;
  readonly leise: string;
}

export function flaechen(dunkel: boolean): Flaechen {
  return dunkel
    ? {
        grund: '#0d1117',
        linie: '#0d1117',
        leer: '#161b22',
        zurueck: '#30363d',
        text: '#e6edf3',
        leise: '#9da7b3',
      }
    : {
        grund: '#f6f8fa',
        linie: '#f6f8fa',
        leer: '#e9edf1',
        zurueck: '#d5dbe1',
        text: '#1d232a',
        leise: '#5b6672',
      };
}

/** Colour of a node: its area's colour, fields below the start a little darker each. */
export function farbeIn(baum: Knoten, knoten: Knoten): string {
  const bereich = bereichVon(baum, knoten.id);
  const basis = bereichsfarbe((baum.kinder ?? []).indexOf(bereich));
  if (bereich === knoten || bereich === baum) return basis;
  const eltern = wegZu(baum, knoten.id).at(-2);
  return feldfarbe(basis, (eltern?.kinder ?? []).indexOf(knoten));
}

/**
 * Fields are shapes, not boxes (Tobias 2026-11-09: „manche Einfassungen von Radausschnitten waren
 * rechteckig“): Safari's tap highlight and the focus ring both draw the element's box — a rectangle
 * around a wheel piece. Both off; a field reached by keyboard shows it in its own outline instead.
 */
export const OHNE_KASTEN = { WebkitTapHighlightColor: 'transparent', outline: 'none' } as const;

/** Focus from the keyboard (not from a tap), which deserves a visible mark. */
export function tastaturFokus(el: Element): boolean {
  try {
    return el.matches(':focus-visible');
  } catch {
    return false;
  }
}

export interface Getriebefarben {
  readonly hell: string;
  readonly mittel: string;
  readonly dunkel: string;
  /** The background the shaft fades into behind the wheels. */
  readonly nebel: string;
}

/** Steel greys for the gears and the shaft of the Reibräder, light or dark. */
export function getriebeFarben(dunkel: boolean, grund: string): Getriebefarben {
  return dunkel
    ? { hell: '#8b949e', mittel: '#484f58', dunkel: '#21262d', nebel: grund }
    : { hell: '#eef1f4', mittel: '#a3acb6', dunkel: '#57606a', nebel: grund };
}
