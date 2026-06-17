-- ============================================================================
-- Migration 001: Grundschema
-- ============================================================================
-- Dieses Schema trennt bewusst "Vorlage" (was immer wiederkehrt) von
-- "Instanz" (was sich pro Schuljahr ändert). So bleibt die Historie früherer
-- Schuljahre erhalten, auch wenn sich die Vorlage später leicht ändert
-- (z. B. ein Schritt wird ergänzt oder umformuliert).
--
-- Authentifizierung läuft NICHT über eine eigene Benutzer-/Passworttabelle,
-- sondern über WebUntis (siehe backend/src/Auth/WebUntisAuth.php). Diese
-- Datenbank speichert daher nur, welche Rolle ein WebUntis-Benutzername in
-- dieser App hat - niemals ein Passwort.
-- ============================================================================

PRAGMA foreign_keys = ON;

-- Ein Eintrag pro Schuljahr (z. B. "2026/2027"). Es ist immer höchstens ein
-- Schuljahr "aktiv" - das ist das, was Kollegium standardmäßig sieht.
CREATE TABLE IF NOT EXISTS schuljahre (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    label       TEXT NOT NULL,                  -- z. B. "2026/2027"
    aktiv       INTEGER NOT NULL DEFAULT 0,      -- 0/1, nur ein Datensatz darf 1 sein
    erstellt_am TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Die wiederkehrenden Arbeitsschritte ("Vorlage"). Wird einmal befüllt
-- (siehe 002_seed_schritte.sql) und nur geändert, wenn sich der reale
-- WebUntis-Ablauf ändert. "aktiv = 0" blendet einen Schritt für künftige
-- Schuljahre aus, ohne die Historie zu löschen.
CREATE TABLE IF NOT EXISTS schritt_vorlagen (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    phase        TEXT NOT NULL,                 -- z. B. "Vorbereitung in Untis"
    phase_farbe  TEXT NOT NULL DEFAULT '#5B6FA8',
    reihenfolge  INTEGER NOT NULL,               -- Sortierung innerhalb der Phase
    titel        TEXT NOT NULL,
    beschreibung TEXT,
    aktiv        INTEGER NOT NULL DEFAULT 1
);

-- Eine Zeile pro (Schuljahr, Schritt) - das ist der eigentliche Arbeitsstand.
-- UNIQUE verhindert, dass derselbe Schritt zweimal im selben Schuljahr
-- angelegt wird.
CREATE TABLE IF NOT EXISTS schritt_instanzen (
    id                       INTEGER PRIMARY KEY AUTOINCREMENT,
    schuljahr_id             INTEGER NOT NULL REFERENCES schuljahre(id) ON DELETE CASCADE,
    vorlage_id               INTEGER NOT NULL REFERENCES schritt_vorlagen(id),
    erledigt                 INTEGER NOT NULL DEFAULT 0,
    verantwortlich_user      TEXT,               -- WebUntis-Kürzel, falls bekannt
    verantwortlich_anzeigename TEXT,              -- Klartextname, frei editierbar
    geplantes_datum          TEXT,                -- ISO-Datum YYYY-MM-DD
    erledigt_am              TEXT,                -- ISO-Zeitstempel
    erledigt_von             TEXT,                -- WebUntis-Kürzel
    kommentar                TEXT,
    UNIQUE (schuljahr_id, vorlage_id)
);

-- Rollen-Zuordnung je WebUntis-Benutzername. Wird beim ersten erfolgreichen
-- Login automatisch mit der Rolle 'mitglied' angelegt. Niemals Passwörter
-- hier speichern - die Authentifizierung läuft ausschließlich über WebUntis.
CREATE TABLE IF NOT EXISTS benutzer_rollen (
    webuntis_user TEXT PRIMARY KEY,
    anzeigename   TEXT,
    rolle         TEXT NOT NULL DEFAULT 'mitglied' CHECK (rolle IN ('admin', 'mitglied')),
    erstellt_am   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Schlankes Login-Protokoll - nützlich zur Fehlersuche und als einfache
-- Grundlage für eine Brute-Force-Bremse (siehe WebUntisAuth::tooManyAttempts).
-- Enthält bewusst kein Passwort.
CREATE TABLE IF NOT EXISTS login_log (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    webuntis_user TEXT NOT NULL,
    erfolgreich   INTEGER NOT NULL,
    grund         TEXT,                          -- z. B. 'falsches_passwort', 'falsche_rolle'
    ip            TEXT,
    zeitpunkt     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_schritt_instanzen_schuljahr ON schritt_instanzen(schuljahr_id);
CREATE INDEX IF NOT EXISTS idx_login_log_user_zeit ON login_log(webuntis_user, zeitpunkt);
