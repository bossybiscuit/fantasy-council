-- ============================================================
-- Fix team RLS policies for commissioner management
--
-- The original policies only allowed users to insert/update
-- their own team (user_id = auth.uid()). This blocks:
--   1. Inserting unclaimed teams (user_id IS NULL)
--   2. Renaming any team other than your own
--   3. Assigning a user to a team
--   4. Deleting unclaimed teams
--
-- Fix: extend INSERT, UPDATE, and DELETE policies to also
-- grant access to the league commissioner and super admins.
-- ============================================================

-- INSERT: allow user joining their own team OR commissioner
-- creating an unclaimed slot (user_id IS NULL) in their league
drop policy if exists "teams_insert_authenticated" on teams;

create policy "teams_insert_authenticated" on teams
  for insert with check (
    -- Normal join: user creates their own team
    auth.uid() = user_id
    -- Commissioner creates unclaimed slot
    or (
      user_id is null
      and exists (
        select 1 from leagues
        where leagues.id = league_id
        and leagues.commissioner_id = auth.uid()
      )
    )
    -- Super admin can always insert
    or exists (
      select 1 from profiles
      where id = auth.uid() and is_super_admin = true
    )
  );

-- UPDATE: allow users to update their own team OR commissioner
-- to rename/assign any team in their league
drop policy if exists "teams_update_own" on teams;

create policy "teams_update_own" on teams
  for update using (
    auth.uid() = user_id
    or exists (
      select 1 from leagues
      where leagues.id = league_id
      and leagues.commissioner_id = auth.uid()
    )
    or exists (
      select 1 from profiles
      where id = auth.uid() and is_super_admin = true
    )
  );

-- DELETE: commissioner can delete unclaimed teams in their league
-- (no delete policy existed before — only commissioner/super_admin can delete)
drop policy if exists "teams_delete_commissioner" on teams;

create policy "teams_delete_commissioner" on teams
  for delete using (
    exists (
      select 1 from leagues
      where leagues.id = league_id
      and leagues.commissioner_id = auth.uid()
    )
    or exists (
      select 1 from profiles
      where id = auth.uid() and is_super_admin = true
    )
  );
