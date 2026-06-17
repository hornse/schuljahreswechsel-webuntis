-- ============================================================================
-- Migration 002: Schritt-Vorlage befüllen
-- ============================================================================
-- Inhaltlich identisch mit der Checkliste aus dem Word-Dokument /
-- HTML-Prototyp, damit alle drei Darstellungen (Doku, Prototyp, App) auf
-- demselben Ablauf basieren. Reihenfolge ist je Phase neu gezählt.
-- ============================================================================

INSERT INTO schritt_vorlagen (phase, phase_farbe, reihenfolge, titel, beschreibung) VALUES
('1. Vorbereitung in Untis (Desktop)', '#D98A2B', 1,
 'Schülergruppen anlegen',
 'Zwingend VOR dem Stammdaten-Export, falls Klassen geteilt werden oder Team-Teaching stattfindet.'),
('1. Vorbereitung in Untis (Desktop)', '#D98A2B', 2,
 'Stammdaten nach WebUntis exportieren',
 'Das neue Schuljahr wird damit automatisch in WebUntis angelegt.'),

('2. Schuljahr in WebUntis', '#3D7B6F', 1,
 'Berichte des alten Schuljahres sichern',
 'Z. B. Klassenbuch-Deckblatt und Arbeitsbericht je Tag (Klassenbuch -> Berichte).'),
('2. Schuljahr in WebUntis', '#3D7B6F', 2,
 'Altes Schuljahr löschen',
 'Erst nach Ablauf der landesspezifischen Aufbewahrungsfrist und nur, wenn alle Berichte gesichert sind.'),

('3. Schülerstammdaten', '#5B6FA8', 1,
 'Schülerdaten importieren',
 'Stichtag für die Klassenzugehörigkeit = Beginn des neuen Schuljahres (Stammdaten -> Schüler -> Import).'),
('3. Schülerstammdaten', '#5B6FA8', 2,
 'Importierte Daten kontrollieren',
 'Auf Dubletten und fehlende Geburtsdaten prüfen, besonders bei Namensgleichheit.'),
('3. Schülerstammdaten', '#5B6FA8', 3,
 'Schüler zu Unterrichten zuordnen',
 'Nur nötig bei Klassenteilungen/Team-Teaching, sofern Schülergruppen angelegt wurden.'),
('3. Schülerstammdaten', '#5B6FA8', 4,
 'Austrittsdatum für abgehende Schüler setzen',
 'Stammdaten -> Schüler -> "Austrittsdatum setzen".'),

('4. Benutzerverwaltung', '#B5577A', 1,
 'Benutzer für neue Schüler anlegen',
 'Administration -> Benutzer -> Benutzerverwaltung -> "Benutzer für Schüler anlegen". Erst nach dem Datenimport.'),
('4. Benutzerverwaltung', '#B5577A', 2,
 'Benutzer ausgetretener Schüler sperren',
 'Administration -> Benutzer -> Benutzerverwaltung -> "Benutzer von inaktiven oder ausgetretenen Personen sperren".'),

('5. Kontrolle', '#3B3B3B', 1,
 'Stichprobe & Probelauf in WebUntis',
 'Stundenplan, Klassenzuordnungen und Logins exemplarisch prüfen, bevor das Kollegium startet.');
