-- ============================================================
-- Fix teams UPDATE policy to allow users to claim unclaimed seats
--
-- The previous "teams_update_own" policy used:
--   USING (auth.uid() = user_id OR commissioner OR super_admin)
--
-- For unclaimed teams, user_id IS NULL, so auth.uid() = NULL is
-- always FALSE in SQL — silently blocking every claim attempt.
--
-- Fix: add `OR user_id IS NULL` to USING so users can update
-- unclaimed rows. WITH CHECK ensures the result must assign
-- the seat to the calling user (or allows commissioner/admin).
-- ============================================================

DROP POLICY IF EXISTS "teams_update_own" ON teams;

CREATE POLICY "teams_update_own" ON teams
  FOR UPDATE
  USING (
    -- User's own claimed team (rename, etc.)
    auth.uid() = user_id
    -- OR an unclaimed seat being claimed
    OR user_id IS NULL
    -- OR commissioner managing any team in their league
    OR EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = league_id
        AND leagues.commissioner_id = auth.uid()
    )
    -- OR super admin
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  )
  WITH CHECK (
    -- Result must be the user's own team (covers claiming + renaming)
    auth.uid() = user_id
    -- OR commissioner can assign any user_id (including NULL to unclaim)
    OR EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = league_id
        AND leagues.commissioner_id = auth.uid()
    )
    -- OR super admin
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );
