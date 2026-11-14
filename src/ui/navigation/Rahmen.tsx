import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import type { Knoten } from '../../logic/navigation/baum';
import { OHNE_KASTEN, flaechen, useDunkel, useWenigBewegung } from './farben';

const ohneRahmen: CSSProperties = {
  border: 'none',
  background: 'transparent',
  font: 'inherit',
  color: 'inherit',
  padding: '6px 4px',
  cursor: 'pointer',
};

/** The app over the whole screen: the way from the start at the top (each step tappable), then the wheels or a page. */
export function Rahmen({
  weg,
  onSprung,
  status,
  onStatus,
  children,
}: {
  weg: readonly Knoten[];
  onSprung: (index: number) => void;
  /** One short line at the right of the way. */
  status?: string | undefined;
  /** When given, the status is a button (e.g. „Neue Version – neu starten“). */
  onStatus?: (() => void) | undefined;
  children: ReactNode;
}) {
  const f = flaechen(useDunkel());
  return (
    <div
      aria-label="Navigation"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: f.grund,
        color: f.text,
        fontFamily: 'system-ui, sans-serif',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        overscrollBehavior: 'none',
        // Inherited by every field: no tap box (see OHNE_KASTEN).
        WebkitTapHighlightColor: OHNE_KASTEN.WebkitTapHighlightColor,
      }}
    >
      <nav
        aria-label="Weg"
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 4px 4px 10px' }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            fontSize: 16,
          }}
        >
          {weg.map((k, i) => (
            <span key={k.id} style={{ display: 'inline-flex', alignItems: 'center' }}>
              {i > 0 && <span style={{ color: f.leise, padding: '0 2px' }}>›</span>}
              {i < weg.length - 1 ? (
                <button
                  type="button"
                  style={{ ...ohneRahmen, textDecoration: 'underline' }}
                  onClick={() => onSprung(i)}
                >
                  {k.name}
                </button>
              ) : (
                <strong style={{ padding: '6px 4px' }}>{k.name}</strong>
              )}
            </span>
          ))}
        </div>
        {status && onStatus && (
          <button
            type="button"
            onClick={onStatus}
            style={{
              ...ohneRahmen,
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
              background: '#1a7f37',
              borderRadius: 14,
              padding: '6px 10px',
              whiteSpace: 'nowrap',
            }}
          >
            {status}
          </button>
        )}
        {status && !onStatus && (
          <span
            role="status"
            title={status}
            style={{
              fontSize: 12,
              color: f.leise,
              maxWidth: '45%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              padding: '0 6px',
            }}
          >
            {status}
          </span>
        )}
      </nav>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>{children}</div>
    </div>
  );
}

/** A page appears out of the field that grew over the screen: it fades in, a little from below. */
export function Einblenden({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const wenigBewegung = useWenigBewegung();
  useEffect(() => {
    if (wenigBewegung) return;
    ref.current?.animate(
      [
        { opacity: 0, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 200, easing: 'ease-out' },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the page appears
  }, []);
  return (
    <div ref={ref} style={{ height: '100%' }}>
      {children}
    </div>
  );
}

/** A page that is not there yet: its name and that it is planned. */
export function Platzhalter({ knoten, farbe }: { knoten: Knoten; farbe: string }) {
  const f = flaechen(useDunkel());
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '0 12px 12px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          background: farbe,
          color: '#fff',
          borderRadius: 14,
          padding: '28px 18px',
          fontSize: 30,
          fontWeight: 700,
          opacity: knoten.geplant ? 0.6 : 1,
        }}
      >
        {knoten.name}
      </div>
      <p style={{ margin: 0, fontSize: 17 }}>
        {knoten.geplant
          ? 'Diese Seite ist geplant und kommt noch.'
          : `Hier kommt die Seite „${knoten.name}“ hin.`}
      </p>
      <p style={{ margin: 0, color: f.leise }}>Zurück über das kleine Rad unten rechts.</p>
    </div>
  );
}
