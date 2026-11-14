// Automatic draft in the browser's localStorage. It is a convenience only: Safari drops it after
// seven days without use and private windows may refuse it — the saved file is the real record.
// Every failure is returned with its reason so the UI can show it.

const KEY = 'sportabzeichen-vorerfassung:entwurf';

export type DraftResult<T> = { ok: true; value: T } | { ok: false; error: string };

function reason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function readDraft(): DraftResult<string | null> {
  try {
    return { ok: true, value: window.localStorage.getItem(KEY) };
  } catch (error) {
    return { ok: false, error: `Browser-Speicher nicht lesbar: ${reason(error)}` };
  }
}

export function writeDraft(text: string): DraftResult<null> {
  try {
    window.localStorage.setItem(KEY, text);
    return { ok: true, value: null };
  } catch (error) {
    return { ok: false, error: `Browser-Speicher nicht beschreibbar: ${reason(error)}` };
  }
}

export function clearDraft(): DraftResult<null> {
  try {
    window.localStorage.removeItem(KEY);
    return { ok: true, value: null };
  } catch (error) {
    return { ok: false, error: `Browser-Speicher nicht löschbar: ${reason(error)}` };
  }
}
