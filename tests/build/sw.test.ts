// hosted-public/sw.js is plain JavaScript outside the type check. Run here with stand-ins for the
// browser parts it uses, it must keep Tobias' rule (2026-11-10): once opened with the right to it,
// the app opens anywhere without a login — so with a cached copy no request may go to the folder
// with credentials, and a refused or failed request never replaces the copy.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { HOSTED_HEAD } from '../../src/build/profiles';

const SW = readFileSync(new URL('../../hosted-public/sw.js', import.meta.url), 'utf8');
const SCOPE = 'https://example.org/NebenprojektSportabzeichen/';
const PAGE = SCOPE;

interface FakeRequest {
  url: string;
  method: string;
  mode: string;
}
interface Call {
  url: string;
  /** 'omit' = no login possible; 'with-login' = the request a navigation would make. */
  credentials: string;
}
type Answer = (url: string) => Response | Promise<Response>;

const keyOf = (input: string | FakeRequest, ignoreSearch = false) => {
  const url = new URL(typeof input === 'string' ? input : input.url, `${SCOPE}sw.js`);
  if (ignoreSearch) url.search = '';
  return url.href;
};

function worker(answer: Answer) {
  const handlers = new Map<string, (event: unknown) => void>();
  const stores = new Map<string, Map<string, Response>>();
  const calls: Call[] = [];
  const posted: unknown[] = [];
  const fetchStandIn = async (input: string | FakeRequest, init?: { credentials?: string }) => {
    const url = keyOf(input);
    calls.push({
      url,
      credentials: init?.credentials ?? (typeof input === 'string' ? 'same-origin' : 'with-login'),
    });
    return answer(url);
  };
  const cacheFor = (name: string) => {
    const store = stores.get(name) ?? new Map<string, Response>();
    stores.set(name, store);
    return {
      match: async (input: string | FakeRequest, options?: { ignoreSearch?: boolean }) =>
        store.get(keyOf(input, options?.ignoreSearch))?.clone(),
      put: async (input: string | FakeRequest, response: Response) => {
        store.set(keyOf(input, true), response.clone());
      },
      add: async (input: string) => {
        const response = await fetchStandIn(input);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        store.set(keyOf(input, true), response);
      },
    };
  };
  const context = {
    self: {
      location: new URL(`${SCOPE}sw.js`),
      addEventListener: (type: string, handler: (event: unknown) => void) =>
        handlers.set(type, handler),
      skipWaiting: async () => undefined,
      clients: {
        claim: async () => undefined,
        matchAll: async () => [{ postMessage: (message: unknown) => posted.push(message) }],
      },
    },
    caches: {
      open: async (name: string) => cacheFor(name),
      keys: async () => [...stores.keys()],
      delete: async (name: string) => stores.delete(name),
    },
    fetch: fetchStandIn,
    URL,
    Promise,
  };
  vm.runInNewContext(SW, context);

  /** Runs an event and waits for everything it asked to wait for. */
  async function dispatch(type: string, extra: Record<string, unknown>) {
    const waits: Promise<unknown>[] = [];
    let response: Promise<Response> | undefined;
    handlers.get(type)?.({
      ...extra,
      waitUntil: (p: Promise<unknown>) => waits.push(p),
      respondWith: (p: Promise<Response>) => {
        response = p;
      },
    });
    const result = response ? await response : undefined;
    await Promise.all(waits);
    // promises chained inside waitUntil (cache writes, messages)
    await new Promise((resolve) => setTimeout(resolve, 0));
    return result;
  }
  const navigate = (url = PAGE) =>
    dispatch('fetch', { request: { url, method: 'GET', mode: 'navigate' } });
  const cachedPage = async () => {
    for (const store of stores.values()) {
      const hit = store.get(PAGE);
      if (hit) return hit.clone().text();
    }
    return undefined;
  };
  return { dispatch, navigate, calls, posted, stores, cachedPage };
}

const ok = (body: string) => new Response(body, { status: 200 });
const refused = () => new Response('Anmeldung nötig', { status: 401 });
/** A version of the app's page: its head carries the app's title tag (HOSTED_HEAD). */
const MARK = '<meta name="apple-mobile-web-app-title" content="Sportabzeichen" />';
const page = (version: string) => `${MARK} App ${version}`;
/** What a login script may answer instead of the app: a page of its own, or a redirect to one. */
const loginPage = () => ok('<title>Anmeldung</title> Bitte anmelden');
const redirectedToLogin = () => {
  const response = loginPage();
  Object.defineProperty(response, 'redirected', { value: true });
  return response;
};

/** A worker installed on a visit with the right (office IP or login): everything answers. */
async function installed(answerAfter: Answer) {
  let answer: Answer = (url) => ok(url === PAGE ? page('v1') : `Datei ${url}`);
  const w = worker((url) => answer(url));
  await w.dispatch('install', {});
  await w.dispatch('activate', {});
  answer = answerAfter;
  w.calls.length = 0;
  return w;
}

describe('service worker of the hosted app', () => {
  it('stores the page, manifest and icons when installed', async () => {
    const w = await installed(refused);
    expect(await w.cachedPage()).toBe(page('v1'));
    const keys = [...(w.stores.values().next().value?.keys() ?? [])];
    expect(keys).toEqual(
      expect.arrayContaining([
        PAGE,
        `${SCOPE}manifest.json`,
        `${SCOPE}icon-192.png`,
        `${SCOPE}apple-touch-icon.png`,
      ]),
    );
  });

  it('outside the office: the cached app opens, nothing asks with a login (Tobias 2026-11-10)', async () => {
    const w = await installed(refused);
    const response = await w.navigate();
    expect(await response?.text()).toBe(page('v1'));
    // the only request is the quiet look for a new version — without credentials, so no dialog
    expect(w.calls).toEqual([{ url: PAGE, credentials: 'omit' }]);
    expect(await w.cachedPage()).toBe(page('v1'));
    expect(w.posted).toEqual([]);
  });

  it('a deep link or a reload with a search opens the cached app as well', async () => {
    const w = await installed(refused);
    const response = await w.navigate(`${SCOPE}index.html?x=1`);
    expect(await response?.text()).toBe(page('v1'));
    expect(w.calls.every((call) => call.credentials === 'omit')).toBe(true);
  });

  it('offline: the cached app opens and the failed look changes nothing', async () => {
    const w = await installed(() => Promise.reject(new TypeError('offline')));
    expect(await (await w.navigate())?.text()).toBe(page('v1'));
    expect(await w.cachedPage()).toBe(page('v1'));
  });

  it('in the office a new version is stored quietly and announced; the same one is not', async () => {
    const same = await installed(() => ok(page('v1')));
    await same.navigate();
    expect(same.posted).toEqual([]);

    const w = await installed(() => ok(page('v2')));
    // this start still shows the version it has …
    expect(await (await w.navigate())?.text()).toBe(page('v1'));
    // … the next one the new one, and the page is told
    expect(await w.cachedPage()).toBe(page('v2'));
    expect(w.posted).toEqual([{ typ: 'neue-version' }]);
  });

  it('icons and manifest come from the cache too, never from the folder', async () => {
    const w = await installed(refused);
    const response = await w.dispatch('fetch', {
      request: { url: `${SCOPE}icon-192.png`, method: 'GET', mode: 'no-cors' },
    });
    expect(await response?.text()).toBe(`Datei ${SCOPE}icon-192.png`);
    expect(w.calls).toEqual([]);
  });

  // Tobias 2026-11-10 on the phone: „Es wird kein User abgefragt“ — a worker cannot show the
  // login dialog, so the update with the login must be the browser's own navigation
  it('„Mit Anmeldung aktualisieren“ is left to the browser, which can ask for the login', async () => {
    const w = await installed(refused);
    expect(await w.navigate(`${PAGE}?neu=1`)).toBeUndefined();
    expect(w.calls).toEqual([]);
  });

  it('after the login the arriving page has itself stored, with the login the browser holds', async () => {
    const w = await installed((url) => ok(url === PAGE ? page('v3') : `Datei neu ${url}`));
    const answers: unknown[] = [];
    await w.dispatch('message', {
      data: { typ: 'nach-anmeldung' },
      source: { postMessage: (message: unknown) => answers.push(message) },
    });
    expect(answers).toEqual([{ typ: 'nach-anmeldung-ergebnis', ok: true }]);
    expect(await w.cachedPage()).toBe(page('v3'));
    expect(w.calls.every((call) => call.credentials === 'include')).toBe(true);
    // the next start without login opens the new version from the cache
    expect(await (await w.navigate())?.text()).toBe(page('v3'));
  });

  it('storing after the login refused: reported, the stored version stays', async () => {
    const w = await installed(refused);
    const answers: unknown[] = [];
    await w.dispatch('message', {
      data: { typ: 'nach-anmeldung' },
      source: { postMessage: (message: unknown) => answers.push(message) },
    });
    expect(answers).toEqual([{ typ: 'nach-anmeldung-ergebnis', ok: false, status: 401 }]);
    expect(await w.cachedPage()).toBe(page('v1'));
  });

  it('the very first visit loads from the folder and keeps the page', async () => {
    const w = worker(() => ok(page('v1')));
    const response = await w.navigate();
    expect(await response?.text()).toBe(page('v1'));
    expect(await w.cachedPage()).toBe(page('v1'));
  });

  it('answers the app’s look for a version with the result', async () => {
    const w = await installed(refused);
    const answers: unknown[] = [];
    await w.dispatch('message', {
      data: { typ: 'suche-version' },
      source: { postMessage: (message: unknown) => answers.push(message) },
    });
    expect(answers).toEqual([{ typ: 'such-ergebnis', ok: false, status: 401, neu: false }]);
    expect(w.calls).toEqual([{ url: PAGE, credentials: 'omit' }]);
  });

  it('a stored version other than the running page is reported, also outside the office', async () => {
    // the running page is „Stand aaa1111“, the stored page (fetched at an earlier start) another
    const w = await installed(refused);
    const answers: unknown[] = [];
    await w.dispatch('message', {
      data: { typ: 'suche-version', stand: 'aaa1111' },
      source: { postMessage: (message: unknown) => answers.push(message) },
    });
    expect(answers).toEqual([{ typ: 'such-ergebnis', ok: false, status: 401, neu: true }]);
    // the running page is the stored one: nothing new
    const same: unknown[] = [];
    await w.dispatch('message', {
      data: { typ: 'suche-version', stand: page('v1') },
      source: { postMessage: (message: unknown) => same.push(message) },
    });
    expect(same).toEqual([{ typ: 'such-ergebnis', ok: false, status: 401, neu: false }]);
  });

  it('leaves other origins and other methods alone', async () => {
    const w = await installed(refused);
    expect(
      await w.dispatch('fetch', {
        request: { url: 'https://other.example/x', method: 'GET', mode: 'cors' },
      }),
    ).toBeUndefined();
    expect(
      await w.dispatch('fetch', { request: { url: PAGE, method: 'POST', mode: 'cors' } }),
    ).toBeUndefined();
  });

  // Test zone on bunny.net (2026-11-15): the login script serves other paths of the same address
  it('leaves the login script’s pages to the network, e.g. „Tester einladen“', async () => {
    const w = await installed(refused);
    const origin = new URL(SCOPE).origin;
    expect(await w.navigate(`${origin}/_zugang/einladen`)).toBeUndefined();
    expect(await w.navigate(`${SCOPE}_zugang/einladen`)).toBeUndefined();
    expect(
      await w.dispatch('fetch', {
        request: { url: `${origin}/_zugang/stil.css`, method: 'GET', mode: 'no-cors' },
      }),
    ).toBeUndefined();
    expect(w.calls).toEqual([]);
    const keys = [...(w.stores.values().next().value?.keys() ?? [])];
    expect(keys.some((key) => key.includes('_zugang'))).toBe(false);
  });

  it('a login page instead of the app never replaces the app, nor is it announced', async () => {
    for (const answer of [loginPage, redirectedToLogin]) {
      const w = await installed(answer);
      expect(await (await w.navigate())?.text()).toBe(page('v1'));
      expect(await w.cachedPage()).toBe(page('v1'));
      expect(w.posted).toEqual([]);
    }
  });

  it('a login page after „Mit Anmeldung aktualisieren“ is not stored either', async () => {
    for (const answer of [loginPage, redirectedToLogin]) {
      const w = await installed(answer);
      const answers: unknown[] = [];
      await w.dispatch('message', {
        data: { typ: 'nach-anmeldung' },
        source: { postMessage: (message: unknown) => answers.push(message) },
      });
      expect(answers).toEqual([{ typ: 'nach-anmeldung-ergebnis', ok: false, status: 200 }]);
      expect(await w.cachedPage()).toBe(page('v1'));
    }
  });

  it('a first visit answered with a login page shows it but does not keep it', async () => {
    const w = worker(() => loginPage());
    expect(await (await w.navigate())?.text()).toContain('Anmeldung');
    expect(await w.cachedPage()).toBeUndefined();
  });

  it('the app’s mark is the title tag of the hosted head', () => {
    expect(SW).toContain(MARK.replace(' />', ''));
    expect(HOSTED_HEAD).toContain(MARK);
  });

  it('activating drops the caches of older versions', async () => {
    const w = await installed(refused);
    w.stores.set('sportabzeichen-app-v0', new Map());
    await w.dispatch('activate', {});
    expect([...w.stores.keys()]).toEqual(['sportabzeichen-app-v1']);
  });
});
