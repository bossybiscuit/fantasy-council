-- Season 51 support:
--   1. Extra castaway bio fields (first-time players have no previous seasons to show)
--   2. League format: 'draft' (classic rosters) or 'predictions' (no draft, open-size league)
--   3. Survivor Pool: each week pick one castaway you think will SURVIVE the episode.
--      You can't pick the same castaway twice in a season. A wrong pick doesn't knock
--      you out — it just resets your streak. Points grow exponentially with the streak.

-- 1. Castaway fields
ALTER TABLE players ADD COLUMN IF NOT EXISTS age int;
ALTER TABLE players ADD COLUMN IF NOT EXISTS occupation text;
ALTER TABLE players ADD COLUMN IF NOT EXISTS residence text;

-- 2. League format
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS format text NOT NULL DEFAULT 'draft';
ALTER TABLE leagues DROP CONSTRAINT IF EXISTS leagues_format_check;
ALTER TABLE leagues ADD CONSTRAINT leagues_format_check CHECK (format IN ('draft', 'predictions'));

-- 3. Survivor Pool picks
CREATE TABLE IF NOT EXISTS survivor_picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  episode_id uuid NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  survived boolean,                         -- null until the episode is scored
  streak int NOT NULL DEFAULT 0,            -- consecutive correct picks ending at this episode
  points_earned numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (league_id, episode_id, team_id),  -- one pick per team per episode
  UNIQUE (league_id, team_id, player_id)    -- never the same castaway twice
);

CREATE INDEX IF NOT EXISTS survivor_picks_league_team ON survivor_picks (league_id, team_id);

ALTER TABLE survivor_picks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "survivor_picks_owner_all" ON survivor_picks;
CREATE POLICY "survivor_picks_owner_all" ON survivor_picks
  FOR ALL
  USING (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "survivor_picks_member_read" ON survivor_picks;
CREATE POLICY "survivor_picks_member_read" ON survivor_picks
  FOR SELECT
  USING (league_id IN (SELECT league_id FROM teams WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "survivor_picks_commissioner_read" ON survivor_picks;
CREATE POLICY "survivor_picks_commissioner_read" ON survivor_picks
  FOR SELECT
  USING (league_id IN (SELECT id FROM leagues WHERE commissioner_id = auth.uid()));

-- Survivor Pool points get their own column so standings can break them out
ALTER TABLE episode_team_scores ADD COLUMN IF NOT EXISTS survivor_points numeric DEFAULT 0;
