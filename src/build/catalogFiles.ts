// Build step: reads every catalog year folder (catalog/2026/, catalog/2027/, …) plus the local,
// not versioned files (catalog/local/2026.requirements.json, 2026.classes.json, 2026.details.json
// with its pictures in 2026.images/) and assembles them. A broken package stops the build with every
// problem listed — never a silently wrong evaluation.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { assembleCatalog } from '../logic/catalogPackage.ts';
import type { Catalog } from '../logic/types.ts';

const IMAGE_TYPES: Readonly<Record<string, string>> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

function readJson(path: string): unknown {
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as unknown) : undefined;
}

/** Year folders in `catalogDir`, oldest first. */
export function catalogYears(catalogDir: string): string[] {
  return readdirSync(catalogDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

/**
 * Replaces the picture file names of the details file by data: URLs (the page may load nothing
 * from outside). A missing or unknown picture stops the build with its name.
 */
export function inlineDetailImages(raw: unknown, imageDir: string): unknown {
  if (
    typeof raw !== 'object' ||
    raw === null ||
    !Array.isArray((raw as { details?: unknown }).details)
  ) {
    return raw;
  }
  const missing: string[] = [];
  const details = (raw as { details: unknown[] }).details.map((item) => {
    if (typeof item !== 'object' || item === null) return item;
    const image = (item as { image?: unknown }).image;
    if (typeof image !== 'string' || image.startsWith('data:')) return item;
    const type = IMAGE_TYPES[extname(image).toLowerCase()];
    const path = join(imageDir, image);
    if (!type || image.includes('/') || image.includes('\\') || !existsSync(path)) {
      missing.push(image);
      return item;
    }
    return { ...item, image: `data:${type};base64,${readFileSync(path).toString('base64')}` };
  });
  if (missing.length > 0) {
    throw new Error(
      `Bilder der Details fehlen oder haben ein unbekanntes Format: ${missing.join(', ')}`,
    );
  }
  return { ...raw, details };
}

export function loadCatalogs(catalogDir: string): Catalog[] {
  return catalogYears(catalogDir).map((year) => {
    const local = join(catalogDir, 'local');
    const details = readJson(join(local, `${year}.details.json`));
    const result = assembleCatalog({
      catalog: readJson(join(catalogDir, year, 'catalog.json')),
      spaz: readJson(join(catalogDir, year, 'spaz.json')),
      localRequirements: readJson(join(local, `${year}.requirements.json`)),
      localClasses: readJson(join(local, `${year}.classes.json`)),
      localDetails:
        details === undefined
          ? undefined
          : inlineDetailImages(details, join(local, `${year}.images`)),
    });
    if (!result.ok) {
      throw new Error(`Leistungskatalog ${year} ist fehlerhaft:\n- ${result.errors.join('\n- ')}`);
    }
    return result.catalog;
  });
}
