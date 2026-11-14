# 01 – Start und Speichern

## MT-01: App startet ohne Internet

**Vorbedingungen:** WLAN/Netzwerk ausgeschaltet (Flugmodus).

**Schritte:**

1. Doppelklick auf `index.html`.

**Erwartet:**

- Zwei Räder füllen den Bildschirm: unten klein die Bereiche (Vorbereiten, Übungen, Abnahme,
  Werkzeuge, Ergebnis, Geräte), darüber groß die Seiten; „Vorbereiten“ steht oben am
  Berührungspunkt, darüber „Kinder“ umrandet.

**Schritte (weiter):**

2. Unteres Rad drehen, bis „Geräte“ oben steht, dann oben auf „Datei“ tippen.

**Erwartet:**

- Die Seite „Datei“ wächst aus ihrem Feld; oben steht „Start › Geräte › Datei“.
- Ganz unten im Abschnitt „App“: Versionsnummer und „läuft vollständig auf diesem Gerät und sendet
  keine Daten“.
- Im Bereich „Leistungskatalog (gültig ab 2026)“ eine Tabelle mit vier Gruppen. **Kein** roter
  Kasten „Der Leistungskatalog ist fehlerhaft“.

## MT-02: Entwurf bleibt nach Neuladen erhalten

**Vorbedingungen:** App geöffnet (MT-01), keine roten Meldungen.

**Schritte:**

1. Rad: „Geräte“ › „Datei“ öffnen. Im Bereich „Prüfung“ bei „Verein / Schule / Organisation“ `Testverein` eintippen, bei „PLZ“
   `76131`, bei „Ort“ `Karlsruhe`.
2. Seite neu laden (F5 bzw. Neu-laden-Pfeil in Safari).

**Erwartet:**

- Alle drei Eingaben sind nach dem Neuladen noch da.
- **Nicht ungewöhnlich:** Die App öffnet nach dem Neuladen wieder die Seite „Datei“ (sie merkt sich
  ihre Seite einige Stunden).
- Unter den Knöpfen steht „Alle Eingaben werden automatisch auf diesem Gerät gespeichert. Verlässlich ist nur
  die gespeicherte Datei …“.
- **Hinweis:** In einem privaten Fenster kann der Browser das Speichern verweigern – dann
  erscheint eine rote Meldung „Browser-Speicher nicht beschreibbar …“. Das ist richtig so.

## MT-03: Als Datei speichern und wieder öffnen

**Vorbedingungen:** MT-02 durchgeführt (Testverein eingetragen).

**Schritte:**

1. Seite „Datei“ (Rad: „Geräte“ › „Datei“): auf „Als Datei speichern“ tippen.
2. Im Download-Ordner nachsehen.
3. Bei „Prüfungsjahr“ eine andere Zahl eintragen, z. B. `2030`.
4. Auf „Datei öffnen …“ tippen und die eben gespeicherte Datei wählen.

**Erwartet:**

- Nach Schritt 1 eine grüne Meldung „Datei zum Speichern angeboten – bitte im Download-Ordner
  prüfen.“ Auf dem iPhone/iPad fragt Safari ggf. erst, ob geladen werden soll.
- Die Datei heißt z. B. `sportabzeichen_2026_Testverein_2026-11-01.sportabzeichen.json`
  (Jahr, Verein, heutiges Datum).
- Nach Schritt 4 grüne Meldung „„…“ geöffnet.“, das Prüfungsjahr steht wieder auf dem
  gespeicherten Wert (nicht 2030).

## MT-04: Beschädigte oder fremde Datei wird abgelehnt

**Vorbedingungen:** Eine beliebige andere Datei, z. B. ein Foto oder eine Textdatei mit dem
Inhalt `hallo`.

**Schritte:**

1. Auf der Seite „Datei“ etwas eintragen (z. B. Ort `Teststadt`).
2. „Datei öffnen …“ und die fremde Datei wählen.

**Erwartet:**

- Roter Kasten: „„…“ wurde nicht geöffnet:“ und darunter der Grund (z. B. „Die Datei ist kein
  gültiges JSON.“ oder „Die Datei ist keine Sportabzeichen-Vorerfassung.“).
- **Wichtig:** Die bisherigen Eingaben (`Teststadt`) sind unverändert – nichts wurde halb
  geladen.

## MT-05: Neu beginnen

**Vorbedingungen:** Es sind Eingaben vorhanden.

**Schritte:**

1. Seite „Datei“: auf „Neu beginnen“ tippen.
2. Die Rückfrage „Alle Eingaben und den Entwurf im Browser löschen?“ mit **Abbrechen**
   beantworten.
3. Erneut „Neu beginnen“, diesmal mit **OK** bestätigen.
4. Seite neu laden.

**Erwartet:**

- Nach Schritt 2 ist alles unverändert.
- Nach Schritt 3 grüne Meldung „Neu begonnen.“, alle Felder leer, Prüfungsjahr = aktuelles Jahr.
- Nach Schritt 4 bleiben die Felder leer (der Entwurf ist wirklich gelöscht).
- **Gespeicherte Dateien** im Download-Ordner sind davon **nicht** betroffen.
