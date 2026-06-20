-- ============================================================================
-- Migration 004: "Kann parallel erledigt werden"-Flag
-- ============================================================================
-- Das Flag existiert auf zwei Ebenen:
--
--   schritt_vorlagen.kann_parallel  (Default für künftige Schuljahre)
--   schritt_instanzen.kann_parallel (überschreibbar pro Schuljahr)
--
-- Beim Anlegen eines neuen Schuljahres wird der Vorlage-Default in die
-- Instanz kopiert (siehe schuljahre.php). Danach ist die Instanz komplett
-- unabhängig von der Vorlage - ein Admin kann das Flag für ein laufendes
-- Schuljahr anders setzen als den Vorlage-Default.
--
-- SQLite ALTER TABLE ADD COLUMN setzt NULL als Default, wir wollen aber 0.
-- Das wird über einen anschließenden UPDATE sichergestellt.
-- ============================================================================

PRAGMA foreign_keys = OFF;

ALTER TABLE schritt_vorlagen  ADD COLUMN kann_parallel INTEGER NOT NULL DEFAULT 0;
ALTER TABLE schritt_instanzen ADD COLUMN kann_parallel INTEGER NOT NULL DEFAULT 0;

PRAGMA foreign_keys = ON;
