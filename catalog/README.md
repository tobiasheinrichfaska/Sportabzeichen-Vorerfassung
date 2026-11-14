# Leistungskatalog als Datenpaket

Jeder Jahrgang „gültig ab“ ist ein eigener Ordner. Die App nimmt für ein Prüfungsjahr den
Katalog mit dem jüngsten „gültig ab“, das nicht nach diesem Jahr liegt. Für 2027 genügt also ein
neuer Ordner `2027/` (und ggf. `local/2027.*.json`) – kein Programmcode.

```
catalog/
  2026/                       öffentlich (im Repository)
    catalog.json              Übungen, Behinderungsklassen A–J, Quellen
    spaz.json                 Bezeichnungen der Disziplinen in SpAz → Übungen (optional)
  local/                      NICHT im Repository (.gitignore)
    2026.requirements.json    Grenzwerte Bronze/Silber/Gold aus den offiziellen Tabellen
    2026.classes.json         Untergruppen und Einstufungskriterien aus dem DBS-Handbuch
```

## Warum `local/`?

Grenzwerte, Übungsbeschreibungen und Klasseneinteilungen gehören dem DOSB bzw. dem DBS. Sie werden nicht veröffentlicht und fallen nicht unter die Lizenz dieses
Repositorys. Wer sie nutzen oder weitergeben möchte, klärt das direkt mit dem DOSB
(deutsches-sportabzeichen@dosb.de) bzw. dem DBS (sportabzeichen@dbs-npc.de).

## Formate der lokalen Dateien

`2026.requirements.json` – Zeilen in der Schreibweise der Prüfkarten; Zeiten, Weiten und Zahlen
werden beim Bauen genauso gelesen wie Eingaben in der App:

```json
{
  "rows": [
    {
      "exerciseId": "run-endurance",
      "track": "regular",
      "sex": "w",
      "ageFrom": 6,
      "ageTo": 7,
      "label": "800 m",
      "bronze": "05:38",
      "silver": "04:58",
      "gold": "04:13"
    },
    {
      "exerciseId": "run-endurance",
      "track": "mmb",
      "classId": "H II",
      "sex": "m",
      "ageFrom": 18,
      "ageTo": 19,
      "label": "…",
      "bronze": "…",
      "silver": "…",
      "gold": "…"
    }
  ]
}
```

`ageTo: null` steht für „und älter“ (z. B. 90+). Übungen, die nach Ausführung bewertet werden
(Gerätturnen), haben keine Grenzwerte, nur `label`.

`2026.classes.json` – ergänzt Bezeichnung/Beschreibung bekannter Klassen und fügt Untergruppen
hinzu:

```json
{
  "classes": [
    { "id": "H", "label": "…", "description": "Kriterien für die Einstufung …" },
    { "id": "H II", "parentId": "H", "label": "…", "description": "…" }
  ]
}
```

## Prüfung

Beim Bauen (`npm run build`, auch beim Testen) wird jedes Paket vollständig geprüft:
unbekannte Übungen, falsche Schreibweisen, Lücken und Überschneidungen von Altersspannen,
Grenzwerte in falscher Reihenfolge, Untergruppen ohne Hauptklasse, SpAz-Zuordnungen zu Übungen
anderer Gruppen. Ein Fehler bricht den Build mit allen Fundstellen ab – es wird nie mit einem
fehlerhaften Katalog gewertet.
