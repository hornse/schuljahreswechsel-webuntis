# Schuljahreswechsel WebUntis

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

Eine mehrbenutzer­fähige Web-App zur Koordination des jährlichen WebUntis-Schuljahreswechsels –
und generell für jeden wiederkehrenden Prozess mit Phasen, Verantwortlichen und Fortschrittsanzeige.

Entwickelt von einem Lehrer/IT-Verantwortlichen an einer Gesamtschule in NRW,
mit Unterstützung von [Claude](https://claude.ai) (Anthropic).

---

## Was die App kann

- **Öffentliches Dashboard** – aktueller Stand ohne Login sichtbar (welcher Schritt ist dran,
  Fortschritt je Phase, überfällige und bald fällige Schritte)
- **Checkliste** – Schritte abhaken, Verantwortliche und Datum eintragen, weiterführende Infos
  mit Markdown-Formatierung
- **Zeitstrahl** – Gantt- und Timeline-Ansicht der terminierten Schritte, öffentlich und eingeloggt
- **Parallel-Erkennung** – Schritte mit gleichem Datum werden automatisch als parallel markiert
  und visuell gruppiert
- **Phasen-Verwaltung** – Phasen anlegen, umbenennen, einfärben und per Drag-and-Drop umsortieren;
  Nummerierung passt sich automatisch an
- **Checkliste verwalten** – Schritte hinzufügen, bearbeiten, umsortieren (Drag-and-Drop),
  Phasen wechseln, deaktivieren; Notizen mit Markdown
- **Vorlagen-Snapshots** – aktuellen Stand einfrieren und beim nächsten Prozess als Basis wählen;
  ermöglicht mehrere unabhängige Prozess-Vorlagen (z. B. WebUntis-Wechsel, Abitur, Geräteausgabe)
- **Archiv-Ansicht** – vergangene Schuljahre/Prozesse read-only durchblättern
- **Zugriffsbeschränkung** – Anmeldung nur für vorab freigegebene Personen (WebUntis-Passwort
  allein reicht nicht); Admins verwalten Freigaben, Rollen und Entfernungen
- **Druckansicht** – Checkliste und Zeitstrahl per `@media print` druckfertig

---

## Technischer Überblick

| Schicht | Technologie |
|---|---|
| Frontend | Vanilla JS/HTML/CSS, kein Build-Schritt |
| Backend | PHP ohne Framework, eigener Router |
| Datenbank | SQLite |
| Authentifizierung | WebUntis JSON-RPC (kein eigenes Passwort-System) |
| Hosting | Uberspace 7 (empfohlen, auch andere PHP-Umgebungen möglich) |

Bewusst ohne externe Abhängigkeiten – kein npm, kein Composer, kein CDN.
Alles läuft mit dem was PHP und SQLite mitbringen.

---

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
LICENSE               GNU General Public License v3.0
```

---

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

---

## Anpassung für andere Schulen

Die App ist nicht auf WebUntis beschränkt – die Authentifizierung steckt
vollständig in `backend/src/Auth/WebUntisAuth.php` und lässt sich durch
eine eigene Implementierung ersetzen. Die Checkliste selbst und alle
anderen Funktionen sind vom Auth-System unabhängig.

Der mitgelieferte Seed (`migrations/002_seed_schritte.sql`) enthält die
11 Standard-Schritte für den WebUntis-Schuljahreswechsel gemäß Kapitel 14
des WebUntis-Handbuchs. Diese können in der Oberfläche jederzeit
angepasst, ergänzt oder durch eigene Vorlagen ersetzt werden.

---

## Mitmachen

Pull Requests und Issues sind willkommen. Bitte achte darauf:

- Keine externen Abhängigkeiten einführen (kein npm, kein Composer)
- PHP-Syntax kompatibel mit PHP 8.0+
- Neue Datenbankänderungen als eigene Migration (`migrations/NNN_name.sql`)
- CHANGELOG.md bei relevanten Änderungen aktualisieren

---

## Lizenz

Copyright (C) 2026 Sebastian Horn, Friedrich-Rückert-Gymnasium Düsseldorf

Dieses Projekt steht unter der **GNU General Public License v3.0**.
Das bedeutet: Du kannst den Code frei nutzen, verändern und weitergeben –
aber abgeleitete Werke müssen ebenfalls unter der GPL-3.0 veröffentlicht
werden. Details siehe [LICENSE](LICENSE) oder
[gnu.org/licenses/gpl-3.0](https://www.gnu.org/licenses/gpl-3.0).

---

## Danksagung

Entwickelt mit Unterstützung von [Claude](https://claude.ai) (Anthropic) –
von der ersten Idee bis zur Implementierung aller Funktionen. Der gesamte
Gesprächsverlauf (Architekturentscheidungen, Code-Reviews, Debugging) ist
Teil der Projektgeschichte.
