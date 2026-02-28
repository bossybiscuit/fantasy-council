-- Add 'medevac' category for players eliminated without a vote (injury, quit, etc.).
-- These players are marked inactive but prediction points are NOT awarded.
ALTER TABLE scoring_events
  DROP CONSTRAINT IF EXISTS scoring_events_category_check;

ALTER TABLE scoring_events
  ADD CONSTRAINT scoring_events_category_check CHECK (category IN (
    'tribe_reward', 'individual_reward', 'tribe_immunity', 'individual_immunity',
    'second_place_immunity', 'merge', 'final_three', 'winner', 'episode_title',
    'voted_out_prediction', 'confessional', 'idol_play', 'advantage',
    'custom_bonus', 'tribal_vote_correct',
    'found_idol', 'successful_idol_play', 'votes_received',
    'medevac'
  ));
