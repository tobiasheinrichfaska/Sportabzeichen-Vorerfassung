// The system's back (Android's back gesture or button, a swipe in the iPhone app) while a page of the
// wheel is open: one level back, not out of the app (gap list 2026-11-10). Opening a page leaves one
// entry in the browser's history; closing it by the app's own „Zurück“ takes that entry away again.
import { useEffect, useRef } from 'react';

export function useZurueckGeste(offen: string | null, zurueck: () => void): void {
  const eintrag = useRef(false);
  const eigenesZurueck = useRef(false);
  const aktuell = useRef(zurueck);
  useEffect(() => {
    aktuell.current = zurueck;
  });
  useEffect(() => {
    if (offen && !eintrag.current) {
      history.pushState({ tkd: 'seite' }, '');
      eintrag.current = true;
    } else if (!offen && eintrag.current) {
      // closed in the app: the entry goes, the popstate it causes is ours
      eintrag.current = false;
      eigenesZurueck.current = true;
      history.back();
    }
  }, [offen]);
  useEffect(() => {
    const zurueckGeste = () => {
      if (eigenesZurueck.current) {
        eigenesZurueck.current = false;
        return;
      }
      if (!eintrag.current) return;
      eintrag.current = false;
      aktuell.current();
    };
    window.addEventListener('popstate', zurueckGeste);
    return () => window.removeEventListener('popstate', zurueckGeste);
  }, []);
}
