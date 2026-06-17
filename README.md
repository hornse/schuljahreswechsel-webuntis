# Schuljahreswechsel WebUntis

Eine kleine, mehrbenutzerfähige Checkliste für den jährlichen
Schuljahreswechsel in WebUntis. Ersetzt die Word-Vorlage/HTML-Prototyp aus
der ersten Projektphase durch eine echte, persistente Web-App mit Login,
Verlauf und Rollen.

## Kurzüberblick

- **Frontend:** Vanilla JS/HTML/CSS, kein Build-Schritt (`backend/public/`).
- **Backend:** PHP ohne Framework, eigener kleiner Router (`backend/public/api-router.php`).
- **Datenbank:** SQLite (`data/app.sqlite`), Schema in `migrations/`.
- **Authentifizierung:** läuft komplett über WebUntis (JSON-RPC), genau wie
  beim bestehenden MRBS-Raumbuchungssystem der Schule - es gibt **keine**
  eigene Benutzer-/Passworttabelle. Details und Sicherheitsanpassungen
  gegenüber dem MRBS-Modul stehen als Kommentar in
  `backend/src/Auth/WebUntisAuth.php`.

## Verzeichnisstruktur

```
config/         Konfigurationsvorlage (echte config.php wird nie eingecheckt)
data/           SQLite-Datenbankdatei (außerhalb des Webroots)
migrations/     SQL-Skripte, der Reihe nach einmalig auszuführen
backend/
  bootstrap.php  Autoloading, Konfiguration, DB, Session, CSRF-Basisschutz
  src/           PHP-Klassen (App\...)
  api/           Handler-Funktionen je Themenbereich
  public/        Uberspace-Dokumentenwurzel: Frontend + api-router.php
docs/
  INSTALL.md          Einrichtung Schritt für Schritt
  BENUTZERHANDBUCH.md  Anleitung fürs Kollegium + Admin-Aufgaben
```

## Schnellstart (lokal)

1. `cp config/config.example.php config/config.php` und WebUntis-Server,
   Schulkennung etc. eintragen.
2. SQLite-Datei aus den Migrationen erzeugen:
   ```
   sqlite3 data/app.sqlite < migrations/001_init.sql
   sqlite3 data/app.sqlite < migrations/002_seed_schritte.sql
   ```
3. PHP-Entwicklungsserver mit `backend/public/` als Dokumentenwurzel starten:
   ```
   php -S localhost:8000 -t backend/public
   ```
4. Im Browser `http://localhost:8000` öffnen und mit den eigenen
   WebUntis-Zugangsdaten anmelden.

Für die Einrichtung auf Uberspace siehe `docs/INSTALL.md`. Für die
Bedienung (inkl. "wie wird jemand Admin") siehe `docs/BENUTZERHANDBUCH.md`.

## Stand / bewusste Vereinfachungen (v1)

- Nur die Checkliste selbst - das in Phase 2 diskutierte Dashboard ("was
  ist gerade dran") ist als mögliche Erweiterung gedacht, aber noch nicht
  gebaut.
- Jeweils nur ein Schuljahr "aktiv". Frühere Schuljahre bleiben in der DB
  erhalten, aber es gibt noch keine UI, um in der Historie zu blättern.
- Keine E-Mail-Erinnerungen.
