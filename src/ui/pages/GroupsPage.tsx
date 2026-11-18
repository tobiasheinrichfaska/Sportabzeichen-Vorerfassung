import { useState } from 'react';
import {
  checkGroupName,
  childrenWithoutGroup,
  exampleChildren,
  groupMembers,
  newChild,
  onlyInGroup,
} from '../../logic/children';
import { newId } from '../../io/ids';
import type { BookProps } from './GroupSwitch';

/** Page „Gruppen“: create, choose, rename and delete groups of children. */
export function GroupsPage({ workbook, dispatch, group, chooseGroup }: BookProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const loose = childrenWithoutGroup(workbook);

  function create() {
    const checked = checkGroupName(workbook, name);
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    const id = newId('g');
    dispatch({ type: 'addGroup', group: { id, name: checked.name, athleteIds: [] } });
    chooseGroup(id);
    setName('');
    setError('');
  }

  /** A group „Beispiel“ with four invented children, to try everything without typing. */
  function example() {
    const name = checkGroupName(workbook, 'Beispiel').ok
      ? 'Beispiel'
      : `Beispiel ${workbook.groups.length + 1}`;
    const id = newId('g');
    dispatch({ type: 'addGroup', group: { id, name, athleteIds: [] } });
    for (const child of exampleChildren(workbook.year)) {
      dispatch({ type: 'addChildToGroup', groupId: id, athlete: newChild(child, newId('k')) });
    }
    chooseGroup(id);
    setError('');
  }

  function rename() {
    if (!renaming) return;
    const target = workbook.groups.find((entry) => entry.id === renaming.id);
    const checked = checkGroupName(workbook, renaming.name, renaming.id);
    if (!target || !checked.ok) {
      setError(checked.ok ? 'Die Gruppe gibt es nicht mehr.' : checked.error);
      return;
    }
    dispatch({ type: 'updateGroup', group: { ...target, name: checked.name } });
    setRenaming(null);
    setError('');
  }

  function remove(groupId: string, groupName: string) {
    const leaving = onlyInGroup(workbook, groupId).length;
    const question =
      leaving > 0
        ? `Gruppe „${groupName}“ löschen? ${leaving} ${leaving === 1 ? 'Kind ist' : 'Kinder sind'} nur in dieser Gruppe und ${leaving === 1 ? 'wird' : 'werden'} mit allen Werten gelöscht.`
        : `Gruppe „${groupName}“ löschen? Ihre Kinder bleiben in ihren anderen Gruppen.`;
    if (window.confirm(question)) dispatch({ type: 'removeGroupWithChildren', groupId });
  }

  return (
    <section>
      <h2>Gruppen</h2>
      <form
        className="entry-row"
        onSubmit={(event) => {
          event.preventDefault();
          create();
        }}
      >
        <label>
          Neue Gruppe
          <input
            value={name}
            placeholder="z. B. Klasse 3b"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <button type="submit">Anlegen</button>
      </form>
      {error && (
        <p className="message error" role="alert">
          {error}
        </p>
      )}
      {workbook.groups.length === 0 ? (
        <p className="muted">Noch keine Gruppe. Lege eine an und trage dann ihre Kinder ein.</p>
      ) : (
        <ul className="rows">
          {workbook.groups.map((entry) => {
            const count = groupMembers(workbook, entry.id).length;
            const shown = entry.id === group?.id;
            return (
              <li key={entry.id} className={shown ? 'row chosen' : 'row'}>
                {renaming?.id === entry.id ? (
                  <form
                    className="entry-row"
                    onSubmit={(event) => {
                      event.preventDefault();
                      rename();
                    }}
                  >
                    <input
                      aria-label="Neuer Name"
                      value={renaming.name}
                      onChange={(event) => setRenaming({ id: entry.id, name: event.target.value })}
                    />
                    <button type="submit">Speichern</button>
                    <button type="button" onClick={() => setRenaming(null)}>
                      Abbrechen
                    </button>
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      className="row-main"
                      aria-pressed={shown}
                      onClick={() => chooseGroup(entry.id)}
                    >
                      <strong>{entry.name}</strong>
                      <span className="muted">
                        {count} {count === 1 ? 'Kind' : 'Kinder'}
                        {shown ? ' · wird gezeigt' : ''}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenaming({ id: entry.id, name: entry.name })}
                    >
                      Umbenennen
                    </button>
                    <button type="button" onClick={() => remove(entry.id, entry.name)}>
                      Löschen
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="actions">
        <button type="button" onClick={example}>
          Beispielgruppe mit 4 erfundenen Kindern
        </button>
      </div>
      {loose.length > 0 && (
        <p className="message info">
          {loose.length} {loose.length === 1 ? 'Kind gehört' : 'Kinder gehören'} zu keiner Gruppe
          (aus einer älteren Datei): {loose.map((child) => child.firstName).join(', ')}.
        </p>
      )}
      <p className="muted">
        Die gezeigte Gruppe gilt für „Kinder“, „Planen“, „Möglich“, „Erfassen“, „Je Kind“ und
        „Gruppe“. Ein Tipp auf eine Gruppe zeigt sie.
      </p>
    </section>
  );
}
