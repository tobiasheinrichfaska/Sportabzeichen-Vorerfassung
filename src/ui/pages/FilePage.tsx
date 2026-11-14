import { GROUPS, TRACKS } from '../../logic/reference';
import type { Catalog, Workbook } from '../../logic/types';
import type { WorkbookAction } from '../../logic/workbook';
import { isHosted, lookForVersion, updateWithLogin } from '../../io/serviceWorker';

/** What the last look for a new version found. */
export type UpdateState =
  'idle' | 'looking' | 'current' | 'new' | 'offline' | 'refused' | 'stored' | 'not-stored';

const UPDATE_TEXT: Record<Exclude<UpdateState, 'idle'>, string> = {
  looking: 'Suche nach einer neuen Version …',
  current: 'Diese Version ist aktuell.',
  new: 'Eine neue Version ist geladen – sie gilt nach dem Neustart der App.',
  offline: 'Keine Verbindung – die gespeicherte Version läuft weiter.',
  refused:
    'Ohne Anmeldung nicht erreichbar (außerhalb des Büronetzes) – die gespeicherte Version läuft weiter.',
  stored: 'Mit der Anmeldung aktualisiert – diese Version startet jetzt auch ohne Anmeldung.',
  'not-stored':
    'Diese Version läuft, ließ sich aber nicht speichern – beim nächsten Start kommt die vorige. Bitte im Büro-WLAN öffnen.',
};

/** Page „Datei“: save, open, start anew, the exam year and organisation, the catalog, updates. */
export function FilePage({
  workbook,
  catalog,
  catalogs,
  dispatch,
  autosave,
  update,
  onUpdate,
  onSave,
  onOpen,
  onRestart,
  persistence,
  lastSaved,
}: {
  workbook: Workbook;
  catalog: Catalog | undefined;
  catalogs: readonly Catalog[];
  dispatch: (action: WorkbookAction) => void;
  autosave: boolean;
  update: UpdateState;
  onUpdate: (state: UpdateState) => void;
  onSave: () => void;
  onOpen: () => void;
  onRestart: () => void;
  persistence: 'granted' | 'denied' | 'unsupported' | 'asking';
  lastSaved: string | null;
}) {
  const { organisation } = workbook;
  const setOrganisation = (patch: Partial<Workbook['organisation']>) =>
    dispatch({ type: 'setOrganisation', organisation: { ...organisation, ...patch } });

  return (
    <>
      <section>
        <h2>Speichern</h2>
        <div className="actions">
          <button type="button" onClick={onSave}>
            Als Datei speichern
          </button>
          <button type="button" onClick={onOpen}>
            Datei öffnen …
          </button>
          <button type="button" onClick={onRestart}>
            Neu beginnen
          </button>
        </div>
        <p className="muted">
          {autosave
            ? 'Alle Eingaben werden automatisch auf diesem Gerät gespeichert. Verlässlich ist nur die gespeicherte Datei – Browserdaten können verloren gehen (z. B. löscht Safari sie nach sieben Tagen ohne Nutzung).'
            : 'Automatisches Speichern auf diesem Gerät ist aus.'}
        </p>
        <p className={lastSaved ? 'muted' : 'message info'}>
          {lastSaved
            ? `Zuletzt als Datei gesichert: ${lastSaved}.`
            : 'In dieser Sitzung noch nicht als Datei gesichert – nach dem Erfassen „Als Datei speichern“ tippen.'}{' '}
          Speicher auf diesem Gerät:{' '}
          {persistence === 'granted'
            ? 'dauerhaft (der Browser löscht ihn nicht von sich aus).'
            : persistence === 'asking'
              ? '…'
              : 'kann vom Browser geleert werden – darum die Datei sichern.'}
        </p>
        <p className="muted">
          Die Datei enthält personenbezogene Daten und bei MmB Gesundheitsdaten
          (Behinderungsklasse). Nur auf eigenen Geräten verwenden und sicher aufbewahren.
        </p>
      </section>

      <section>
        <h2>Prüfung</h2>
        <div className="fields">
          <label>
            Prüfungsjahr
            <input
              type="number"
              value={workbook.year}
              onChange={(event) => dispatch({ type: 'setYear', year: Number(event.target.value) })}
            />
          </label>
          <label>
            Verein / Schule / Organisation
            <input
              value={organisation.name}
              onChange={(event) => setOrganisation({ name: event.target.value })}
            />
          </label>
          <label>
            PLZ
            <input
              value={organisation.postalCode}
              inputMode="numeric"
              onChange={(event) => setOrganisation({ postalCode: event.target.value })}
            />
          </label>
          <label>
            Ort
            <input
              value={organisation.city}
              onChange={(event) => setOrganisation({ city: event.target.value })}
            />
          </label>
        </div>
        <p className="muted">
          {workbook.athletes.length} Kinder · {workbook.groups.length} Gruppen ·{' '}
          {workbook.measurements.length} Messwerte
        </p>
      </section>

      {catalog ? (
        <section>
          <h2>Leistungskatalog (gültig ab {catalog.validFrom})</h2>
          <table>
            <thead>
              <tr>
                <th>Gruppe</th>
                {TRACKS.map((track) => (
                  <th key={track.id}>Übungen {track.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GROUPS.map((group) => (
                <tr key={group.id}>
                  <td>{group.label}</td>
                  {TRACKS.map((track) => (
                    <td key={track.id}>
                      {
                        catalog.exercises.filter(
                          (exercise) =>
                            exercise.group === group.id && exercise.tracks.includes(track.id),
                        ).length
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">
            Hinterlegte Leistungsanforderungen: {catalog.requirements.length}.{' '}
            {catalog.requirements.length === 0 &&
              'Die Grenzwerte für Bronze/Silber/Gold kommen aus einem lokalen Datenpaket, das in dieser Datei nicht enthalten ist; ohne sie ist keine Bewertung möglich.'}
          </p>
          <p className="muted">
            Leistungsdaten: © DOSB bzw. DBS (MmB). Sie gehören nicht zur Lizenz dieser App; ihre
            Nutzung oder Weitergabe ist direkt mit dem DOSB bzw. dem DBS zu klären.
          </p>
        </section>
      ) : (
        <p className="message error" role="alert">
          Für das Prüfungsjahr {workbook.year} ist kein Leistungskatalog vorhanden (enthalten:{' '}
          {catalogs.map((entry) => `gültig ab ${entry.validFrom}`).join(', ') || 'keiner'}).
        </p>
      )}

      <section>
        <h2>App</h2>
        <p className="muted">
          Version {__APP_VERSION__} · Stand {__APP_STAND__} · läuft vollständig auf diesem Gerät und
          sendet keine Daten.
        </p>
        {isHosted() && (
          <>
            <div className="actions">
              <button
                type="button"
                onClick={() => {
                  onUpdate('looking');
                  void lookForVersion().then((ok) => {
                    if (!ok) onUpdate('offline');
                  });
                }}
              >
                Nach neuer Version suchen
              </button>
              <button type="button" onClick={updateWithLogin}>
                Mit Anmeldung aktualisieren
              </button>
              {update === 'new' && (
                <button type="button" onClick={() => window.location.reload()}>
                  Jetzt neu starten
                </button>
              )}
            </div>
            {update !== 'idle' && (
              <p className={update === 'new' ? 'message info' : 'muted'} role="status">
                {UPDATE_TEXT[update]}
              </p>
            )}
            <p className="muted">
              Die App startet immer aus dem Speicher dieses Geräts, auch ohne Netz und außerhalb des
              Büros – ohne Anmeldung. Neue Versionen kommen im Büronetz von selbst; unterwegs holt
              „Mit Anmeldung aktualisieren“ sie mit der Tester-Anmeldung.
            </p>
          </>
        )}
      </section>
    </>
  );
}
