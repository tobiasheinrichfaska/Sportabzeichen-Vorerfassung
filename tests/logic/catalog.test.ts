import {
  directionOf,
  exerciseById,
  exerciseName,
  helpParagraphs,
  findRequirements,
  requirementFromRow,
  validateCatalog,
} from '../../src/logic/catalog';
import { PUBLIC_CATALOG, TEST_CATALOG } from '../fixtures/testCatalog';
import type { Catalog, GroupId, Requirement, SpazLabel, Track } from '../../src/logic/types';

const count = (track: Track, group: GroupId) =>
  PUBLIC_CATALOG.exercises.filter(
    (exercise) => exercise.tracks.includes(track) && exercise.group === group,
  ).length;

describe('shipped catalog', () => {
  it('is consistent', () => {
    expect(validateCatalog(PUBLIC_CATALOG)).toEqual([]);
  });

  // Gruppenprüfkarte 2026: Ausdauer 6, Kraft 7, Schnelligkeit 4, Koordination 8 rows. The row
  // "Erweiterter Leistungskatalog" stands for real exercises: Kraft 6.2.6.1–4 (7 − 1 + 4 = 10) and
  // Koordination 6.4.7.1–4 (8 − 1 + 4 = 11, added 2026-11-10).
  it('has the rows of the Gruppenprüfkarte 2026 with the Erweiterter Leistungskatalog', () => {
    expect([
      count('regular', 'endurance'),
      count('regular', 'strength'),
      count('regular', 'speed'),
      count('regular', 'coordination'),
    ]).toEqual([6, 10, 4, 11]);
  });

  it('models the Erweiterter Leistungskatalog Kraft as counted exercises', () => {
    const extended = PUBLIC_CATALOG.exercises.filter((exercise) =>
      ['push-ups', 'curl-ups', 'triceps-dips', 'pull-ups'].includes(exercise.id),
    );
    expect(extended).toHaveLength(4);
    for (const exercise of extended) {
      expect(exercise).toMatchObject({ group: 'strength', measure: 'count', tracks: ['regular'] });
    }
  });

  it('lists exactly the main classes A–J', () => {
    expect(PUBLIC_CATALOG.classes.map((entry) => entry.id).join('')).toBe('ABCDEFGHIJ');
  });

  // Einzelprüfkarte MmB 2026: Ausdauer 7, Kraft 8, Schnelligkeit 4, Koordination 5 rows. Where a
  // row holds another measure kind it is an exercise of its own, as on the platform (decision (a),
  // 2026-11-01): 25 m Schwimmen in Minuten and 200 m Handbike (speed 4 + 2), Drehwurf and
  // Schleuderball (one row → two), and Fußballzielstoß of class E (coordination 5 + 1 + 1).
  it('has the rows of the Einzelprüfkarte MmB 2026, a row per measure kind', () => {
    expect([
      count('mmb', 'endurance'),
      count('mmb', 'strength'),
      count('mmb', 'speed'),
      count('mmb', 'coordination'),
    ]).toEqual([7, 8, 6, 7]);
  });

  it('models the Erweiterter Leistungskatalog Koordination (6.4.7.1–4, regular)', () => {
    const extended = ['ball-grip', 'kick-catch', 't-run', 'coordination-ladder'].map((id) =>
      exerciseById(PUBLIC_CATALOG, id),
    );
    expect(extended.map((exercise) => exercise?.measure)).toEqual([
      'count',
      'count',
      'secTenth',
      'secTenth',
    ]);
    for (const exercise of extended) expect(exercise?.tracks).toEqual(['regular']);
  });

  it('points every exercise to its official source', () => {
    for (const exercise of PUBLIC_CATALOG.exercises) expect(exercise.help.source).not.toBe('');
  });

  // Tobias 2026-11-10: „den Übungsaufbau in der App ansehen“ — in our own words, no limit tables
  it('describes the setup and the run of every exercise, MmB notes only where MmB applies', () => {
    for (const exercise of PUBLIC_CATALOG.exercises) {
      const labels = helpParagraphs(exercise.help.text).map((p) => p.label);
      expect(labels.slice(0, 2), exercise.id).toEqual(['Aufbau', 'Ablauf']);
      if (labels.includes('MmB')) expect(exercise.tracks, exercise.id).toContain('mmb');
    }
  });

  it('the setup texts carry no Bronze/Silber/Gold limits', () => {
    for (const exercise of PUBLIC_CATALOG.exercises) {
      // naming a level is fine („die Grobform reicht für Bronze“), a level with a value is not
      expect(exercise.help.text, exercise.id).not.toMatch(/(Bronze|Silber|Gold)\s*[:=(]?\s*\d/);
    }
  });

  it('carries no Verbandsabzeichen — they are not captured (removed 2026-11-01)', () => {
    expect(Object.keys(PUBLIC_CATALOG)).not.toContain('badges');
    expect(JSON.stringify(PUBLIC_CATALOG)).not.toContain('Verbandsabzeichen');
  });

  it('carries no limits yet — they come from the official tables in a separate step', () => {
    expect(PUBLIC_CATALOG.requirements).toEqual([]);
  });

  it('the test catalog is consistent too', () => {
    expect(validateCatalog(TEST_CATALOG)).toEqual([]);
  });
});

describe('helpParagraphs', () => {
  it('splits the help text into its headed paragraphs', () => {
    expect(
      helpParagraphs(['Aufbau: Bahn.', 'Ablauf: Ein Versuch.', 'Ohne Kopf.'].join('\n\n')),
    ).toEqual([
      { label: 'Aufbau', text: 'Bahn.' },
      { label: 'Ablauf', text: 'Ein Versuch.' },
      { label: null, text: 'Ohne Kopf.' },
    ]);
    expect(helpParagraphs('')).toEqual([]);
  });
});

describe('lookups', () => {
  it('finds exercises and their card wording per track', () => {
    const run = exerciseById(PUBLIC_CATALOG, 'run-endurance');
    expect(run && exerciseName(run, 'regular')).toBe('Laufen');
    expect(run && exerciseName(run, 'mmb')).toBe('Laufen / Rollstuhlfahren');
    expect(exerciseById(PUBLIC_CATALOG, 'nope')).toBeUndefined();
  });

  it('derives the direction from the order of the limits', () => {
    expect(directionOf({ bronze: 300, silver: 400, gold: 500 })).toBe('higher');
    expect(directionOf({ bronze: 340, silver: 290, gold: 250 })).toBe('lower');
  });

  it('matches requirements by exercise, track, sex, age and class', () => {
    const query = {
      exerciseId: 'run-endurance',
      track: 'regular',
      sex: 'w',
      classId: null,
    } as const;
    expect(findRequirements(TEST_CATALOG, { ...query, age: 8 })).toHaveLength(1);
    expect(findRequirements(TEST_CATALOG, { ...query, age: 9 })).toHaveLength(1);
    expect(findRequirements(TEST_CATALOG, { ...query, age: 10 })).toHaveLength(0);
    expect(findRequirements(TEST_CATALOG, { ...query, sex: 'm', age: 8 })).toHaveLength(0);
    expect(
      findRequirements(TEST_CATALOG, { ...query, track: 'mmb', classId: 'A', sex: 'm', age: 25 }),
    ).toHaveLength(1);
  });

  it('an open age band reaches any age above its start', () => {
    const query = { exerciseId: 'run-10k', track: 'regular', sex: 'm', classId: null } as const;
    expect(findRequirements(TEST_CATALOG, { ...query, age: 104 })).toHaveLength(1);
    expect(findRequirements(TEST_CATALOG, { ...query, age: 89 })).toHaveLength(0);
  });
});

describe('requirementFromRow', () => {
  const row = {
    exerciseId: 'run-endurance',
    track: 'regular',
    sex: 'w',
    ageFrom: 6,
    ageTo: 7,
    label: '800 m',
    bronze: '05:38',
    silver: '04:58',
    gold: '04:13',
  } as const;

  it('parses the limits in card notation', () => {
    expect(requirementFromRow(PUBLIC_CATALOG, row)).toEqual({
      ok: true,
      requirement: {
        exerciseId: 'run-endurance',
        track: 'regular',
        sex: 'w',
        ageFrom: 6,
        ageTo: 7,
        label: '800 m',
        thresholds: { bronze: 338, silver: 298, gold: 253 },
      },
    });
  });

  it('reports which limit is unreadable', () => {
    const result = requirementFromRow(PUBLIC_CATALOG, { ...row, silver: '5,0' });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain('Silber');
  });

  it('refuses limits for exercises judged by execution', () => {
    const result = requirementFromRow(PUBLIC_CATALOG, {
      ...row,
      exerciseId: 'gymnastics-strength',
    });
    expect(result.ok).toBe(false);
  });

  it('refuses unknown exercises', () => {
    expect(requirementFromRow(PUBLIC_CATALOG, { ...row, exerciseId: 'nope' }).ok).toBe(false);
  });
});

describe('validateCatalog finds', () => {
  const base: Requirement = {
    exerciseId: 'run-endurance',
    track: 'regular',
    sex: 'w',
    ageFrom: 8,
    ageTo: 9,
    label: '800 m',
    thresholds: { bronze: 335, silver: 290, gold: 250 },
  };
  const issues = (requirements: Requirement[], patch: Partial<Catalog> = {}) =>
    validateCatalog({ ...PUBLIC_CATALOG, ...patch, requirements }).map((issue) => issue.message);

  it.each<[string, Requirement, string]>([
    ['an unknown exercise', { ...base, exerciseId: 'nope' }, 'unbekannte Übung'],
    [
      'a track the exercise lacks',
      { ...base, exerciseId: 'stone-put', track: 'mmb', classId: 'A' },
      'nicht',
    ],
    ['MmB without class', { ...base, track: 'mmb' }, 'Behinderungsklasse fehlt'],
    [
      'MmB with an unknown class',
      { ...base, track: 'mmb', classId: 'Z' },
      'Behinderungsklasse fehlt',
    ],
    ['a regular requirement with class', { ...base, classId: 'A' }, 'mit Behinderungsklasse'],
    ['an age below 6', { ...base, ageFrom: 5 }, 'Alter unter 6'],
    ['an empty age band', { ...base, ageFrom: 9, ageTo: 8 }, 'leer'],
    [
      'equal Bronze and Gold',
      { ...base, thresholds: { bronze: 300, silver: 300, gold: 300 } },
      'gleich',
    ],
    [
      'Silber outside',
      { ...base, thresholds: { bronze: 335, silver: 360, gold: 250 } },
      'zwischen',
    ],
    [
      'non-integer limits',
      { ...base, thresholds: { bronze: 335.5, silver: 290, gold: 250 } },
      'ganze',
    ],
    ['limits on a level exercise', { ...base, exerciseId: 'gymnastics-speed' }, 'nach Ausführung'],
  ])('%s', (_name, requirement, fragment) => {
    expect(issues([requirement]).join(' ')).toContain(fragment);
  });

  it('missing limits on a measured exercise', () => {
    const withoutLimits: Requirement = {
      exerciseId: base.exerciseId,
      track: base.track,
      sex: base.sex,
      ageFrom: base.ageFrom,
      ageTo: base.ageTo,
      label: base.label,
    };
    expect(issues([withoutLimits]).join(' ')).toContain('Grenzwerte fehlen');
  });

  it('overlapping age bands for the same case', () => {
    expect(issues([base, { ...base, ageFrom: 9, ageTo: 10 }]).join(' ')).toContain('überschneidet');
    expect(issues([base, { ...base, ageFrom: 10, ageTo: 11 }])).toEqual([]);
    expect(issues([base, { ...base, sex: 'm' }])).toEqual([]);
    // another variant for the same case is a choice, not an overlap (Kegeln Asphalt/Bohle …)
    expect(issues([base, { ...base, label: 'Dauerlauf-Variante', ageFrom: 9 }])).toEqual([]);
  });

  it('duplicate ids and missing sources', () => {
    const [first] = PUBLIC_CATALOG.exercises;
    if (!first) throw new Error('no exercises');
    const messages = issues([], {
      exercises: [
        ...PUBLIC_CATALOG.exercises,
        first,
        { ...first, id: 'x', tracks: [], help: { text: '', source: ' ' } },
      ],
      classes: [...PUBLIC_CATALOG.classes, { id: 'A', label: 'doppelt' }],
    }).join(' ');
    expect(messages).toContain(`Übung „${first.id}“ ist mehrfach`);
    expect(messages).toContain('Behinderungsklasse „A“ ist mehrfach');
    expect(messages).toContain('keiner Bedingung');
    expect(messages).toContain('Hilfe ohne Quelle');
  });

  describe('SpAz labels', () => {
    const spaz = (labels: SpazLabel[]) =>
      issues([], { spaz: { source: 'x', complete: false, labels } }).join(' ');
    const label: SpazLabel = {
      track: 'mmb',
      group: 'coordination',
      label: 'Drehwurf',
      exerciseIds: ['rotation-throw'],
    };

    it('accepts the same name on both Laufzettel', () => {
      expect(spaz([label, { ...label, track: 'regular' }])).toBe('');
    });

    it('an exercise of the other Laufzettel', () => {
      // MmB "Drehwurf" once pointed at an exercise that was regular only
      expect(spaz([{ ...label, exerciseIds: ['rotation-throw', 'zone-long-jump'] }])).toContain(
        '„zone-long-jump“ gilt nicht für MmB',
      );
    });

    it('a name listed twice on one Laufzettel', () => {
      expect(spaz([label, label])).toContain('SpAz „Drehwurf“ (MmB, Koordination) ist mehrfach');
    });
  });
});
