import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  archiveImport,
  archiveLabel,
  freeFolderName,
  localDate,
  MANIFEST,
} from '../../tools/importArchive.ts';

// Workspace rule: scratch space stays inside the project (.tmp/ is gitignored)
const scratch = fileURLToPath(new URL('../../.tmp/', import.meta.url));
const now = new Date(2026, 10, 2, 9, 30);
let root: string;

beforeEach(() => {
  mkdirSync(scratch, { recursive: true });
  root = mkdtempSync(join(scratch, 'vitest-archive-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function deliver(files: Record<string, string>) {
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, 'import', ...path.split('/'));
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, content);
  }
}

describe('archiveLabel', () => {
  it('turns a free label into a folder-safe one, umlauts spelled out', () => {
    expect(archiveLabel('Gegenprüfung Nachtrag 2')).toBe('gegenpruefung-nachtrag-2');
    expect(archiveLabel('  Maße / Gewichte  ')).toBe('masse-gewichte');
  });

  it('refuses an empty label', () => {
    expect(() => archiveLabel('  – ')).toThrow(/Bezeichnung/);
  });
});

describe('freeFolderName', () => {
  it('never reuses a folder name', () => {
    expect(freeFolderName('a', new Set())).toBe('a');
    expect(freeFolderName('a', new Set(['a', 'a_2']))).toBe('a_3');
  });
});

describe('archiveImport', () => {
  it('moves everything, keeps the structure and leaves import/ empty', () => {
    deliver({ 'handbuch.pdf': 'PDF', 'paket/K01_plattform.png': 'PNG' });
    const result = archiveImport(root, 'Quellen', now);

    expect(result.ordner).toBe(`${localDate(now)}_quellen`);
    expect(readdirSync(join(root, 'import'))).toEqual([]);
    const target = join(root, 'archiv', result.ordner);
    expect(readFileSync(join(target, 'paket', 'K01_plattform.png'), 'utf8')).toBe('PNG');
    expect(result.dateien.map((f) => f.pfad)).toEqual(['handbuch.pdf', 'paket/K01_plattform.png']);
  });

  it('records size and SHA-256 of every file in the manifest', () => {
    deliver({ 'a.json': '{"x":1}' });
    const { ordner } = archiveImport(root, 'x', now);
    const manifest = JSON.parse(readFileSync(join(root, 'archiv', ordner, MANIFEST), 'utf8'));

    expect(manifest.archiviert_am).toBe(now.toISOString());
    expect(manifest.dateien).toEqual([
      { pfad: 'a.json', bytes: 7, sha256: createHash('sha256').update('{"x":1}').digest('hex') },
    ]);
  });

  it('adds a numbered folder for a second processing on the same day and lists both', () => {
    deliver({ 'a.txt': '1' });
    archiveImport(root, 'paket', now);
    deliver({ 'b.txt': '2' });
    const second = archiveImport(root, 'paket', now);

    expect(second.ordner).toBe(`${localDate(now)}_paket_2`);
    const index = readFileSync(join(root, 'archiv', 'INDEX.md'), 'utf8');
    expect(index).toContain(`\`${localDate(now)}_paket\` — 1 Dateien`);
    expect(index).toContain(`\`${localDate(now)}_paket_2\` — 1 Dateien`);
  });

  it('refuses an empty inbox without creating an archive', () => {
    mkdirSync(join(root, 'import'));
    expect(() => archiveImport(root, 'leer', now)).toThrow(/leer/);
    expect(existsSync(join(root, 'archiv'))).toBe(false);
  });

  it('refuses a delivery that would collide with the manifest', () => {
    deliver({ [MANIFEST]: '{}' });
    expect(() => archiveImport(root, 'x', now)).toThrow(/umbenennen/);
    expect(readdirSync(join(root, 'import'))).toEqual([MANIFEST]);
  });
});
