-- ============================================================
-- Remove tier column from players table
-- ============================================================

ALTER TABLE players DROP COLUMN IF EXISTS tier;
