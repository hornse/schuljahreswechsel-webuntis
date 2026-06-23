# Changelog

Alle wesentlichen Änderungen an diesem Projekt werden hier dokumentiert.
Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

---

## [Unreleased]

Geplant:
- Zeitstrahl-Ansicht für vergangene Schuljahre
- E-Mail-Erinnerungen bei überfälligen Schritten
- `develop`-Branch für Parallelentwicklung

---

## [1.9.0] – 2026-06-23

### Hinzugefügt
- **Lokales Fallback-Passwort** für Notfall-Admin: optionaler `passwort_hash`
  (bcrypt) in `benutzer_rollen`; wenn gesetzt, wird zuerst das lokale
  Passwort geprüft – bei Erfolg entfällt der WebUntis-Request komplett.
  Stimmt das lokale Passwort nicht, wird wie gewohnt gegen WebUntis
  geprüft. Migration 008.
- Zwei Varianten möglich: lokales Passwort für bestehenden WebUntis-Nutzer,
  oder vollständig unabhängiger lokaler Benutzer (z. B. `notfalladmin`)
  der nicht an ein WebUntis-Kürzel gebunden ist
- Der Hash verlässt den Server nie (weder in API-Antworten noch im
  Aktivitätsprotokoll)

---

## [1.8.0] – 2026-06-22

### Behoben
- SVG-Export: Sonderzeichen (`&`, `<`, `>`) in Schritttiteln verursachten
  einen XML-Parse-Fehler in Firefox und Inkscape; alle Texte werden jetzt
  korrekt als XML-Entities escaped
- SVG-Export: Balken die über das Datumsende hinausragten werden nun per
  `clipPath` sauber abgeschnitten
- SVG-Export: Titel wurden zu früh abgekürzt (nach 28 Zeichen); jetzt
  erst nach 32 Zeichen mit korrektem Unicode-Ellipsis-Zeichen

### Geändert
- SVG-Export: Label-Spalte breiter (240 px), Gitternetzlinien, Heute-
  Markierung und Zeilenabstand verbessert
- Seitenränder in der HTML-Ansicht vergrößert (40 px / 60 px)
- Zeitstrahl-Druckregeln bereinigt: doppelter `@media print`-Block
  entfernt, Farben und Balken werden beim Drucken korrekt ausgegeben

---

## [1.7.0] – 2026-06-22

### Hinzugefügt
- **Kommentarfeld** in der Checkliste: schuljahrspezifische Kurznotiz
  pro Schritt, nur für angemeldete Personen sichtbar; im Archiv-Modus
  read-only angezeigt
- **CSV-Export** der Checkliste (⬇ CSV): alle Felder inkl. Verantwortlich,
  Datum, Kommentar; UTF-8 BOM für korrektes Öffnen in Excel
- **SVG-Export** des Zeitstrahls (⬇ SVG): skalierbare Vektorgrafik mit
  Balken, Phasen, Datumsachse und Heute-Markierung
- **PDF-Export** über Browser-Druckdialog (🖨 PDF) in Checkliste und
  Zeitstrahl
- **Aktivitätsprotokoll** im Admin-Bereich: die letzten 200 Einträge
  mit Zeitstempel, Person, Schritt und Aktion; als CSV exportierbar;
  Migration 007
- **Mobilansicht** optimiert: kompakteres Layout unter 640 px,
  Tabellen horizontal scrollbar, Felder untereinander statt nebeneinander
- **Aufklapp-Zustand** bleibt nach Rerender erhalten: offene Schritt-
  und Vorlagen-Detail-Boxen werden in `STATE` gespeichert und nach
  Datumseingabe oder anderen Aktualisierungen wiederhergestellt
- **Eigene Farbpalette** ersetzt den nativen Browser-Farbpicker:
  15 vordefinierte Farb-Kästchen plus Hex-Eingabefeld mit Live-Vorschau
- **Gantt-Zoom**: Schieberegler (1–7 Tage pro Spalte) über dem Gantt
  für Tages- bis Wochenansicht
- Volle Bildschirmbreite genutzt (kein `max-width` mehr)

### Behoben
- Aufklappbare Boxen klappten nach Datumseingabe zu, weil der Rerender
  den DOM neu aufgebaut hat; behoben durch Zustandsspeicherung in STATE
- Kommentarfeld blieb nach Speichern leer bis zum Neuladen der Seite;
  Wert wird jetzt sofort in STATE aktualisiert

---

## [1.6.0] – 2026-06-22

### Hinzugefügt
- **`start_datum`** pro Schritt-Instanz (optional): ermöglicht echte
  Zeiträume statt einzelner Zieldaten; Migration 006
- Gantt-Ansicht zeigt Schritte mit Start- und Zieldatum als durchgehenden
  Balken, Schritte mit nur einem Datum weiterhin als Punkt
- Timeline zeigt „ab TT.MM."-Hinweis wenn ein Startdatum eingetragen ist
- Echte Überschneidungserkennung für den Parallel-Flag: zwei Schritte
  gelten als parallel wenn sich ihre Zeiträume um mindestens einen Tag
  überschneiden (statt nur gleiches Zieldatum)

### Behoben
- Zeitstrahl und Parallel-Gruppierung wurden nach dem Eintragen von Daten
  erst nach einem manuellen Neuladen der Seite aktualisiert; Datumsfelder
  lösen jetzt sofort einen Rerender aus

---

## [1.5.0] – 2026-06-21

### Hinzugefügt
- **Zeitstrahl-Tab** (öffentlich und eingeloggt): Gantt-Ansicht und
  Timeline als Untertabs, druckbar; öffentliche Variante ohne
  Verantwortlich-Feld
- **Vorlagen-Snapshots**: aktuellen Stand als benannten Snapshot
  einfrieren; beim Anlegen eines neuen Schuljahres als Basis wählen
  (ermöglicht mehrere unabhängige Prozess-Vorlagen)
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
- **`kann_parallel`-Flag** pro Schritt-Vorlage (Default für neue
  Schuljahre) und pro Instanz (überschreibbar je Schuljahr); Migration 004
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
- Beschreibung bewusst nicht im öffentlichen Dashboard-Endpunkt enthalten

---

## [1.0.0] – 2026-06-18

### Hinzugefügt
- **Öffentliches Dashboard** als Landingpage ohne Anmeldung (Titel,
  Phase, Status, Fortschritt – kein Verantwortlich, kein Kommentar)
- **Zugriffsbeschränkung**: Login nur für vorab freigegebene Personen;
  korrektes WebUntis-Passwort allein reicht nicht mehr
- Admin kann Personen vorab eintragen (vor dem ersten Login)
- **Checkliste verwalten**: Schritte über die Oberfläche hinzufügen,
  bearbeiten, deaktivieren und per Drag-and-Drop umsortieren

---

## [0.2.0] – 2026-06-17 (Pre-Release)

### Hinzugefügt
- Erstes vollständiges Multi-User-Release: WebUntis-Authentifizierung,
  SQLite-Datenbank, Rollen (admin/mitglied), CSRF-Basisschutz,
  Brute-Force-Lockout via `login_log`
- Migrationen 001 (Schema) und 002 (Seed: 11 Schritte in 5 Phasen)
- Uberspace-Deployment: bare repo, post-receive Hook, Symlink als
  Additional DocumentRoot

---

## [0.1.0] – 2026-06-17 (Prototyp)

### Hinzugefügt
- HTML-Prototyp einer Checkliste (statisch, kein Backend)
- Word-Dokument und Mermaid-Zeitplan aus Kapitel 14 (WebUntis-Handbuch)
