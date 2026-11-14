import { SWIM_STATUS_TEXT, swimStatus, type SwimStatus } from '../../src/logic/swim';

const adult = { birthYear: 1990, firstTime: false };
const child = { birthYear: 2015, firstTime: false };

describe('swimStatus (Prüfungswegweiser 2026, Kap. 4.2)', () => {
  it('is missing without a proof year', () => {
    expect(swimStatus(adult, 2026)).toBe('missing');
  });

  it('follows the official example: swum 2021 is valid through 2025, not in 2026', () => {
    expect(swimStatus({ ...adult, swimProofYear: 2021 }, 2025)).toBe('valid');
    expect(swimStatus({ ...adult, swimProofYear: 2021 }, 2026)).toBe('expired');
  });

  it('a child proof stays valid until 17', () => {
    expect(swimStatus({ ...child, swimProofYear: 2021 }, 2032)).toBe('valid');
  });

  it('an adult cannot use a proof from before the year of the 18th birthday', () => {
    const young = { birthYear: 2008, firstTime: false };
    expect(swimStatus({ ...young, swimProofYear: 2025 }, 2026)).toBe('childProof');
    expect(swimStatus({ ...young, swimProofYear: 2026 }, 2026)).toBe('valid');
  });

  it('first acquisition requires swimming in the exam year', () => {
    expect(swimStatus({ ...child, firstTime: true, swimProofYear: 2025 }, 2026)).toBe(
      'firstTimeMustSwim',
    );
    expect(swimStatus({ ...child, firstTime: true, swimProofYear: 2026 }, 2026)).toBe('valid');
  });

  it('refuses a proof from after the exam year', () => {
    expect(swimStatus({ ...adult, swimProofYear: 2027 }, 2026)).toBe('future');
  });

  it('has a German text for every status', () => {
    const all: SwimStatus[] = [
      'valid',
      'missing',
      'future',
      'firstTimeMustSwim',
      'childProof',
      'expired',
    ];
    for (const status of all) expect(SWIM_STATUS_TEXT[status].length).toBeGreaterThan(0);
  });
});
