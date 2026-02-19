-- ============================================================
-- Fix infinite recursion in teams RLS policy
--
-- The teams_select_league_members policy referenced the teams
-- table in its own USING clause, causing infinite recursion.
-- Fix: use a security definer function that bypasses RLS to
-- fetch the current user's league IDs safely.
-- ============================================================

-- Helper: returns all league_ids the current user has a team in.
-- security definer bypasses RLS so this won't recurse.
create or replace function public.my_league_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select league_id from public.teams where user_id = auth.uid();
$$;

-- Fix teams select policy (was self-referential → infinite recursion)
drop policy if exists "teams_select_league_members" on teams;

create policy "teams_select_league_members" on teams
  for select using (
    league_id in (select public.my_league_ids())
    or exists (
      select 1 from leagues
      where leagues.id = teams.league_id and leagues.commissioner_id = auth.uid()
    )
    or exists (select 1 from profiles where id = auth.uid() and is_super_admin = true)
  );

-- Fix leagues select policy (referenced teams → triggered recursive teams policy)
drop policy if exists "leagues_select_members" on leagues;

create policy "leagues_select_members" on leagues
  for select using (
    id in (select public.my_league_ids())
    or commissioner_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and is_super_admin = true)
  );
