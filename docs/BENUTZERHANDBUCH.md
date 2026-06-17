# Benutzerhandbuch

## Anmeldung

Mit den gewohnten WebUntis-Zugangsdaten anmelden - kein neuer Account
nötig. Die Anmeldung funktioniert nur für Lehrkräfte; Schüler-Logins
werden von der App abgelehnt, auch wenn Benutzername und Passwort
korrekt sind.

## Checkliste

Jeder Schritt lässt sich anklicken, um Details aufzuklappen:

- **Häkchen** setzt den Schritt auf "erledigt" und merkt sich automatisch,
  wer ihn wann erledigt hat.
- **Verantwortlich** und **Datum** können frei eingetragen werden, z. B.
  um vorab zu planen, wer einen Schritt bis wann übernimmt.
- Alle Änderungen sind sofort für das ganze Kollegium sichtbar - es gibt
  keinen "Speichern"-Knopf, jedes Feld wird beim Verlassen übernommen.

## Admin-Aufgaben

Der Admin-Bereich erscheint nur für Personen mit der Rolle "admin" am
Ende der Seite.

### Neues Schuljahr anlegen

Trägt man im Feld "Neues Schuljahr" z. B. `2027/2028` ein und klickt auf
"Anlegen", passiert Folgendes:

1. Alle Schritte aus der aktuellen Vorlage werden frisch (und unerledigt)
   für das neue Schuljahr angelegt.
2. Das neue Schuljahr wird automatisch aktiv - alle anderen werden
   deaktiviert.
3. Frühere Schuljahre verschwinden nicht, sie sind nur nicht mehr die
   Standardansicht (eine Oberfläche, um in ihnen zu blättern, ist für
   eine spätere Version geplant).

### Zugriff verwalten

Jede Person, die sich schon einmal angemeldet hat, taucht in der Tabelle
"Zugriff" auf - mit der Standardrolle "mitglied". Über das Auswahlfeld in
der Zeile lässt sich jemand zum "admin" machen oder wieder zurückstufen.

**Wichtig:** Es kann nicht "der letzte Admin" über die Oberfläche entfernt
werden, dieser Schutz ist aktuell nicht eingebaut - bitte beim
Zurückstufen kurz nachdenken, sonst muss der erste Admin erneut per SQL
eingerichtet werden (siehe `docs/INSTALL.md`, Abschnitt 5).

## Was diese App (noch) nicht kann

- Keine E-Mail-Erinnerungen.
- Kein Dashboard mit "was ist diese Woche fällig" - nur die
  Gesamtchecklist.
- Keine Ansicht vergangener Schuljahre in der Oberfläche (die Daten sind
  aber in der Datenbank erhalten).
