/// <reference types="vite/client" />

/** Injected by vite.config.ts from package.json. */
declare const __APP_VERSION__: string;

/** Short commit of the build („abc1234“, „+geändert“ when built from a dirty tree). */
declare const __APP_STAND__: string;

/** True in the hosted app (service worker, manifest), false in the plain file. */
declare const __HOSTED__: boolean;

/** Every catalog year, assembled and checked by vite.config.ts (src/build/catalogFiles.ts). */
declare const __CATALOGS__: import('./logic/types').Catalog[];
