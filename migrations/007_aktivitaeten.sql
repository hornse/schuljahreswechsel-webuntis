-- ============================================================================
-- Migration 007: Aktivitätsprotokoll
-- ============================================================================
-- Zeichnet auf wer wann was an welchem Schritt geändert hat. Granular
-- genug für Audit-Zwecke, aber keine vollständige Event-Sourcing-Lösung.
--
-- Erfasste Ereignisse:
--   schritt_erledigt        – Häkchen gesetzt
--   schritt_rueckgaengig    – Häkchen entfernt
--   verantwortlich_gesetzt  – Verantwortlich eingetragen/geändert
--   datum_gesetzt           – geplantes_datum oder start_datum gesetzt
--   kommentar_gesetzt       – Kommentar eingetragen/geändert
-- ============================================================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS aktivitaeten (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    schuljahr_id INTEGER REFERENCES schuljahre(id) ON DELETE CASCADE,
    vorlage_id   INTEGER REFERENCES schritt_vorlagen(id) ON DELETE SET NULL,
    schritt_titel TEXT,          -- Snapshot des Titels zum Zeitpunkt der Aktion
    ereignis     TEXT NOT NULL,  -- Ereignis-Typ (s. o.)
    wert_neu     TEXT,           -- neuer Wert (z. B. Datum, Name)
    benutzer     TEXT,           -- WebUntis-Kürzel
    anzeigename  TEXT,           -- Anzeigename zum Zeitpunkt der Aktion
    zeitstempel  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_aktivitaeten_schuljahr ON aktivitaeten(schuljahr_id);
CREATE INDEX IF NOT EXISTS idx_aktivitaeten_zeitstempel ON aktivitaeten(zeitstempel DESC);
