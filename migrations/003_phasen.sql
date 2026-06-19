-- ============================================================================
-- Migration 003: Phasen als eigene Tabelle
-- ============================================================================
-- Bisher war "Phase" nur ein freier Textstring pro schritt_vorlage. Das
-- führte zu zwei Problemen:
--   1. Umbenennen einer Phase musste an jeder Vorlage einzeln passieren.
--   2. Die Reihenfolge der Phasen selbst war implizit (lexikografisch nach
--      dem Textnamen "1. ...", "2. ..."), nicht explizit verwaltbar.
--
-- Diese Migration:
--   a) legt die neue Tabelle "phasen" an (id, name, farbe, reihenfolge)
--   b) befüllt sie aus den DISTINCT-Werten der bestehenden schritt_vorlagen
--   c) fügt schritt_vorlagen eine neue Spalte "phase_id" hinzu
--   d) verknüpft alle Vorlagen mit ihrer neuen Phase-ID
--   e) entfernt die alten Spalten "phase" und "phase_farbe" aus
--      schritt_vorlagen (über den SQLite-üblichen Umweg: Tabelle umbenennen,
--      neue ohne die Spalten anlegen, Daten umkopieren, alte löschen)
--
-- SQLite unterstützt kein DROP COLUMN vor Version 3.35 (Uberspace 7 hat
-- SQLite 3.26). Daher der table-rebuild-Weg.
-- ============================================================================

PRAGMA foreign_keys = OFF;

-- a) Phasen-Tabelle
CREATE TABLE IF NOT EXISTS phasen (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    farbe       TEXT NOT NULL DEFAULT '#5B6FA8',
    reihenfolge INTEGER NOT NULL DEFAULT 0
);

-- b) Befüllen aus bestehenden Vorlagen (DISTINCT phase/phase_farbe, Reihenfolge
--    wird über den Textnamen bestimmt - "1. ...", "2. ..." etc.)
INSERT INTO phasen (name, farbe, reihenfolge)
SELECT DISTINCT phase, phase_farbe,
       CAST(SUBSTR(phase, 1, INSTR(phase, '.') - 1) AS INTEGER)
FROM schritt_vorlagen
ORDER BY CAST(SUBSTR(phase, 1, INSTR(phase, '.') - 1) AS INTEGER);

-- c+d) phase_id-Spalte ergänzen und befüllen
ALTER TABLE schritt_vorlagen ADD COLUMN phase_id INTEGER REFERENCES phasen(id);
UPDATE schritt_vorlagen SET phase_id = (
    SELECT id FROM phasen WHERE phasen.name = schritt_vorlagen.phase
);

-- e) Tabelle neu aufbauen ohne phase/phase_farbe
CREATE TABLE schritt_vorlagen_neu (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    phase_id     INTEGER NOT NULL REFERENCES phasen(id),
    reihenfolge  INTEGER NOT NULL,
    titel        TEXT NOT NULL,
    beschreibung TEXT,
    aktiv        INTEGER NOT NULL DEFAULT 1
);

INSERT INTO schritt_vorlagen_neu (id, phase_id, reihenfolge, titel, beschreibung, aktiv)
SELECT id, phase_id, reihenfolge, titel, beschreibung, aktiv
FROM schritt_vorlagen;

DROP TABLE schritt_vorlagen;
ALTER TABLE schritt_vorlagen_neu RENAME TO schritt_vorlagen;

-- Indizes wiederherstellen (der auf schritt_instanzen war schon da, FK-Index
-- auf phase_id ist neu sinnvoll)
CREATE INDEX IF NOT EXISTS idx_schritt_instanzen_schuljahr ON schritt_instanzen(schuljahr_id);
CREATE INDEX IF NOT EXISTS idx_vorlagen_phase ON schritt_vorlagen(phase_id);

PRAGMA foreign_keys = ON;
