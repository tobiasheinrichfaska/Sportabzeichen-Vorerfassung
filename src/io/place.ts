// Where the app was (the open page of the wheel), so a home-screen app the phone restarted opens
// there again within a few hours. A convenience only: every failure means „start on the wheel“.
import { BAUM, ortLesen, seitenKnoten } from '../logic/navigation/baum';

const KEY = 'sportabzeichen-vorerfassung:ort';
const PAGES = seitenKnoten(BAUM);

/** The node id of the page to open on start, if the app was there lately. */
export function readPlace(now = Date.now()): string | undefined {
  try {
    const raw = window.localStorage.getItem(KEY);
    return ortLesen(raw === null ? null : JSON.parse(raw), now, PAGES)?.knoten ?? undefined;
  } catch {
    return undefined;
  }
}

export function writePlace(knoten: string | null, now = Date.now()): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ knoten, zeit: now }));
  } catch {
    // without storage the app simply starts on the wheel
  }
}

const GROUP_KEY = 'sportabzeichen-vorerfassung:gruppe';

/** The group shown last (pages „Kinder“, „Möglich“, „Erfassen“ …); none = the first one. */
export function readGroupChoice(): string | undefined {
  try {
    return window.localStorage.getItem(GROUP_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function writeGroupChoice(groupId: string): void {
  try {
    window.localStorage.setItem(GROUP_KEY, groupId);
  } catch {
    // without storage the first group is shown
  }
}
