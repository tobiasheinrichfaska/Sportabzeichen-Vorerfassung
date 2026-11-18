# Manuelle Tests – Sportabzeichen-Vorerfassung

Schritt-für-Schritt-Anleitungen für Testerinnen und Tester **ohne Programmierkenntnisse**. Sie
prüfen, was nur ein Mensch am Bildschirm feststellen kann: Darstellung, Bedienung mit Finger
und Maus, gespeicherte Dateien, Verhalten auf iPad/iPhone. Die automatischen Unit-Tests
ersetzen diese Tests nicht.

## Vorbereitung

1. Die Datei `index.html` aus dem Ordner `dist` erhalten (oder selbst bauen: `npm run build`).
2. Auf einen Ordner kopieren, in dem du Dateien anlegen darfst (z. B. Desktop).
3. Getestet werden soll mindestens mit:
   - einem aktuellen Chrome oder Edge auf Windows,
   - Safari auf iPad oder iPhone (Datei per AirDrop oder „Dateien“-App öffnen).
4. **Keine echten Personendaten verwenden** – nur ausgedachte Namen.

## So startest du die App

- **Als Datei:** Doppelklick auf `index.html`. Die App öffnet sich im Browser. Eine
  Internetverbindung ist nicht nötig.
- **Gehostet zum Installieren:** die Adresse im Ordner `NebenprojektSportabzeichen/` öffnen (nur aus
  dem Büronetz oder mit Tester-Anmeldung) und auf den Home-Bildschirm legen – siehe MT-18.

Navigiert wird mit zwei Rädern: unten die Bereiche, oben die Seiten. „Rad: „Geräte“ › „Datei““
heißt: unten „Geräte“ zum Berührungspunkt drehen oder antippen, dann oben „Datei“ antippen.

## Testfälle

| Datei                                                                | Bereich                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [01_start_und_speichern.md](01_start_und_speichern.md)               | Start ohne Internet, Entwurf im Browser, Datei speichern/öffnen, beschädigte Datei, Neu beginnen (MT-01 … MT-05)                                                                                                                                                                                                                                   |
| [02_stoppuhr_und_zaehler.md](02_stoppuhr_und_zaehler.md)             | Stoppuhr mit Zieleinlauf, Reiterwechsel, Zähler per Finger und Tastatur, Metronom, auch an der Station, Curl-Up mit Ende/Übernahme, Push-Ups mit Takt im Zähler, Zielvideo (MT-06 … MT-11, MT-38, MT-42, MT-46)                                                                                                                                    |
| [03_katalog_und_reiter.md](03_katalog_und_reiter.md)                 | Behinderungsklassen, keine Verbandsabzeichen, Prüfungsjahr ohne Katalog (MT-12 … MT-14)                                                                                                                                                                                                                                                            |
| [04_rad_und_installation.md](04_rad_und_installation.md)             | Räder bedienen, Seite merken, geplante Seiten, installieren, Start ohne Anmeldung, Updates, Testzone (MT-15 … MT-21, MT-43)                                                                                                                                                                                                                        |
| [05_gruppen_und_kinder.md](05_gruppen_und_kinder.md)                 | Gruppe anlegen, Kinder mit Vorname und Jahrgang, gleiche Namen, MmB, löschen, umschalten (MT-22 … MT-27)                                                                                                                                                                                                                                           |
| [06_moeglich_erfassen_ergebnis.md](06_moeglich_erfassen_ergebnis.md) | Möglich je Übung/je Kind, Planen (Stationen, Lücken), Schwimmnachweis, Durchgang und Zuordnen, Erfassen mit Stoppuhr, Variante und Klasse, Ergebnis, Aufbau, erwartete Werte und Einplanen, Ausführung (Schrittfolgen, Turnelemente), amtliche Namen, Werkzeuge bei der Übung, Korrekturen B–G (MT-28 … MT-37, MT-39 … MT-41, MT-44, MT-45, MT-47) |
| [07_live_test.md](07_live_test.md)                                   | Ablauf für den Live-Test mit vier Kindern: vorbereiten, erfassen ohne Büro-WLAN, sichern, auswerten                                                                                                                                                                                                                                                |

## Fehler melden

Bitte notieren: Testfall-ID, Gerät und Browser, was du getan hast, was du erwartet hast, was
stattdessen passiert ist – am besten mit Bildschirmfoto.
