import { ageInYear, isIsoDate } from '../../src/logic/age';

describe('ageInYear', () => {
  it('is the age reached in the calendar year — the birth year is all it needs', () => {
    expect(ageInYear(2018, 2026)).toBe(8);
    expect(ageInYear(2020, 2026)).toBe(6);
  });
});

describe('isIsoDate', () => {
  it.each(['2026-01-31', '2024-02-29', '1950-12-01'])('accepts %s', (text) => {
    expect(isIsoDate(text)).toBe(true);
  });

  it.each(['2026-02-30', '2025-02-29', '2026-13-01', '01.05.2017', '2017-5-1', ''])(
    'refuses %s',
    (text) => {
      expect(isIsoDate(text)).toBe(false);
    },
  );
});
