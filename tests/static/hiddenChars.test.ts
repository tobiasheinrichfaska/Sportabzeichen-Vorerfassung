// Guard: editing tools have turned escapes into invisible characters before (NBSP, zero-width,
// combining marks). Such characters in source change regexes and texts without being visible.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
// NBSP, zero-width space/joiners, word joiner, BOM — and any combining mark (\p{M})
const HIDDEN = /[\u{a0}\u{200b}-\u{200d}\u{2060}\u{feff}]|\p{M}/u;

function sourceFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { recursive: true, encoding: 'utf8' })
    .filter((file) => /\.(ts|tsx|css|html)$/.test(file))
    .map((file) => join(dir, file));
}

describe('source files', () => {
  const files = [...sourceFiles('src'), ...sourceFiles('tests'), 'index.html'];

  it('are found', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files)('%s has no invisible characters', (file) => {
    const lines = readFileSync(join(ROOT, file), 'utf8').split('\n');
    const hits = lines.flatMap((line, index) => (HIDDEN.test(line) ? [index + 1] : []));
    expect(hits).toEqual([]);
  });
});
