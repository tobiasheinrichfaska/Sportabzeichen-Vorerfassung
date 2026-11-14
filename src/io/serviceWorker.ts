// The hosted app's service worker (hosted-public/sw.js): registration, the quiet look for a new
// version and the update with the login. The plain file (file://) has none.

export type UpdateNotice =
  | { kind: 'new-version' }
  /** After „Mit Anmeldung aktualisieren“: the page that came with the login is stored (or not). */
  | { kind: 'stored-after-login'; ok: boolean; status: number }
  | { kind: 'checked'; ok: true; isNew: boolean }
  | { kind: 'checked'; ok: false; status: number };

const supported = () => __HOSTED__ && 'serviceWorker' in navigator;

/** Registers the worker; returns the reason when it fails (shown, never swallowed). */
export async function registerServiceWorker(): Promise<string | null> {
  if (!supported()) return null;
  try {
    await navigator.serviceWorker.register('./sw.js');
    return null;
  } catch (error) {
    return `Offline-Start nicht eingerichtet: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/** Notices from the worker: a new version was stored, or the result of a look asked for. */
export function onUpdateNotice(listener: (notice: UpdateNotice) => void): () => void {
  if (!supported()) return () => undefined;
  const handle = (event: MessageEvent) => {
    const data: unknown = event.data;
    if (typeof data !== 'object' || data === null) return;
    const message = data as Record<string, unknown>;
    if (message.typ === 'neue-version') listener({ kind: 'new-version' });
    if (message.typ === 'nach-anmeldung-ergebnis') {
      listener({
        kind: 'stored-after-login',
        ok: message.ok === true,
        status: Number(message.status) || 0,
      });
    }
    if (message.typ === 'such-ergebnis') {
      // a stored version other than the running one waits for a restart, reached or not
      if (message.neu === true) listener({ kind: 'new-version' });
      else {
        listener(
          message.ok === true
            ? { kind: 'checked', ok: true, isNew: false }
            : { kind: 'checked', ok: false, status: Number(message.status) || 0 },
        );
      }
    }
  };
  navigator.serviceWorker.addEventListener('message', handle);
  return () => navigator.serviceWorker.removeEventListener('message', handle);
}

/** Asks the worker to look for a new version without the login (works in the office network). */
export async function lookForVersion(): Promise<boolean> {
  if (!supported()) return false;
  const registration = await navigator.serviceWorker.ready;
  registration.active?.postMessage({ typ: 'suche-version', stand: __APP_STAND__ });
  return !!registration.active;
}

/** Loads the app anew through the folder with the login (the browser may ask for it). */
export function updateWithLogin(): void {
  window.location.assign(`./?neu=${Date.now()}`);
}

/**
 * After an update with the login the address carries `?neu=…`: tidied (a reload must not repeat
 * it); returns whether the page came that way — then it asks the worker to store it.
 */
export function tidyAddress(): boolean {
  if (!new URLSearchParams(window.location.search).has('neu')) return false;
  window.history.replaceState(window.history.state, '', window.location.pathname);
  return true;
}

/** The page loaded with the login: the worker stores it for the starts without login. */
export async function storeAfterLogin(): Promise<void> {
  if (!supported()) return;
  const registration = await navigator.serviceWorker.ready;
  registration.active?.postMessage({ typ: 'nach-anmeldung' });
}

export const isHosted = (): boolean => __HOSTED__;
