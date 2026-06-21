# Schuljahreswechsel WebUntis

Eine mehrbenutzer­fähige Web-App zur Koordination des jährlichen WebUntis-Schuljahreswechsels –
und generell für jeden wiederkehrenden Prozess mit Phasen, Verantwortlichen und Fortschrittsanzeige.

## Was die App kann

- **Öffentliches Dashboard** – aktueller Stand (welcher Schritt ist dran, Fortschritt je Phase,
  überfällige und bald fällige Schritte) ohne Login sichtbar
- **Checkliste** – Schritte abhaken, Verantwortliche und Datum eintragen, weiterführende Infos
  mit Markdown-Formatierung
- **Zeitstrahl** – Gantt- und Timeline-Ansicht der terminierten Schritte, öffentlich und eingeloggt
- **Parallel-Erkennung** – Schritte mit gleichem Datum werden automatisch als parallel markiert
  und visuell gruppiert
- **Phasen-Verwaltung** – Phasen anlegen, umbenennen, einfärben und per Drag-and-Drop umsortieren;
  Nummerierung wird automatisch angepasst
- **Checkliste verwalten** – Schritte hinzufügen, bearbeiten, umsortieren (Drag-and-Drop),
  Phasen wechseln, deaktivieren
- **Vorlagen-Snapshots** – aktuellen Stand als benannte Vorlage einfrieren; beim nächsten
  Schuljahr (oder einem anderen Prozess) daraus wählen
- **Archiv-Ansicht** – vergangene Schuljahre read-only durchblättern
- **Zugriffsbeschränkung** – Anmeldung nur für vorab freigegebene Personen (WebUntis-Passwort
  allein reicht nicht); Admins können Personen freigeben, Rollen ändern und entfernen
- **Druckansicht** – Checkliste und Zeitstrahl druckfertig per `@media print`

## Technischer Überblick

| Schicht | Technologie |
|---|---|
| Frontend | Vanilla JS/HTML/CSS, kein Build-Schritt |
| Backend | PHP ohne Framework, eigener Router |
| Datenbank | SQLite |
| Authentifizierung | WebUntis JSON-RPC (kein eigenes Passwort-System) |
| Hosting | Uberspace 7 |

## Verzeichnisstruktur

```
config/               Konfigurationsvorlage (config.php wird nie eingecheckt)
data/                 SQLite-Datenbankdatei (außerhalb des Webroots)
migrations/           SQL-Skripte, einmalig der Reihe nach auszuführen
backend/
  bootstrap.php       Autoloading, Konfiguration, DB, Session, CSRF-Schutz
  src/                PHP-Klassen (App\...)
  api/                Endpunkt-Handler je Themenbereich
  public/             Dokumentenwurzel: index.html, CSS, JS, api-router.php
docs/
  INSTALL.md          Einrichtung Schritt für Schritt (Uberspace + lokal)
  BENUTZERHANDBUCH.md Bedienungsanleitung für Admins und Mitglieder
CHANGELOG.md          Versionshistorie
```

## Schnellstart (lokal)

```bash
cp config/config.example.php config/config.php
# config.php bearbeiten: webuntis.base_url und webuntis.school setzen

sqlite3 data/app.sqlite < migrations/001_init.sql
sqlite3 data/app.sqlite < migrations/002_seed_schritte.sql
sqlite3 data/app.sqlite < migrations/003_phasen.sql
sqlite3 data/app.sqlite < migrations/004_parallel_flag.sql
sqlite3 data/app.sqlite < migrations/005_vorlagen_sets.sql

php -S localhost:8000 -t backend/public dev-router.php
```

Dann `http://localhost:8000` öffnen. Für den ersten Admin-Eintrag und die
Uberspace-Einrichtung siehe `docs/INSTALL.md`.

## Bewusste Vereinfachungen / nicht (noch nicht) eingebaut

- Kein `start_datum` pro Schritt (nur Zieldatum) – Parallel-Erkennung basiert auf gleichem Tag
- Keine E-Mail-Erinnerungen
- Kein vollständiger Audit-Log (nur `login_log`)
- Keine Mehrsprachigkeit
