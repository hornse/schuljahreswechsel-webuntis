# Installation auf Uberspace

## 1. Code auf den Server bringen

Per Git (empfohlen, siehe Haupt-Gespräch zum Git-Workflow) oder einmalig
per `scp`/`rsync`. Der Code darf irgendwo im Uberspace-Home liegen, z. B.
`~/schuljahreswechsel-webuntis/`.

## 2. Domain einrichten und auf backend/public zeigen lassen

Wichtig, und beim ersten Mal leicht falsch zu machen: Uberspace liefert
standardmäßig für **alle** Domains denselben Inhalt aus `~/html/` aus -
auch ein Ordner *innerhalb* von `~/html/`, der wie eure neue Domain
heißt, wird NICHT automatisch als eigener DocumentRoot erkannt. Der
richtige Mechanismus dafür ("Additional DocumentRoots") ist ein
Geschwisterordner bzw. Symlink **neben** `html/`, nicht darin:

```
uberspace web domain add DEINE-SUBDOMAIN.deine-domain.de
```

Da der Code per Git-Hook nach `/var/www/virtual/DEIN_USER/schuljahreswechsel-webuntis-src`
ausgecheckt wird (siehe Hinweis unten zu Symlinks in `/home`), den Symlink
direkt daneben anlegen:

```
cd /var/www/virtual/DEIN_USER
ln -s schuljahreswechsel-webuntis-src/backend/public DEINE-SUBDOMAIN.deine-domain.de
```

**Warum nicht einfach `~/schuljahreswechsel-webuntis` im Home-Verzeichnis
auschecken lassen?** Apache hat auf Uberspace keine Zugriffsrechte auf
`/home` - ein Symlink von dort aus würde nie funktionieren, egal wie er
benannt ist. Der Git-Hook (`~/repos/schuljahreswechsel-webuntis.git/hooks/post-receive`)
muss daher direkt nach `/var/www/virtual/DEIN_USER/schuljahreswechsel-webuntis-src`
auschecken:

```
GIT_WORK_TREE=/var/www/virtual/DEIN_USER/schuljahreswechsel-webuntis-src git checkout -f main
```

Zuletzt: für diesen DocumentRoot-Mechanismus verlangt die Uberspace-Doku
eine `RewriteBase /`-Zeile ganz oben in der `.htaccess` - die ist bereits
in `backend/public/.htaccess` enthalten, falls sie fehlt (z. B. nach
einem manuellen Test), einfach ergänzen.

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

Seit der Zugriffsbeschränkung aufs Untis/WebUntis-Team reicht ein
korrektes WebUntis-Passwort allein nicht mehr aus, um sich anzumelden -
die Person muss zusätzlich in `benutzer_rollen` stehen. Das betrifft auch
die allererste Person: es gibt bewusst keine Oberfläche, um sich selbst
freizuschalten, sonst könnte das jede:r mit einem WebUntis-Account tun.

Stattdessen den ersten Admin direkt per SQL eintragen, BEVOR diese Person
sich zum ersten Mal anmeldet:

```
sqlite3 data/app.sqlite \
  "INSERT INTO benutzer_rollen (webuntis_user, anzeigename, rolle) VALUES ('DEIN_KUERZEL', 'Dein Name', 'admin');"
```

Danach ganz normal mit den eigenen WebUntis-Zugangsdaten anmelden - der
Admin-Bereich erscheint unten auf der Seite. Weitere Personen (admin oder
mitglied) lassen sich danach über "Zugriff" → "Freigeben" in der
Oberfläche eintragen, ganz ohne erneutes SQL.

## 6. Testen

`https://swj.deine-domain.de` aufrufen, mit eigenen WebUntis-Zugangsdaten
anmelden, ein Schuljahr anlegen (Admin-Bereich) und ein paar Schritte
durchklicken.
