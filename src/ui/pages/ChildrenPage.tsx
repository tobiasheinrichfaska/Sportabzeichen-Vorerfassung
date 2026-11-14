import { useRef, useState, type Ref } from 'react';
import { ageInYear } from '../../logic/age';
import {
  checkChild,
  childLabel,
  groupMembers,
  inputOf,
  newChild,
  twinHint,
  type ChildInput,
} from '../../logic/children';
import { classTree } from '../../logic/classes';
import type { Athlete, Catalog, Sex } from '../../logic/types';
import { newId } from '../../io/ids';
import { GroupSwitch, NoGroup, type BookProps } from './GroupSwitch';

const EMPTY: ChildInput = { firstName: '', birthYear: '', sex: null, track: 'regular' };
const SEXES: readonly { id: Sex; label: string }[] = [
  { id: 'w', label: 'Mädchen' },
  { id: 'm', label: 'Junge' },
];

/** The fields of a child: first name, birth year, w/m, MmB — the same for entering and changing. */
function ChildFields({
  value,
  onChange,
  nameRef,
}: {
  value: ChildInput;
  onChange: (value: ChildInput) => void;
  nameRef?: Ref<HTMLInputElement>;
}) {
  return (
    <div className="entry-row">
      <label>
        Vorname
        <input
          ref={nameRef}
          value={value.firstName}
          autoComplete="off"
          enterKeyHint="next"
          onChange={(event) => onChange({ ...value, firstName: event.target.value })}
        />
      </label>
      <label className="narrow">
        Jahrgang
        <input
          value={value.birthYear}
          inputMode="numeric"
          maxLength={4}
          placeholder="JJJJ"
          onChange={(event) =>
            onChange({ ...value, birthYear: event.target.value.replace(/\D/g, '') })
          }
        />
      </label>
      <div className="chips" role="group" aria-label="Wertung">
        {SEXES.map((sex) => (
          <button
            key={sex.id}
            type="button"
            className="chip"
            aria-pressed={value.sex === sex.id}
            onClick={() => onChange({ ...value, sex: sex.id })}
          >
            {sex.label}
          </button>
        ))}
        <button
          type="button"
          className="chip"
          aria-pressed={value.track === 'mmb'}
          title="Sportabzeichen für Menschen mit Behinderung (DBS)"
          onClick={() => onChange({ ...value, track: value.track === 'mmb' ? 'regular' : 'mmb' })}
        >
          MmB
        </button>
      </div>
    </div>
  );
}

/** MmB: the possible classes (several may match) and the consent for health data. */
function MmbFields({
  child,
  catalog,
  onChange,
}: {
  child: Athlete;
  catalog: Catalog | undefined;
  onChange: (child: Athlete) => void;
}) {
  if (child.track !== 'mmb' || !catalog) return null;
  const toggle = (id: string) =>
    onChange({
      ...child,
      classIds: child.classIds.includes(id)
        ? child.classIds.filter((entry) => entry !== id)
        : [...child.classIds, id],
    });
  return (
    <div className="mmb">
      <p className="muted">
        Mögliche Behinderungsklassen – alle, die zutreffen (Hilfe: Seite „Klassen“):
      </p>
      <div className="chips" role="group" aria-label="Behinderungsklassen">
        {classTree(catalog).flatMap(({ main, subgroups }) =>
          (subgroups.length > 0 ? subgroups : [main]).map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="chip"
              aria-pressed={child.classIds.includes(entry.id)}
              title={entry.label}
              onClick={() => toggle(entry.id)}
            >
              {entry.id}
            </button>
          )),
        )}
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={child.consentOnFile}
          onChange={(event) => onChange({ ...child, consentOnFile: event.target.checked })}
        />
        Einwilligung für Gesundheitsdaten (Behinderungsklasse) liegt vor
      </label>
    </div>
  );
}

/** Page „Kinder“: enter the children of the shown group fast, change or delete one. */
export function ChildrenPage({ workbook, dispatch, catalog, group, chooseGroup }: BookProps) {
  const [entry, setEntry] = useState<ChildInput>(EMPTY);
  const [errors, setErrors] = useState<string[]>([]);
  const [twin, setTwin] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ child: Athlete; input: ChildInput } | null>(null);
  const nameField = useRef<HTMLInputElement>(null);
  if (!group) return <NoGroup />;
  const members = groupMembers(workbook, group.id);

  function add() {
    if (!group) return;
    const checked = checkChild(entry, workbook.year);
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    const hint = twinHint(members, checked.value);
    // the same name and year: added only on the second press
    if (hint && twin !== hint) {
      setTwin(hint);
      setErrors([]);
      return;
    }
    dispatch({
      type: 'addChildToGroup',
      groupId: group.id,
      athlete: newChild(checked.value, newId('k')),
    });
    // the next child is often of the same year: keep it, ask the rest again
    setEntry({ ...EMPTY, birthYear: entry.birthYear });
    setErrors([]);
    setTwin(null);
    nameField.current?.focus();
  }

  function save() {
    if (!editing) return;
    const checked = checkChild(editing.input, workbook.year);
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    dispatch({ type: 'updateAthlete', athlete: { ...editing.child, ...checked.value } });
    setEditing(null);
    setErrors([]);
  }

  function remove(child: Athlete) {
    const label = childLabel(child, members);
    if (window.confirm(`„${label}“ mit allen Werten löschen?`)) {
      dispatch({ type: 'removeAthlete', athleteId: child.id });
      setEditing(null);
    }
  }

  return (
    <section>
      <h2>Kinder – {group.name}</h2>
      <GroupSwitch workbook={workbook} group={group} chooseGroup={chooseGroup} />
      {!editing && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            add();
          }}
        >
          <ChildFields value={entry} onChange={setEntry} nameRef={nameField} />
          <div className="actions">
            <button type="submit">{twin ? 'Trotzdem hinzufügen' : 'Hinzufügen'}</button>
          </div>
        </form>
      )}
      {errors.length > 0 && (
        <div className="message error" role="alert">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}
      {twin && !editing && <p className="message info">{twin}</p>}

      <p className="muted">
        {members.length} {members.length === 1 ? 'Kind' : 'Kinder'} · Alter im Prüfungsjahr{' '}
        {workbook.year}
      </p>
      <ul className="rows">
        {members.map((child) =>
          editing?.child.id === child.id ? (
            <li key={child.id} className="row editing">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  save();
                }}
              >
                <ChildFields
                  value={editing.input}
                  onChange={(input) => setEditing({ ...editing, input })}
                />
                <MmbFields
                  child={{ ...editing.child, track: editing.input.track }}
                  catalog={catalog}
                  onChange={(changed) => setEditing({ ...editing, child: changed })}
                />
                <div className="actions">
                  <button type="submit">Speichern</button>
                  <button type="button" onClick={() => setEditing(null)}>
                    Abbrechen
                  </button>
                  <button type="button" onClick={() => remove(child)}>
                    Löschen …
                  </button>
                </div>
              </form>
            </li>
          ) : (
            <li key={child.id} className="row">
              <button
                type="button"
                className="row-main"
                onClick={() => {
                  setEditing({ child, input: inputOf(child) });
                  setErrors([]);
                }}
              >
                <strong>{childLabel(child, members)}</strong>
                <span className="muted">
                  {child.birthYear} · {ageInYear(child.birthYear, workbook.year)} Jahre ·{' '}
                  {child.sex === 'w' ? 'Mädchen' : 'Junge'}
                  {child.track === 'mmb' &&
                    ` · MmB ${child.classIds.length > 0 ? child.classIds.join(', ') : '(Klasse offen)'}`}
                </span>
              </button>
            </li>
          ),
        )}
      </ul>
      {members.length > 0 && <p className="muted">Antippen zum Ändern oder Löschen.</p>}
    </section>
  );
}
