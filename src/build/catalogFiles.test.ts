// The build step that loads every catalog year — run against the real catalog folder, so a broken
// package (public or local) fails here as it would fail the build.
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { variantName } from '../logic/catalog';
import { catalogYears, inlineDetailImages, loadCatalogs } from './catalogFiles';

const CATALOG_DIR = join(__dirname, '..', '..', 'catalog');

describe('loadCatalogs', () => {
  it('finds the year folders and ignores others (local/)', () => {
    expect(catalogYears(CATALOG_DIR)).toContain('2026');
    expect(catalogYears(CATALOG_DIR)).not.toContain('local');
  });

  it('assembles every year of the real catalog folder', () => {
    const catalogs = loadCatalogs(CATALOG_DIR);
    expect(catalogs.map((catalog) => catalog.validFrom)).toContain(2026);
  });

  // Runs only where the local package (DOSB texts and pictures, never in git) is present.
  it.skipIf(!existsSync(join(CATALOG_DIR, 'local', '2026.details.json')))(
    'local details: every ladder step sequence and Gerätturnen element of the limits has one',
    () => {
      const catalog = loadCatalogs(CATALOG_DIR).find((entry) => entry.validFrom === 2026);
      const needed = new Set(
        (catalog?.requirements ?? [])
          .filter(
            (r) => r.exerciseId === 'coordination-ladder' || r.exerciseId.startsWith('gymnastics-'),
          )
          .map((r) => `${r.exerciseId}|${r.label}`),
      );
      const have = new Set((catalog?.details ?? []).map((d) => `${d.exerciseId}|${d.label}`));
      expect(needed.size).toBe(25);
      expect([...needed].filter((key) => !have.has(key))).toEqual([]);
      expect(catalog?.details?.every((d) => d.image?.startsWith('data:image/webp;base64,'))).toBe(
        true,
      );
      // the official names never make two variants of one exercise look alike
      // (the Wegweiser calls 6.3.4.4 and 6.3.4.6 both „Handstütz-Sprungüberschlag“)
      if (!catalog) throw new Error('catalog 2026');
      const shown = [...needed].map((key) => {
        const [exerciseId = '', label = ''] = key.split('|');
        return `${exerciseId}|${variantName(catalog, exerciseId, label)}`;
      });
      expect(new Set(shown).size).toBe(needed.size);
    },
  );

  it('inlines the pictures of the details; a missing one stops the build with its name', () => {
    const dir = join(__dirname, '..', '..', '.tmp', 'catalog-images');
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'bild.webp'), Buffer.from([1, 2, 3]));
    try {
      const raw = { quelle: 'x', details: [{ label: 'a', image: 'bild.webp' }, { label: 'b' }] };
      expect(inlineDetailImages(raw, dir)).toEqual({
        quelle: 'x',
        details: [{ label: 'a', image: 'data:image/webp;base64,AQID' }, { label: 'b' }],
      });
      const missing = {
        details: [{ image: 'fehlt.webp' }, { image: '../bild.webp' }, { image: 'a.gif' }],
      };
      expect(() => inlineDetailImages(missing, dir)).toThrow(
        'Bilder der Details fehlen oder haben ein unbekanntes Format: fehlt.webp, ../bild.webp, a.gif',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('stops with every problem listed when a package is broken', () => {
    const dir = join(__dirname, '..', '..', '.tmp', 'catalog-broken');
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(join(dir, '2030'), { recursive: true });
    writeFileSync(join(dir, '2030', 'catalog.json'), '{"validFrom": "neu"}');
    try {
      expect(() => loadCatalogs(dir)).toThrow(/Leistungskatalog 2030 ist fehlerhaft/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
