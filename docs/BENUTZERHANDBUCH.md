# Benutzerhandbuch

## Öffentliches Dashboard

`https://schuljahreswechsel.hornse.de` zeigt ohne Anmeldung den aktuellen
Stand: welcher Schritt gerade dran ist, Gesamtfortschritt, Fortschritt je
Phase, sowie überfällige und in den nächsten 14 Tagen anstehende Schritte
(sofern jemand ein Datum eingetragen hat). Das ist bewusst für alle
einsehbar - Kollegium, Schulleitung, auch ohne Login. Wer zuständig ist
("Verantwortlich") und eingetragene Kommentare sind in dieser öffentlichen
Ansicht NICHT zu sehen, das gibt es nur nach Anmeldung.

## Anmeldung

Über den Button "Anmelden" oben rechts, mit den gewohnten
WebUntis-Zugangsdaten. Wichtig: anders als man vielleicht erwartet, reicht
ein korrektes WebUntis-Passwort allein nicht aus. Die Anmeldung
funktioniert nur für Personen, die zusätzlich von einem Admin in "Zugriff"
freigegeben wurden (gedacht fürs Untis/WebUntis-Team, nicht fürs ganze
Kollegium). Schüler-Logins werden unabhängig davon immer abgelehnt, auch
wenn Benutzername und Passwort korrekt sind.

## Checkliste

Nach der Anmeldung über den Tab "Checkliste" erreichbar. Jeder Schritt
lässt sich anklicken, um Details aufzuklappen:

- **Häkchen** setzt den Schritt auf "erledigt" und merkt sich automatisch,
  wer ihn wann erledigt hat.
- **Verantwortlich** und **Datum** können frei eingetragen werden, z. B.
  um vorab zu planen, wer einen Schritt bis wann übernimmt.
- Alle Änderungen sind sofort für das ganze freigegebene Team sichtbar -
  es gibt keinen "Speichern"-Knopf, jedes Feld wird beim Verlassen
  übernommen.

## Admin-Aufgaben

Der Admin-Bereich erscheint nur für Personen mit der Rolle "admin" am
Ende der Seite (nach Anmeldung).

### Neues Schuljahr anlegen

Trägt man im Feld "Neues Schuljahr" z. B. `2027/2028` ein und klickt auf
"Anlegen", passiert Folgendes:

1. Alle aktiven Schritt-Vorlagen werden frisch (und unerledigt) für das
   neue Schuljahr angelegt.
2. Das neue Schuljahr wird automatisch aktiv - alle anderen werden
   deaktiviert.
3. Frühere Schuljahre verschwinden nicht, sie sind nur nicht mehr die
   Standardansicht (eine Oberfläche, um in ihnen zu blättern, ist für
   eine spätere Version geplant).

### Zugriff verwalten

Nur Personen in dieser Liste können sich überhaupt anmelden. Über das
Formular "WebUntis-Kürzel / Anzeigename / Rolle" lässt sich jemand VOR
ihrem ersten Login freischalten - das Kürzel muss exakt dem
WebUntis-Benutzernamen entsprechen. Über das Auswahlfeld in der jeweiligen
Zeile lässt sich die Rolle jederzeit ändern (mitglied ↔ admin) oder der
Zugriff faktisch entziehen, indem die Rolle auf "mitglied" gesetzt wird
(ein vollständiges Entfernen aus der Liste gibt es in der Oberfläche noch
nicht - dafür wäre direkter Datenbankzugriff nötig).

**Wichtig:** Es kann nicht "der letzte Admin" über die Oberfläche entfernt
werden, dieser Schutz ist aktuell nicht eingebaut - bitte beim
Zurückstufen kurz nachdenken, sonst muss wieder ein Admin per SQL
eingerichtet werden (siehe `docs/INSTALL.md`, Abschnitt 5).

### Checkliste verwalten (Schritte ergänzen, bearbeiten, umsortieren)

Hier wird die wiederkehrende Vorlage gepflegt, nicht nur das aktuelle
Schuljahr - Änderungen wirken sich aber sofort auch auf das gerade
laufende Schuljahr aus.

- **Neuer Schritt:** Phase auswählen, Titel eintragen, "Hinzufügen". Der
  neue Schritt erscheint sofort (unerledigt) im aktuell laufenden
  Schuljahr und wird Teil der Vorlage für alle künftigen Schuljahre.
- **Titel ändern:** direkt im Textfeld der Zeile bearbeiten, beim
  Verlassen des Feldes wird gespeichert.
- **Phase ändern:** über das Auswahlfeld in der Zeile - der Schritt
  landet automatisch ans Ende der neuen Phase.
- **Umsortieren innerhalb einer Phase:** an dem Griff-Symbol (⠿) per
  Drag-and-Drop an die gewünschte Stelle ziehen. Das funktioniert
  absichtlich nur innerhalb derselben Phase, nicht phasenübergreifend -
  für einen Phasenwechsel das Auswahlfeld benutzen.
- **Deaktivieren:** entfernt einen Schritt aus allen KÜNFTIGEN
  Schuljahren, lässt ihn aber im aktuell laufenden (und in vergangenen)
  Schuljahren stehen, damit keine bereits eingetragene Arbeit verloren
  geht. Über "reaktivieren" rückgängig zu machen.

## Was diese App (noch) nicht kann

- Keine E-Mail-Erinnerungen.
- Keine Ansicht vergangener Schuljahre in der Oberfläche (die Daten sind
  aber in der Datenbank erhalten).
- Niemand kann vollständig aus der Zugriffsliste entfernt werden (nur die
  Rolle ändern) - dafür wäre direkter Datenbankzugriff nötig.
