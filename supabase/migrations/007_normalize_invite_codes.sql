-- ============================================================
-- Normalize all existing invite codes to UPPER(TRIM(...))
--
-- Invite codes are generated as uppercase with no whitespace,
-- but trimming ensures any codes with accidental surrounding
-- whitespace are corrected so lookups match consistently.
-- ============================================================

UPDATE leagues
SET invite_code = UPPER(TRIM(invite_code))
WHERE invite_code IS NOT NULL
  AND invite_code != UPPER(TRIM(invite_code));
