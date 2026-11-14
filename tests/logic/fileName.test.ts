import { suggestedFileName } from '../../src/logic/fileName';
import { emptyWorkbook } from '../../src/logic/workbook';

const SUFFIX = '.sportabzeichen.json';

function named(name: string) {
  const workbook = { ...emptyWorkbook(2026), organisation: { name, postalCode: '', city: '' } };
  return suggestedFileName(workbook, '2026-11-01', SUFFIX);
}

describe('suggestedFileName', () => {
  it('combines year, organisation and date', () => {
    expect(named('TSV Musterstadt')).toBe(
      'sportabzeichen_2026_TSV-Musterstadt_2026-11-01.sportabzeichen.json',
    );
  });

  it('turns umlauts and ß into safe letters', () => {
    expect(named('Fußball-Club Größe & Söhne')).toBe(
      'sportabzeichen_2026_Fussball-Club-Grosse-Sohne_2026-11-01.sportabzeichen.json',
    );
  });

  it('leaves the organisation out when empty', () => {
    expect(named('  ')).toBe('sportabzeichen_2026_2026-11-01.sportabzeichen.json');
  });

  it('caps a long name', () => {
    expect(named('x'.repeat(100))).toBe(
      `sportabzeichen_2026_${'x'.repeat(40)}_2026-11-01${SUFFIX}`,
    );
  });
});
