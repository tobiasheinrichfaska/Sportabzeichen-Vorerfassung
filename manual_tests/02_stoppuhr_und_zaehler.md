# 02 – Stoppuhr und Zähler

## MT-06: Einfache Zeitmessung

**Vorbedingungen:** App geöffnet.

**Schritte:**

1. Rad: „Werkzeuge“ › „Stoppuhr“ öffnen.
2. Auf „Start“ tippen, nach etwa 8 Sekunden auf „Stopp“ tippen.

**Erwartet:**

- Die Anzeige läuft flüssig mit Hundertstelsekunden hoch (z. B. `8,43`).
- **Die Uhr startet schon beim Berühren** des Knopfes, nicht erst beim Loslassen.
- Nach „Stopp“ steht darunter z. B. „Gestoppt: Schnelligkeit: **8,4**3 · Ausdauer: **00:08**,4“ –
  der Wert für die Prüfkarte fett, die folgende Stelle in einem **helleren Farbton**.
- **Nicht offensichtlich:** Der fette Wert ist **abgeschnitten**, nicht gerundet: aus 8,49 s wird
  8,4, nicht 8,5 – so verlangt es der Prüfungswegweiser („auf Zehntelsekunde abgelesen“ bzw. „auf
  Sekunden abgelesen“). Die hellere Ziffer wird nicht eingetragen; sie hilft dem Prüfer bei
  Grenzfällen. Mit dem Finger/der Maus auf die helle Ziffer zeigen: Hinweis „nächste Stelle, nicht
  für die Prüfkarte“.
- Der Knopf heißt jetzt „Weiter“; „Zurücksetzen“ ist aktiv.

## MT-07: Gruppenstart mit mehreren Zieleinläufen

**Vorbedingungen:** Stoppuhr zurückgesetzt („Zurücksetzen“).

**Schritte:**

1. „Start“ tippen.
2. Nach ca. 5 s „Zieleinlauf“, nach ca. 6 s nochmals „Zieleinlauf“, nach ca. 7 s ein drittes Mal.
3. „Stopp“ tippen.

**Erwartet:**

- Eine nummerierte Liste mit drei Zeiten in der Reihenfolge der Einläufe, jede mit beiden
  Lesarten (Schnelligkeit/Ausdauer).
- „Zieleinlauf“ ist nur wählbar, solange die Uhr läuft (vorher und nachher ausgegraut).
- „Zurücksetzen“ ist nur bei angehaltener Uhr wählbar und leert auch die Liste.

## MT-08: Stoppuhr läuft beim Seitenwechsel weiter

**Schritte:**

1. Stoppuhr starten.
2. Oben auf „‹ Zähler“ tippen (oder auf der Seite nach rechts wischen), ein paar Sekunden warten.
3. Oben auf „Stoppuhr ›“ tippen.

**Erwartet:** Die Uhr ist **weitergelaufen**; die vergangene Zeit ist enthalten.

## MT-09: Zähler reagiert schnell

**Vorbedingungen:** Auf einem Touch-Gerät (iPad/iPhone/Android) testen.

**Schritte:**

1. Rad: „Werkzeuge“ › „Zähler“ öffnen.
2. So schnell wie möglich 30-mal auf die große Fläche tippen und dabei mitzählen.
3. Einmal auf „−1 (Korrektur)“ tippen.
4. Auf „Zurücksetzen“ tippen, danach noch einmal „−1 (Korrektur)“.

**Erwartet:**

- Nach Schritt 2 steht **genau 30** da – kein Tipp geht verloren, keiner wird doppelt gezählt.
- Jeder Tipp zählt **sofort beim Berühren**; die Seite zoomt beim schnellen Doppeltippen **nicht**
  und es wird kein Text markiert.
- Nach Schritt 3: 29. Nach Schritt 4: 0 – auch nach „−1“ bleibt es bei 0 (nie negativ).

## MT-10: Zähler per Tastatur

**Vorbedingungen:** Rechner mit Tastatur.

**Schritte:**

1. Rad: „Werkzeuge“ › „Zähler“, die große Fläche einmal anklicken (zählt 1).
2. Fünfmal die Leertaste drücken, dann zweimal Enter.
3. Zweimal die Pfeiltaste nach unten drücken.

**Erwartet:** Nach Schritt 2 steht 8, nach Schritt 3 steht 6.

## MT-11: Metronom für den Curl-Up-Test

**Vorbedingungen:** Gerät mit Lautsprecher; auf iPhone/iPad den **Stummschalter ausschalten**
(sonst bleibt das Metronom stumm – das ist ein Verhalten von iOS, kein Fehler der App).

**Schritte:**

1. Rad: „Werkzeuge“ › „Metronom“ öffnen.
2. Bei „Vorgabe“ steht „Curl-Up-Test / Crunches (6.2.6.2)“, bei „Schläge pro Minute“ `40`.
3. Auf „Start“ tippen und mit einer Uhr 30 Sekunden mitlaufen lassen.
4. „Stopp“ tippen.
5. Vorgabe „Frei“ wählen, mit „+“ auf `61` stellen, kurz starten und wieder stoppen.

**Erwartet:**

- Nach dem Start alle 1,5 Sekunden ein Ton; die große Fläche blinkt im Takt und zeigt
  abwechselnd **„hoch“** und **„runter“**. Der Ton bei „hoch“ klingt höher.
- Nach 30 Sekunden etwa 20 Schläge und 10 Wiederholungen („Schläge: 20 · Wiederholungen: 10“).
- Der Takt bleibt gleichmäßig, auch wenn man währenddessen auf dem Bildschirm scrollt.
- Bei „Frei“ zeigt die Fläche die Schlagzahl statt hoch/runter; es gibt keine Wiederholungen.
- Werte unter 20 oder über 240 werden auf diese Grenzen gesetzt.

## MT-38: Metronom an der Station (Curl-Up und Push-Ups)

**Vorbedingungen:** wie MT-11 (Ton an); eine Gruppe mit einer erwachsenen Person (z. B. Jahrgang 1990) – Push-Ups und Curl-Up gibt es erst ab 18 Jahren, bei Kindern erscheint kein Metronom.

1. Rad: „Werkzeuge“ › „Metronom“, „Vorgabe“ aufklappen.
   - Drei Vorgaben: „Curl-Up-Test / Crunches (6.2.6.2)“, „Push-Ups / Liegestützen (6.2.6.1)“,
     „Frei“. Unter dem Start-Knopf steht bei Curl-Up „Pflichttakt: …“, bei Push-Ups „Richtwert: …“.
2. Rad: „Abnahme“ › „Erfassen“, die Übung „Crunches/Curl-Up-Test/Bauchpresse (6.2.6.2)“ wählen.
   - Unter „Aufbau ansehen“ stehen aufgeklappt „Zähler: …“ und „Metronom: 40 Schläge pro Minute
     (Pflichttakt)“ (seit 11.11.2026 gleich offen, siehe MT-40).
3. Beim Metronom „Start“ tippen.
   - Das Metronom läuft wie in MT-11, nur mit kleinerer Fläche; eine Auswahl der Vorgabe gibt es
     hier nicht.
4. „Metronom: …“ antippen (zuklappen).
   - Der Ton hört auf. Wieder aufgeklappt steht „–“ und „Start“.
5. Die Übung „Push-Ups (6.2.6.1)“ wählen.
   - Seit 18.11.2026 kein eigenes Metronom mehr: der Zähler trägt den Takt („Takt an (60/min)“,
     siehe MT-46).
   - **Nicht ungewöhnlich:** Triceps-Dips und Pull-Ups haben kein Metronom – ihr Text nennt kein
     Tempo, nur „kontrolliert“.

## MT-42: Zielvideo – Ziel aufnehmen, Bild wählen, Zeit übernehmen

**Vorbedingungen:** Handy mit Kamera, gehostete App (aus dem Büronetz oder mit Tester-Anmeldung)
oder die Datei; eine Person, die über eine Linie läuft (oder eine Hand, die durchs Bild fährt).

1. Rad: „Werkzeuge“ › „Stoppuhr“, „Zielvideo aus“ antippen.
   - Beim ersten Mal fragt das Handy, ob die Seite die Kamera benutzen darf – erlauben.
   - Der Knopf heißt „Zielvideo an“, darunter das Kamerabild (die Rückkamera).
   - **Nicht ungewöhnlich:** Wird die Kamera verweigert, steht rot „Die Kamera ist für diese Seite
     nicht erlaubt …“ – das lässt sich in den Einstellungen des Browsers ändern.
2. Kamera aufs Ziel richten, „Start“, die Person läuft durchs Bild, dabei „Zieleinlauf“, dann
   „Stopp“.
   - Neben der Zeit „1) …“ steht „Zielbilder“.
3. „Zielbilder“ antippen.
   - Ein Bild mit rotem Rand: das Bild im Moment des Drückens. Darunter „Bild … von …“.
   - **Nicht offensichtlich – je nach Handy einer von zwei Fällen:**
     - **Mit Zeit:** „● Druck auf „Zieleinlauf““, dahinter die Zeit dieses Bildes; darunter der
       Knopf „Zeit dieses Bildes übernehmen“. Weiter mit Schritt 4.
     - **Ohne Zeit:** „● etwa beim Druck auf „Zieleinlauf““, keine Zeit, kein Knopf, dafür der
       Hinweis „Dieses Gerät meldet nicht, wann die Kamera das Bild aufgenommen hat … es gilt die
       gedrückte Zeit.“ Das ist Absicht, kein Fehler: eine Zeit aus dem Bild wäre um die
       Verzögerung der Kamera falsch. Weiter mit Schritt 6.
4. Mit „◀“/„▶“ oder dem Schieber zum ersten Bild gehen, auf dem die Person die Linie erreicht hat.
   - Die Zeit ändert sich mit jedem Bild (je Bild etwa 3 Hundertstel); ohne roten Rand.
5. „Zeit dieses Bildes übernehmen“ antippen.
   - Die Zeit bei „1)“ ist jetzt die des Bildes, dahinter „(aus dem Zielbild; Druck …)“ mit der
     gedrückten Zeit. In „Erfassen“ steht beim Kind „⏱ 1) …“ mit der neuen Zeit.
6. „Zurücksetzen“.
   - Die Zielbilder sind weg. „Zielvideo an“ antippen schaltet die Kamera aus.
   - **Nicht ungewöhnlich:** Die Bilder werden nie gespeichert – auch nicht in der Datei. Nach dem
     Schließen der App sind sie weg. Je Zieleinlauf gibt es Bilder 2 s davor bis 1 s danach; nach
     20 Zieleinläufen steht bei weiteren „ohne Zielbilder“.
7. Auf einem iPhone wiederholen (Safari und vom Home-Bildschirm).
   - Bitte je Handy melden: Erscheint das Kamerabild? Fall „Mit Zeit“ oder „Ohne Zeit“ (Schritt 3)?
     Sind die Bilder flüssig genug?

## MT-46: Curl-Up mit „Ende“ und Übernahme, Push-Ups mit Takt im Zähler

Seit 18.11.2026 (Tobias: „Ja, bauen, Zwischenton alle 10 … Für die Push-Ups … der Zähler bekommt
eine Metronom-Funktion“). **Vorbedingungen:** wie MT-38, Ton an.

1. Rad: „Abnahme“ › „Erfassen“, „Crunches/Curl-Up-Test/Bauchpresse (6.2.6.2)“, beim Metronom
   „Start“.
   - Der Knopf heißt nun „Ende“. „Wiederholungen“ zählt erst, wenn nach „runter“ das nächste „hoch“
     kommt (nach dem 2. Schlag steht 0, nach dem 3. Schlag 1).
2. Bis über 10 Wiederholungen laufen lassen (bei 40/min etwa 30 s).
   - Auf dem Schlag, der die 10. Wiederholung abschließt, klingt ein tiefer, langer Ton statt des
     hohen; ebenso bei 20, 30 …
3. „Ende“ tippen.
   - Das Metronom hält an. „Ende: n Wiederholungen“ mit „−1 (letzte nicht sauber)“ und „+1“; die
     Wiederholung, die beim Drücken lief, zählt nicht.
4. „−1“ tippen, dann beim Kind „Metronom (n−1)“.
   - Die Zahl steht im Feld des Kindes; „Speichern“ speichert sie.
5. „Push-Ups/Liegestützen (6.2.6.1)“ wählen.
   - Das Feld des Kindes ist leer (der Wert von eben bleibt nicht stehen). Kein eigenes Metronom;
     unter der Zählfläche „Takt an (60/min)“.
6. „Takt an“, dann bei jeder ganzen Wiederholung (alle ~2 s, auf dem hohen Ton) die Zählfläche
   antippen.
   - Unter dem Takt-Knopf z. B. „Letzte Zählung 0,1 s später als der Takt.“ – der Takt bleibt, wie
     er ist.
7. Einmal deutlich (mehr als eine halbe Sekunde) zu spät oder zu früh tippen.
   - „… – Takt neu ausgerichtet.“: der hohe Ton kommt sofort und von da an im selben Tempo; die
     nächste Zählung im Takt steht wieder bei „genau im Takt“ bzw. wenigen Zehnteln.
   - **Nicht ungewöhnlich:** Das Tempo ändert sich nie – es ist der Richtwert. Ein Sportler, der
     dauerhaft langsamer ist, bekommt öfter „neu ausgerichtet“.
8. Beim Kind „Zähler (n)“ antippen und speichern.
