# Critical User Paths — Sportabzeichen-Vorerfassung

**Purpose:** Core workflows that must not break. Audit validates these end-to-end.
Unchecked items are planned but not built yet (status 2026-11-10).

## App & storage

- [x] **Open `dist/index.html` offline by double-click** — app renders, no network request, CSP present
- [x] **Edit year/organisation, reload the page** — draft restored from the browser
- [x] **"Als Datei speichern" → "Datei öffnen …"** — identical workbook restored
- [x] **Open a damaged or foreign file** — refused with every reason listed, current data untouched
- [x] **"Neu beginnen"** — after confirmation all data and the browser draft are gone

## Navigation and hosted app (2026-11-10)

- [x] **Reibräder:** six areas, every page reachable, swipe to the neighbour, back by the small wheel and the system's back (MT-15, `navigation.test.ts`)
- [x] **The app reopens its page** within 4 hours (MT-16)
- [x] **Hosted app installs to the home screen** and starts offline from its cache (MT-18)
- [x] **Once opened with the right, it opens anywhere without a login** — no request with credentials while a copy is cached (`tests/build/sw.test.ts`, MT-19)
- [x] **New version in the office arrives quietly** — „Neue Version bereit“, „Jetzt neu starten“ (MT-20); unterwegs „Mit Anmeldung aktualisieren“, refused → cached copy (MT-21)
- [x] **„Übertragen“ and „Prüfungstag“ foreseen** as planned pages (MT-17)

## Measuring tools

- [x] **Stoppuhr: Start → Zieleinlauf ×n → Stopp** — one time per finisher, readings for Schnelligkeit (1/10 s) and Ausdauer (s), finer digits cut off, one finer digit shown for the examiner
- [x] **Stoppuhr keeps running while switching pages** (state in `App.tsx`, MT-08)
- [x] **Zielvideo** — with the camera on, each „Zieleinlauf“ keeps the pictures from 2 s before to 1 s after, the press marked; step through them and take the time of a picture as the finish time — only where the camera gives its capture time, else the pictures show no time and the pressed time counts; pictures only in memory, gone on reset (`finishVideo.ts`, `finishVideo.test.ts`, MT-42; real phones still to check)
- [x] **Pressed times are the moment of the touch** — Start/Stopp/Zieleinlauf use the input event's time, so a busy phone (camera) cannot make a time late (`pressTime`, `stopwatch.test.ts`)
- [x] **Zähler counts on touch (pointer down), −1 corrects, never below 0**
- [x] **Metronom: Curl-Up preset 40 BPM, sound + light in time, hoch/runter, repetitions counted**

## Catalog and reference pages

- [x] **Catalog per exam year** — the package with the latest "gültig ab" not after the exam year is used; a year without catalog shows a clear message (MT-14)
- [x] **Broken catalog package stops the build** — every problem listed (`src/build/catalogFiles.test.ts`)
- [x] **Page „Klassen“ (Behinderungsklassen)** — A–J listed; subgroups/criteria appear once the local package has them (MT-12)
- [x] **No Verbandsabzeichen** (removed 2026-11-01) — no page, no catalog list; an old file with an empty badge list opens, a file with badges is refused with its reason (MT-13, `fileFormat.test.ts`)

## Capture (planned)

- [x] **Enter a group of children** — first name, birth year, w/m (MmB with possible classes and consent); same name + year asked twice; group delete takes only its own children (MT-22…MT-27, `children.test.ts`)
- [x] **„Möglich“: which Abnahmen the children of a group can do** — by exercise or by child, with variants (`overview.test.ts`)
- [x] **MmB athlete with several possible classes** — "Klasse ausschlaggebend" shown where requirements differ
- [ ] **Einstufung:** classes A–J with subgroups and criteria shown, several selectable, single classes deactivatable
- [x] **Enter a measurement in card notation** („Erfassen“, `capture.test.ts`) — level Bronze/Silber/Gold shown immediately
- [x] **Every exercise opens its help entry** — page „Aufbau“ and the fold „Aufbau“ in „Möglich“ / „Erfassen“ (MT-34)
- [x] **Metronome at the station** for every exercise whose official text sets a beat (Curl-Up required, Push-Ups guide; MT-38, `metronome.test.ts`)
- [x] **Tools at hand while an exercise runs** — „Erfassen“ shows the stopwatch open for timed exercises, the counter for counted ones, plus the metronome where a beat is set; same state as the tool pages (`stationTools`, MT-40, `capture.test.ts`)
- [x] **Card notation everywhere** — long times in minutes as on the cards (e.g. „75:00“, never „1:15:00“), variant names as on the cards (Zielwurf H III distances, „…, rechts und links zusammen“, „Rollstuhlparcours“; MT-41, `measure.test.ts`; converter tests in the private companion repo)
- [x] **Ausführung per variant** — ladder step sequence (picture, steps, video link) and Gerätturnen element (material, picture strip, task per level) of the child's age in „Möglich“, „Erfassen“, „Aufbau“; only with the local package (MT-37, `overview.test.ts`, `catalogPackage.test.ts`, `catalogFiles.test.ts`)
- [ ] **Ausgleichsbedingung / Klassenkombination** captured as free text with the examiner's level
- [x] **Final exam profile** („Je Kind“) — examiner picks the measurement taken over per group; otherwise the best counts
- [x] **Evaluation per athlete** („Je Kind“, „Gruppe“) — points, award, swim proof status, blocking notes (consent, open manual decision), paper-card route
- [ ] **Transfer to SpAz** (view in SpAz order for typing in) and values for the DOSB Mustervorlage

| Path                 | Impact                                       | Audit Check                                                                |
| -------------------- | -------------------------------------------- | -------------------------------------------------------------------------- |
| Offline single file  | App unusable at the sports ground without it | Build, grep `dist/index.html` for CSP and absence of external `src`/`href` |
| Start without login  | Examiner locked out on the sports ground     | `tests/build/sw.test.ts` + MT-19 on a phone outside the office             |
| Save/open file       | Data loss (Safari wipes drafts after 7 days) | `tests/logic/fileFormat.test.ts` round trip + manual MT-02/MT-03           |
| Damaged file refused | Half-loaded data would corrupt results       | `fileFormat.test.ts` refusal cases + MT-04                                 |
| Evaluation rules     | Wrong medal awarded                          | `tests/logic/evaluation.test.ts`, `swim.test.ts`, catalog validation empty |
| Stopwatch/counter    | Wrong measured values                        | `tests/logic/stopwatch.test.ts` + MT-06…MT-10                              |
