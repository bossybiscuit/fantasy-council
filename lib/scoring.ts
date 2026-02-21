import type { Json, ScoringCategory } from "@/types/database";

// Default scoring constants
export const DEFAULT_SCORING = {
  TRIBE_REWARD_WIN: 1,
  TRIBE_IMMUNITY_WIN: 2,
  TRIBE_IMMUNITY_SECOND: 1,
  INDIVIDUAL_REWARD_WIN: 4,
  VOTES_RECEIVED: 1,
  FOUND_IDOL: 5,
  SUCCESSFUL_IDOL_PLAY: 5,
  MERGE_BONUS: 5,
  FINAL_THREE_BONUS: 10,
  WINNER_BONUS: 20,
} as const;

export type ScoringConfig = {
  TRIBE_REWARD_WIN?: number;
  TRIBE_IMMUNITY_WIN?: number;
  TRIBE_IMMUNITY_SECOND?: number;
  INDIVIDUAL_REWARD_WIN?: number;
  VOTES_RECEIVED?: number;
  FOUND_IDOL?: number;
  SUCCESSFUL_IDOL_PLAY?: number;
  MERGE_BONUS?: number;
  FINAL_THREE_BONUS?: number;
  WINNER_BONUS?: number;
};

export function getScoringValues(
  configJson: Json
) {
  const config = (configJson as ScoringConfig) || {};
  return {
    ...DEFAULT_SCORING,
    ...config,
  };
}

export function getCategoryPoints(
  category: ScoringCategory,
  config: ReturnType<typeof getScoringValues>
): number {
  switch (category) {
    case "tribe_reward":
      return config.TRIBE_REWARD_WIN;
    case "tribe_immunity":
      return config.TRIBE_IMMUNITY_WIN;
    case "second_place_immunity":
      return config.TRIBE_IMMUNITY_SECOND;
    case "individual_reward":
      return config.INDIVIDUAL_REWARD_WIN;
    case "found_idol":
      return config.FOUND_IDOL;
    case "successful_idol_play":
      return config.SUCCESSFUL_IDOL_PLAY;
    case "votes_received":
      return config.VOTES_RECEIVED;
    case "merge":
      return config.MERGE_BONUS;
    case "final_three":
      return config.FINAL_THREE_BONUS;
    case "winner":
      return config.WINNER_BONUS;
    default:
      return 0;
  }
}

export const CATEGORY_LABELS: Record<ScoringCategory, string> = {
  tribe_reward: "Tribe Reward Win",
  individual_reward: "Individual Reward Win",
  tribe_immunity: "Tribe Immunity Win",
  individual_immunity: "Individual Immunity Win",
  second_place_immunity: "Second Place Immunity",
  merge: "Merge Bonus",
  final_three: "Final Three Bonus",
  winner: "Winner Bonus",
  episode_title: "Episode Title Speaker",
  voted_out_prediction: "Vote Prediction (Bonus)",
  confessional: "Confessional Count",
  idol_play: "Idol Play",
  advantage: "Advantage Used",
  custom_bonus: "Custom Bonus",
  tribal_vote_correct: "Correct Tribal Vote",
  found_idol: "Found Idol",
  successful_idol_play: "Successful Idol Play",
  votes_received: "Votes Received at Tribal",
};

export const CHALLENGE_CATEGORIES: ScoringCategory[] = [
  "tribe_reward",
  "individual_reward",
  "tribe_immunity",
  "second_place_immunity",
  "found_idol",
  "successful_idol_play",
  "votes_received",
];

export const MILESTONE_CATEGORIES: ScoringCategory[] = [
  "merge",
  "final_three",
  "winner",
];
