-- League lineage: a league started from a previous season's league points back to it.
-- Lets a league carry its members forward season to season and show its history.
ALTER TABLE leagues
  ADD COLUMN IF NOT EXISTS parent_league_id uuid REFERENCES leagues(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS leagues_parent_league_id_idx ON leagues(parent_league_id);
