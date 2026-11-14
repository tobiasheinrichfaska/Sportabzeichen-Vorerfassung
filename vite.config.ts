import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import type { Plugin } from 'vite';
import { withCsp, type CspOptions } from './src/build/csp.ts';
import { loadCatalogs } from './src/build/catalogFiles.ts';
import { HOSTED_HEAD, profileFor } from './src/build/profiles.ts';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

/** „Stand“ of a build: the short commit, „+geändert“ when the tree is dirty (as in TKD-Trainerbuch). */
function stand(): string {
  const git = (...args: string[]) =>
    execFileSync('git', args, {
      cwd: fileURLToPath(new URL('.', import.meta.url)),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  try {
    return `${git('rev-parse', '--short', 'HEAD')}${git('status', '--porcelain') ? '+geändert' : ''}`;
  } catch {
    return 'unbekannt';
  }
}

/**
 * The Content-Security-Policy with the hashes of what the single-file step inlined — applied to the
 * written file, because that step inlines during generateBundle after the other plugins.
 */
function contentSecurityPolicy(options: CspOptions): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    writeBundle: (output, bundle) => {
      for (const file of Object.values(bundle)) {
        if (file.type !== 'asset' || !file.fileName.endsWith('.html') || !output.dir) continue;
        const path = join(output.dir, file.fileName);
        writeFileSync(path, withCsp(readFileSync(path, 'utf8'), options));
      }
    },
  };
}

/** The hosted app's head tags (manifest, home-screen name and icon); the plain file has none. */
function hostedHead(hosted: boolean): Plugin {
  return {
    name: 'hosted-head',
    transformIndexHtml: (html) =>
      hosted ? html.replace('</title>', `</title>\n    ${HOSTED_HEAD}`) : html,
  };
}

export default defineConfig(({ mode }) => {
  const profile = profileFor(mode);
  return {
    // Relative asset paths so the single file also runs from file://
    base: './',
    publicDir: profile.publicDir,
    plugins: [
      react(),
      viteSingleFile(),
      hostedHead(profile.hosted),
      contentSecurityPolicy(profile.csp),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __APP_STAND__: JSON.stringify(stand()),
      __HOSTED__: JSON.stringify(profile.hosted),
      // Every catalog year (public structure + local limits); a broken package stops the build
      __CATALOGS__: JSON.stringify(
        loadCatalogs(fileURLToPath(new URL('./catalog', import.meta.url))),
      ),
    },
    build: {
      target: 'es2022',
      outDir: profile.outDir,
      // The preload polyfill uses fetch(), which fails on file:// — everything is inlined anyway
      modulePreload: { polyfill: false },
      chunkSizeWarningLimit: 2000,
    },
    server: { port: 5178, strictPort: true },
    test: {
      include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
      environment: 'node',
      pool: 'forks',
      globals: true,
    },
  };
});
