// Guards taken over with the Reibräder from TKD-Trainerbuch (Tobias 2026-11-09 there: „manche
// Einfassungen von Radausschnitten waren rechteckig“): Safari's tap highlight and the focus ring
// draw the element's box — a rectangle around a wheel piece. Every tappable field switches both off.
import { readFileSync } from 'node:fs';
import { OHNE_KASTEN } from '../../src/ui/navigation/farben';

const quelle = (name: string) =>
  readFileSync(new URL(`../../src/ui/navigation/${name}`, import.meta.url), 'utf8');

describe('Navigation: no boxes around fields', () => {
  it('the shared style switches off tap highlight and focus ring', () => {
    expect(OHNE_KASTEN).toEqual({ WebkitTapHighlightColor: 'transparent', outline: 'none' });
  });

  it('the frame passes the transparent tap highlight down to every field', () => {
    expect(quelle('Rahmen.tsx')).toMatch(
      /WebkitTapHighlightColor: OHNE_KASTEN\.WebkitTapHighlightColor/,
    );
  });

  it('every tappable wheel piece carries the style', () => {
    const text = quelle('Ring.tsx');
    const knoepfe = (text.match(/role(?::|=\{)[^,\n]*'button'/g) ?? []).length;
    const mitStil = (text.match(/OHNE_KASTEN/g) ?? []).length - 1;
    expect(knoepfe).toBeGreaterThan(0);
    expect(mitStil).toBeGreaterThanOrEqual(knoepfe);
  });
});

describe('Navigation: pages follow the app’s light/dark scheme', () => {
  it('a real page stands on the app’s own background and text colour', () => {
    const blatt =
      /className="blatt"\s*style=\{\{([^}]*)\}\}/.exec(quelle('ReibNavi.tsx'))?.[1] ?? '';
    expect(blatt).toMatch(/background: 'var\(--bg\)'/);
    expect(blatt).toMatch(/color: 'var\(--fg\)'/);
  });
});
