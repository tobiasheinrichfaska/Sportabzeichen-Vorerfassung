import type { AthleteGroup, Catalog, Workbook } from '../../logic/types';
import type { WorkbookAction } from '../../logic/workbook';

/** What every page about the group gets from the app. */
export interface BookProps {
  workbook: Workbook;
  dispatch: (action: WorkbookAction) => void;
  catalog: Catalog | undefined;
  /** The group shown (pages „Kinder“, „Planen“, „Möglich“, „Erfassen“, „Je Kind“, „Gruppe“). */
  group: AthleteGroup | undefined;
  chooseGroup: (groupId: string) => void;
}

/** The groups as buttons to tap (no drop-down); the shown one is marked. */
export function GroupSwitch({
  workbook,
  group,
  chooseGroup,
}: Pick<BookProps, 'workbook' | 'group' | 'chooseGroup'>) {
  if (workbook.groups.length < 2) return null;
  return (
    <div className="chips" role="group" aria-label="Gruppe wählen">
      {workbook.groups.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className="chip"
          aria-pressed={entry.id === group?.id}
          onClick={() => chooseGroup(entry.id)}
        >
          {entry.name}
        </button>
      ))}
    </div>
  );
}

/** Shown where a page needs the limit tables and this file has none (the public plain file). */
export function NoLimits() {
  return (
    <p className="message info">
      Diese Datei wurde ohne Grenzwerte gebaut. Die Tabellen von DOSB und DBS kommen aus einem
      lokalen Datenpaket, das nicht veröffentlicht wird.
    </p>
  );
}

/** Shown where a page needs a group and there is none yet. */
export function NoGroup() {
  return (
    <p className="message info">
      Noch keine Gruppe – zuerst auf der Seite „Gruppen“ (Rad: „Vorbereiten“ › „Gruppen“) eine
      Gruppe anlegen.
    </p>
  );
}
