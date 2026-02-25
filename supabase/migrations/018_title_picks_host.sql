-- Allow title picks to record a "Jeff Probst (host)" prediction without
-- needing a real player UUID. When is_host_pick is true, player_id is null.
ALTER TABLE title_picks ADD COLUMN IF NOT EXISTS is_host_pick boolean NOT NULL DEFAULT false;
