-- Add missing categories to the scoring_events check constraint.
-- The original constraint was missing: found_idol, successful_idol_play, votes_received.
ALTER TABLE scoring_events
  DROP CONSTRAINT IF EXISTS scoring_events_category_check;

ALTER TABLE scoring_events
  ADD CONSTRAINT scoring_events_category_check CHECK (category IN (
    'tribe_reward', 'individual_reward', 'tribe_immunity', 'individual_immunity',
    'second_place_immunity', 'merge', 'final_three', 'winner', 'episode_title',
    'voted_out_prediction', 'confessional', 'idol_play', 'advantage',
    'custom_bonus', 'tribal_vote_correct',
    'found_idol', 'successful_idol_play', 'votes_received'
  ));
