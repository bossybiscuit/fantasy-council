-- Pre-draft valuations: each team can privately note their target value and max bid
-- for players before an auction draft begins.

CREATE TABLE IF NOT EXISTS draft_valuations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  my_value int NOT NULL DEFAULT 0,
  max_bid int,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(league_id, team_id, player_id)
);

ALTER TABLE draft_valuations ENABLE ROW LEVEL SECURITY;

-- Team owner can manage their own valuations; commissioner can read all
CREATE POLICY "team_member_manage_valuations" ON draft_valuations
  FOR ALL
  USING (
    team_id IN (SELECT id FROM teams WHERE user_id = auth.uid())
    OR league_id IN (SELECT id FROM leagues WHERE commissioner_id = auth.uid())
  )
  WITH CHECK (
    team_id IN (SELECT id FROM teams WHERE user_id = auth.uid())
  );
