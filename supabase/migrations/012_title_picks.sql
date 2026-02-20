-- Title pick predictions: each team picks one castaway they think will say the episode title
-- Worth 3 points if correct (resolved when commissioner scores the episode)

CREATE TABLE IF NOT EXISTS title_picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  episode_id uuid NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id uuid REFERENCES players(id) ON DELETE SET NULL, -- null = no pick made
  points_earned int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(league_id, episode_id, team_id)
);

-- RLS: team owners can read/write their own picks; commissioner can read all
ALTER TABLE title_picks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "title_picks_owner_all" ON title_picks
  FOR ALL
  USING (
    team_id IN (
      SELECT id FROM teams WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "title_picks_commissioner_read" ON title_picks
  FOR SELECT
  USING (
    league_id IN (
      SELECT id FROM leagues WHERE commissioner_id = auth.uid()
    )
  );
