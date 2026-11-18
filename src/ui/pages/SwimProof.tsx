import { useState } from 'react';
import { ageInYear } from '../../logic/age';
import { evaluateAthlete } from '../../logic/evaluation';
import {
  BADGE_TAKERS_FROM_12,
  SWIM_STATUS_TEXT,
  swimProofText,
  swimWayLabel,
  swimWaysFor,
  type SwimWay,
} from '../../logic/swim';
import type { Athlete, Catalog, Workbook } from '../../logic/types';
import type { WorkbookAction } from '../../logic/workbook';

/** Without the year the way goes too (it described that year's proof). */
function withoutProof(child: Athlete): Athlete {
  const { swimProofYear: _year, swimProofWay: _way, ...rest } = child;
  void _year;
  void _way;
  return rest;
}

/**
 * The swim proof of one child (Kap. 4.2): what counts and why, the ways open to its age as chips
 * (tapped = given in the exam year), and — not compact — the year of an earlier proof.
 */
export function SwimProofEditor({
  child,
  workbook,
  catalog,
  dispatch,
  compact = false,
}: {
  child: Athlete;
  workbook: Workbook;
  catalog: Catalog;
  dispatch: (action: WorkbookAction) => void;
  compact?: boolean;
}) {
  const { year } = workbook;
  // what is being typed: the stored year changes only with four digits (or none)
  const [draft, setDraft] = useState<string | null>(null);
  const evaluation = evaluateAthlete(child, workbook, catalog);
  const proof = evaluation.swimProof;
  const age = ageInYear(child.birthYear, year);
  const ways = swimWaysFor(age);
  const save = (athlete: Athlete) => dispatch({ type: 'updateAthlete', athlete });
  const chosen = (way: SwimWay) => child.swimProofYear === year && child.swimProofWay === way;
  const toggle = (way: SwimWay) =>
    save(chosen(way) ? withoutProof(child) : { ...child, swimProofYear: year, swimProofWay: way });

  return (
    <div className="swim-proof">
      <p className={evaluation.swim === 'valid' ? 'muted' : 'message error'}>
        {SWIM_STATUS_TEXT[evaluation.swim]}{' '}
        <span>Nachweis: {swimProofText(proof, workbook, catalog)}</span>
      </p>
      <div className="chips" role="group" aria-label={`Schwimmnachweis ${year}`}>
        <span className="muted chip-label">{year} erbracht durch:</span>
        {ways.map((way) => (
          <button
            key={way}
            type="button"
            className="chip plan"
            aria-pressed={chosen(way)}
            onClick={() => toggle(way)}
          >
            {chosen(way) ? '✓ ' : ''}
            {swimWayLabel(way)}
          </button>
        ))}
      </div>
      {!compact && (
        <>
          {age >= 12 && <p className="muted">Abzeichen ab 12 Jahren: {BADGE_TAKERS_FROM_12}.</p>}
          <p className="muted">
            Ohne Eintrag zählt von selbst: Schwimmen (Ausdauer), in „Erfassen“ erfasst – auch ohne
            Bronze, die Strecke muss nur ganz geschwommen sein –, oder Schwimmen (Schnelligkeit) ab
            Bronze.
          </p>
          <div className="entry-row">
            <label className="narrow">
              Nachweisjahr (auch ein früheres)
              <input
                value={draft ?? String(child.swimProofYear ?? '')}
                inputMode="numeric"
                maxLength={4}
                placeholder="JJJJ"
                onChange={(event) => {
                  const text = event.target.value.replace(/\D/g, '');
                  if (text.length === 4 && Number(text) !== child.swimProofYear) {
                    // a typed year is one whose way is not known here
                    save({ ...withoutProof(child), swimProofYear: Number(text) });
                    setDraft(null);
                  } else if (text === '') {
                    save(withoutProof(child));
                    setDraft(null);
                  } else setDraft(text);
                }}
                onBlur={() => setDraft(null)}
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={child.firstTime}
                onChange={(event) => save({ ...child, firstTime: event.target.checked })}
              />
              Erstmaliger Erwerb
            </label>
          </div>
        </>
      )}
    </div>
  );
}
