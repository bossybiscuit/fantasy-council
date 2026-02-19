-- ============================================================
-- Security-definer RPC functions for operations that need to
-- bypass RLS without requiring the service role key.
-- Run this in the Supabase SQL editor.
-- ============================================================

-- Look up a league by invite code (allows non-members to validate a code)
create or replace function public.league_by_invite_code(p_code text)
returns setof leagues
language sql
security definer
stable
set search_path = public
as $$
  select * from public.leagues
  where upper(trim(invite_code)) = upper(trim(p_code))
  limit 1;
$$;

-- List unclaimed teams for a league (allows non-members to see open seats)
create or replace function public.unclaimed_teams_for_league(p_league_id uuid)
returns setof teams
language sql
security definer
stable
set search_path = public
as $$
  select * from public.teams
  where league_id = p_league_id and user_id is null
  order by created_at;
$$;

-- Count all teams in a league (includes unclaimed, bypasses RLS)
create or replace function public.team_count_for_league(p_league_id uuid)
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select count(*) from public.teams where league_id = p_league_id;
$$;

-- Atomically claim an unclaimed team seat for the calling user
-- Always assigns to auth.uid() — callers cannot claim on behalf of others
create or replace function public.claim_team_seat(p_team_id uuid, p_league_id uuid)
returns setof teams
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.teams
  set user_id = auth.uid()
  where id = p_team_id
    and league_id = p_league_id
    and user_id is null
  returning *;
end;
$$;
