# Wochenprüfung Sportabzeichen-Vorerfassung

Die geplante Aufgabe „Wochenprüfung“ arbeitet diese Liste jeden Sonntag um 3:42 Uhr ab. Angelegt
auf Tobias' Auftrag vom 15.11.2026: Die Leistungstabellen und Prüfungsbedingungen von DOSB und DBS
ändern sich von Jahr zu Jahr, und die App muss das rechtzeitig merken.

**Erweitern** heißt: hier einen Eintrag ergänzen. Die Aufgabe selbst bleibt gleich; sie liest diese
Datei bei jedem Lauf vom Hauptzweig. Prüfungen über alle Projekte (Sicherheit, Abhängigkeiten,
CI-Stand, Zugangsdaten, private Dateien, täglicher Integritätsauftrag) stehen nicht hier, sondern in
`aufgaben/wochenpruefung.md` im privaten Repo `tobiasheinrichfaska/Pruefvorgaenge`.

## Regeln für jeden Lauf

- Nur Primärquellen:
  - DOSB: die Materialien des Deutschen Sportabzeichens und deren PDFs;
  - DBS: die DSA-Materialien;
  - die Plattform Sportabzeichen-Digital und ihre FAQ;
  - BLSV: SpAz.

  Wo diese Unterlagen heute liegen und welcher Stand gilt, steht in `docs/quellen.md`. Kopien bei
  Landes- oder Kreissportbünden zählen nur, wenn der DOSB die Datei nicht selbst anbietet; eine
  abweichende Kopie ist keine Änderung (Beispiel: die ältere Wegweiser-Kopie in `docs/quellen.md`).
  Nicht raten. Was sich nicht klären lässt, wird als „offen“ gemeldet, mit der Quelle, die fehlt.

- **Keine DOSB/DBS-Inhalte in dieses öffentliche Repo**, auch nicht in Berichte, PRs oder
  Kommentare: keine Grenzwerte, keine wörtlichen Texte, keine Bilder. Gemeldet werden nur
  Unterlage, alter und neuer Stand, Fundstelle und wie viele Zeilen oder Übungen betroffen sind.
  Vor jedem Push läuft die DOSB/DBS-Prüfung nach `CLAUDE.md`.
- Eine Änderung wird als PR umgesetzt, mit einem Test, der vorher fehlschlägt, und nach den Regeln
  von `CLAUDE.md`. Neue Grenzwerte, Texte oder Bilder kommen nur über den Konverter und den Abgleich
  mit der amtlichen Tabelle im Begleit-Repo in das lokale Paket, nie ungeprüft und erst nach
  Tobias' OK.
- PRs dieser Liste werden **nicht** gemergt: Was als Prüfungsbedingung gilt, entscheidet Tobias.
- Auch eine Änderung an dieser Datei selbst mergt nur Tobias (15.11.2026): Sie ist ein Auftrag an die
  geplante Aufgabe.
- Nie hochladen. Hochgeladen wird nur über die Workflows im Repo `Freigabe`, von Tobias gestartet.
- Ist das „Ende“ eines Eintrags oder eines Unterpunkts erreicht, wird er im selben PR gestrichen
  (oder in einem eigenen, wenn sonst nichts zu ändern ist).
- Die Einträge S1 bis S3 brauchen die privaten Dateien. Dafür das Begleit-Repo
  `Sportabzeichen-Vorerfassung-privat` anhängen und die Dateien kopieren, wie es `CLAUDE.md`
  („Cloud sessions“) beschreibt.

## Einträge

### L1 · DOSB-Unterlagen in neuer Fassung?

- **Prüfen:** Gibt es eine neuere Fassung als den Stand in `docs/quellen.md`? Maßgeblich sind
  Dateiname, Datum oder „gültig ab“ in der Unterlage. Geprüft werden:
  - Prüfungswegweiser (Fassung 24.03.2026);
  - Leistungskatalog Erwachsene und Leistungsübersicht Kinder und Jugendliche;
  - Erweiterter Leistungskatalog Kraft und Koordination (Fassung 24.03.2026);
  - Gruppenprüfkarte Allgemein und Einzelprüfkarte Menschen mit Behinderung.
- **Dann:** Melden: welche Unterlage, alter und neuer Stand, welche Kapitel betroffen sind.
  - Neue Werte, Texte oder Bilder nur nach den Regeln oben (Begleit-Repo, Tobias' OK).
  - Regeln ohne Werte (z. B. Alter, Schwimmnachweis, Ablesen, Punkte und Verleihung) als PR mit
    Test.
  - `docs/quellen.md` fortschreiben.
- **Ende:** dauerhaft.

### L2 · DBS-Handbuch für Menschen mit Behinderung in neuer Fassung?

- **Prüfen:** Gibt es eine neue Ausgabe des Handbuchs „Deutsches Sportabzeichen für Menschen mit
  Behinderung“ (Stand: gültig ab 1. Januar 2026), eine Berichtigung oder neue Leistungskarten?
- **Dann:** Wie L1 melden, dazu betroffene Behinderungsklassen und Untergruppen.
- **Ende:** dauerhaft.

### L3 · Offene Fragen an DOSB und DBS amtlich geklärt?

- **Prüfen:** Gibt es zu einer dieser Fragen eine amtliche Antwort (neue Fassung, Berichtigung,
  FAQ)? Die Fragen stehen in `CLAUDE.md` unter „Known Limitations“.
  - **G II Geschicklichkeitsgehen** im Alter 14–17, 35–44 und 65–74: Die Karte lässt die Felder
    leer, die Plattform bietet die Übung an. Bis zur Klärung gilt die Karte (Tobias, 02.11.2026).
  - **25 m Schwimmen in Minuten und 200 m Handbike:** Messart und Beschreibung fehlen im
    DBS-Handbuch.
  - **Zielwurf und Fußballzielstoß:** Ringpunkte nach DBS-Handbuch, die Plattform nennt eine Anzahl.
  - **Ablesen der Stoppuhr:** Keine Quelle nennt eine Rundungsrichtung.
  - **Aufbau-Texte:** Was die Quellen offenlassen (`docs/aufbau-offene-punkte.md`): Ist eine neue
    amtliche Beschreibung erschienen?
- **Dann:** Mit Fundstelle melden. Umgesetzt wird nach Tobias' Entscheidung; G II betrifft den
  Konverter und seinen Test im Begleit-Repo.
- **Ende:** je Unterpunkt, wenn er amtlich geklärt und umgesetzt ist.

### L4 · Unterlagen für das nächste Prüfungsjahr

- **Prüfen:** Ab September: Gibt es Unterlagen mit „gültig ab“ dem nächsten Jahr? Ändern sie
  Übungen, Klassen oder Werte?
- **Dann:**
  - Ohne Änderung: nur melden. Die App nimmt für ein Jahr ohne eigenes Paket das neueste mit
    „gültig ab“ ≤ Jahr (`catalogForYear`).
  - Mit Änderung: Tobias melden, dass ein neues Paket `catalog/<Jahr>/` (und ein lokales Paket im
    Begleit-Repo) nötig ist, rechtzeitig vor dem 1. Januar. Angelegt wird es erst nach seinem OK.
- **Ende:** dauerhaft.

### P1 · Sportabzeichen-Digital

- **Prüfen:** Gibt es eine neue Version des Leitfadens für Prüfer\*innen (Stand: Version 2.0,
  Juli 2026), der Mustervorlage „Prüfungsimport (XLSX)“ oder eine veröffentlichte Anleitung zum
  Import von Drittanbieterdateien?
- **Dann:** Melden. Das betrifft die geplante Übertragung zur Plattform (`CLAUDE.md`, „Next steps“).
- **Ende:** dauerhaft.

### P2 · SpAz (BLSV)

- **Prüfen:** Gibt es eine neue FAQ oder einen neuen Leitfaden zu SpAz (Stand: FAQ 2024-07,
  Leitfaden 2025-01)? Ist die Importfunktion für Prüfer jetzt freigeschaltet?
- **Dann:** Melden. Die Laufzettel und Exporte gibt es nur mit Prüfer-Zugang. Neue Bezeichnungen in
  `catalog/2026/spaz.json` kommen nur aus einem neuen Export von Tobias.
- **Ende:** dauerhaft.

### S1 · Tests mit dem lokalen Paket

- **Prüfen:** `npx vitest run src/build/catalogFiles.test.ts tests/tools/localCatalog.test.ts` mit
  den privaten Dateien. Die GitHub-Prüfung „Tests“ überspringt den Test mit dem echten Paket, und den
  Konverter-Test gibt es dort nicht.
- **Dann:** Einen Fehlschlag mit Ursache melden und beheben wie jeden anderen. Was das lokale Paket
  betrifft, wird im Begleit-Repo behoben.
- **Ende:** dauerhaft.

### S2 · Konverter und Paket stimmen überein

- **Prüfen:** `npm run katalog:lokal`. Danach muss `catalog/local/` bytegleich mit dem Begleit-Repo
  sein (Vergleichsbefehl in dessen README).
- **Dann:** Eine Abweichung melden: Welche Datei, wie viele Zeilen, nie die Werte. Klären, ob der
  Konverter oder das Paket den neueren Stand hat.
- **Ende:** dauerhaft.

### S3 · Keine DOSB/DBS-Inhalte in der ganzen Historie

- **Prüfen:** Die DOSB/DBS-Prüfung aus dem Begleit-Repo mit `history` über die vollständige
  Historie dieses Repos; ein flacher Klon wird vorher vollständig geholt. Sauber ist es ohne
  `triples` und ohne `text`-Treffer.
- **Dann:** Einen Treffer melden: nur Datei und Commit-Anzahl, nie den gefundenen Inhalt. Nichts
  selbst umschreiben, die Historie bereinigt nur Tobias.
- **Ende:** dauerhaft.
