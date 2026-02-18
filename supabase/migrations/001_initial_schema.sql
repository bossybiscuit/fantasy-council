-- ============================================================
-- Survivor Fantasy League - Initial Schema
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  is_super_admin boolean default false,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);

create policy "profiles_select_any_authenticated" on profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- ============================================================
-- SEASONS
-- ============================================================
create table if not exists seasons (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  season_number int not null,
  status text not null default 'upcoming' check (status in ('upcoming', 'active', 'completed')),
  created_at timestamptz default now()
);

alter table seasons enable row level security;

create policy "seasons_select_all" on seasons
  for select using (true);

create policy "seasons_insert_admin" on seasons
  for insert with check (
    exists (select 1 from profiles where id = auth.uid() and is_super_admin = true)
  );

create policy "seasons_update_admin" on seasons
  for update using (
    exists (select 1 from profiles where id = auth.uid() and is_super_admin = true)
  );

create policy "seasons_delete_admin" on seasons
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and is_super_admin = true)
  );

-- ============================================================
-- PLAYERS (castaways per season)
-- ============================================================
create table if not exists players (
  id uuid primary key default uuid_generate_v4(),
  season_id uuid not null references seasons(id) on delete cascade,
  name text not null,
  tribe text,
  tier text check (tier in ('S', 'A', 'B', 'C', 'D')),
  suggested_value int default 10,
  bio text,
  img_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table players enable row level security;

create policy "players_select_all" on players
  for select using (true);

create policy "players_insert_admin" on players
  for insert with check (
    exists (select 1 from profiles where id = auth.uid() and is_super_admin = true)
  );

create policy "players_update_admin" on players
  for update using (
    exists (select 1 from profiles where id = auth.uid() and is_super_admin = true)
  );

create policy "players_delete_admin" on players
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and is_super_admin = true)
  );

create index if not exists players_season_id_idx on players(season_id);

-- ============================================================
-- LEAGUES
-- ============================================================
create table if not exists leagues (
  id uuid primary key default uuid_generate_v4(),
  season_id uuid not null references seasons(id) on delete cascade,
  name text not null,
  commissioner_id uuid not null references auth.users(id),
  draft_type text not null default 'snake' check (draft_type in ('auction', 'snake')),
  num_teams int not null default 8,
  budget int default 100,
  roster_size int,
  invite_code text unique not null,
  draft_status text not null default 'pending' check (draft_status in ('pending', 'active', 'completed')),
  status text not null default 'setup' check (status in ('setup', 'drafting', 'active', 'completed')),
  scoring_config jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table leagues enable row level security;

create policy "leagues_select_members" on leagues
  for select using (
    exists (select 1 from teams where teams.league_id = leagues.id and teams.user_id = auth.uid())
    or leagues.commissioner_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and is_super_admin = true)
  );

create policy "leagues_insert_authenticated" on leagues
  for insert with check (auth.role() = 'authenticated');

create policy "leagues_update_commissioner" on leagues
  for update using (
    leagues.commissioner_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and is_super_admin = true)
  );

create index if not exists leagues_invite_code_idx on leagues(invite_code);
create index if not exists leagues_season_id_idx on leagues(season_id);

-- ============================================================
-- TEAMS
-- ============================================================
create table if not exists teams (
  id uuid primary key default uuid_generate_v4(),
  league_id uuid not null references leagues(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  name text not null default 'My Team',
  draft_order int,
  budget_remaining int,
  created_at timestamptz default now(),
  unique(league_id, user_id)
);

alter table teams enable row level security;

create policy "teams_select_league_members" on teams
  for select using (
    exists (
      select 1 from teams t2
      where t2.league_id = teams.league_id and t2.user_id = auth.uid()
    )
    or exists (
      select 1 from leagues l
      where l.id = teams.league_id and l.commissioner_id = auth.uid()
    )
    or exists (select 1 from profiles where id = auth.uid() and is_super_admin = true)
  );

create policy "teams_insert_authenticated" on teams
  for insert with check (auth.uid() = user_id);

create policy "teams_update_own" on teams
  for update using (auth.uid() = user_id);

create index if not exists teams_league_id_idx on teams(league_id);
create index if not exists teams_user_id_idx on teams(user_id);

-- ============================================================
-- DRAFT PICKS
-- ============================================================
create table if not exists draft_picks (
  id uuid primary key default uuid_generate_v4(),
  league_id uuid not null references leagues(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  player_id uuid not null references players(id),
  round int,
  pick_number int,
  amount_paid int,
  created_at timestamptz default now(),
  unique(league_id, player_id)
);

alter table draft_picks enable row level security;

create policy "draft_picks_select_league_members" on draft_picks
  for select using (
    exists (
      select 1 from teams
      where teams.league_id = draft_picks.league_id and teams.user_id = auth.uid()
    )
    or exists (
      select 1 from leagues
      where leagues.id = draft_picks.league_id and leagues.commissioner_id = auth.uid()
    )
  );

create policy "draft_picks_insert_commissioner" on draft_picks
  for insert with check (
    exists (
      select 1 from leagues
      where leagues.id = draft_picks.league_id and leagues.commissioner_id = auth.uid()
    )
    or exists (
      select 1 from teams
      where teams.id = draft_picks.team_id and teams.user_id = auth.uid()
    )
  );

create policy "draft_picks_delete_commissioner" on draft_picks
  for delete using (
    exists (
      select 1 from leagues
      where leagues.id = draft_picks.league_id and leagues.commissioner_id = auth.uid()
    )
  );

create index if not exists draft_picks_league_id_idx on draft_picks(league_id);
create index if not exists draft_picks_team_id_idx on draft_picks(team_id);

-- ============================================================
-- EPISODES
-- ============================================================
create table if not exists episodes (
  id uuid primary key default uuid_generate_v4(),
  season_id uuid not null references seasons(id) on delete cascade,
  episode_number int not null,
  title text,
  air_date date,
  is_merge boolean default false,
  is_finale boolean default false,
  is_scored boolean default false,
  prediction_deadline timestamptz,
  created_at timestamptz default now(),
  unique(season_id, episode_number)
);

alter table episodes enable row level security;

create policy "episodes_select_all" on episodes
  for select using (true);

create policy "episodes_insert_admin" on episodes
  for insert with check (
    exists (select 1 from profiles where id = auth.uid() and is_super_admin = true)
  );

create policy "episodes_update_admin" on episodes
  for update using (
    exists (select 1 from profiles where id = auth.uid() and is_super_admin = true)
  );

create index if not exists episodes_season_id_idx on episodes(season_id);

-- ============================================================
-- SCORING EVENTS
-- ============================================================
create table if not exists scoring_events (
  id uuid primary key default uuid_generate_v4(),
  league_id uuid not null references leagues(id) on delete cascade,
  episode_id uuid not null references episodes(id) on delete cascade,
  player_id uuid not null references players(id),
  team_id uuid references teams(id),
  category text not null check (category in (
    'tribe_reward', 'individual_reward', 'tribe_immunity', 'individual_immunity',
    'second_place_immunity', 'merge', 'final_three', 'winner', 'episode_title',
    'voted_out_prediction', 'confessional', 'idol_play', 'advantage',
    'custom_bonus', 'tribal_vote_correct'
  )),
  points int not null default 0,
  note text,
  created_at timestamptz default now()
);

alter table scoring_events enable row level security;

create policy "scoring_events_select_league_members" on scoring_events
  for select using (
    exists (
      select 1 from teams
      where teams.league_id = scoring_events.league_id and teams.user_id = auth.uid()
    )
    or exists (
      select 1 from leagues
      where leagues.id = scoring_events.league_id and leagues.commissioner_id = auth.uid()
    )
  );

create policy "scoring_events_insert_commissioner" on scoring_events
  for insert with check (
    exists (
      select 1 from leagues
      where leagues.id = scoring_events.league_id and leagues.commissioner_id = auth.uid()
    )
    or exists (select 1 from profiles where id = auth.uid() and is_super_admin = true)
  );

create policy "scoring_events_delete_commissioner" on scoring_events
  for delete using (
    exists (
      select 1 from leagues
      where leagues.id = scoring_events.league_id and leagues.commissioner_id = auth.uid()
    )
    or exists (select 1 from profiles where id = auth.uid() and is_super_admin = true)
  );

create index if not exists scoring_events_league_id_idx on scoring_events(league_id);
create index if not exists scoring_events_episode_id_idx on scoring_events(episode_id);
create index if not exists scoring_events_team_id_idx on scoring_events(team_id);

-- ============================================================
-- PREDICTIONS
-- ============================================================
create table if not exists predictions (
  id uuid primary key default uuid_generate_v4(),
  league_id uuid not null references leagues(id) on delete cascade,
  episode_id uuid not null references episodes(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  player_id uuid not null references players(id),
  points_allocated int not null default 0,
  points_earned int default 0,
  locked_at timestamptz,
  created_at timestamptz default now(),
  unique(league_id, episode_id, team_id, player_id)
);

alter table predictions enable row level security;

create policy "predictions_select_league_members" on predictions
  for select using (
    exists (
      select 1 from teams
      where teams.league_id = predictions.league_id and teams.user_id = auth.uid()
    )
    or exists (
      select 1 from leagues
      where leagues.id = predictions.league_id and leagues.commissioner_id = auth.uid()
    )
  );

create policy "predictions_insert_own" on predictions
  for insert with check (
    exists (
      select 1 from teams
      where teams.id = predictions.team_id and teams.user_id = auth.uid()
    )
  );

create policy "predictions_update_own" on predictions
  for update using (
    exists (
      select 1 from teams
      where teams.id = predictions.team_id and teams.user_id = auth.uid()
    )
    and locked_at is null
  );

create policy "predictions_delete_own" on predictions
  for delete using (
    exists (
      select 1 from teams
      where teams.id = predictions.team_id and teams.user_id = auth.uid()
    )
    and locked_at is null
  );

create index if not exists predictions_league_id_idx on predictions(league_id);
create index if not exists predictions_episode_id_idx on predictions(episode_id);
create index if not exists predictions_team_id_idx on predictions(team_id);

-- ============================================================
-- EPISODE TEAM SCORES (materialized per episode)
-- ============================================================
create table if not exists episode_team_scores (
  id uuid primary key default uuid_generate_v4(),
  league_id uuid not null references leagues(id) on delete cascade,
  episode_id uuid not null references episodes(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  challenge_points int default 0,
  milestone_points int default 0,
  prediction_points int default 0,
  total_points int default 0,
  cumulative_total int default 0,
  rank int,
  created_at timestamptz default now(),
  unique(league_id, episode_id, team_id)
);

alter table episode_team_scores enable row level security;

create policy "episode_team_scores_select_league_members" on episode_team_scores
  for select using (
    exists (
      select 1 from teams
      where teams.league_id = episode_team_scores.league_id and teams.user_id = auth.uid()
    )
    or exists (
      select 1 from leagues
      where leagues.id = episode_team_scores.league_id and leagues.commissioner_id = auth.uid()
    )
  );

create policy "episode_team_scores_insert_commissioner" on episode_team_scores
  for insert with check (
    exists (
      select 1 from leagues
      where leagues.id = episode_team_scores.league_id and leagues.commissioner_id = auth.uid()
    )
    or exists (select 1 from profiles where id = auth.uid() and is_super_admin = true)
  );

create policy "episode_team_scores_update_commissioner" on episode_team_scores
  for update using (
    exists (
      select 1 from leagues
      where leagues.id = episode_team_scores.league_id and leagues.commissioner_id = auth.uid()
    )
    or exists (select 1 from profiles where id = auth.uid() and is_super_admin = true)
  );

create policy "episode_team_scores_delete_commissioner" on episode_team_scores
  for delete using (
    exists (
      select 1 from leagues
      where leagues.id = episode_team_scores.league_id and leagues.commissioner_id = auth.uid()
    )
    or exists (select 1 from profiles where id = auth.uid() and is_super_admin = true)
  );

create index if not exists episode_team_scores_league_id_idx on episode_team_scores(league_id);
create index if not exists episode_team_scores_episode_id_idx on episode_team_scores(episode_id);
create index if not exists episode_team_scores_team_id_idx on episode_team_scores(team_id);
