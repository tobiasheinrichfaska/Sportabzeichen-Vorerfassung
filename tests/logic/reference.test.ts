import { AWARD_BANDS, GROUPS, LEVELS, MEASURE_KINDS } from '../../src/logic/reference';

describe('reference data (Prüfungswegweiser 2026)', () => {
  it('has the four Disziplingruppen', () => {
    expect(GROUPS.map((group) => group.label)).toEqual([
      'Ausdauer',
      'Kraft',
      'Schnelligkeit',
      'Koordination',
    ]);
  });

  it('gives 1/2/3 points for Bronze/Silber/Gold', () => {
    expect(LEVELS.map((level) => [level.id, level.points])).toEqual([
      ['bronze', 1],
      ['silver', 2],
      ['gold', 3],
    ]);
  });

  it('award bands cover 4–12 points without gap or overlap', () => {
    const covered = AWARD_BANDS.flatMap((band) =>
      Array.from({ length: band.to - band.from + 1 }, (_, i) => band.from + i),
    );
    expect(covered).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('describes every measure kind', () => {
    expect(Object.keys(MEASURE_KINDS).sort()).toEqual(
      ['count', 'level', 'meterCm', 'minSec', 'points', 'secTenth'].sort(),
    );
  });
});
