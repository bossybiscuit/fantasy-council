-- Season-long predictions table
CREATE TABLE season_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  category text NOT NULL,
  answer text,
  is_correct boolean DEFAULT NULL,
  points_earned int DEFAULT 0,
  locked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(league_id, team_id, category)
);

ALTER TABLE season_predictions ENABLE ROW LEVEL SECURITY;

-- League members can read all season predictions in their leagues
CREATE POLICY "League members can view season predictions" ON season_predictions
  FOR SELECT USING (
    league_id IN (
      SELECT league_id FROM teams WHERE user_id = auth.uid()
    )
  );

-- Teams can insert/update their own season predictions
CREATE POLICY "Teams can manage their own season predictions" ON season_predictions
  FOR ALL USING (
    team_id IN (
      SELECT id FROM teams WHERE user_id = auth.uid()
    )
  );
