# 03 – Katalog und Behinderungsklassen

## MT-12: Seite „Klassen“ (Behinderungsklassen)

**Schritte:**

1. Rad: „Übungen“ › „Klassen“ öffnen.
2. Die Klasse „H“ antippen.

**Erwartet:**

- Zehn Einträge A bis J, jeweils mit Bezeichnung (z. B. „H – Schädigung des Nervensystems, im
  Rollstuhl“).
- **Nicht ungewöhnlich:** Eine Datei, die mit dem lokalen Paket gebaut wurde, zeigt bei G und H die
  längeren amtlichen Bezeichnungen aus dem DBS-Handbuch.
- **Nicht ungewöhnlich:** Ein blauer Hinweis sagt, dass Untergruppen und Einstufungskriterien noch
  nicht hinterlegt sind – sie kommen aus dem DBS-Handbuch über das lokale Datenpaket. Eine Datei,
  die mit diesem Paket gebaut wurde, zeigt beim Antippen Untergruppen (z. B. H I … H IV) und
  Kriterien.

## MT-13: Keine Verbandsabzeichen (seit 01.11.2026)

**Vorbedingung:** Eine Datei, die mit Version 0.1.0 gespeichert wurde (falls vorhanden).

**Schritte:**

1. Auf dem Rad alle Seiten ansehen (unteres Rad drehen).
2. Seite „Datei“ (Rad: „Geräte“ › „Datei“): die Tabelle „Leistungskatalog“ und die Zeile mit den Zählern ansehen.
3. Falls vorhanden: die mit Version 0.1.0 gespeicherte Datei über „Datei öffnen …“ öffnen.

**Erwartet:**

- Auf dem Rad gibt es **keine** Seite „Verbandsabzeichen“.
- Die Katalogtabelle hat nur die Spalten Gruppe und Übungen (regulär / MmB); die Zählerzeile nennt
  Teilnehmende, Gruppen und Messwerte, aber keine Verbandsabzeichen.
- Die alte Datei öffnet sich normal (ihre leere Verbandsabzeichen-Liste fällt still weg).
  **Nicht ungewöhnlich:** Enthielte eine Datei tatsächlich Verbandsabzeichen, würde sie mit dem
  roten Hinweis „Die Datei enthält Verbandsabzeichen; diese werden nicht mehr erfasst …“ abgelehnt –
  nichts geht unbemerkt verloren.

## MT-14: Prüfungsjahr ohne Katalog

**Schritte:**

1. Seite „Datei“, Prüfungsjahr auf `2025` setzen.
2. Seite „Klassen“ öffnen (Rad: „Übungen“ › „Klassen“).
3. Prüfungsjahr wieder auf das aktuelle Jahr setzen.

**Erwartet:**

- Nach Schritt 1 erscheint statt der Katalogtabelle ein roter Hinweis „Für das Prüfungsjahr 2025 ist
  kein Leistungskatalog vorhanden (enthalten: gültig ab 2026)“; dasselbe auf der Seite
  „Klassen“.
- Nach Schritt 3 ist alles wieder da. Für 2027 gilt weiter der Katalog „gültig ab 2026“, bis ein
  neuer Jahrgang eingebaut ist.
