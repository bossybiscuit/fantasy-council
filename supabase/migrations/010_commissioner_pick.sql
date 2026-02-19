-- Add commissioner_pick flag to draft_picks
-- Tracks when a commissioner picked on behalf of a team that doesn't own a seat

ALTER TABLE draft_picks ADD COLUMN IF NOT EXISTS commissioner_pick boolean NOT NULL DEFAULT false;
