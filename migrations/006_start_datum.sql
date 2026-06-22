-- ============================================================================
-- Migration 006: start_datum pro Schritt-Instanz
-- ============================================================================
-- Bisher gab es nur geplantes_datum (Zieldatum). Mit start_datum lassen
-- sich echte Zeiträume abbilden, was zwei Dinge ermöglicht:
--
--   1. Echte Überschneidungserkennung: zwei Schritte sind parallel wenn
--      sich ihre Zeiträume [start_datum, geplantes_datum] um mindestens
--      einen Tag überschneiden (statt nur gleiches Zieldatum).
--
--   2. Gantt-Balken statt Punkte: im Zeitstrahl werden Schritte mit
--      beiden Daten als Balken dargestellt.
--
-- start_datum ist optional – Schritte ohne start_datum verhalten sich
-- wie bisher (Punkt im Gantt, Datum-Gleichheit für Parallel-Erkennung).
-- ============================================================================

PRAGMA foreign_keys = OFF;
ALTER TABLE schritt_instanzen ADD COLUMN start_datum TEXT;
PRAGMA foreign_keys = ON;
