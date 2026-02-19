-- ============================================================
-- Make teams.user_id nullable
--
-- Allows admin/commissioner to pre-create named team slots
-- before any user claims them. A team with user_id IS NULL
-- is an "open seat" that a user can claim when joining.
--
-- The existing unique(league_id, user_id) constraint still
-- works correctly — Postgres treats NULLs as distinct for
-- uniqueness purposes, so multiple open seats per league are fine.
-- ============================================================

ALTER TABLE teams ALTER COLUMN user_id DROP NOT NULL;
