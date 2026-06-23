# Schuljahreswechsel WebUntis

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

Eine mehrbenutzer­fähige Web-App zur Koordination des jährlichen WebUntis-Schuljahreswechsels –
und generell für jeden wiederkehrenden Prozess mit Phasen, Verantwortlichen und Fortschrittsanzeige.

Entwickelt von einem Lehrer und IT-Verantwortlichen am Friedrich-Rückert-Gymnasium Düsseldorf,
mit Unterstützung von [Claude](https://claude.ai) (Anthropic).

---

## Was die App kann

- **Öffentliches Dashboard** – aktueller Stand ohne Login sichtbar (welcher Schritt ist dran,
  Fortschritt je Phase, überfällige und bald fällige Schritte)
- **Checkliste** – Schritte abhaken, Verantwortliche sowie Start- und Zieldatum eintragen,
  Kommentare und weiterführende Infos mit Markdown-Formatierung
- **Zeitstrahl** – Gantt- und Timeline-Ansicht der terminierten Schritte, öffentlich und
  eingeloggt; Schritte mit Start- und Zieldatum als Balken, Zoom-Schieberegler
- **Export** – Checkliste als CSV, Zeitstrahl als SVG-Vektorgrafik, beides auch als PDF
- **Aktivitätsprotokoll** – wer hat wann was erledigt, als Tabelle und CSV-Export
- **Parallel-Erkennung** – Schritte mit überlappenden Zeiträumen werden automatisch
  als parallel markiert und visuell gruppiert
- **Phasen-Verwaltung** – Phasen anlegen, umbenennen, einfärben und per Drag-and-Drop
  umsortieren; Nummerierung passt sich automatisch an
- **Checkliste verwalten** – Schritte hinzufügen, bearbeiten, umsortieren, Phasen wechseln,
  deaktivieren; Notizen mit Markdown und Live-Vorschau
- **Vorlagen-Snapshots** – aktuellen Stand einfrieren und beim nächsten Prozess als Basis
  wählen; ermöglicht mehrere unabhängige Prozess-Vorlagen
- **Archiv-Ansicht** – vergangene Schuljahre read-only durchblättern
- **Zugriffsbeschränkung** – Anmeldung nur für vorab freigegebene Personen; WebUntis-
  Passwort allein reicht nicht
- **Lokales Notfall-Passwort** – optionaler bcrypt-Hash pro Person für den Fall dass
  WebUntis nicht erreichbar ist; wird per SQL gesetzt, kein UI
- **Druckansicht** – Checkliste und Zeitstrahl per `@media print` druckfertig
- **Mobilansicht** – optimiertes Layout für kleine Bildschirme

---

## Technischer Überblick

| Schicht | Technologie |
|---|---|
| Frontend | Vanilla JS/HTML/CSS, kein Build-Schritt |
| Backend | PHP ohne Framework, eigener Router |
| Datenbank | SQLite |
| Authentifizierung | WebUntis JSON-RPC + optionales lokales bcrypt-Passwort |
| Hosting | Uberspace 7 (empfohlen; andere PHP-Umgebungen sind möglich) |

Bewusst ohne externe Abhängigkeiten – kein npm, kein Composer, kein CDN.

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
  INSTALL.md          Einrichtung Schritt für Schritt (Uberspace und lokal)
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
sqlite3 data/app.sqlite < migrations/006_start_datum.sql
sqlite3 data/app.sqlite < migrations/007_aktivitaeten.sql
sqlite3 data/app.sqlite < migrations/008_lokales_passwort.sql

php -S localhost:8000 -t backend/public dev-router.php
```

Für den ersten Admin-Eintrag und die Uberspace-Einrichtung
siehe `docs/INSTALL.md`.

---

## Anpassung für andere Schulen

Die Authentifizierung steckt vollständig in `backend/src/Auth/WebUntisAuth.php`
und lässt sich durch eine eigene Implementierung ersetzen. Alternativ kann
das lokale Passwort-Feature genutzt werden um ganz ohne WebUntis zu arbeiten.

---

## Mitmachen

Pull Requests und Issues sind willkommen. Bitte beachten:

- Keine externen Abhängigkeiten (kein npm, kein Composer)
- PHP-Syntax kompatibel mit PHP 8.0+
- Neue Datenbankänderungen als eigene Migration (`migrations/NNN_name.sql`)
- CHANGELOG.md bei relevanten Änderungen aktualisieren

---

## Lizenz

Copyright (C) 2026 Sebastian Horn, Friedrich-Rückert-Gymnasium Düsseldorf

Dieses Projekt steht unter der **GNU General Public License v3.0**.
Details siehe [LICENSE](LICENSE) oder
[gnu.org/licenses/gpl-3.0](https://www.gnu.org/licenses/gpl-3.0).

---

## Danksagung

Entwickelt mit Unterstützung von [Claude](https://claude.ai) (Anthropic) –
von der ersten Idee bis zur Implementierung aller Funktionen.
