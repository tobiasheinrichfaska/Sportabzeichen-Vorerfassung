import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { catalogForYear } from '../logic/catalogPackage';
import { counterReducer } from '../logic/counter';
import { parseWorkbook, serializeWorkbook } from '../logic/fileFormat';
import { suggestedFileName } from '../logic/fileName';
import { BAUM, START_BEREICH, type SeitenId } from '../logic/navigation/baum';
import { STOPWATCH_RESET, type StopwatchState } from '../logic/stopwatch';
import type { Catalog, Workbook } from '../logic/types';
import { emptyWorkbook, workbookReducer, type WorkbookAction } from '../logic/workbook';
import { clearDraft, readDraft, writeDraft } from '../io/browserDraft';
import { FILE_SUFFIX, readTextFile, saveText } from '../io/fileTransfer';
import { requestPersistence, type Persistence } from '../io/persistence';
import { currentGroup } from '../logic/children';
import { readGroupChoice, readPlace, writeGroupChoice, writePlace } from '../io/place';
import {
  isHosted,
  lookForVersion,
  storeAfterLogin,
  onUpdateNotice,
  registerServiceWorker,
  tidyAddress,
} from '../io/serviceWorker';
import { Classes } from './Classes';
import { Counter } from './Counter';
import { Messages } from './Messages';
import { Metronome } from './Metronome';
import { ReibNavi } from './navigation/ReibNavi';
import { CapturePage } from './pages/CapturePage';
import { ChildrenPage } from './pages/ChildrenPage';
import { FilePage, type UpdateState } from './pages/FilePage';
import { GroupsPage } from './pages/GroupsPage';
import type { BookProps } from './pages/GroupSwitch';
import { PlannedPage } from './pages/PlannedPage';
import { PossiblePage } from './pages/PossiblePage';
import { ChildResultPage, GroupResultPage } from './pages/ResultPages';
import { SetupPage } from './pages/SetupPage';
import { Stopwatch } from './Stopwatch';
import { useFinishVideo } from './useFinishVideo';

/** Catalog years built into this file — checked at build time, see src/build/catalogFiles.ts. */
const CATALOGS: readonly Catalog[] = __CATALOGS__;

interface Start {
  workbook: Workbook;
  /** Off while a broken draft is kept, so it is not overwritten unseen. */
  autosave: boolean;
  errors: string[];
}

function start(): Start {
  const empty = emptyWorkbook(new Date().getFullYear());
  const draft = readDraft();
  if (!draft.ok) return { workbook: empty, autosave: false, errors: [draft.error] };
  if (draft.value === null) return { workbook: empty, autosave: true, errors: [] };
  const parsed = parseWorkbook(draft.value, CATALOGS);
  if (parsed.ok) return { workbook: parsed.workbook, autosave: true, errors: [] };
  return {
    workbook: empty,
    autosave: false,
    errors: ['Der Entwurf im Browser ist beschädigt und wurde nicht geladen:', ...parsed.errors],
  };
}

export function App() {
  const [initial] = useState(start);
  const [startPage] = useState(readPlace);
  const [workbook, setWorkbook] = useState(initial.workbook);
  const [autosave, setAutosave] = useState(initial.autosave);
  const [errors, setErrors] = useState<string[]>(initial.errors);
  const [info, setInfo] = useState('');
  const [update, setUpdate] = useState<UpdateState>('idle');
  // The tools' state lives here, so a running stopwatch survives a change of page
  const [stopwatch, setStopwatch] = useState<StopwatchState>(STOPWATCH_RESET);
  const [count, countDispatch] = useReducer(counterReducer, 0);
  // the Zielvideo's camera, likewise kept while pages change
  const finishVideo = useFinishVideo();
  const [groupChoice, setGroupChoice] = useState(readGroupChoice);
  // the exercise chosen on „Erfassen“, kept while other pages are open
  const [captureExercise, setCaptureExercise] = useState<string | undefined>(undefined);
  const fileInput = useRef<HTMLInputElement>(null);
  // the newest workbook, so several changes in a row build on each other (never on a stale one)
  const latest = useRef(initial.workbook);
  const [persistence, setPersistence] = useState<Persistence | 'asking'>('asking');
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  // the workbook as last saved to a file: anything after it is only on this device
  const [savedBook, setSavedBook] = useState<Workbook | null>(null);

  useEffect(() => {
    const cameWithLogin = tidyAddress();
    void registerServiceWorker().then((error) => {
      if (error) setErrors((current) => [...current, error]);
      // came with the login: store this page; else a version stored earlier may wait for a restart
      else if (cameWithLogin) void storeAfterLogin();
      else void lookForVersion();
    });
    void requestPersistence().then(setPersistence);
    // a phone resumes the app without a new start: look for a new version then too
    const resumed = () => {
      if (document.visibilityState === 'visible') void lookForVersion();
    };
    document.addEventListener('visibilitychange', resumed);
    const stopNotices = onUpdateNotice((notice) => {
      if (notice.kind === 'new-version') setUpdate('new');
      else if (notice.kind === 'stored-after-login') {
        setUpdate(notice.ok ? 'stored' : 'not-stored');
      } else if (notice.ok)
        setUpdate((current) => (notice.isNew || current === 'new' ? 'new' : 'current'));
      else setUpdate(notice.status === 0 ? 'offline' : 'refused');
    });
    return () => {
      stopNotices();
      document.removeEventListener('visibilitychange', resumed);
    };
  }, []);

  /** Applies a change and writes the draft right away, so a storage error shows at once. */
  function commit(next: Workbook, draftOn = autosave) {
    latest.current = next;
    setWorkbook(next);
    if (!draftOn) return;
    const result = writeDraft(serializeWorkbook(next));
    if (!result.ok) setErrors([result.error]);
  }

  const dispatch = (action: WorkbookAction) => commit(workbookReducer(latest.current, action));

  async function save() {
    const today = new Date().toISOString().slice(0, 10);
    const book = latest.current;
    const outcome = await saveText(
      suggestedFileName(book, today, FILE_SUFFIX),
      serializeWorkbook(book),
    );
    const time = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    if (outcome === 'cancelled') setInfo('Sichern abgebrochen – nichts gespeichert.');
    else if (typeof outcome === 'object') setErrors([`Sichern nicht möglich: ${outcome.error}`]);
    else {
      setLastSaved(time);
      setSavedBook(book);
      setInfo(
        outcome === 'shared'
          ? `Datei übergeben (${time}) – z. B. „In Dateien sichern“ gewählt? Dann liegt sie dort.`
          : `Datei zum Speichern angeboten (${time}) – bitte im Download-Ordner prüfen.`,
      );
    }
  }

  async function open(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = parseWorkbook(await readTextFile(file), CATALOGS);
      if (!parsed.ok) {
        setErrors([`„${file.name}“ wurde nicht geöffnet:`, ...parsed.errors]);
        return;
      }
      setErrors([]);
      setAutosave(true);
      commit(parsed.workbook, true);
      setInfo(`„${file.name}“ geöffnet.`);
    } catch (error) {
      setErrors([`„${file.name}“ ist nicht lesbar: ${String(error)}`]);
    }
  }

  function restart() {
    if (!window.confirm('Alle Eingaben und den Entwurf im Browser löschen?')) return;
    const result = clearDraft();
    commit(emptyWorkbook(new Date().getFullYear()), false);
    setAutosave(result.ok);
    setErrors(result.ok ? [] : [result.error]);
    setInfo(result.ok ? 'Neu begonnen.' : '');
  }

  const catalog = catalogForYear(CATALOGS, workbook.year);
  const noCatalog = (
    <p className="message error" role="alert">
      Für das Prüfungsjahr {workbook.year} ist kein Leistungskatalog vorhanden (enthalten:{' '}
      {CATALOGS.map((entry) => `gültig ab ${entry.validFrom}`).join(', ') || 'keiner'}).
    </p>
  );

  const book: BookProps = {
    workbook,
    dispatch,
    catalog,
    group: currentGroup(workbook, groupChoice),
    chooseGroup: (groupId) => {
      setGroupChoice(groupId);
      writeGroupChoice(groupId);
    },
  };

  const pages: Partial<Record<SeitenId, () => ReactNode>> = {
    gruppen: () => <GroupsPage {...book} />,
    kinder: () => <ChildrenPage {...book} />,
    moeglich: () => <PossiblePage {...book} />,
    aufbau: () => <SetupPage {...book} />,
    erfassen: () => (
      <CapturePage
        {...book}
        exerciseId={captureExercise}
        chooseExercise={setCaptureExercise}
        stopwatch={stopwatch}
        setStopwatch={setStopwatch}
        finishVideo={finishVideo}
        count={count}
        countDispatch={countDispatch}
      />
    ),
    'je-kind': () => <ChildResultPage {...book} />,
    gruppe: () => <GroupResultPage {...book} />,
    klassen: () => (catalog ? <Classes catalog={catalog} /> : noCatalog),
    stoppuhr: () => <Stopwatch state={stopwatch} setState={setStopwatch} video={finishVideo} />,
    zaehler: () => <Counter count={count} dispatch={countDispatch} />,
    metronom: () => <Metronome />,
    datei: () => (
      <FilePage
        workbook={workbook}
        catalog={catalog}
        catalogs={CATALOGS}
        dispatch={dispatch}
        autosave={autosave}
        update={update}
        onUpdate={setUpdate}
        onSave={() => void save()}
        persistence={persistence}
        lastSaved={lastSaved}
        onOpen={() => fileInput.current?.click()}
        onRestart={restart}
      />
    ),
    uebertragen: () => <PlannedPage page="uebertragen" />,
    pruefungstag: () => <PlannedPage page="pruefungstag" />,
  };

  const showPage = (page: SeitenId) => {
    const render = pages[page];
    if (!render) return undefined;
    return (
      <>
        <Messages errors={errors} info={info} onDismissInfo={() => setInfo('')} />
        {render()}
      </>
    );
  };
  const onPlace = useCallback((knoten: string | null) => writePlace(knoten), []);

  return (
    <>
      <ReibNavi
        baum={BAUM}
        startBereich={START_BEREICH}
        startKnoten={startPage}
        onOrt={onPlace}
        seiteZeigen={showPage}
        status={
          errors.length > 0
            ? '⚠ Meldung – Seite öffnen'
            : update === 'new'
              ? 'Neue Version – neu starten'
              : workbook.measurements.length > 0 && savedBook !== workbook
                ? 'Nicht als Datei gesichert'
                : isHosted()
                  ? `Stand ${__APP_STAND__}`
                  : undefined
        }
        onStatus={
          update === 'new' && errors.length === 0 ? () => window.location.reload() : undefined
        }
      />
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => void open(event)}
      />
    </>
  );
}
