import { classTree } from '../logic/classes';
import type { Catalog } from '../logic/types';

/** Einstufungshilfe: the Behinderungsklassen with subgroups and criteria of the catalog. */
export function Classes({ catalog }: { catalog: Catalog }) {
  const tree = classTree(catalog);
  const detailed = catalog.classes.some((entry) => entry.description || entry.parentId);

  return (
    <section>
      <h2>Behinderungsklassen</h2>
      <p className="muted">
        Für das Sportabzeichen für Menschen mit Behinderung (DBS). Es können mehrere Klassen
        zutreffen; der Prüfer kann einzelne davon deaktivieren. Die Auswahl je Person kommt mit der
        Erfassungsansicht.
      </p>
      {!detailed && (
        <p className="message info">
          Untergruppen und Einstufungskriterien sind noch nicht hinterlegt – sie kommen aus dem
          DBS-Handbuch über das lokale Datenpaket.
        </p>
      )}
      {tree.map(({ main, subgroups }) => (
        <details key={main.id} className="class-branch">
          <summary>
            <strong>{main.id}</strong> – {main.label}
          </summary>
          {main.description && <p>{main.description}</p>}
          {subgroups.length > 0 && (
            <ul>
              {subgroups.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.id}</strong> – {entry.label}
                  {entry.description && <p className="muted">{entry.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </details>
      ))}
    </section>
  );
}
