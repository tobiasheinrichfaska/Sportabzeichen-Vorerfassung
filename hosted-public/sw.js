// Offline start of the installed app (Tobias 2026-11-10: once opened with the right to it — office
// network or tester login — the app must open anywhere else without asking for a login).
//
// So the app's files are always served from this worker's cache once they are in it: opening the
// app never asks the protected folder, and a 401 can never reach the screen. New versions are
// looked for quietly: after each start the worker fetches the page WITHOUT credentials (no login
// dialog can follow) — in the office network that brings the new version, elsewhere it fails
// silently and the cached one stays.
//
// „Mit Anmeldung aktualisieren“ opens `./?neu=…`. A worker can never show the browser's login
// dialog (Tobias 2026-11-10 on the phone: „Es wird kein User abgefragt“ — the worker got the 401
// and showed the cached copy), so this one navigation is NOT taken: the browser loads it itself and
// asks for the login. The page that arrives then asks the worker to store it (`nach-anmeldung`),
// fetched with the login the browser now holds.
const CACHE = 'sportabzeichen-app-v1';
const PAGE = './';
const FILES = [
  PAGE,
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  // The first visit came with the right (IP or login), so these requests get through too.
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.allSettled(FILES.map((file) => cache.add(file))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

async function tellClients(message) {
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) client.postMessage(message);
}

/** The page from the network without credentials; stored and announced when it is new. */
async function quietUpdate() {
  try {
    const response = await fetch(PAGE, { credentials: 'omit', cache: 'no-store' });
    if (!response.ok) return { ok: false, status: response.status };
    const fresh = await response.clone().text();
    const cache = await caches.open(CACHE);
    const old = await cache.match(PAGE);
    if (old && (await old.text()) === fresh) return { ok: true, neu: false };
    await cache.put(PAGE, response);
    await tellClients({ typ: 'neue-version' });
    return { ok: true, neu: true };
  } catch {
    return { ok: false, status: 0 };
  }
}

/** Right after the login: the page (and the files beside it) stored with the login just given. */
async function storeAfterLogin() {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(PAGE, { credentials: 'include', cache: 'no-store' });
    if (!response.ok) return { ok: false, status: response.status };
    await cache.put(PAGE, response);
    await Promise.allSettled(
      FILES.filter((file) => file !== PAGE).map((file) =>
        fetch(file, { credentials: 'include' }).then((r) =>
          r.ok ? cache.put(file, r) : undefined,
        ),
      ),
    );
    return { ok: true };
  } catch {
    return { ok: false, status: 0 };
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // the update with the login: the browser's own navigation, so it can ask for the login
  if (request.mode === 'navigate' && url.searchParams.has('neu')) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit =
        request.mode === 'navigate'
          ? await cache.match(PAGE)
          : await cache.match(request, { ignoreSearch: true });
      if (hit) {
        if (request.mode === 'navigate') event.waitUntil(quietUpdate());
        return hit;
      }
      // Not cached yet (the very first visit): from the network, kept for the next start.
      const response = await fetch(request);
      if (response.ok)
        await cache.put(request.mode === 'navigate' ? PAGE : request, response.clone());
      return response;
    })(),
  );
});

// The app asks for a quiet look for a new version (page „Datei“, and whenever it comes back to the
// screen). It sends its own Stand: when the stored page is another one (fetched at an earlier
// start, the running page never reloaded), a restart brings it — also outside the office.
self.addEventListener('message', (event) => {
  if (event.data?.typ === 'nach-anmeldung') {
    event.waitUntil(
      storeAfterLogin().then((result) =>
        event.source?.postMessage({ typ: 'nach-anmeldung-ergebnis', ...result }),
      ),
    );
    return;
  }
  if (event.data?.typ !== 'suche-version') return;
  const own = typeof event.data.stand === 'string' ? event.data.stand : '';
  event.waitUntil(
    quietUpdate().then(async (result) => {
      const stored = await (await caches.open(CACHE)).match(PAGE);
      const other = !!own && !!stored && !(await stored.text()).includes(own);
      event.source?.postMessage({ typ: 'such-ergebnis', ...result, neu: !!result.neu || other });
    }),
  );
});
