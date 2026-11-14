// Suggested file name for a saved workbook: year, organisation and date, safe on every system.
import type { Workbook } from './types.ts';

// Combining marks left over by NFKD (the accents of ä, é, …)
const COMBINING_MARKS = /\p{M}/gu;

export function suggestedFileName(workbook: Workbook, today: string, suffix: string): string {
  const organisation = workbook.organisation.name
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const parts = ['sportabzeichen', String(workbook.year), organisation, today].filter(Boolean);
  return `${parts.join('_')}${suffix}`;
}
