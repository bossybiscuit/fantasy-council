-- ============================================================
-- Survivor Fantasy League - Seed Data
-- ============================================================
-- NOTE: Run this after setting up your first super admin user via Supabase Auth.
-- Replace 'YOUR_SUPER_ADMIN_UUID' with the actual UUID from auth.users.

-- Make a user super admin (run manually after registration)
-- update profiles set is_super_admin = true where id = 'YOUR_SUPER_ADMIN_UUID';

-- ============================================================
-- Sample Season: Survivor 50
-- ============================================================
insert into seasons (id, name, season_number, status) values
  ('a0000000-0000-0000-0000-000000000001', 'The Council: Season 50', 50, 'active')
on conflict do nothing;

-- ============================================================
-- Sample Players (20 castaways)
-- ============================================================
insert into players (season_id, name, tribe, tier, suggested_value, bio, is_active) values
  ('a0000000-0000-0000-0000-000000000001', 'Marcus Firewalker', 'Ember', 'S', 20, 'Former Marine turned wilderness guide. Natural leader with a gift for alliances.', true),
  ('a0000000-0000-0000-0000-000000000001', 'Yara Moonstone', 'Ember', 'A', 15, 'Marine biologist who reads people as well as she reads the sea.', true),
  ('a0000000-0000-0000-0000-000000000001', 'Diego Flint', 'Ember', 'B', 10, 'Retired firefighter. Strong in challenges, loyal to a fault.', true),
  ('a0000000-0000-0000-0000-000000000001', 'Priya Ashdale', 'Ember', 'A', 14, 'Corporate attorney who hides a cutthroat instinct behind a warm smile.', true),
  ('a0000000-0000-0000-0000-000000000001', 'Cal Torrent', 'Ember', 'B', 11, 'Wildlife photographer. Patient, observant, dangerous when underestimated.', true),
  ('a0000000-0000-0000-0000-000000000001', 'Nadia Crest', 'Smoke', 'S', 18, 'Olympic sprinter. Dominates physical challenges, magnetic personality.', true),
  ('a0000000-0000-0000-0000-000000000001', 'Theo Briar', 'Smoke', 'C', 6, 'Retired high school teacher. Beloved but not a threat.', true),
  ('a0000000-0000-0000-0000-000000000001', 'Sage Holloway', 'Smoke', 'A', 13, 'Tech startup founder. Brilliant strategist, but socially awkward.', true),
  ('a0000000-0000-0000-0000-000000000001', 'Lena Voss', 'Smoke', 'B', 9, 'Pastry chef. Beloved by all — which makes her a jury threat.', true),
  ('a0000000-0000-0000-0000-000000000001', 'Axel Trout', 'Smoke', 'D', 3, 'College student. Overconfident and first to stir trouble.', true),
  ('a0000000-0000-0000-0000-000000000001', 'Ren Nakamura', 'Ash', 'A', 16, 'Martial arts instructor. Calm under pressure, wins when it counts.', true),
  ('a0000000-0000-0000-0000-000000000001', 'Blair Weston', 'Ash', 'B', 8, 'Real estate agent. Social butterfly who finds idol clues first.', true),
  ('a0000000-0000-0000-0000-000000000001', 'Cruz Santos', 'Ash', 'C', 7, 'Street artist from Miami. Lovable chaos agent.', true),
  ('a0000000-0000-0000-0000-000000000001', 'Isla Merrow', 'Ash', 'S', 19, 'Poker champion turned survival expert. Reads bluffs at tribal council.', true),
  ('a0000000-0000-0000-0000-000000000001', 'Owen Griff', 'Ash', 'C', 5, 'Cattle rancher. Old-school loyalty, not built for modern gameplay.', true),
  ('a0000000-0000-0000-0000-000000000001', 'Petra Dune', 'Cinder', 'B', 12, 'Archaeologist. Finds patterns others miss — in puzzles and people.', true),
  ('a0000000-0000-0000-0000-000000000001', 'Eli Storm', 'Cinder', 'A', 15, 'Surf instructor. Likable, athletic, hard to pin down.', true),
  ('a0000000-0000-0000-0000-000000000001', 'Mira Rowe', 'Cinder', 'D', 4, 'Event planner. Talks too much, targets herself early.', true),
  ('a0000000-0000-0000-0000-000000000001', 'Fox Aldric', 'Cinder', 'B', 10, 'Wilderness EMT. Dependable in a crisis, trustworthy to a fault.', true),
  ('a0000000-0000-0000-0000-000000000001', 'Zoe Cairn', 'Cinder', 'A', 14, 'Forensic accountant. Follows the money and the alliances.', true)
on conflict do nothing;

-- ============================================================
-- Sample Episodes
-- ============================================================
insert into episodes (season_id, episode_number, title, air_date, is_merge, is_finale, is_scored) values
  ('a0000000-0000-0000-0000-000000000001', 1, 'Flame and Fortune', '2025-09-24', false, false, false),
  ('a0000000-0000-0000-0000-000000000001', 2, 'Smoke Signals', '2025-10-01', false, false, false),
  ('a0000000-0000-0000-0000-000000000001', 3, 'The Weight of Fire', '2025-10-08', false, false, false),
  ('a0000000-0000-0000-0000-000000000001', 4, 'Ash and Ember', '2025-10-15', false, false, false),
  ('a0000000-0000-0000-0000-000000000001', 5, 'The Council Speaks', '2025-10-22', true, false, false)
on conflict do nothing;
