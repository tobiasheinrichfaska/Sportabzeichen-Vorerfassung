# CLAUDE.md — Sportabzeichen-Vorerfassung

> Workspace-wide conventions (language, git, build, architecture, testing, collaboration):
> [`c:\skripte\private\general stuff\CLAUDE.md`](../../private/general%20stuff/CLAUDE.md)

---

## Project overview

Vorerfassung (pre-capture) for the Deutsches Sportabzeichen — **regular (DOSB conditions) and
for Menschen mit Behinderung (MmB, DBS conditions)** — as **one offline HTML file** with local
storage (browser draft + saved JSON file). Public repo (AGPLv3 + commercial).

Core idea (Tobias, 2026-11-01): select **athletes** (one, a group, all — MmB athletes carry their
_possible_ Behinderungsklassen) and **exercises** (one, a Disziplingruppe, all); the app shows,
**by athlete or by exercise**, which combinations are possible and under which requirement; where
an athlete's possible classes lead to different requirements, the class is marked **decisive**.
Measurements are captured right there. Every exercise has a **help entry**. A **stopwatch**, a fast
**tally counter** and a **metronome** measure exercises directly. **Verbandsabzeichen** (Kap. 8.4)
are deliberately **not** part of the project (Tobias, 2026-11-01; tab, Taekwondo scheme, badge list
and `BadgeRecord` removed — last state in commit `dccb37d`).

**Platform:** web — one HTML file, two builds: the plain file (`npm run build` → `dist/`, runs from
`file://`) and the **hosted app** to install on the home screen (`npm run build:hosted` →
`dist-hosted/` + service worker, manifest, icons), iPad/iPhone/Android/desktop
**Language:** TypeScript + React 19
**Architecture:** Vite 8 + `vite-plugin-singlefile` (pattern of `public/Fragebogen`).
`src/logic/` is UI-free and fully unit-tested; `src/io/` wraps browser APIs (localStorage, file
download/upload, service worker); `src/ui/` renders and dispatches only. A build step adds a
hash-based Content-Security-Policy that forbids every network connection from the page
(`src/build/csp.ts`; the hosted profile only adds its own worker and manifest). Navigation:
**Reibräder** taken over from `private/TKD-Trainerbuch` (see below).

---

## Standalone app (Tobias 2026-11-10)

„Erstelle die App, komplett zum Standalone-Betrieb … Schwesterordner zu den anderen beiden auf der
Kanzlei gehosteten Apps … Datenübertragung an ein anderes Gerät und Zusammenschluss mit anderen
Geräten für einen Prüfungstag vorsehen, vorerst leer … Navigation: unsere neue Rad-Navigation …
eine Gruppe Kinder eingeben, sehen, welche Abnahmen ich machen kann, den Übungsaufbau ansehen,
Zeiten bzw. Leistungsdaten erfassen. Die Kinder werden mit Vornamen und Geburtsjahr angelegt.“
Later the same day: „Beachte, dass die App, wenn sie einmal berechtigt aufgerufen wurde, auch
außerhalb des Büronetzes aufgerufen werden können soll, ohne ein Login zu erfordern.“

**Decisions (2026-11-10):**

- **Limit tables go into the hosted file** (his choice „Mit Tabellen, geschützt“): the folder is
  protected like the other two apps (office IPs or tester login), the app names the rights of
  DOSB/DBS; before other examiners get access he clarifies it with DOSB/DBS. The public repo still
  never holds the tables (`catalog/local/`, `dist-hosted/` gitignored).
- **Page tree** (his „So bauen“): six areas of three — Vorbereiten (Gruppen · Kinder · Möglich —
  since 2026-11-18 · Planen, see below),
  Übungen (Aufbau · Möglich · Klassen), Abnahme (Stoppuhr · Erfassen · Zähler), Werkzeuge (Zähler ·
  Stoppuhr · Metronom), Ergebnis (Je Kind · Gruppe · Erfassen), Geräte (Datei · Übertragen ·
  Prüfungstag). „Übertragen“ and „Prüfungstag“ are planned pages with a description only.
- **Children:** first name + birth year (Jahrgangsprinzip: age = exam year − birth year); the sex
  is needed too, because every table has w/m columns.

**Phases (all built 2026-11-10):** 1 wheels + hosted app + folder (`791059d`, uploaded) · 2
children and groups (`60ce27d`) · 3 limits (model change (a), subclasses, converter with the
official corrections) and „Möglich“ + 4 „Erfassen“, „Je Kind“, „Gruppe“ (`f6cf677`, uploaded with
the tables — Tobias needed „zeitnah eine erste App zum Installieren, damit ich das Gerät
freischalten kann“) · 5 „Aufbau“ (see below). Planned and empty: „Übertragen“, „Prüfungstag“.

### Exercise setup „Aufbau“ (phase 5, 2026-11-10)

- Every exercise's `help.text` holds paragraphs „Aufbau: …“, „Ablauf: …“ and, for MmB exercises
  where the DBS handbook adds something, „MmB: …“ (`helpParagraphs`), `help.source` the exact
  chapters. Written **in our own words** from the Prüfungswegweiser 2026, the Erweiterter
  Leistungskatalog 2026 and the DBS handbook (rendered pages where pypdf mixed text layers), no
  limit values (guard test: no level followed by a number). What the sources leave open is not in
  the text but in `docs/aufbau-offene-punkte.md` (37 exercises with open points) — to clarify.
- Page „Aufbau“ (`SetupPage.tsx`): „Für <Gruppe>“ (only what the group can do) or „Alle Übungen“;
  the same text folds out under each exercise of „Möglich“ and „Erfassen“ (`SetupText`).
- Found while writing: the DBS handbook (4.29) scores Zielwurf by ring points 1/3/6, best 5 of 6 —
  measure `points` again (the platform calls it a count).

### Children and groups (phase 2, 2026-11-10)

- **File format version 2:** `Athlete.birthYear` replaces `birthDate`, `lastName` is optional.
  Version-1 files are read (`READABLE_VERSIONS`): a readable date becomes its year, an unreadable
  one is named („Geburtsdatum ungültig“), an empty last name goes, a filled one stays; written as 2.
- `src/logic/children.ts`: `checkChild` (first name ≤ 40, four-digit birth year, at least 6 in the
  exam year, plausible, w/m — every reason at once), `newChild`, `groupMembers` (by first name, then
  year), `childLabel` (birth year added where names repeat), `twinHint` (same name + year: added
  only on the second press), `currentGroup`, `onlyInGroup`, `checkGroupName`. Reducer actions
  `addChildToGroup` and `removeGroupWithChildren` (children only in that group go with all their
  values; children in another group stay).
- Pages „Gruppen“ (`GroupsPage.tsx`) and „Kinder“ (`ChildrenPage.tsx`): choices are tapped, no
  drop-downs; the shown group (`GroupSwitch.tsx`) is remembered in localStorage
  `sportabzeichen-vorerfassung:gruppe` and holds for „Kinder“, „Möglich“, „Erfassen“, „Je Kind“,
  „Gruppe“. MmB per child: possible classes as buttons (subgroups where the catalog has them) and
  the consent for health data. Ids: `src/io/ids.ts` (`crypto.getRandomValues`, also on file://).

### Limits, „Möglich“, „Erfassen“, results (phases 3–4, 2026-11-10)

- **Model change (a) done:** own exercises where the platform has another measure kind —
  `swim-sprint-minutes`, `handbike-sprint`; MmB Drehwurf/Schleuderball are the regular
  `rotation-throw`/`sling-ball` (tracks regular + mmb, `rotation-sling-mmb` gone); new
  `football-target` (class E) and the **Erweiterter Leistungskatalog Koordination** 6.4.7.1–4
  (`ball-grip`, `kick-catch`, `t-run`, `coordination-ladder`, regular from 6); Zielwurf and
  Fußballzielstoß count ring points (DBS-Handbuch 4.29: 1/3/6, best 5 of 6 — the platform calls it
  a count); Kegeln „Asphalt“. `spaz.json` now `complete: true` (badges deliberately left out).
- **Variants:** several requirements may apply to one case when their `label` differs (Kegeln
  Asphalt/Bohle/Bowling/Schere, a distance or Dauerschwimmen …): `Combination.variants[].options`,
  `Measurement.variant`, `chooseOption` (only one → no choice; several without a choice →
  `variantUndecided`, never a guess). Overlap check per case + label, bucketed (17 669 rows).
- **Converter** `npm run katalog:lokal` (`tools/katalog-lokal.ts`, `tools/localCatalog.ts` with
  its tests — kept in the private companion repo, gitignored here) builds `catalog/local/` (limits
  in card notation, classes with subgroups); writes nothing on any problem. Details in the private companion repo (`docs/privat/plattform-abgleich.md`).
  Logic imports carry `.ts` endings so Node runs the converter directly.
- Pages: „Möglich“ (`PossiblePage.tsx`, logic `overview.ts`: je Übung / je Kind, variants, „Klasse
  entscheidet“, groups without any exercise in red), „Erfassen“ (`CapturePage.tsx`, logic
  `capture.ts`: exercise chips by group, class and variant chips where needed, live level, ⏱ takes
  the next finish time of the stopwatch, counter value, attempts with level and delete), „Je Kind“
  and „Gruppe“ (`ResultPages.tsx`: level per group with what counts, choose the counting attempt,
  swim proof year, first time, notes; the group as a table).

### Ready for the phone (2026-11-10, before Tobias' live test with four children on 2026-11-11)

Tobias: „setze nun um was geht, ich möchte auf dem Handy so viel wie möglich testen können. Morgen
möchte ich live mit 4 Kindern testen und erfassen.“

- Times with the phone's number pad: min:sec also takes a comma or point („4,05“ = 4:05; seconds
  always two digits, so „4,5“ stays an error).
- Inputs at 16 px (below it the iPhone zooms into every focused field — found in WebKit).
- „Als Datei speichern“ goes through the share sheet where it takes files (iPhone „In Dateien
  sichern“), else a download (`saveText`); „Zuletzt als Datei gesichert: …“ and the status line
  „Nicht als Datei gesichert“ while measurements are newer than the last save.
- Persistent storage asked for at start (`src/io/persistence.ts`), the answer shown on „Datei“.
- „Erfassen“: every finish time of the stopwatch as a button per child (who got which: ✓).
- „Beispielgruppe mit 4 erfundenen Kindern“ on „Gruppen“ (`exampleChildren`) to try everything.
- Requirement lookups indexed per case (`findRequirements`, WeakMap per requirement list).
- `dispatch` builds on the newest workbook (ref), so several changes in a row never drop one.
- Measured: Chromium 20–30 ms per page change, 14 ms per keystroke; Playwright's WebKit on
  Windows ~8× slower (no JIT) — not the app. Rehearsal script in WebKit as iPhone 13 passed (example
  group, comma time, stopwatch buttons, save, reload). Live-test guide: `manual_tests/07_live_test.md`.

### Expected values and plans (2026-11-10)

Tobias: „wenn ich eine Übung anklicke, den Aufbau sehen und für ein Kind auch gleich die Werte, die
erwartet werden … auswählen, dass die Übung von dem Kind gemacht werden wird“.

- `Workbook.plans` (`Plan` = athleteId + exerciseId, file format stays 2 — an older file gets an
  empty list, a plan must point to a known child and exercise, no duplicate), reducer `togglePlan`,
  `removeAthlete` takes the child's plans. Plans plan the stations; the evaluation ignores them.
- `expectedValues(combination, exercise)` (`overview.ts`): per variant (and per class where it
  decides) the limits in card notation; Bronze equal to Silber shown as „–“ (the converter's „no
  Bronze“), Gerätturnen „nach Ausführung“. UI `ExerciseBits.tsx` (`ExpectedValues`, `PlanToggle`).
- „Möglich“: tapping an exercise (je Übung: per child; je Kind: per exercise) shows the expected
  values, „Macht diese Übung“ and the setup. „Erfassen“: exercise buttons carry the number of
  planned children, „Geplante (n)“ / „Alle, die können (m)“, planned first with „✓ geplant“ and
  their expected values at the station. „Je Kind“: „geplant: …“ per Disziplingruppe. MT-35, MT-36.

### „Planen“ instead of „Möglich“ in „Vorbereiten“ (2026-11-18)

Tobias: „Prüfe den Bereich Vorbereiten – wie sinnvoll ist der Punkt ‚Möglich‘ hier?“ – review: the
step belongs there, but in „Vorbereiten“ the work is planning, and „Möglich“ was slow for it (one tap
per child and exercise inside a fold full of values and setup, no overview of the plan) – „Go“.

- Page tree: Vorbereiten = Gruppen · Kinder · **Planen**; „Möglich“ stays in „Übungen“ (middle).
  A stored place `vorbereiten/moeglich` no longer exists → the wheel opens (as for any gone page).
- `PlanPage.tsx`: per Disziplingruppe the exercises someone can do; folded open: „Alle, die können
  (n)“ / „Keins“ and a chip per child (red border: the child has nothing planned in this
  Disziplingruppe yet). On top „Stationen am Tag“, „Noch nichts geplant in: <Kind> – <Gruppen>“,
  „Kann noch nichts: …“ and plans no longer possible (age/class changed) with „Plan entfernen“.
  No values, setup or Ausführung there — those stay on „Möglich“.
- Logic: reducer `setPlans` (several children, one exercise, on/off; unknown skipped, never
  doubled, unchanged → same state), `planOverview` (overview.ts: stations, gaps, stale — a stale
  plan is named, not counted, never dropped silently). File format unchanged.
- „Möglich“ remembers „je Übung“ / „je Kind“ (localStorage `sportabzeichen-vorerfassung:moeglich-ansicht`).
- Checked in Chromium at iPhone size, light and dark, with the example group and the local package
  (stations, gaps, „Erfassen“ counts, remembered view, no horizontal scroll). MT-44.

### Curl-Up counted by the metronome, Push-Ups with the beat in the counter (2026-11-18)

Tobias: „Für welche Übung wird das Metronom verwendet? Sollte das Metronom gestartet werden können,
und dann Zwischenzählungen und Ende?“ – „Ja, bauen, Zwischenton alle 10. Dazu eine Zahl zum
Übernehmen. Für die Push-Ups machen wir das anders herum, der Zähler bekommt eine Metronom-Funktion,
wobei wir prüfen müssen, ob wir bei jeder Zählung das Metronom neu ausrichten, oder besser nur, wenn
die Zählung stark genug abweicht“.

- **Curl-Up (station 'metronome'):** a milestone tone (520 Hz, long) on the beat that completes
  repetition 10, 20, … (`isMilestone`); „Ende“ stops and shows the whole repetitions with −1/+1;
  „Metronom (n)“ per child takes it (`Metronome` `onResult`). **Fixed:** `completedRepetitions` ran
  half a cycle early (2 beats = 1) — a repetition is done when the next cycle begins.
- **Push-Ups (station 'counter'):** no metronome of its own; `Counter` `beat` („Takt an (60/min)“).
  A count far from a cycle start moves the cycle there (`alignToTap`, phase only, never the tempo),
  beyond `REALIGN_THRESHOLD_S` 0.5 s. **Checked by simulation** (tap scatter 0.12 s, 400 runs of 30):
  realigning on every count made the beat jump audibly on about every second repetition even for an
  athlete at exactly 2 s; with 0.5 s only about 5 %. A different tempo is not followed (the tempo is
  the guide); the counter says „Letzte Zählung 0,3 s später als der Takt“.
- Shared audio: `src/ui/useBeat.ts` (look-ahead scheduling as before, realign, press time → audio
  clock).
- **Fixed on the way:** a value typed for one exercise stayed in the child's field when another
  exercise was chosen (a Curl-Up count could be saved as Push-Ups) — „Erfassen“ now starts afresh
  per exercise (`key`).
- Checked in Chromium (fake audio, oscillators recorded): 240/min for 23 beats → 11 repetitions,
  milestone exactly on beat index 20, „−1“ then „Metronom (10)“ → 10; Push-Ups: 0.1/0.2 s left the
  beat, 0.7 s realigned, the next count „genau im Takt“. MT-46.

### Schwimmnachweis (2026-11-18)

Tobias: „Kann die App schon den Schwimmnachweis? Entweder separat oder als Automatik aus den anderen
Übungen?“ – „Beides“; DBS check first „Ja“; the Ausdauer swim without Bronze counts as in the
Wegweiser „Ja“.

- **DBS handbook** (4.1, 4.10, MmB Prüfkarten): the proof as in the Wegweiser, nobody freed, the same
  five ways (an exercise of the badge, 15 min Dauerschwimmen, 50/200 m, badges, Kleiderschwimmen) and
  validity; swimming aids only in exceptions after asking the DBS. One rule set for both tracks.
- **Automatic** (`swim.ts` `SWIM_PROOF_EXERCISES`, `swimProof`): a recorded `swim-endurance` counts
  with any value, `swim-sprint` / `swim-sprint-minutes` from Bronze; year = the measurement's date,
  else the workbook's. The latest proof counts, at the same year the recorded swim.
  `AthleteEvaluation.swimProof` names the source; `swimProofStatus` applies Kap. 4.2's validity.
- **Separate:** `Athlete.swimProofWay` (`SwimWay`, needs `swimProofYear`; file format stays 2, an
  unknown way or a way without year is refused, `updateAthlete` drops a way without year).
  `swimWaysFor(age)` splits at 12 (50 m / 200 m in 11 min; Rettungsschwimm- and Fünfkampfabzeichen
  from 12, with the note on who must take the badge). UI `SwimProof.tsx` (`SwimProofEditor`) on „Je
  Kind“ (with „Nachweisjahr (auch ein früheres)“ and „Erstmaliger Erwerb“) and as the station
  „Schwimmnachweis“ in „Erfassen“ (`SWIM_STATION`, chips per child, a stopwatch); „Gruppe“ names the
  source in the ✓/✗ cell's title.
- **Fixed on the way:** the year field of „Je Kind“ was bound to the stored year and dropped every
  partial input — typing „2025“ left it empty (seen in Chromium on main). Now a draft until four
  digits. Checked in Chromium at iPhone size, light and dark (automatic ✓ from a 15:00 swim below
  Bronze, station chip, typed year). MT-45.

### Ausführung: ladder step sequences and Gerätturnen elements (2026-11-10)

Tobias: „ergänze in den Anleitungen auch die Detaildaten … die einzelnen Schrittarten im
Koordinationsleiterlauf, die Ausführungsbilder zum Bodenturnen/Gerätturnen“ — „Ja, in die App“.

- `ExerciseDetail` per variant (`Catalog.details`, optional): 7 ladder step sequences (ELK 2026,
  6.4.7.4, pp. 14–18: subtitle, steps, ladder picture, YouTube video link) and 18 Gerätturnen
  elements (Wegweiser 2026, 6.2.7.1–6, 6.3.4.1–6, 6.4.8.1–6: material, picture strip with Aufbau +
  B/S/G, task per level). **Verbatim DOSB text and cut-out pictures → local package only**
  (`catalog/local/2026.details.json` + `2026.images/*.webp`, 330 KB, gitignored like the tables).
- Build: `inlineDetailImages` (`src/build/catalogFiles.ts`) inlines the pictures as `data:` URLs;
  `assembleCatalog` checks every detail (known exercise, label = a variant of the limits, once each,
  inlined picture, https video, all three levels). Lookup `exerciseDetails` (catalog.ts),
  `detailsInUse` (overview.ts: each variant once with the children it applies to).
- UI `ExerciseDetails`/`DetailBody` (`ExerciseBits.tsx`): „Ausführung: <title>“ folds out in
  „Möglich“ (je Übung with the children per variant, je Kind), „Erfassen“ and „Aufbau“ (for the
  group: its variants; all exercises: all 25). Wide strips scroll sideways on a phone (min 600 px),
  the ladder is shown by height; pictures stay on white in dark mode. MT-37.
- Made with local scripts in `.tmp/details/` (picture cut-outs, text repair) — described in
  the private companion repo (`docs/privat/plattform-abgleich.md`). Real-package test in `catalogFiles.test.ts`: all 25 variants of the limits have a
  detail.
- 6.2.7.1 is „Kopfstand“ in the Wegweiser but describes a stand on both shoulders; the limits keep
  the platform's „Schulterstand“ as the key (`docs/aufbau-offene-punkte.md`).
- **Official names shown (Tobias 2026-11-11, „ja“ after the Chrome check of part A):**
  `variantName` (catalog.ts) shows a variant by its detail's title unless the label is that title plus
  an addition — 6 names change (Kopfstand, Kerze/Nackenstand, Hüft-Aufschwung, Sprungaufhocken als
  Stützsprung, Gehen auf dem Schwebebalken, Rad/Handstützüberschlag seitwärts), „Handstütz-
  Sprungüberschlag auf Weichbodenmatte / auf Sprungtisch“ keep their addition (the Wegweiser names both
  alike; a real-package test locks that no two variants of one exercise look alike). Labels stay the
  keys in requirements, details and saved measurements. MT-39.
- **Wegweiser edition:** only the DOSB file of 24.03.2026 (`…_24032026.pdf`, linked on
  deutsches-sportabzeichen.de/materialien). The copy at the Kreissportbund (made 20.01.2026) prints the
  tasks of 6.2.7.1 again under 6.2.7.2 — the Chrome check of part A read it and reported two false
  deviations (2026-11-11).

### Metronome per exercise (2026-11-11)

Tobias: „Metronom für alle anwendbaren Übungen verfügbar machen, nicht nur für die eine Übung“.
Searched ELK 2026, Wegweiser 2026 and the DBS handbook for a beat: only Curl-Up 6.2.6.2 (40 BPM,
„vom Rhythmus darf nicht abgewichen werden“ → `binding: 'required'`) and Push-Ups 6.2.6.1 („ca. zwei
Sekunden, jeweils eine Sekunde pro Bewegungsrichtung“ → 60 BPM, `binding: 'guide'`); Triceps-Dips and
Pull-Ups say „kontrolliert“. Each preset carries `exerciseId`, binding and the sentence; „Erfassen“
shows a compact metronome for such an exercise (closing its fold stops the beat, `Metronome`
`compact`). Both are ELK Kraft, i.e. from 18 — children never see it at a station. MT-38.

### Chrome check parts B–G and tools at the exercise (2026-11-11)

- **Check result (Claude in Chrome, 2026-11-11):** every limit value of the checked persons equal
  to the official tables; all Gerätturnen sections and ladder sequences seen, every picture fits.
  Zielwurf H III distances corrected in the local package. Details in the private companion repo (`docs/privat/plattform-abgleich.md`).
- **Names as on the cards** (converter): both-arms shot put „Kugelstoßen (2 kg), rechts und links
  zusammen“ (was the same text as the one-armed variant), `CARD_NAMES` „Rollstuhl-Parcour“ →
  „Rollstuhlparcours“. Labels are keys: measurements saved under an old label show
  „Die Variante des Messwerts gibt es … nicht“ (`variantUnknown`) — MmB was not in use yet.
- **Minutes as on the cards:** `formatMeasure('minSec')` shows long times in minutes (e.g. „75:00“,
  never „1:15:00“); h:mm:ss is still accepted on input. Regenerated package: 1 087 rows changed only
  their notation, no value changed (all 1 779 changed rows classified, 0 unexpected).
- **Tools at the exercise (Tobias: „Während einer Durchführung sollte die Stoppuhr oder der Zähler,
  ggf. mit Metronom, direkt verfügbar sein“):** `stationTools(exercise)` (capture.ts, table
  `TOOL_OF_MEASURE`: minSec/secTenth → stopwatch, count → counter, + metronome where a preset
  exists); „Erfassen“ shows them open below „Aufbau ansehen“ — `Stopwatch compact kind` (only that
  exercise's reading) and `Counter compact`, the same app state as the tool pages; ⏱ and „Zähler (n)“
  per child as before. MT-40, MT-41.
- **Test run broke with a lower-case drive** (`c:\…` shell): `navigation.test.ts` (from
  TKD-Trainerbuch) imported `describe/it/expect` from 'vitest' → a second copy without runner,
  „Cannot read properties of undefined (reading 'config')“, the whole file silently not run (also on
  2f211eb — the 520 reported then came from an upper-case shell). Fix: globals like every other test,
  ESLint `no-restricted-imports` for those names in tests. Not fixable by `test.root` or
  `process.chdir` in the config (tried).

### Zielvideo (2026-11-11)

Tobias: „Stoppuhr mit Zieleinlauf: können wir das Ziel aufnehmen? Video zB?“ – „Mit Kennzeichnung der
Stopp Druck stellen?“ – proposal (pictures only in memory, ~2 s before to 1 s after each press) „ok“.

- Logic `src/logic/finishVideo.ts` (pure, generic over the picture, one clock): rolling buffer of the
  last `FINISH_WINDOW.beforeMs`, a clip per „Zieleinlauf“ (`markFinish`: index of the finish, press
  time, stopwatch time at the press) filled until `afterMs` after it, `MAX_CLIPS` 20 then
  `withoutPictures` (named, not dropped), ~25 pictures/s (`isFrameDue`), `pictureTime` = the camera's
  capture time where plausible (≤ 500 ms before the callback), `frameElapsed` = press time moved by
  the picture's distance, `pressFrameIndex` = the marked picture. `setFinish` (stopwatch.ts) replaces a
  finish time by the picture's.
- UI: `useFinishVideo` (App level like the stopwatch, so it runs while pages change): rear camera via
  `getUserMedia` (640×480 ideal), an off-page `<video>`, `requestVideoFrameCallback` (else rAF), JPEG
  480 px wide (~25 KB) via canvas into memory; errors by `CAMERA_ERRORS`. `FinishVideo.tsx`:
  `CameraSwitch` („Zielvideo aus/an“, live picture, note incl. consent) and `FinishPictures` (opens at
  the press picture with red border „● Druck auf „Zieleinlauf““, ◀/▶/slider, „zum Druck“, „Zeit
  dieses Bildes übernehmen“). On the Stoppuhr page and the compact stopwatch of „Erfassen“; reset
  clears the pictures; the finish list says „(aus dem Zielbild; Druck …)“ after taking.
- Hosting: `deploy/upload.json` `"devices": ["camera"]` — the Auslieferung tool then sends
  `Permissions-Policy: camera=(self)` for the folder (the site root switches the camera off).
- Checked with Chromium's fake camera on both builds (`klick-zielvideo.mjs` in the session
  scratchpad): 14/14. Found on the way: `formatStopwatch` cut fractional ms while `readingParts`
  rounded them — „2,51 – 2,5|2“; now both round to whole ms first (regression test). MT-42.
- **Without distorting the measurement** (Tobias: „Wenn das ohne Verfälschung der Messung geht“), three
  fixes with regression tests (each shown failing on the old code):
  - Pressed times are the input event's time (`pressTime` in stopwatch.ts, used by `fastPress` for
    Start/Stopp/Zieleinlauf), not `performance.now()` in the handler — a phone busy with the camera
    made every pressed time late. Another clock or > 1 s old → the handler's time.
  - A picture's time may replace the finish only when it is the camera's capture time
    (`Frame.exact`, `canTakeTime`); without it (no `captureTime`, rAF fallback) the pictures show
    no time, the marker reads „● etwa beim Druck …“ and a note says the pressed time counts.
  - `MIN_FRAME_GAP_MS` 40 → 25: a 30-fps camera kept only every other frame (67 ms apart).
  - Note under the take button: take the first picture where the line is reached — never too short.
  - Chromium's fake camera gives `captureTime`: 14/14 on both builds; without frame callbacks
    (`klick-zielvideo.mjs dist ohne-aufnahmezeit`) 13/13.

### Navigation (Reibräder from TKD-Trainerbuch, 2026-11-10)

- Copied from `private/TKD-Trainerbuch` at `30a6e35` with its **German identifiers kept**, so the
  code stays comparable with its origin (a later shared library is the plan there):
  `src/logic/navigation/rad.ts`, `ring.ts`, `getriebe.ts` unchanged; `baum.ts` is ours (tree,
  `SEITEN`, `START_BEREICH`, where the app was: `ortLesen`, `ORT_GILT_MS`). UI in
  `src/ui/navigation/`: `ReibNavi.tsx` (without TKD's test button, jump targets and practice; the
  middles are inert as in the Arbeitszeitplaner), `Rahmen.tsx` (way at the top, placeholder),
  `lage.ts`, `Ring.tsx`, `Getriebe.tsx`, `MiniRad.tsx`, `farben.ts`, `radZeichnung.ts`,
  `useZurueckGeste.ts` as in TKD.
- Pages stand on the app's own light/dark sheet (`var(--bg)`/`var(--fg)` from `styles.css`), not on
  TKD's always-light sheet. Swipe sideways to the page beside it; not on fields, the counter pad or
  the stopwatch's big buttons. The system's back goes one level back.
- The app remembers its page for 4 h (`src/io/place.ts`, localStorage
  `sportabzeichen-vorerfassung:ort`).
- Stopwatch and counter keep their state in `App.tsx`, so a running stopwatch survives a change of
  page (the pages unmount). The metronome stops when its page is left.

### Hosted app, start without login (2026-11-10)

- Upload target `app` in `deploy/upload.json` → folder **`NebenprojektSportabzeichen/`** on the
  Fragebogen subdomain (sister of `NebenprojektArbeitszeitplaner/` and `NebenprojektTKD/`), access
  `ipOrLogin`, dialog name „Sportabzeichen - Test“, tester list `deploy/.local/tester-app.json`.
  `npm run hochladen` (from this session always `-- -OhneRueckfrage`, committed state only; print
  only the whitelist of result lines — see the Auslieferung memory), `npm run tester` (window, Tobias).
- **Start without login (Tobias' rule):** `hosted-public/sw.js` serves the app's files from its
  cache whenever they are there — opening never asks the protected folder, so no 401 and no login
  dialog can reach the screen, in the office, outside or offline. After each start the worker looks
  for a new version **with the device's own right** (`credentials: 'same-origin'`, since 2026-11-15;
  until then `'omit'`): in the bunny.net test zone that is the login script's cookie, so the new
  version comes wherever the device is online (on the IONOS folder: the office network) and the page
  shows „Neue Version – neu starten“; without the right it gets a 401 and fails silently — a
  worker's request cannot show the login dialog (see below). „Mit Anmeldung aktualisieren“ (page „Datei“) navigates to
  `./?neu=…` and the worker **leaves this one navigation to the browser** — a worker can never show
  the login dialog (Tobias on the phone 2026-11-10: „Es wird kein User abgefragt“; the first build
  answered it from the worker, got the 401 and showed the cached copy). The page that arrives asks
  the worker to store itself (`nach-anmeldung`, fetched with `credentials: 'include'` — the login
  the browser now holds); „Abbrechen“ in the dialog shows the server's error page (reopen the app). Locked by `tests/build/sw.test.ts` (the worker run with stand-ins: with a cached copy the
  only request is the worker's quiet look; behind a cookie-only zone a new version arrives).
- Build profiles as data (`src/build/profiles.ts`): `file` (no worker, no manifest) and `hosted`
  (worker + manifest from `'self'`, head tags `HOSTED_HEAD`, manifest with
  `crossorigin="use-credentials"` like TKD); `connect-src 'none'` in both. `__HOSTED__` switches the
  registration (`src/io/serviceWorker.ts`). Icons: `npm run icons` (`tools/icons.ts`).

---

## Status (2026-11-10)

**Task (Kanzlei PC session, 2026-11-15, Tobias): a GitHub check named „Tests“.**

- Every app's upload through the repo `Freigabe` waits for the app's own GitHub check **„Tests“**,
  green for exactly the commit that is uploaded. Tobias wants one way for all projects.
- This repo has no check yet. Add `.github/workflows/tests.yml` with `name: Tests`, run on every push
  to main and on pull requests (unit tests, typecheck, lint, format).
- Tests that need the DOSB/DBS data of the companion must skip there; they still run locally.
- Then the Kanzlei PC adds the app to `Freigabe` (test zone `sportabzeichentest`).
- **Done (cloud session, 2026-11-15):** `.github/workflows/tests.yml` — workflow and job both named
  „Tests“, on pushes to main and on pull requests: `npm ci`, typecheck, lint, format, tests and both
  builds, Node 22 on Ubuntu, read-only token. Without the companion the real-package tests skip
  (`skipIf`), the converter's test is not in the repo, both builds say „ohne Grenzwerte gebaut“ —
  run in a clean clone without the companion before the push. **Done (Tobias 2026-11-15):** the app is
  in `Freigabe`; `cd937cd` was uploaded to the test zone and runs on his phone.

**Task (Kanzlei PC session, 2026-11-15, Tobias): footer link „Tester einladen“ in the hosted build.**

- The hosted app moves from IONOS to a protected test zone of its own in Tobias' private bunny.net
  account. The login script comes from the private repo `Testumgebung` (`zugang/`): testers log in
  once, then a cookie recognises the device. Every tester of that account may test every project of
  it.
- Add a link **„Tester einladen“** to the footer of the hosted build (`build:hosted`), pointing to
  the relative address `/_zugang/einladen`. That page of the login script makes a one-time invitation
  link (7 days) and leads back with „Zurück zur App“.
- There is no live version yet. Once there is one, the link stays out of it, and a test checks that.
- Style it like the rest of the app. It is a plain navigation, no fetch, so the CSP stays as it is.
- Background: `Testumgebung` `docs/plan.md`, „Fußzeile ‚Tester einladen‘“.
- **Done (cloud session, 2026-11-15 — Tobias: „Dieses Projekt ist, wie fast alle, nun in der
  cloud“):** build profiles carry `stage` (`file` / `test` / `live`) and `testerInvite`; only the
  hosted test build has `/_zugang/einladen` (`__TESTER_INVITE__`), and a test in `csp.test.ts` locks
  that a `live` profile never carries it. The link sits in a slim footer of the frame (`Rahmen` prop
  `fuss`, through `ReibNavi`), bottom right under the wheels and every page, quiet like the status
  line (`.tester-einladen`). Checked at iPhone size, light and dark.
- **Found on the way and fixed with it:** the service worker answered _every_ navigation of its
  scope with the cached app — at the root of the test zone a tap on „Tester einladen“ would have
  opened the app again. It now answers only for its own files (`PAGE_PATHS`, `FILE_PATHS`) and
  stores a page only when it is the app (`isApp`: not redirected, carries the hosted head's title tag
  `APP_MARK`), so a login page answered in its place can never replace the app on a device. Five new
  tests in `tests/build/sw.test.ts`, each shown failing on the old worker.

### Handover — where to pick up

- **Code:** public on GitHub, `tobiasheinrichfaska/Sportabzeichen-Vorerfassung` (Tobias 2026-11-14:
  „ja, mach das“). Fresh start — one start commit; the history before it holds DOSB/DBS data and is
  kept only as a bundle in the companion repo (`historie/`). Commit and push after each meaningful
  session; **before every push** run the DOSB/DBS scan (values, verbatim texts, platform hints — see
  the companion's README). Re-run `typecheck`, `lint`, `format:check`, `test`, `build`,
  `build:hosted` before claiming a green gate; after a change of `catalog/2026/` or the local sources
  run `npm run katalog:lokal` first. The check „Tests“ (`.github/workflows/tests.yml`) runs the same
  on GitHub, without the companion's data.
- **Division of work (Tobias 2026-11-15: „Dieses Projekt ist, wie fast alle, nun in der cloud“ —
  „upload erfolgt durch github workflows in Projekt Freigabe“):** all editing — code, docs, tests —
  happens in cloud sessions through commits and pull requests, with invented data only (the DOSB/DBS
  package comes from the companion, never into this repo). Uploads go through the GitHub workflows of
  the private repo `Freigabe`; each waits for this repo's check „Tests“, green for exactly the
  uploaded commit — never from a cloud session. What needs a server dashboard or a real device stays
  with Tobias: the bunny.net zone and its headers, hand tests on the phones. `npm run hochladen` /
  `tester` (Auslieferung, PC) serve only the old IONOS folder until the move.
- **Weekly check** (Tobias 2026-11-15): the scheduled task „Wochenprüfung“ (Sundays 3:42) works
  through [`docs/wochenpruefung.md`](docs/wochenpruefung.md) — new editions of the DOSB/DBS
  documents, open questions to DOSB/DBS, the next exam year, Sportabzeichen-Digital and SpAz, and
  the tests with the companion's package. **A change to `docs/wochenpruefung.md` is merged only by
  Tobias** — it is an order to the scheduled task — even where reversible merges are otherwise
  allowed; the task's own PRs are not merged either.
- **Private companion repo** `tobiasheinrichfaska/Sportabzeichen-Vorerfassung-privat` (local clone
  `c:\skripte\private\Sportabzeichen-Vorerfassung-privat\`): every DOSB/DBS file — `catalog/local/`
  (limits, class details, Ausführung texts and pictures), `archiv/` (official PDFs, platform data,
  check results), `docs/privat/` (verification record, rights research, platform sources), the
  converter `tools/localCatalog.ts` + `tools/katalog-lokal.ts` with `tests/tools/localCatalog.test.ts`,
  and the working files of `.tmp/` — copied **1:1 over this checkout** (all gitignored here). After
  changing one of these paths here, copy it back and commit there. **Never credentials** there
  (`deploy/.local/` stays on the PC). A new private path goes into `.gitignore` first.
- **Cloud sessions (claude.ai/code, since 2026-11-15):** both repos are sibling checkouts. With both
  in the session, the setup script of the Default environment runs `npm ci` here and copies the
  companion's paths over this checkout at container build (`cp -R -u`); anything git then sees here
  is reported loudly. A companion added mid-session gets no setup run — run its block by hand from
  the folder holding both checkouts. Copies changed in the cloud are lost with the container unless
  copied back and committed in the companion (compare command in its README). Only on the PC:
  `hochladen`/`tester` (PowerShell + `private/Auslieferung`) and the Windows-bound scripts of `.tmp/`
  (companion README). Browser checks in the cloud: `require('playwright')` (global, preinstalled
  Chromium), not `import`; no WebKit there, so the iPhone rehearsal in WebKit stays on the PC.
- **App (2026-11-10):** the standalone app of the section above — wheels, groups, children,
  „Möglich“, „Erfassen“, „Je Kind“, „Gruppe“, „Aufbau“, tools, with the local tables. **Hosted since
  2026-11-15 in the bunny.net test zone `sportabzeichentest`** (upload through `Freigabe`, login of
  `Testumgebung`); `cd937cd` runs on Tobias' phone — a pull-down reload brought it, because the new
  `sw.js` was installed by the browser's own worker check (which sends the cookie). The quiet look
  with the cookie is proven only by a later upload with an unchanged `sw.js` (MT-43 step 4). The old
  IONOS folder `NebenprojektSportabzeichen/` goes before the DNS switch of the Fragebogen subdomain;
  there the app started anywhere without login after one start in the office (MT-18). Next: his feedback from the phone;
  „Übertragen“ / „Prüfungstag“ (QR transfer from TKD-Trainerbuch's technique, see the memory
  „Transfer technique“); SpAz transfer view.
- **Verification of the official tables (done 2026-11-02)** and its deliverables (Klärungs-PDF,
  Prüfliste, case list): in the private companion repo (`docs/privat/plattform-abgleich.md`).
- ⚠️ **Do not clean `.tmp/` in this project** — it holds local analysis scripts and extracted
  source texts; a copy is in the companion repo (`.tmp/`).

### Built so far

Done: data model, combinations engine, evaluation (manual decision > profile choice > best),
swim-proof rules, workbook reducer, file format with upgrade, catalog as **data package per year**
(`catalog/<year>/`, local limits in gitignored `catalog/local/`), Erweiterter Leistungskatalog
Kraft (6.2.6.1–4), SpAz discipline names (both Laufzettel, without ELK Koordination), tools (Stoppuhr, Zähler, Metronom), UI tabs
Übersicht / Behinderungsklassen / Stoppuhr / Zähler / Metronom, save/open/autosave.
**Not yet built:** capture view (selection → combinations → measurements), athlete/group editor
(incl. class selection/deactivation, final profile, Ausgleichsbedingung form), help texts, limits.

### Import inbox (Tobias, 2026-11-02)

`import/` is an **inbox**: after **every** processing its whole content is archived so the folder
is empty again — `npm run import:archivieren -- "<Bezeichnung>"` moves everything unchanged to
`archiv/<YYYY-MM-DD>_<bezeichnung>/` (gitignored, `_2`, `_3` … if the name is taken), writes
`MANIFEST.json` (path, size, SHA-256 per file) and a line in `archiv/INDEX.md`; files it cannot move
are named in the error, never skipped silently. The archive itself is kept in the companion repo.

### Next steps

1. **Einstufung UI:** classes A–J with subgroups and criteria, several selectable, single classes
   deactivatable; Ausgleichsbedingung form.
2. **Import from SpAz** — the "Absolventen" export (14 columns) can pre-fill athletes; needs one
   export WITH rows to learn the value formats (only shapes are inspected, never content).
3. **Transfer to SpAz** in the order of its input mask (one discipline per group, as in the
   "Absolventendaten" export); values for the DOSB Mustervorlage (needs the template file).
4. **„Übertragen“ / „Prüfungstag“** (QR transfer, see the memory „Transfer technique“).

### Target systems (Tobias, 2026-11-01: "SpAz, aber auch andere")

- **SpAz** (BLSV, Bayern): web app, entry on the sports ground only "bei vorhandenem Internet";
  "Die Importfunktion ist für den Prüfer deaktiviert" (SpAz-FAQ 2024-07) → our role: offline
  capture, then a transfer view in SpAz order for typing in.
- **Sportabzeichen-Digital** (DOSB): Prüfungsimport (XLSX) only via the platform's Mustervorlage —
  "Baue die Mustervorlage nicht selbst nach" (Leitfaden v2.0, Kap. 4.3 and FAQ part) → copy values
  into the official template; ask DOSB about the "Drittanbieter-Import" (Leitfaden Kap. 8).

### Open questions (for Tobias)

- **SpAz export with rows** (value formats of date, MmB, Leistung, Ergebnis).
- **DOSB Mustervorlage** "Prüfungsimport (XLSX)" file, for the Sportabzeichen-Digital route.
- **"Gruppe von Übungsarten":** now = Disziplingruppe. Are user-defined exercise sets
  (e.g. stations of a Sportfest) wanted?
- Verification questions (Klärungs-PDF, G II Geschicklichkeitsgehen): in the private companion repo (`docs/privat/plattform-abgleich.md`).

---

## Project Directory

| File/Folder                                                                                           | Purpose                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md`                                                                                           | Project documentation and conventions                                                                                                                                        |
| `README.md`                                                                                           | German user-facing description + license section                                                                                                                             |
| `FEATURES_REQUIRED.md`                                                                                | Critical user paths the audit validates end-to-end                                                                                                                           |
| `LICENSE`, `LICENSE_COMMERCIAL.md`, `CONTRIBUTING.md`                                                 | AGPLv3 + commercial dual license (workspace templates)                                                                                                                       |
| `.gitignore`, `.gitattributes`                                                                        | Git rules (LF line endings; saved workbooks `*.sportabzeichen.json` and `import/` never committed)                                                                           |
| `.prettierrc.json`, `.prettierignore`, `eslint.config.js`                                             | Formatting/linting; ESLint forbids React/DOM/storage in `src/logic/`                                                                                                         |
| `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`                                | Build/test configuration (Vitest `pool: 'forks'`)                                                                                                                            |
| `.github/workflows/tests.yml`                                                                         | Check „Tests“ on GitHub (push to main, pull requests) — the gate of every upload through `Freigabe`                                                                          |
| `index.html`                                                                                          | HTML shell; the build inlines everything into `dist/index.html`                                                                                                              |
| `docs/data-model.html`                                                                                | Self-contained data-model reference (regenerate when the model changes)                                                                                                      |
| `docs/quellen.md`                                                                                     | Official sources used, with URLs and what was taken from each                                                                                                                |
| `docs/wochenpruefung.md`                                                                              | List of the scheduled weekly check (DOSB/DBS editions, open questions, next exam year, targets, private-package tests) — merged only by Tobias                               |
| `catalog/`                                                                                            | Catalog data package per "gültig ab" year — see `catalog/README.md`                                                                                                          |
| `catalog/2026/catalog.json`                                                                           | Public: exercises, classes A–J, sources                                                                                                                                      |
| `catalog/2026/spaz.json`                                                                              | Public: SpAz discipline names per Laufzettel (regular, MmB) → exercises                                                                                                      |
| `catalog/local/`                                                                                      | NOT versioned: limit tables, class details (rights of DOSB/DBS) — from the private companion repo                                                                            |
| `docs/privat/`, `tools/localCatalog.ts`, `tools/katalog-lokal.ts`, `tests/tools/localCatalog.test.ts` | NOT versioned: from the private companion repo (verification record, rights research, converter + its tests)                                                                 |
| `import/`                                                                                             | NOT versioned: inbox for deliveries — empty after every processing (`npm run import:archivieren`); shapes only                                                               |
| `archiv/`                                                                                             | NOT versioned: archived deliveries per processing (`<date>_<label>/` + `MANIFEST.json`, `INDEX.md`)                                                                          |
| `tools/importArchive.ts`                                                                              | Moves `import/` to `archiv/<date>_<label>/` with manifest and index line (`archiveImport`)                                                                                   |
| `tools/import-archivieren.ts`                                                                         | CLI for `npm run import:archivieren -- <Bezeichnung>`                                                                                                                        |
| `manual_tests/`                                                                                       | Human-tester instructions (German)                                                                                                                                           |
| `src/main.tsx`                                                                                        | Entry point; mounts `App`                                                                                                                                                    |
| `src/build/profiles.ts`                                                                               | Build profiles `file` / `hosted` (worker, manifest, head tags) as data                                                                                                       |
| `hosted-public/`                                                                                      | Copied next to the hosted page: `sw.js` (start from the cache, quiet update), `manifest.json`, icons                                                                         |
| `deploy/upload.json`                                                                                  | Upload target `app` → `NebenprojektSportabzeichen/` for `private/Auslieferung` (`deploy/.local/` gitignored)                                                                 |
| `tools/icons.ts`                                                                                      | Writes the PNG icons (`npm run icons`)                                                                                                                                       |
| `src/logic/navigation/`                                                                               | Reibräder from TKD-Trainerbuch: `baum.ts` (our tree, where the app was), `rad.ts`, `ring.ts`, `getriebe.ts`                                                                  |
| `src/ui/navigation/`                                                                                  | `ReibNavi.tsx` (the two wheels, pages), `Rahmen.tsx`, `lage.ts`, `Ring.tsx`, `Getriebe.tsx`, `MiniRad.tsx`, colours                                                          |
| `src/ui/pages/`                                                                                       | Pages of the wheel: `FilePage.tsx` („Datei“, updates), `PlannedPage.tsx` („Übertragen“, „Prüfungstag“)                                                                       |
| `src/ui/Messages.tsx`                                                                                 | Errors and notes on top of every page                                                                                                                                        |
| `src/io/place.ts`, `src/io/serviceWorker.ts`                                                          | Where the app was; worker registration, quiet look for a version, update with the login                                                                                      |
| `tests/build/sw.test.ts`, `tests/build/navigation-ui.test.ts`                                         | The worker run with stand-ins (no login with a cached copy); no tap boxes, pages on the app's sheet                                                                          |
| `tests/logic/navigation/navigation.test.ts`                                                           | Tree, where the app was, swiping, Reibräder, gear train, wheel geometry                                                                                                      |
| `src/vite-env.d.ts`                                                                                   | Vite types + `__APP_VERSION__`, `__CATALOGS__`                                                                                                                               |
| `src/build/csp.ts`                                                                                    | Build step: hash-based Content-Security-Policy (+ `csp.test.ts`)                                                                                                             |
| `src/build/catalogFiles.ts`                                                                           | Build step: loads every `catalog/<year>/` + `catalog/local/` file; a broken package stops the build (+ test)                                                                 |
| **`src/logic/`**                                                                                      | **UI-free data + rules**                                                                                                                                                     |
| `src/logic/types.ts`                                                                                  | All entities (Catalog, Exercise, Requirement, DisabilityClass, Workbook, Athlete, …)                                                                                         |
| `src/logic/reference.ts`                                                                              | Fixed reference data: groups, levels/points, award bands, tracks, measure kinds, age limits                                                                                  |
| `src/logic/catalogPackage.ts`                                                                         | Checks the raw JSON of a catalog year and assembles it (`assembleCatalog`), `catalogForYear`                                                                                 |
| `src/logic/classes.ts`                                                                                | Active classes of an athlete, class tree (main classes + subgroups) for the Einstufung                                                                                       |
| `src/logic/catalog.ts`                                                                                | Lookups, `requirementFromRow` (card notation), `validateCatalog`                                                                                                             |
| `src/logic/age.ts`                                                                                    | Age in the exam year (Jahrgangsprinzip), ISO-date check                                                                                                                      |
| `src/logic/measure.ts`                                                                                | Parse/format values per measure kind (stored in smallest unit)                                                                                                               |
| `src/logic/combinations.ts`                                                                           | Selections → combinations (variants per class, "class decisive"), grouping by athlete/exercise                                                                               |
| `src/logic/evaluation.ts`                                                                             | Level per measurement, best per group, points, award, notes (German texts)                                                                                                   |
| `src/logic/swim.ts`                                                                                   | Nachweis der Schwimmfertigkeit (Kap. 4.2): validity, ways by age, proof from recorded swims                                                                                  |
| `src/logic/workbook.ts`                                                                               | Workbook reducer (cascades on athlete removal / class change)                                                                                                                |
| `src/logic/fileFormat.ts`                                                                             | Save/load JSON with full validation                                                                                                                                          |
| `src/logic/fileName.ts`                                                                               | Suggested file name                                                                                                                                                          |
| `src/logic/stopwatch.ts`                                                                              | Stopwatch state machine, finish times, card reading (cut off) + one finer digit                                                                                              |
| `src/logic/finishVideo.ts`                                                                            | Zielvideo: rolling buffer, pictures around each „Zieleinlauf“, press marked, time of a picture (memory only)                                                                 |
| `src/logic/counter.ts`                                                                                | Tally counter reducer                                                                                                                                                        |
| `src/logic/metronome.ts`                                                                              | Metronome timing (beats in a window, pattern labels, repetitions), presets per exercise (`metronomePresetFor`)                                                               |
| **`src/io/`**                                                                                         | **Browser APIs**                                                                                                                                                             |
| `src/io/browserDraft.ts`                                                                              | localStorage draft (every failure returned with reason)                                                                                                                      |
| `src/io/fileTransfer.ts`                                                                              | Download/upload of the workbook file                                                                                                                                         |
| **`src/ui/`**                                                                                         | **Rendering only**                                                                                                                                                           |
| `src/ui/App.tsx`                                                                                      | Shell: workbook, draft, tool state, messages; the pages behind the wheels                                                                                                    |
| `src/ui/Classes.tsx`                                                                                  | Page „Klassen“: classes A–J with subgroups and criteria (Einstufungshilfe)                                                                                                   |
| `src/ui/Stopwatch.tsx`                                                                                | Stopwatch with finish times and Schnelligkeit/Ausdauer readings; `compact` at the exercise on „Erfassen“; Zielbilder per finish                                              |
| `src/ui/useFinishVideo.ts`                                                                            | Zielvideo camera (App level): getUserMedia, frame loop, JPEG pictures into memory                                                                                            |
| `src/ui/FinishVideo.tsx`                                                                              | Zielvideo switch + live picture, Zielbilder viewer (step, mark of the press, take the time)                                                                                  |
| `src/ui/Counter.tsx`                                                                                  | Tally counter (acts on pointer down)                                                                                                                                         |
| `src/ui/Metronome.tsx`                                                                                | Metronome: Web Audio look-ahead scheduling, beat light, up/down labels; started by a click (audio unlock on touch)                                                           |
| `src/ui/fastPress.ts`                                                                                 | Pointer-down handlers with keyboard fallback; hand the action the moment of the press (`pressTime`)                                                                          |
| `src/ui/styles.css`                                                                                   | Styles (light/dark)                                                                                                                                                          |
| `tests/logic/`                                                                                        | Unit tests of every logic module                                                                                                                                             |
| `tests/fixtures/testCatalog.ts`                                                                       | **Test-only** limits + sample workbook                                                                                                                                       |
| `tests/static/hiddenChars.test.ts`                                                                    | Guard against invisible characters in sources                                                                                                                                |
| `tests/tools/importArchive.test.ts`                                                                   | Archiving of `import/` (temp project under `.tmp/`)                                                                                                                          |
| `src/logic/children.ts`                                                                               | Children by first name + birth year, groups (check, label, twins, current group, delete with group)                                                                          |
| `src/logic/overview.ts`, `src/logic/capture.ts`                                                       | „Möglich“ (offers by exercise/child, variants) and „Erfassen“ (rows, class/variant choice, live level)                                                                       |
| `src/ui/pages/`                                                                                       | `GroupsPage`, `ChildrenPage`, `PlanPage`, `PossiblePage`, `SwimProof`, `CapturePage`, `ResultPages` (Je Kind, Gruppe), `SetupPage`, `FilePage`, `PlannedPage`, `GroupSwitch` |
| `docs/aufbau-offene-punkte.md`                                                                        | What the official texts leave open about each exercise's setup (to clarify)                                                                                                  |
| `catalog/local/2026.details.json`, `catalog/local/2026.images/`                                       | NOT versioned: Ausführung per variant (ladder step sequences, Gerätturnen elements) — DOSB text verbatim, cut-out pictures (WebP)                                            |

---

## Data Model

Authoritative reference: [`docs/data-model.html`](docs/data-model.html). Regenerate from source
whenever `src/logic/types.ts`, `reference.ts`, a catalog package or the reducer changes.

Key decisions:

- Values are stored in the **smallest unit** (s, 1/10 s, cm, whole points) → integer comparisons.
- **Direction** (more/less is better) follows from the limits' order (Bronze < Gold ⇒ more is
  better) — one card row can mean a time _or_ a duration (e.g. MmB "Schwimmen / Dauerschwimmen").
- A **requirement** carries the concrete variant per age (`label`, e.g. "800 m", "Schlagball
  (80 g)"), because one card row maps to different exercises by age/class.
- **No Verbandsabzeichen** (removed 2026-11-01). Files of 0.1.0 carry an empty `badgeRecords`
  list, which `upgradeWorkbook` drops; a file with entries is refused with its reason (never dropped
  unseen).
- **Ausgleichsbedingung / combined classes** are captured completely as `ManualAssessment` (free
  text condition + performance, who set it, the examiner's level). They make the result
  _paper card only_ — the platform records them with the final result only (DOSB MmB info sheet).
- **Classes:** `classIds` = every matching class, `inactiveClassIds` = matching but deliberately not
  used by the examiner (kept visible, not evaluated). Subgroups via `DisabilityClass.parentId`.
- **Per group** the decisive result is: manual decision > choice in the final profile
  (`ProfileChoice`) > best result (as Sportabzeichen-Digital takes the best values automatically).

---

## Known Limitations

- **Planned (Tobias 2026-11-14):** the hosted file carries the whole local package **AES-GCM-encrypted,
  unlocked with a password** (PBKDF2 like TKD-Trainerbuch E4); then the folder needs no server login.
  Reasons and the rights research: the private companion repo (`docs/privat/plattform-abgleich.md`) and `docs/privat/recherche-rechte-dosb.md`.
- **Limits only in builds with the local package** (`catalog/local/`, never in git — on the PC or
  in a cloud session with the companion repo, where `dist/` then holds the tables too) — the
  public plain file says „ohne Grenzwerte gebaut“. Gerätturnen descriptions per level and the
  platform's discipline descriptions are not taken over.
- **25 m Schwimmen in Minuten / 200 m Handbike** are entered in min:sec as on the platform; the
  DBS handbook describes neither, the Wegweiser reads speed in tenths — clarify.
- **Zielwurf/Fußballzielstoß** count ring points per the DBS handbook; the platform calls the value
  a count — same numbers, the label differs.
- **Rights to the tables** — DOSB/DBS tables, texts and pictures live only in the local package
  (private companion repo), never in this repo; README, docs/quellen.md and the app state that they
  are not under the AGPL and that others must clarify use with DOSB/DBS directly. Passing a BUILT
  file with tables to other examiners is the user's own distribution — ask DOSB/DBS first.
- **Limits are taken over only after a check against the official tables** (DBS handbook, DOSB
  tables); the record of that check is in the companion repo.
- **G II Geschicklichkeitsgehen not offered at 14–17, 35–44, 65–74** — the G II card leaves these
  fields empty, while G I/G III and the platform offer 1x/2x/3x there (probably a handbook layout
  error). DECIDED (Tobias, 2026-11-02): follow the card, i.e. not offered; adjust later if the DBS
  confirms the platform. The converter must keep these fields empty and a test must lock it.
- **Erweiterter Leistungskatalog Koordination missing** — Kraft 6.2.6.1–4 is modelled (counted, 18+);
  the Koordination exercises exist on the platform but are not modelled yet, and the official
  document (exercise rules) is still missing.
- **Subclasses missing** — the catalog has only main classes A–J; the requirements are keyed by the
  21 subclasses (B 1 … H 4). They come with the local class file.
- **Verbandsabzeichen not supported** (decided 2026-11-01) — a group replaced by a Verbandsabzeichen
  (Kap. 8.4) is entered directly in the target system; the app's evaluation of that athlete then
  shows the group as open.
- **SpAz names nearly complete** — `spaz.json` lacks the 4 ELK Koordination labels until those
  exercises are modelled; the MmB speed entry "Radfahren … - Langstrecke" is printed that way on all
  44 Behindertensport Laufzettel (probably meant Kurzstrecke). No variant link yet (e.g. which
  SpAz label „Laufen (800m)“ vs „(3000m)“ belongs to an age) — needed for the transfer view.
- **Setup texts have open points** — 37 exercises carry details the sources leave open (listed in
  `docs/aufbau-offene-punkte.md`, not guessed in the text); Fußballzielstoß, 25 m Schwimmen in
  Minuten and 200 m Handbike have no description in the DBS handbook.
- **Swim-proof rules for MmB** follow the DOSB-Wegweiser — compared with the DBS handbook on
  2026-11-18: it refers to the Wegweiser, frees nobody, names the same ways and validity. Swimming
  aids only after asking the DBS (4.10): not modelled, a note on the paper card.
- **Schwimmnachweis by way, not checked against age at an earlier year** — the app offers only the
  ways of the child's age in the exam year; an earlier year is a year only (no way). A recorded swim
  counts whatever its level for Ausdauer (the Wegweiser: no minimum time), the app cannot see
  whether the distance was swum to the end — the examiner records only completed swims.
- **Stopwatch reading** follows the Wegweiser wording "abgelesen" (6.1 "auf Sekunden", 6.3 "auf
  Zehntelsekunde"): finer digits are cut off, and one finer digit is shown so the examiner can
  judge borderline cases (Tobias, 2026-11-01). No rounding direction is stated in the sources.
- **No transfer/export** to SpAz or Sportabzeichen-Digital yet.
- **„Übertragen“ and „Prüfungstag“ are empty** (Tobias 2026-11-10: foreseen, „vorerst leer“) —
  until then a group moves to another device only as a saved file.
- **Start without login not yet tried on a phone** — locked by `tests/build/sw.test.ts` with
  stand-ins; open on devices (MT-19): whether the browser's own check of `sw.js` outside the office
  (it gets a 401) ever shows a login dialog, and the first start from the home screen on iPhone
  (its own storage — open it once in the office, MT-18).
- **On the old IONOS folder** remote testers got updates only by „Mit Anmeldung aktualisieren“ (the
  quiet look sent no credentials until 2026-11-15; one tester login, list in the gitignored
  `deploy/.local/`). In the bunny.net test zone the look carries the zone's cookie (see below).
- **Update flow (2026-11-10, after „in meinem Handy geht es nicht“):** the top bar shows „Stand
  <commit>“ (`__APP_STAND__`); the look for a version runs at start and whenever the app comes back
  to the screen, sends the page's own Stand, and the worker reports `neu` also when the stored page
  is another than the running one (stored at an earlier start, never reloaded) — then the status is
  the green button „Neue Version – neu starten“.
- **Updates in the bunny.net test zone — adjusted, untried on devices** (2026-11-15, read from the
  login script of the private repo `Testumgebung`, `zugang/src/logik.ts` and `rahmen.ts`): without a
  cookie the zone answers 401 with HTTP Basic; with the cookie `__Secure-Zugang` (HMAC, 400 days,
  `Path=/; Secure; HttpOnly; SameSite=Lax`, renewed on requests) it lets the request in and sends
  `Cache-Control: private, no-cache`. So the quiet look now sends the device's cookie
  (`same-origin`) — the new version arrives anywhere online, and those requests also keep the cookie
  renewed on a device that otherwise starts from its cache. „Mit Anmeldung aktualisieren“ (a
  navigation: Basic dialog when the cookie is gone, then the cookie) and the manifest's
  `use-credentials` (sends the cookie) work as they are. Regression test in `sw.test.ts` (shown
  failing on the old worker). Open on devices (MT-43): the login on the home-screen app, an update
  arriving without the office, „Tester einladen“, the camera. The zone already allows the camera:
  its rule „Sicherheits-Header“ from the `Testumgebung` setup sends `Permissions-Policy:
camera=(self), …` (checked 2026-11-15 without login and by Claude in Chrome; record in the
  companion, `hosting/bunny-testzone.md`). A new address means a new
  install — save the groups as a file first. A login page answered instead of the app is never
  stored (`isApp` in `sw.js`).
- **Hosted file with DOSB/DBS tables** in the protected folder (decided 2026-11-10): giving testers
  access is distribution — clarify with DOSB/DBS before other examiners get it.
- **Browser draft is not reliable** — Safari drops site data after 7 days without use; the saved
  file is the real record.
- **Ausführung only with the local package** — the public plain file has no step sequences or
  Gerätturnen pictures (DOSB rights, like the tables); the video links open YouTube outside the app
  and need internet. MmB Gerätturnen-like exercises have no details (the DBS handbook has none).
- **Sex:** only w/m (evaluation categories); non-binary athletes choose one (Wegweiser 2026).
- **Zielvideo not yet tried on a real phone** (2026-11-11) — checked only with Chromium's fake camera.
  Open (MT-42): iPhone Safari/home screen (camera permission, the off-page video element), frame rate
  and memory on older phones, and **whether the phone's browser gives the camera's capture time** —
  without it the pictures only show the finish and no time can be taken (on purpose: the camera's
  delay would make it late). With it, the picture's time is exact to the picture, but the line is
  crossed between two pictures (≈ 3 hundredths at 30 fps); the start stays pressed by hand.
  Whether a Zielbild is accepted as proof is the examiner's call; the pictures are never kept, so
  they cannot serve as a record. Filming people needs their consent (note in the app).
- **Labels renamed on 2026-11-11** (both-arms shot put, Rollstuhlparcours, Zielwurf H III) — an MmB
  measurement saved before under the old label shows „Die Variante des Messwerts gibt es … nicht“;
  enter it again (no alias table).
- **„2,5 km Radfahren (Tandem bei Behinderungsklasse F)“** keeps the platform's addition for every
  class; the G II card names only „Radfahren 2,5 km“. Geschicklichkeitsgehen/Rollstuhlparcours show
  1/2/3 where the card prints 1x/2x/3x.

---

## Development Server Ports

| Server                          | Port |
| ------------------------------- | ---- |
| Vite dev server (`npm run dev`) | 5178 |

## Commands

```bash
npm --prefix "c:/skripte/public/Sportabzeichen-Vorerfassung" test        # unit tests (Vitest)
npm --prefix "c:/skripte/public/Sportabzeichen-Vorerfassung" run typecheck
npm --prefix "c:/skripte/public/Sportabzeichen-Vorerfassung" run lint
npm --prefix "c:/skripte/public/Sportabzeichen-Vorerfassung" run build   # → dist/index.html
npm --prefix "c:/skripte/public/Sportabzeichen-Vorerfassung" run build:hosted   # → dist-hosted/ (app to install)
npm --prefix "c:/skripte/public/Sportabzeichen-Vorerfassung" run hochladen -- -OhneRueckfrage   # target app
npm --prefix "c:/skripte/public/Sportabzeichen-Vorerfassung" run import:archivieren -- "<Bezeichnung>"  # after each processing
```

Note: the `cd-discipline` hook mistakes a shell variable holding this hyphenated project name for
a PowerShell cmdlet — write the full path inline instead of `P=".../Sportabzeichen-Vorerfassung"`.
In a cloud session the same scripts run from the checkout (`npm test`, …), except `hochladen` and
`tester` (PC only).

_Last updated: 2026-11-18_
