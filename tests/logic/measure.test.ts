import { fitsMeasure, formatMeasure, parseMeasure } from '../../src/logic/measure';
import type { MeasureKindId } from '../../src/logic/types';

function value(kind: MeasureKindId, input: string) {
  const result = parseMeasure(kind, input);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

describe('parseMeasure', () => {
  it.each([
    ['05:40', 340],
    ['5:40', 340],
    ['75:00', 4500],
    ['1:02:30', 3750],
    [' 04:10 ', 250],
    // the phone's number pad has no colon (live test 2026-11-11): comma or point instead
    ['5,40', 340],
    ['5.40', 340],
    ['1,02,30', 3750],
  ])('minSec %s → %d s', (input, seconds) => {
    expect(value('minSec', input)).toBe(seconds);
  });

  it.each(['5,4', '05:60', '1:60:00', '540', 'abc', '5:4'])('minSec refuses %s', (input) => {
    expect(parseMeasure('minSec', input).ok).toBe(false);
  });

  it.each([
    ['8,4', 84],
    ['8.4', 84],
    ['8', 80],
    ['18,6', 186],
  ])('secTenth %s → %d tenths', (input, tenths) => {
    expect(value('secTenth', input)).toBe(tenths);
  });

  it('secTenth refuses hundredths', () => {
    expect(parseMeasure('secTenth', '8,45').ok).toBe(false);
  });

  it.each([
    ['2,30', 230],
    ['2,3', 230],
    ['27,00', 2700],
    ['1', 100],
  ])('meterCm %s → %d cm', (input, cm) => {
    expect(value('meterCm', input)).toBe(cm);
  });

  it('meterCm refuses millimetres and negatives', () => {
    expect(parseMeasure('meterCm', '2,305').ok).toBe(false);
    expect(parseMeasure('meterCm', '-2,30').ok).toBe(false);
  });

  it('points and count take whole numbers only', () => {
    expect(value('points', '24')).toBe(24);
    expect(value('count', '15')).toBe(15);
    expect(parseMeasure('count', '1,5').ok).toBe(false);
  });

  it.each([
    ['B', 'bronze'],
    ['s', 'silver'],
    ['Gold', 'gold'],
    ['silber', 'silver'],
  ])('level %s → %s', (input, level) => {
    expect(value('level', input)).toBe(level);
  });

  it('level refuses anything else', () => {
    expect(parseMeasure('level', 'X').ok).toBe(false);
  });

  it('refuses empty input with a message', () => {
    const result = parseMeasure('minSec', '   ');
    expect(result).toEqual({ ok: false, error: 'Bitte einen Wert eingeben.' });
  });
});

describe('formatMeasure', () => {
  it.each([
    ['minSec', 340, '05:40'],
    // Chrome check 2026-11-11: the cards write long times in minutes (e.g. „75:00“), the app showed
    // hours („1:15:00“) — same value, other notation than the card
    ['minSec', 3750, '62:30'],
    ['minSec', 4500, '75:00'],
    ['minSec', 6000, '100:00'],
    ['secTenth', 84, '8,4'],
    ['meterCm', 230, '2,30'],
    ['meterCm', 2705, '27,05'],
    ['points', 24, '24'],
    ['level', 'silver', 'S'],
  ] as const)('%s %s → %s', (kind, stored, shown) => {
    expect(formatMeasure(kind, stored)).toBe(shown);
  });

  it.each([
    ['minSec', '05:40'],
    ['minSec', '75:00'],
    ['secTenth', '18,6'],
    ['meterCm', '2,05'],
    ['count', '7'],
    ['level', 'G'],
  ] as const)('round-trips %s %s', (kind, text) => {
    expect(formatMeasure(kind, value(kind, text))).toBe(text);
  });
});

describe('fitsMeasure', () => {
  it('accepts stored shapes and refuses others', () => {
    expect(fitsMeasure('minSec', 340)).toBe(true);
    expect(fitsMeasure('minSec', 3.5)).toBe(false);
    expect(fitsMeasure('meterCm', -1)).toBe(false);
    expect(fitsMeasure('level', 'gold')).toBe(true);
    expect(fitsMeasure('level', 3)).toBe(false);
    expect(fitsMeasure('points', 'gold')).toBe(false);
  });
});
