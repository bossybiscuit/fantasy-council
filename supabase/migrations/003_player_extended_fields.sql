-- ============================================================
-- Extended player fields for public castaway profile pages
-- ============================================================

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS hometown text,
  ADD COLUMN IF NOT EXISTS previous_seasons text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS best_placement text,
  ADD COLUMN IF NOT EXISTS placement_badge text,
  ADD COLUMN IF NOT EXISTS vote_out_episode int;

-- Unique slug per season (allows same slug across different seasons)
CREATE UNIQUE INDEX IF NOT EXISTS players_season_slug_idx ON players(season_id, slug);
