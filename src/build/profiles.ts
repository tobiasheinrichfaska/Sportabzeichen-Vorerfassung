// What each build produces and may do (pattern of TKD-Trainerbuch). Both stay without any network
// from the page: the plain file runs from file://; the hosted app (Tobias 2026-11-10: „komplett zum
// standalone-Betrieb“) is installed to the home screen and starts offline through its service worker.
import type { CspOptions } from './csp.ts';

export interface BuildProfile {
  readonly outDir: string;
  /** Files copied next to the page (service worker, manifest, icons); false = single file only. */
  readonly publicDir: string | false;
  readonly csp: CspOptions;
  /** The page links its manifest and registers the service worker. */
  readonly hosted: boolean;
}

export const BUILD_PROFILES = {
  file: {
    outDir: 'dist',
    publicDir: false,
    csp: { serviceWorker: false, manifest: false },
    hosted: false,
  },
  hosted: {
    outDir: 'dist-hosted',
    publicDir: 'hosted-public',
    csp: { serviceWorker: true, manifest: true },
    hosted: true,
  },
} as const satisfies Record<string, BuildProfile>;

export function profileFor(mode: string): BuildProfile {
  return mode === 'hosted' ? BUILD_PROFILES.hosted : BUILD_PROFILES.file;
}

/** Tags the hosted page needs in its head: manifest (sent with the login), home-screen name, icon. */
export const HOSTED_HEAD = [
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-title" content="Sportabzeichen" />',
  '<meta name="theme-color" content="#1f4e9c" />',
  // Behind the tester login the manifest is only fetched with credentials
  '<link rel="manifest" href="manifest.json" crossorigin="use-credentials" />',
  '<link rel="apple-touch-icon" href="apple-touch-icon.png" />',
].join('\n    ');
