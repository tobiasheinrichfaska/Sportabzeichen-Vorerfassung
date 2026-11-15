# 04 – Räder, Installation, Start ohne Anmeldung

Die gehostete App liegt im geschützten Ordner `NebenprojektSportabzeichen/` (nur aus dem Büronetz
oder mit Tester-Anmeldung erreichbar). Die Adresse nennt dir Tobias.

## MT-15: Mit den Rädern navigieren

**Vorbedingungen:** App geöffnet (Datei oder gehostete App), Startbild mit den zwei Rädern.

1. Das untere Rad mit dem Finger ein Stück drehen.
   - Das obere Rad dreht sich gegenläufig mit, wie durch Reibung; die Zahnräder dahinter drehen sich.
2. Loslassen.
   - Beide Räder rasten so ein, dass am Berührungspunkt (kleines Kreuz) genau eine Seite steht.
3. Unten auf „Abnahme“ tippen.
   - „Abnahme“ dreht sich zum Berührungspunkt, darüber stehen „Stoppuhr“, „Erfassen“, „Zähler“.
4. Oben auf „Erfassen“ tippen.
   - Die Seite wächst aus ihrem Feld; oben steht „Start › Abnahme › Erfassen“.
5. Auf der Seite nach links wischen.
   - Die Nachbarseite „Zähler“ öffnet sich (rechts in derselben Gruppe).
6. Unten rechts auf das kleine Rad mit „↩“ tippen.
   - Zurück auf den Rädern, „Abnahme“ steht weiter am Berührungspunkt.
7. Auf Android: die Zurück-Geste machen, während eine Seite offen ist.
   - Die App geht eine Ebene zurück zu den Rädern und schließt sich **nicht**.

## MT-16: Die App merkt sich ihre Seite

1. Rad: „Werkzeuge“ › „Metronom“ öffnen.
2. Die App schließen (Tab schließen bzw. auf dem Handy die App wegwischen) und neu öffnen.
   - Die Seite „Metronom“ ist wieder offen.
   - **Nicht ungewöhnlich:** Nach mehr als vier Stunden startet die App wieder auf den Rädern bei
     „Vorbereiten“.

## MT-17: Geplante Seiten

1. Rad: „Geräte“ drehen.
   - „Übertragen“ und „Prüfungstag“ sind blasser als „Datei“.
2. „Übertragen“ öffnen.
   - „Diese Funktion ist vorgesehen und kommt noch.“ und ein Satz, was sie später tut.
3. „Prüfungstag“ öffnen.
   - Ebenso, mit der Beschreibung des Zusammenschlusses mehrerer Geräte.

## MT-18: Im Büro installieren (iPhone/iPad)

**Vorbedingungen:** Gerät im Büro-WLAN.

1. In Safari die Adresse der App öffnen.
   - Die Räder erscheinen, **ohne** Anmeldefenster.
2. Teilen-Knopf › „Zum Home-Bildschirm“ › „Hinzufügen“.
   - Auf dem Home-Bildschirm erscheint das Symbol (blau, goldene Medaille am roten Band) mit dem
     Namen „Sportabzeichen“.
3. Die App **vom Home-Bildschirm** öffnen, noch im Büro-WLAN.
   - Sie startet ohne Browserleiste.
   - **Wichtig:** Auf iPhone/iPad hat die App vom Home-Bildschirm einen eigenen Speicher. Erst
     dieser erste Start im Büro legt sie für unterwegs ab.

Android/Chrome: Menü › „App installieren“ bzw. „Zum Startbildschirm hinzufügen“, dann wie Schritt 3.

## MT-19: Start außerhalb des Büros ohne Anmeldung

**Vorbedingungen:** MT-18 erledigt.

1. Das Büro-WLAN ausschalten, mobile Daten an.
2. Die App vom Home-Bildschirm öffnen.
   - Die Räder erscheinen sofort, **kein Anmeldefenster**.
3. Seite „Datei“ öffnen, „Nach neuer Version suchen“ tippen.
   - „Ohne Anmeldung nicht erreichbar (außerhalb des Büronetzes) – die gespeicherte Version läuft
     weiter.“ Es erscheint **kein** Anmeldefenster.
4. Flugmodus einschalten und die App neu öffnen.
   - Sie startet genauso; die Eingaben von vorher sind da.

## MT-20: Neue Version im Büro

**Vorbedingungen:** Tobias hat eine neue Version hochgeladen; Gerät im Büro-WLAN.

1. Die App öffnen (oder aus dem Hintergrund zurückholen).
   - Oben rechts steht „Stand …“ (die laufende Version). Nach kurzer Zeit erscheint dort der grüne
     Knopf „Neue Version – neu starten“.
2. Den grünen Knopf antippen.
   - Die App lädt neu; oben steht der neue Stand. Eingaben sind erhalten.
   - **Nicht ungewöhnlich:** Wurde die neue Version schon bei einem früheren Start im Büro geladen,
     erscheint der Knopf auch unterwegs – der Neustart braucht dann kein Netz.

## MT-21: Unterwegs mit Anmeldung aktualisieren

**Vorbedingungen:** Tester-Anmeldung (Benutzer `test`), Gerät außerhalb des Büros, mit Netz; auf
dem Gerät läuft schon ein Stand ab 10.11.2026 abends (sonst erst MT-20 im Büro oder neu
installieren, MT-18).

1. Seite „Datei“ › „Mit Anmeldung aktualisieren“ tippen.
   - Der Browser fragt nach Benutzername und Passwort („Sportabzeichen - Test“).
   - **Wichtig:** Kommt **kein** Anmeldefenster und die App bleibt, wie sie war, läuft noch der
     alte Service-Worker – dann erst im Büro-WLAN starten (MT-20).
2. Anmeldung eingeben.
   - Die App lädt die neue Version; auf „Datei“ steht „Mit der Anmeldung aktualisiert – diese
     Version startet jetzt auch ohne Anmeldung.“; oben der neue Stand.
3. App schließen und ohne Netz (Flugmodus) wieder öffnen.
   - Der neue Stand startet ohne Anmeldung.
4. Noch einmal „Mit Anmeldung aktualisieren“, das Anmeldefenster mit „Abbrechen“ schließen.
   - **Nicht ungewöhnlich:** Der Browser zeigt eine Fehlerseite („Unauthorized“). App schließen und
     vom Home-Bildschirm neu öffnen – sie startet wieder aus dem Speicher.

## MT-43: Testzone auf bunny.net – anmelden, unterwegs aktualisieren, Tester einladen

Ab dem Umzug liegt die Testfassung in einer eigenen, geschützten Testzone auf bunny.net. Die Tester
melden sich einmal an, danach erkennt ein Cookie das Gerät. Es gibt dort kein Büronetz mehr.

**Vorbedingungen:** Die App ist über „Freigabe“ in die Testzone hochgeladen. Adresse und
Tester-Zugang kommen von Tobias. Die Kamera-Regel der Zone ist angelegt (Begleit-Repo, `hosting/`).

1. Die Adresse der Testzone in Safari (Android: Chrome) öffnen.
   - Der Browser fragt nach Benutzername und Passwort („Sportabzeichen - Test“). Anmelden.
   - Die Räder erscheinen, unten rechts steht „Tester einladen“.
2. Zum Home-Bildschirm hinzufügen und die App **vom Home-Bildschirm** öffnen.
   - **Nicht ungewöhnlich:** Auf iPhone/iPad hat die App vom Home-Bildschirm einen eigenen Speicher
     und fragt beim ersten Start noch einmal nach der Anmeldung. Danach startet sie ohne.
3. Die App schließen, Flugmodus an, die App wieder öffnen.
   - Sie startet ohne Anmeldung, die Eingaben von vorher sind da.
4. Flugmodus aus (mobile Daten, kein Büro-WLAN). Tobias lädt eine neue Version hoch. Die App öffnen
   oder aus dem Hintergrund zurückholen.
   - Nach kurzer Zeit erscheint oben rechts der grüne Knopf „Neue Version – neu starten“, **ohne**
     Anmeldefenster. Antippen: Oben steht der neue Stand, die Eingaben sind erhalten.
5. Seite „Datei“ › „Nach neuer Version suchen“ tippen.
   - „Diese Version ist aktuell.“ Es erscheint **kein** Anmeldefenster.
6. Unten rechts „Tester einladen“ antippen.
   - Die Einladungsseite der Testumgebung erscheint, **nicht** wieder die App. „Zurück zur App“
     führt zurück.
7. Seite „Stoppuhr“ › „Zielvideo“ an.
   - Das Bild der Rückkamera erscheint. Kommt stattdessen „Die Kamera ist für diese Seite nicht
     erlaubt“, obwohl der Browser die Kamera erlaubt: Bildschirmfoto an Tobias, die Kamera-Regel
     der Zone prüfen.
