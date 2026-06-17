# Installation auf Uberspace

## 1. Code auf den Server bringen

Per Git (empfohlen, siehe Haupt-Gespräch zum Git-Workflow) oder einmalig
per `scp`/`rsync`. Der Code darf irgendwo im Uberspace-Home liegen, z. B.
`~/schuljahreswechsel-webuntis/`.

## 2. Domain/Subdomain auf den richtigen Ordner zeigen lassen

Wichtig: **nicht** das Projektverzeichnis selbst, sondern
`backend/public/` muss die Dokumentenwurzel sein - alles andere
(Konfiguration, PHP-Quellcode, SQLite-Datei) bleibt damit für den
Webserver unsichtbar.

```
uberspace web domain add swj.deine-domain.de
uberspace web backend set swj.deine-domain.de --apache
```

Anschließend in der Uberspace-Dashboard/Konfiguration den Dokumentenwurzel-
Pfad auf

```
/home/DEIN_USER/schuljahreswechsel-webuntis/backend/public
```

setzen (Uberspace nennt das je nach Version "Document Root" oder
richtet es über eine `.htaccess`-Weiterleitung im Hauptverzeichnis ein -
im Zweifel in der aktuellen Uberspace-Doku unter "Web Backends" nachsehen,
das ändert sich gelegentlich).

## 3. Konfiguration anlegen

```
cd schuljahreswechsel-webuntis
cp config/config.example.php config/config.php
```

Dann `config/config.php` öffnen und mindestens setzen:

- `webuntis.base_url` (z. B. `https://SERVERNAME.webuntis.com`)
- `webuntis.school` (Schulkennung, wie in der WebUntis-URL)

Diese beiden Werte stehen vermutlich schon irgendwo in der MRBS-
Konfiguration (`$auth["web_untis"]["school"]` /
`$auth["web_untis"]["base_url"]`) - dort einfach abschreiben.

## 4. Datenbank anlegen

```
sqlite3 data/app.sqlite < migrations/001_init.sql
sqlite3 data/app.sqlite < migrations/002_seed_schritte.sql
```

`sqlite3` ist auf Uberspace vorinstalliert. Die Datei `data/app.sqlite`
braucht Schreibrechte für den PHP-Prozess - auf Uberspace ist das per
Default der Fall, da PHP unter dem eigenen Uberspace-Benutzer läuft.

## 5. Erste:n Admin einrichten

Es gibt bewusst keine Oberfläche, um den allerersten Admin zu bestimmen -
sonst könnte sich theoretisch jeder selbst zum Admin machen. Stattdessen:

1. Mit den eigenen WebUntis-Zugangsdaten einmal ganz normal einloggen
   (legt automatisch eine Zeile mit der Rolle "mitglied" an).
2. Direkt per SQL zum Admin befördern:
   ```
   sqlite3 data/app.sqlite \
     "UPDATE benutzer_rollen SET rolle = 'admin' WHERE webuntis_user = 'DEIN_KUERZEL';"
   ```
3. Neu laden - der Admin-Bereich erscheint unten auf der Seite. Weitere
   Admins lassen sich danach ganz normal über die Oberfläche ernennen.

## 6. Testen

`https://swj.deine-domain.de` aufrufen, mit eigenen WebUntis-Zugangsdaten
anmelden, ein Schuljahr anlegen (Admin-Bereich) und ein paar Schritte
durchklicken.
