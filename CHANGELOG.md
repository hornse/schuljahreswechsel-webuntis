# Changelog

Alle wesentlichen Änderungen an diesem Projekt werden hier dokumentiert.
Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

---

## [Unreleased]

Geplant:
- `start_datum` pro Schritt für echte Überschneidungserkennung
- Zeitstrahl-Ansicht für vergangene Schuljahre
- E-Mail-Erinnerungen bei überfälligen Schritten

---

## [1.5.0] – 2026-06-21

### Hinzugefügt
- **Zeitstrahl-Tab** (öffentlich + eingeloggt): Gantt-Ansicht und Timeline
  als Untertabs, druckbar; öffentliche Variante ohne Verantwortlich-Feld
- **Vorlagen-Snapshots**: aktuellen Stand als benannten Snapshot einfrieren;
  beim Anlegen eines neuen Schuljahres als Basis wählen (ermöglicht mehrere
  unabhängige Prozess-Vorlagen)
- **Vergangene Schuljahre** durchblättern: Auswahlfeld in der Checkliste,
  Archiv-Ansicht ist read-only
- **Person entfernen** aus der Zugriffsliste (mit Schutz: letzter Admin
  und eigener Account nicht löschbar)

---

## [1.4.0] – 2026-06-21

### Hinzugefügt
- **Automatische Phasen-Nummerierung**: Nummer wird aus der Reihenfolge
  berechnet, nicht mehr im Datenbanknamen gespeichert – passt sich beim
  Umsortieren automatisch an
- **Druckansicht** (`@media print`): Checkliste druckfertig mit Button;
  Navigation, Admin-Bereich und Toggles werden ausgeblendet, alle Schritte
  ausgeklappt
- **Datum-basierte Parallel-Erkennung**: Schritte mit gleichem
  `geplantes_datum` werden automatisch mit gestricheltem Rahmen und
  „⇉ parallel"-Badge zusammengefasst

### Geändert
- Phasen-Nummerierung in der Anzeige jetzt dynamisch statt statisch

---

## [1.3.0] – 2026-06-21

### Hinzugefügt
- **`kann_parallel`-Flag** pro Schritt-Vorlage (Default für neue Schuljahre)
  und pro Instanz (überschreibbar je Schuljahr); Migration 004
- Parallel-Badge (⇉) in Checkliste und öffentlichem Dashboard
- `kann_parallel`-Default wird beim Anlegen eines neuen Schuljahres aus
  der Vorlage in die Instanzen kopiert

---

## [1.2.0] – 2026-06-20

### Hinzugefügt
- **Phasen als eigene Tabelle** (`phasen`): Umbenennen, Farbe ändern und
  Reihenfolge per Drag-and-Drop ohne jede Vorlage anfassen; Migration 003
- Phasen-Drag-and-Drop im Admin-Bereich (⠿-Griff auf Phasen-Block)
- Farbpicker direkt in der Phasen-Kopfzeile

### Behoben
- Farb-Bug beim ersten Schritt einer Phase (Fallback-Farbe statt
  Phasenfarbe) – durch JOIN auf neue `phasen`-Tabelle behoben

---

## [1.1.0] – 2026-06-19

### Hinzugefügt
- **Weiterführende Infos** pro Schritt: Markdown-Textarea im Admin-Bereich
  (nur Admins können bearbeiten), Live-Vorschau, Formatierungs-Toolbar
  (Fett, Kursiv, Listen, Links)
- Markdown-Rendering in der Checkliste für alle eingeloggten Personen
- Öffentliche Infos bewusst ausgeblendet (kein `beschreibung` im
  öffentlichen Dashboard-Endpunkt)

---

## [1.0.0] – 2026-06-18

### Hinzugefügt
- **Öffentliches Dashboard** als Landingpage ohne Anmeldung (Titel,
  Phase, Status, Fortschritt – kein Verantwortlich, kein Kommentar)
- **Zugriffsbeschränkung**: Login nur für vorab freigegebene Personen;
  korrektes WebUntis-Passwort allein reicht nicht mehr
- Admin kann Personen vorab eintragen (vor dem ersten Login)
- Spezifische Fehlermeldung bei Ablehnung (nicht freigegebene Person)
- **Checkliste verwalten**: Schritte über die Oberfläche hinzufügen,
  bearbeiten, deaktivieren und per Drag-and-Drop umsortieren
- Neuer Schritt erzeugt sofort Instanz im laufenden Schuljahr
- Phasenwechsel für Schritte über Dropdown
- `docs/INSTALL.md` Schritt 5 angepasst: erster Admin per `INSERT`
  (nicht mehr `UPDATE`, da kein Auto-Login mehr)

---

## [0.3.0] – 2026-06-17 (Pre-Release)

### Hinzugefügt
- **Dashboard-Tab** innerhalb der eingeloggten App: „Aktuell dran",
  „Überfällig", „Demnächst (14 Tage)", Fortschritt je Phase
- Rollen-Änderungen wirken sofort ohne Re-Login (Guard liest Rolle
  bei jedem Request frisch aus DB)
- Logout-Button immer sichtbar (auch ohne aktives Schuljahr)

---

## [0.2.0] – 2026-06-17 (Pre-Release)

### Hinzugefügt
- Erstes vollständiges Multi-User-Release: WebUntis-Authentifizierung,
  SQLite-Datenbank, Rollen (admin/mitglied), CSRF-Basisschutz,
  Brute-Force-Lockout via `login_log`
- Migrationen 001 (Schema) und 002 (Seed: 11 Schritte in 5 Phasen)
- Uberspace-Deployment: bare repo, post-receive Hook, Symlink als
  Additional DocumentRoot
- Erstes Admin-Bootstrap per direktem SQL (`INSERT INTO benutzer_rollen`)

---

## [0.1.0] – 2026-06-17 (Prototyp)

### Hinzugefügt
- HTML-Prototyp einer Checkliste (statisch, kein Backend)
- Word-Dokument und Mermaid-Zeitplan aus Kapitel 14 (WebUntis-Handbuch)
