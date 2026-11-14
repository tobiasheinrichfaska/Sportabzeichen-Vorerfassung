# Sportabzeichen-Vorerfassung

Vorerfassung für das **Deutsche Sportabzeichen** – regulär (DOSB-Bedingungen) und für
**Menschen mit Behinderung** (DBS-Bedingungen) – als **eine einzige HTML-Datei**.

- Läuft vollständig auf dem eigenen Gerät (Laptop, iPad, Smartphone), auch ohne Internet und
  direkt per Doppelklick. Es werden **keine Daten gesendet**; der Browser verbietet der Datei jede
  Netzwerkverbindung (Content-Security-Policy).
- **Speichern:** automatischer Entwurf im Browser plus Speichern/Öffnen als Datei
  (`*.sportabzeichen.json`). Verlässlich ist die Datei – Safari löscht Browserdaten nach sieben
  Tagen ohne Nutzung.
- **Stoppuhr** (mit Zieleinlauf für Gruppenstarts) und **Zähler** (reagiert beim Berühren) zum
  direkten Messen.

> **Stand:** Grundgerüst. Die Grenzwerte der Leistungskataloge sind noch nicht hinterlegt; die
> Erfassungsansicht (Auswahl von Personen und Übungen → mögliche Kombinationen → Messwerte) folgt.

## Datenschutz

Die gespeicherte Datei enthält personenbezogene Daten und bei MmB **Gesundheitsdaten**
(Behinderungsklasse). Sie nur auf eigenen Geräten verwenden und sicher aufbewahren. Die
Teilnehmenden sind über die Datenverarbeitung zu informieren; bei MmB ist zusätzlich eine
gesonderte Einwilligung zur Verarbeitung der Gesundheitsdaten nötig (DOSB-Prüfungswegweiser
2026, Kap. 9.1.2).

Verbandsabzeichen (Kap. 8.4 des Prüfungswegweisers) erfasst die App nicht; eine Gruppe, die durch
ein Verbandsabzeichen ersetzt wird, wird direkt im Zielsystem eingetragen.

## Leistungsdaten von DOSB und DBS

Die Leistungsanforderungen (Grenzwerte), Übungsbeschreibungen und Einteilungen in
Behinderungsklassen des Deutschen Sportabzeichens stammen vom **Deutschen Olympischen Sportbund
(DOSB)**, für Menschen mit Behinderung vom **Deutschen Behindertensportverband (DBS)**. Diese Daten
sind **nicht Teil dieses Repositorys** und fallen **nicht unter dessen Lizenz** (AGPLv3 gilt nur
für den Programmcode).

Wer diese Daten nutzen, vervielfältigen oder weitergeben möchte, klärt das bitte **direkt mit dem
Rechteinhaber**: DOSB (deutsches-sportabzeichen@dosb.de) bzw. DBS (sportabzeichen@dbs-npc.de).
Derzeit enthält die App keine Grenzwerte; künftig werden sie aus einem
lokalen Datenpaket eingelesen, das nicht veröffentlicht wird.

## Entwicklung

```bash
npm install
npm test           # Unit-Tests
npm run build      # → dist/index.html
npm run dev        # Entwicklungsserver auf Port 5178
```

Quellen der fachlichen Regeln: [docs/quellen.md](docs/quellen.md) ·
Datenmodell: [docs/data-model.html](docs/data-model.html) ·
Manuelle Tests: [manual_tests/](manual_tests/README.md)

## License

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

This project is licensed under the **GNU Affero General Public License v3.0** (AGPLv3).
You are free to use, modify, and distribute this software under the terms of the AGPLv3.
If you use this software to provide a network service, you must make the full source code
of your modifications available to users of that service.

**Commercial License:** If you wish to use this software in a closed-source or proprietary
product, a commercial license is available. Contact: tobias.a.w.heinrich@gmail.com

See [LICENSE](LICENSE) for the full AGPLv3 text.
See [LICENSE_COMMERCIAL.md](LICENSE_COMMERCIAL.md) for commercial licensing terms.
