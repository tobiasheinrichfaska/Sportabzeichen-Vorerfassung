// Asks the browser to keep this app's storage (the draft with all entries) instead of clearing it
// when space runs low. Granted or not, the saved file stays the real record.

export type Persistence = 'granted' | 'denied' | 'unsupported';

export async function requestPersistence(): Promise<Persistence> {
  const storage = navigator.storage as StorageManager | undefined;
  if (!storage?.persist || !storage.persisted) return 'unsupported';
  try {
    if (await storage.persisted()) return 'granted';
    return (await storage.persist()) ? 'granted' : 'denied';
  } catch {
    return 'unsupported';
  }
}
