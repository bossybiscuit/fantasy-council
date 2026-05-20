-- Finale-specific predictions: 5th/4th place allocations, final 3 picks, and winner pick.
-- Reusable across seasons — keyed on episode_id (which must be is_finale = true).

CREATE TABLE IF NOT EXISTS finale_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  episode_id uuid NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  pick_type text NOT NULL CHECK (pick_type IN ('fifth_place', 'fourth_place', 'final_three', 'winner')),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  points_allocated numeric NOT NULL DEFAULT 0,
  points_earned numeric NOT NULL DEFAULT 0,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- A team can have multiple rows per pick_type (e.g. 10-point allocations spread across players)
  -- but only one row per (league, episode, team, pick_type, player) combo.
  UNIQUE (league_id, episode_id, team_id, pick_type, player_id)
);

CREATE INDEX IF NOT EXISTS finale_predictions_lookup
  ON finale_predictions (league_id, episode_id, team_id);

ALTER TABLE finale_predictions ENABLE ROW LEVEL SECURITY;

-- Team owner: read + write their own picks
CREATE POLICY "finale_predictions_owner_all" ON finale_predictions
  FOR ALL
  USING (
    team_id IN (SELECT id FROM teams WHERE user_id = auth.uid())
  );

-- Commissioner: read all in their league
CREATE POLICY "finale_predictions_commissioner_read" ON finale_predictions
  FOR SELECT
  USING (
    league_id IN (SELECT id FROM leagues WHERE commissioner_id = auth.uid())
  );
