// Entering and showing values in the notation of the Prüfkarten. Values are stored in the smallest
// unit (seconds, tenths, centimetres, whole points), so comparing against limits stays exact.
import type { Level, MeasureKindId, MeasuredValue } from './types.ts';

export type ParseResult = { ok: true; value: MeasuredValue } | { ok: false; error: string };

const LEVEL_INPUT: Readonly<Record<string, Level>> = {
  b: 'bronze',
  bronze: 'bronze',
  s: 'silver',
  silber: 'silver',
  g: 'gold',
  gold: 'gold',
};

const LEVEL_SHORT: Readonly<Record<Level, string>> = { bronze: 'B', silver: 'S', gold: 'G' };

function fail(error: string): ParseResult {
  return { ok: false, error };
}

// The phone's number pad has no colon: a comma or point separates minutes and seconds too
// („5,40“ = 5:40); the seconds always take two digits, so „5,4“ stays an error, not 5:04.
function parseMinSec(text: string): ParseResult {
  const match = /^(?:(\d+)[:.,])?(\d+)[:.,](\d{2})$/.exec(text);
  if (!match) {
    return fail('Bitte als Minuten:Sekunden eingeben, z. B. 05:40 (oder 5,40) bzw. 75:00.');
  }
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (seconds > 59) return fail('Die Sekunden müssen zwischen 00 und 59 liegen.');
  if (match[1] !== undefined && minutes > 59) {
    return fail('Die Minuten müssen bei Angabe von Stunden zwischen 00 und 59 liegen.');
  }
  return { ok: true, value: hours * 3600 + minutes * 60 + seconds };
}

/** Decimal number with at most `decimals` places, returned scaled to an integer. */
function parseScaled(text: string, decimals: number, hint: string): ParseResult {
  const match = /^(\d+)(?:[,.](\d+))?$/.exec(text);
  if (!match) return fail(hint);
  const fraction = match[2] ?? '';
  if (fraction.length > decimals) return fail(hint);
  const scale = 10 ** decimals;
  return { ok: true, value: Number(match[1]) * scale + Number(fraction.padEnd(decimals, '0')) };
}

function parseWhole(text: string): ParseResult {
  if (!/^\d+$/.test(text)) return fail('Bitte eine ganze Zahl eingeben.');
  return { ok: true, value: Number(text) };
}

function parseLevel(text: string): ParseResult {
  const level = LEVEL_INPUT[text.toLowerCase()];
  return level ? { ok: true, value: level } : fail('Bitte B, S oder G eingeben.');
}

const PARSERS: Readonly<Record<MeasureKindId, (text: string) => ParseResult>> = {
  minSec: parseMinSec,
  secTenth: (text) =>
    parseScaled(text, 1, 'Bitte Sekunden mit höchstens einer Nachkommastelle eingeben, z. B. 8,4.'),
  meterCm: (text) =>
    parseScaled(text, 2, 'Bitte Meter mit höchstens zwei Nachkommastellen eingeben, z. B. 2,35.'),
  points: parseWhole,
  count: parseWhole,
  level: parseLevel,
};

/** Parses user input in the notation of the measure kind. Surrounding blanks are ignored. */
export function parseMeasure(kind: MeasureKindId, input: string): ParseResult {
  const text = input.trim();
  if (text === '') return fail('Bitte einen Wert eingeben.');
  return PARSERS[kind](text);
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function formatScaled(value: number, decimals: number): string {
  const scale = 10 ** decimals;
  return `${Math.floor(value / scale)},${String(value % scale).padStart(decimals, '0')}`;
}

/** Shows a stored value in the notation of the measure kind (inverse of parseMeasure). */
export function formatMeasure(kind: MeasureKindId, value: MeasuredValue): string {
  if (typeof value !== 'number') return LEVEL_SHORT[value];
  switch (kind) {
    // the cards count long times in minutes too (e.g. „75:00“), never in hours
    case 'minSec':
      return `${pad2(Math.floor(value / 60))}:${pad2(value % 60)}`;
    case 'secTenth':
      return formatScaled(value, 1);
    case 'meterCm':
      return formatScaled(value, 2);
    case 'points':
    case 'count':
    case 'level':
      return String(value);
  }
}

/** True if the stored value has the shape the measure kind expects. */
export function fitsMeasure(kind: MeasureKindId, value: unknown): value is MeasuredValue {
  if (kind === 'level') return typeof value === 'string' && value in LEVEL_SHORT;
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}
