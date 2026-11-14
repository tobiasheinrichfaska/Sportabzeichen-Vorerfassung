// Saving and opening the workbook as a file — works offline, from file:// and on iPad/iPhone.

export const FILE_SUFFIX = '.sportabzeichen.json';

/** Offers the text as a download; the browser decides where it lands. */
export function downloadText(fileName: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Revoke later: some browsers start the download only after the click handler returned
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export type SaveOutcome = 'shared' | 'downloaded' | 'cancelled' | { error: string };

/**
 * The file through the phone's share sheet where it can take files (iPhone: „In Dateien
 * sichern“, AirDrop, mail) — an app on the home screen has no reliable download; else a download.
 */
export async function saveText(fileName: string, text: string): Promise<SaveOutcome> {
  const file = new File([text], fileName, { type: 'application/json' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }
  downloadText(fileName, text);
  return 'downloaded';
}

export function readTextFile(file: File): Promise<string> {
  return file.text();
}
