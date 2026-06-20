-- ============================================================================
-- Migration 005: Vorlagen-Snapshots
-- ============================================================================
-- Bisher gibt es genau eine "aktuelle Vorlage" (schritt_vorlagen + phasen).
-- Damit lässt sich die App nur für einen einzigen wiederkehrenden Prozess
-- nutzen. Mit Snapshots kann man den aktuellen Stand als benannte Vorlage
-- einfrieren und beim Anlegen eines neuen Schuljahres (oder eines anderen
-- Prozesses) gezielt daraus wählen.
--
-- Struktur:
--   vorlagen_sets         – der Snapshot selbst (Name, Zeitstempel, Ersteller)
--   vorlagen_set_phasen   – eingefrorene Kopie der Phasen
--   vorlagen_set_schritte – eingefrorene Kopie der Schritte
--
-- Die Verknüpfung läuft über vorlagen_set_phasen.id (nicht über die
-- originalen phasen.id), damit Snapshots unabhängig von späteren
-- Änderungen an der aktiven Vorlage bleiben.
-- ============================================================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS vorlagen_sets (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    beschreibung TEXT,
    erstellt_am  TEXT NOT NULL DEFAULT (datetime('now')),
    erstellt_von TEXT                           -- WebUntis-Kürzel des Erstellers
);

CREATE TABLE IF NOT EXISTS vorlagen_set_phasen (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id      INTEGER NOT NULL REFERENCES vorlagen_sets(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    farbe       TEXT NOT NULL DEFAULT '#5B6FA8',
    reihenfolge INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS vorlagen_set_schritte (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id        INTEGER NOT NULL REFERENCES vorlagen_sets(id) ON DELETE CASCADE,
    set_phase_id  INTEGER NOT NULL REFERENCES vorlagen_set_phasen(id) ON DELETE CASCADE,
    reihenfolge   INTEGER NOT NULL,
    titel         TEXT NOT NULL,
    beschreibung  TEXT,
    kann_parallel INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_set_phasen_set   ON vorlagen_set_phasen(set_id);
CREATE INDEX IF NOT EXISTS idx_set_schritte_set ON vorlagen_set_schritte(set_id);
