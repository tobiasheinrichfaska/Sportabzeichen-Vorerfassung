import {
  SWIM_STATUS_TEXT,
  SWIM_WAYS,
  swimProof,
  swimProofStatus,
  swimProofText,
  swimStatus,
  swimWaysFor,
  type SwimAttempt,
  type SwimStatus,
} from '../../src/logic/swim';
import { SWIM_TEST_CATALOG } from '../fixtures/testCatalog';

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

describe('swimWaysFor (Kap. 4.2: split at 12)', () => {
  it('under 12: 50 m, no 200 m, no Rettungsschwimm- or Fünfkampfabzeichen', () => {
    const ways = swimWaysFor(11);
    expect(ways).toContain('swim50');
    expect(ways).not.toContain('swim200');
    expect(ways).not.toContain('badgeRescue');
    expect(ways).not.toContain('badgePentathlon');
    expect(ways).toEqual(
      expect.arrayContaining(['continuous15', 'clothes100', 'badgeSwim', 'badgeJuniorRescue']),
    );
  });

  it('from 12: 200 m instead of 50 m, all badges', () => {
    const ways = swimWaysFor(12);
    expect(ways).toContain('swim200');
    expect(ways).not.toContain('swim50');
    expect(ways).toEqual(expect.arrayContaining(['badgeRescue', 'badgePentathlon']));
  });

  it('every way has a label and a unique id', () => {
    const ids = SWIM_WAYS.map((way) => way.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(SWIM_WAYS.every((way) => way.label.length > 0)).toBe(true);
  });
});

describe('swimProof (entered, or a swim recorded as an exercise)', () => {
  const attempt = (patch: Partial<SwimAttempt>): SwimAttempt => ({
    measurementId: 'm1',
    exerciseId: 'swim-endurance',
    year: 2026,
    level: null,
    ...patch,
  });

  it('none without an entered year or a recorded swim', () => {
    expect(swimProof({}, [])).toBeNull();
    expect(swimProof({}, [attempt({ exerciseId: 'sprint', level: 'gold' })])).toBeNull();
  });

  it('the Ausdauer swim counts without any level (no time needed)', () => {
    expect(swimProof({}, [attempt({})])).toEqual({
      from: 'measurement',
      year: 2026,
      measurementId: 'm1',
      exerciseId: 'swim-endurance',
    });
  });

  it('the Schnelligkeit swim counts only from Bronze', () => {
    expect(swimProof({}, [attempt({ exerciseId: 'swim-sprint' })])).toBeNull();
    expect(swimProof({}, [attempt({ exerciseId: 'swim-sprint', level: 'bronze' })])?.from).toBe(
      'measurement',
    );
    expect(swimProof({}, [attempt({ exerciseId: 'swim-sprint-minutes', level: null })])).toBeNull();
  });

  it('the latest proof counts; at the same year the recorded swim', () => {
    expect(
      swimProof({ swimProofYear: 2026, swimProofWay: 'swim50' }, [attempt({ year: 2025 })]),
    ).toEqual({ from: 'entered', year: 2026, way: 'swim50' });
    expect(swimProof({ swimProofYear: 2026 }, [attempt({})])?.from).toBe('measurement');
    expect(swimProof({ swimProofYear: 2024 }, [])).toEqual({ from: 'entered', year: 2024 });
  });

  it('a first acquisition is valid with a recorded swim of the exam year', () => {
    const first = { birthYear: 2017, firstTime: true };
    const proof = swimProof({ swimProofYear: 2025 }, [attempt({})]);
    expect(swimProofStatus(first, proof, 2026)).toBe('valid');
    expect(swimProofStatus(first, swimProof({ swimProofYear: 2025 }, []), 2026)).toBe(
      'firstTimeMustSwim',
    );
    expect(swimProofStatus(first, null, 2026)).toBe('missing');
  });
});

describe('swimProofText', () => {
  it('names where the proof comes from', () => {
    const none = { measurements: [] };
    expect(swimProofText(null, none, SWIM_TEST_CATALOG)).toBe(
      'kein Nachweis eingetragen oder erfasst',
    );
    expect(swimProofText({ from: 'entered', year: 2024 }, none, SWIM_TEST_CATALOG)).toBe(
      '2024 (nur das Jahr eingetragen)',
    );
    expect(
      swimProofText({ from: 'entered', year: 2026, way: 'swim200' }, none, SWIM_TEST_CATALOG),
    ).toBe('2026: 200 m am Stück in höchstens 11 min');
    const book = {
      measurements: [
        {
          id: 'm1',
          athleteId: 'p1',
          exerciseId: 'swim-endurance',
          value: 500,
          date: '2026-06-12',
        },
      ],
    };
    expect(
      swimProofText(
        { from: 'measurement', year: 2026, measurementId: 'm1', exerciseId: 'swim-endurance' },
        book,
        SWIM_TEST_CATALOG,
      ),
    ).toBe('2026: Schwimmen (Ausdauer) erfasst am 12.06.2026');
  });
});
