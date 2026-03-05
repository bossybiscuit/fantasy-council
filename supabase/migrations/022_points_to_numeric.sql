-- Change all point columns from int to numeric to support fractional values (e.g. 0.5)
ALTER TABLE scoring_events ALTER COLUMN points TYPE numeric USING points::numeric;
ALTER TABLE predictions ALTER COLUMN points_allocated TYPE numeric USING points_allocated::numeric;
ALTER TABLE predictions ALTER COLUMN points_earned TYPE numeric USING points_earned::numeric;
ALTER TABLE episode_team_scores ALTER COLUMN challenge_points TYPE numeric USING challenge_points::numeric;
ALTER TABLE episode_team_scores ALTER COLUMN milestone_points TYPE numeric USING milestone_points::numeric;
ALTER TABLE episode_team_scores ALTER COLUMN prediction_points TYPE numeric USING prediction_points::numeric;
ALTER TABLE episode_team_scores ALTER COLUMN total_points TYPE numeric USING total_points::numeric;
ALTER TABLE episode_team_scores ALTER COLUMN cumulative_total TYPE numeric USING cumulative_total::numeric;
