import type { Knoten } from '../../logic/navigation/baum';
import { feldKeil, keilPfad } from '../../logic/navigation/rad';
import { farbeIn, flaechen, useDunkel } from './farben';
import { AUSSEN, HALB, INNEN } from './radZeichnung';

/**
 * The wheel small on a detail page (Tobias 2026-11-09: „blenden wir das Rad irgendwo klein ein, um
 * eine Ebene zurück zu kommen“): the level the page was opened from, the page's field at the top,
 * „↩“ in the middle. A tap goes back to that level.
 */
export function MiniRad({
  baum,
  eltern,
  hier,
  onZurueck,
}: {
  baum: Knoten;
  eltern: Knoten;
  hier: Knoten;
  onZurueck: () => void;
}) {
  const f = flaechen(useDunkel());
  const kinder = eltern.kinder ?? [];
  const n = kinder.length;
  const i = Math.max(0, kinder.indexOf(hier));
  const dreh = n > 0 ? -i * ((2 * Math.PI) / n) : 0;
  return (
    <button
      type="button"
      aria-label={`Zurück zu ${eltern.name}`}
      title={`Zurück zu ${eltern.name}`}
      onClick={onZurueck}
      style={{
        position: 'absolute',
        right: 14,
        bottom: 14,
        width: 84,
        height: 84,
        padding: 0,
        border: 'none',
        borderRadius: '50%',
        background: f.grund,
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.28)',
        cursor: 'pointer',
      }}
    >
      <svg
        viewBox={`${-HALB} ${-HALB} ${2 * HALB} ${2 * HALB}`}
        width={84}
        height={84}
        aria-hidden="true"
      >
        {kinder.map((knoten, j) => (
          <path
            key={knoten.id}
            d={keilPfad(feldKeil(j, dreh, n), AUSSEN + 8, INNEN)}
            fill={farbeIn(baum, knoten)}
            opacity={j === i ? 1 : 0.55}
            stroke={j === i ? f.text : f.grund}
            strokeWidth={j === i ? 6 : 4}
          />
        ))}
        <circle r={INNEN} fill={f.leer} />
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fill={f.text}
          fontSize={44}
          fontWeight={700}
        >
          ↩
        </text>
      </svg>
    </button>
  );
}
