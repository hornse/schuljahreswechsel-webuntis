-- ============================================================================
-- Migration 008: Lokales Passwort für Notfall-Admin
-- ============================================================================
-- Ergänzt benutzer_rollen um eine optionale passwort_hash-Spalte.
-- Wenn diese gesetzt ist, wird bei der Anmeldung zuerst das lokale
-- Passwort geprüft (bcrypt via PHP password_verify). Stimmt es,
-- entfällt der WebUntis-Request komplett. Stimmt es nicht, wird
-- trotzdem gegen WebUntis geprüft – so kann man auch mit lokalem
-- Hash weiterhin das WebUntis-Passwort nutzen.
--
-- Das Passwort wird NUR per direktem SQL gesetzt, kein UI:
--
--   php -r "echo password_hash('MEIN_PASSWORT', PASSWORD_BCRYPT);"
--
-- Den ausgegebenen Hash dann eintragen:
--
--   sqlite3 data/app.sqlite \
--     "UPDATE benutzer_rollen SET passwort_hash = 'HASH' \
--      WHERE webuntis_user = 'DEIN_KUERZEL';"
--
-- Zum Entfernen:
--
--   sqlite3 data/app.sqlite \
--     "UPDATE benutzer_rollen SET passwort_hash = NULL \
--      WHERE webuntis_user = 'DEIN_KUERZEL';"
-- ============================================================================

PRAGMA foreign_keys = OFF;
ALTER TABLE benutzer_rollen ADD COLUMN passwort_hash TEXT;
PRAGMA foreign_keys = ON;
