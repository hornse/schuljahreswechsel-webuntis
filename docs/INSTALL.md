# Installation

## Lokal (Entwicklung)

```bash
cp config/config.example.php config/config.php
# config.php bearbeiten (siehe Abschnitt 3)

sqlite3 data/app.sqlite < migrations/001_init.sql
sqlite3 data/app.sqlite < migrations/002_seed_schritte.sql
sqlite3 data/app.sqlite < migrations/003_phasen.sql
sqlite3 data/app.sqlite < migrations/004_parallel_flag.sql
sqlite3 data/app.sqlite < migrations/005_vorlagen_sets.sql
sqlite3 data/app.sqlite < migrations/006_start_datum.sql

php -S localhost:8000 -t backend/public dev-router.php
```

---

## Uberspace 7 (Produktion)

### 1. Code auf den Server bringen

Empfohlen per Git mit zwei Remotes (GitHub und Uberspace bare repo):

```bash
# Einmalig auf dem Server: bare repo anlegen
mkdir -p ~/repos/schuljahreswechsel-webuntis.git
cd ~/repos/schuljahreswechsel-webuntis.git
git init --bare

# post-receive Hook anlegen und ausführbar machen
cat > hooks/post-receive << 'EOF'
#!/bin/bash
GIT_WORK_TREE=/var/www/virtual/DEIN_USER/schuljahreswechsel-webuntis-src git checkout -f main
EOF
chmod +x hooks/post-receive
```

Wichtig: der Hook checkt direkt nach `/var/www/virtual/` aus, nicht nach
`~/home/` – Apache hat auf Uberspace keine Rechte auf `/home`, Symlinks
von dort funktionieren nie.

### 2. Domain und DocumentRoot einrichten

```bash
uberspace web domain add schuljahreswechsel.deine-domain.de

# Symlink als "Additional DocumentRoot" direkt neben html/ anlegen
cd /var/www/virtual/DEIN_USER
ln -s schuljahreswechsel-webuntis-src/backend/public schuljahreswechsel.deine-domain.de
```

Ein Symlink innerhalb von `html/` funktioniert nicht – er muss Geschwister
von `html/` sein. Die `.htaccess` enthält bereits `RewriteBase /`, das für
diesen Mechanismus erforderlich ist.

### 3. Konfiguration anlegen

```bash
cd /var/www/virtual/DEIN_USER/schuljahreswechsel-webuntis-src
cp config/config.example.php config/config.php
```

In `config/config.php` mindestens setzen:

```php
'webuntis' => [
    'base_url' => 'https://SERVERNAME.webuntis.com',
    'school'   => 'SCHULKENNUNG',   // wie in der WebUntis-URL
],
```

Diese Werte stehen in der MRBS-Konfiguration unter
`$auth["web_untis"]["school"]` und `$auth["web_untis"]["base_url"]`.

### 4. Datenbank anlegen

```bash
cd /var/www/virtual/DEIN_USER/schuljahreswechsel-webuntis-src
sqlite3 data/app.sqlite < migrations/001_init.sql
sqlite3 data/app.sqlite < migrations/002_seed_schritte.sql
sqlite3 data/app.sqlite < migrations/003_phasen.sql
sqlite3 data/app.sqlite < migrations/004_parallel_flag.sql
sqlite3 data/app.sqlite < migrations/005_vorlagen_sets.sql
sqlite3 data/app.sqlite < migrations/006_start_datum.sql
```

`sqlite3` ist auf Uberspace vorinstalliert. PHP läuft unter dem eigenen
Uberspace-Account, daher hat es automatisch Schreibrechte auf `data/`.

### 5. Erste Admin-Person einrichten

Ein korrektes WebUntis-Passwort allein reicht nicht – jede Person muss
vorab in `benutzer_rollen` stehen. Die erste Admin-Person per SQL eintragen,
bevor sie sich das erste Mal anmeldet:

```bash
sqlite3 data/app.sqlite \
  "INSERT INTO benutzer_rollen (webuntis_user, anzeigename, rolle)
   VALUES ('DEIN_KUERZEL', 'Dein Name', 'admin');"
```

Danach normal anmelden – der Admin-Bereich erscheint am Ende der Seite.
Weitere Personen lassen sich über „Zugriff → Freigeben" ohne SQL eintragen.

### 6. Deployment-Workflow (laufender Betrieb)

```bash
# Lokal: Änderungen committen und auf beide Remotes pushen
git push github main
git push uberspace main
```

Der post-receive Hook auf Uberspace aktualisiert den Code automatisch.
Wenn eine neue Migration dazukommt, muss sie einmalig manuell auf dem
Server eingespielt werden:

```bash
sqlite3 /var/www/virtual/DEIN_USER/schuljahreswechsel-webuntis-src/data/app.sqlite \
  < /var/www/virtual/DEIN_USER/schuljahreswechsel-webuntis-src/migrations/NNN_name.sql
```

### Migrationen im Überblick

| Datei | Inhalt |
|---|---|
| `001_init.sql` | Basis-Schema: alle Tabellen, Indizes |
| `002_seed_schritte.sql` | 11 Standard-Schritte für den WebUntis-Wechsel |
| `003_phasen.sql` | Phasen als eigene Tabelle (aus schritt_vorlagen extrahiert) |
| `004_parallel_flag.sql` | `kann_parallel`-Flag auf Vorlagen und Instanzen |
| `005_vorlagen_sets.sql` | Vorlagen-Snapshots (vorlagen_sets, vorlagen_set_phasen, vorlagen_set_schritte) |
| `006_start_datum.sql` | `start_datum` pro Schritt-Instanz für Zeitraum-Darstellung im Gantt |
