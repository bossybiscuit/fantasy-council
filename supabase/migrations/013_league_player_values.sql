-- Per-league player values: commissioners can set custom auction values
-- per player within their league, overriding the global suggested_value.

CREATE TABLE IF NOT EXISTS league_player_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  value int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(league_id, player_id)
);

-- RLS: commissioners can read/write values for their league; members can read
ALTER TABLE league_player_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "league_player_values_commissioner_all" ON league_player_values
  FOR ALL
  USING (
    league_id IN (
      SELECT id FROM leagues WHERE commissioner_id = auth.uid()
    )
  );

CREATE POLICY "league_player_values_member_read" ON league_player_values
  FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM teams WHERE user_id = auth.uid()
    )
  );
