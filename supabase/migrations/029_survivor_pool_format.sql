-- Third league format: 'survivor_pool' — the Survivor Pool on its own.
-- No draft, no weekly vote allocations, no season predictions.
ALTER TABLE leagues DROP CONSTRAINT IF EXISTS leagues_format_check;
ALTER TABLE leagues ADD CONSTRAINT leagues_format_check
  CHECK (format IN ('draft', 'predictions', 'survivor_pool'));
