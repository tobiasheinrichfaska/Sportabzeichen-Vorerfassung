// import/ is an inbox: after each processing its whole content moves to archiv/<date>_<label>/
// (unchanged, with a manifest), so the next delivery starts in an empty folder.
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

export const MANIFEST = 'MANIFEST.json';

export interface ArchivedFile {
  pfad: string;
  bytes: number;
  sha256: string;
}

export interface ArchiveResult {
  ordner: string;
  dateien: ArchivedFile[];
}

const UMLAUTS: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };

export function archiveLabel(label: string): string {
  const clean = label
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => UMLAUTS[c] ?? c)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!clean) throw new Error('Bitte eine Bezeichnung angeben, z. B. „gegenpruefung-nachtrag2“.');
  return clean;
}

export function localDate(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Folder names are never reused: a second archive with the same date and label gets _2, _3, … */
export function freeFolderName(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

function listFiles(dir: string, prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      return entry.isDirectory() ? listFiles(join(dir, entry.name), rel) : [rel];
    });
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

export function archiveImport(projectRoot: string, label: string, now: Date): ArchiveResult {
  const importDir = join(projectRoot, 'import');
  const entries = existsSync(importDir) ? readdirSync(importDir) : [];
  if (entries.length === 0) throw new Error('Der Ordner import/ ist leer – nichts zu archivieren.');
  if (entries.includes(MANIFEST))
    throw new Error(`import/ enthält selbst eine Datei ${MANIFEST}; bitte umbenennen.`);

  const archiveDir = join(projectRoot, 'archiv');
  mkdirSync(archiveDir, { recursive: true });
  const ordner = freeFolderName(
    `${localDate(now)}_${archiveLabel(label)}`,
    new Set(readdirSync(archiveDir)),
  );
  const target = join(archiveDir, ordner);
  mkdirSync(target);

  const failed: string[] = [];
  for (const name of entries) {
    try {
      renameSync(join(importDir, name), join(target, name));
    } catch (error) {
      failed.push(`${name} (${error instanceof Error ? error.message : String(error)})`);
    }
  }

  const dateien = listFiles(target).map((pfad) => {
    const path = join(target, ...pfad.split('/'));
    return {
      pfad,
      bytes: statSync(path).size,
      sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
    };
  });
  writeFileSync(
    join(target, MANIFEST),
    `${JSON.stringify({ archiviert_am: now.toISOString(), bezeichnung: label, dateien }, null, 2)}\n`,
  );

  const index = join(archiveDir, 'INDEX.md');
  if (!existsSync(index))
    writeFileSync(
      index,
      '# Archiv der Lieferungen aus import/\n\nJe Verarbeitung ein Ordner, Inhalt unverändert; Prüfsummen in MANIFEST.json.\n\n',
    );
  const total = dateien.reduce((sum, f) => sum + f.bytes, 0);
  appendFileSync(index, `- \`${ordner}\` — ${dateien.length} Dateien, ${formatBytes(total)}\n`);

  if (failed.length > 0)
    throw new Error(
      `Nach archiv/${ordner}/ verschoben: ${dateien.length} Dateien. Nicht verschoben (noch in import/): ${failed.join('; ')}`,
    );
  return { ordner, dateien };
}
