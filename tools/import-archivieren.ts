// npm run import:archivieren -- <Bezeichnung>
import { fileURLToPath } from 'node:url';
import { archiveImport } from './importArchive.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
try {
  const { ordner, dateien } = archiveImport(root, process.argv.slice(2).join(' '), new Date());
  console.log(
    `Archiviert nach archiv/${ordner}/: ${dateien.length} Dateien. import/ ist jetzt leer.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
