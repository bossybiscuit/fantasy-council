# The Council — Survivor Fantasy League

A full-stack Survivor fantasy league platform. Draft castaways, score episodes, make weekly vote predictions, and compete with friends across multiple leagues.

## Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Database + Auth**: Supabase (PostgreSQL + Supabase Auth)
- **Styling**: Tailwind CSS (custom dark tribal council theme)
- **Deployment**: Vercel

---

## Local Setup

### 1. Supabase Project

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → run the contents of `supabase/migrations/001_initial_schema.sql`
3. (Optional) Run `supabase/seed.sql` to populate sample season + players

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Find these in your Supabase project under **Settings → API**.

### 3. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## First-Time Admin Setup

1. Register an account via `/register`
2. In Supabase SQL Editor, run:
   ```sql
   UPDATE profiles SET is_super_admin = true WHERE username = 'yourusername';
   ```
3. You now have access to the `/admin` panel to manage seasons, players, and leagues

---

## App Flow

### Platform Flow

```
/register or /login
  → /dashboard          (your leagues overview + join via invite code)
  → /leagues/new        (create a new league)
  → /leagues/[id]       (standings, teams, invite code display)
  → /leagues/[id]/draft (draft room — snake or auction)
  → /leagues/[id]/predictions  (weekly vote predictions)
  → /leagues/[id]/recap        (episode-by-episode recap)
  → /leagues/[id]/team/[id]    (team detail + roster)
  → /leagues/[id]/player/[id]  (player stats + ownership)
```

### Commissioner Flow

```
/leagues/[id]/admin/scoring   (enter episode results → auto-calculates scores)
/leagues/[id]/admin/settings  (customize scoring values, toggle optional categories)
```

### Super Admin Flow

```
/admin/seasons   (create/edit seasons + manage episodes)
/admin/players   (add/edit/bulk import castaways)
/admin/leagues   (view all leagues platform-wide)
```

---

## Scoring System

Default point values (editable per league):

| Event | Points |
|-------|--------|
| Tribe Reward Win | 1 |
| Individual Reward Win | 2 |
| Tribe Immunity Win | 2 |
| Individual Immunity Win | 4 |
| 2nd Place Immunity | 1 |
| Merge Bonus (per player) | 5 |
| Final Three Bonus | 10 |
| Winner Bonus | 30 |
| Episode Title Speaker | 3 |

**Vote Predictions**: Allocate exactly 10 points across active players before each episode. If your predicted player is voted out, you earn those points.

---

## Draft Types

### Snake Draft
- Draft order randomized at draft start
- Order reverses each round (snake pattern)
- Commissioner or team owner makes picks
- Commissioner can force-advance picks

### Auction Draft
- Each team has a budget (default $100)
- Commissioner nominates players and records winning bids
- Highest bidder wins the player
- Budget tracked per team in real time

---

## Database Schema

See `supabase/migrations/001_initial_schema.sql` for the full schema with all tables, indexes, and RLS policies.

Key tables:
- `profiles` — user profiles (extends Supabase auth.users)
- `seasons` — Survivor seasons
- `players` — castaways per season
- `leagues` — fantasy leagues with invite codes
- `teams` — a user's team within a league
- `draft_picks` — drafted player assignments
- `episodes` — season episodes with air dates
- `scoring_events` — individual scoring records per player/episode
- `predictions` — weekly vote predictions with point allocations
- `episode_team_scores` — materialized score totals per team per episode

---

## Deployment (Vercel)

1. Push to GitHub (this repo)
2. Connect to Vercel → import the repo
3. Add environment variables in Vercel project settings
4. Deploy — Vercel auto-deploys on every push to main

---

## Project Structure

```
app/
  (auth)/login, register       — Auth pages
  (platform)/
    dashboard/                 — User's leagues overview
    leagues/
      new/                     — Create league
      join/                    — Join via invite code
      [leagueId]/              — League home (standings)
        draft/                 — Draft room
        predictions/           — Weekly predictions
        recap/                 — Episode recap
        team/[teamId]/         — Team detail
        player/[playerId]/     — Player detail
        admin/scoring/         — Commissioner: score episodes
        admin/settings/        — Commissioner: league settings
  admin/                       — Super admin panel
    seasons/                   — Manage seasons + episodes
    players/                   — Manage cast lists
    leagues/                   — Platform league overview
  api/                         — API route handlers

components/
  layout/                      — Navbar, LeagueSidebar
  ui/                          — PlayerCard, StandingsTable, etc.

lib/
  supabase/client.ts           — Browser Supabase client
  supabase/server.ts           — Server Supabase client
  scoring.ts                   — Scoring constants + helpers
  utils.ts                     — Utility functions

types/
  database.ts                  — TypeScript types matching Supabase schema

supabase/
  migrations/001_initial_schema.sql
  seed.sql
```
