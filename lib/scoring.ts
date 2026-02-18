import type { Json, ScoringCategory } from "@/types/database";

// Default scoring constants
export const DEFAULT_SCORING = {
  TRIBE_REWARD_WIN: 1,
  INDIVIDUAL_REWARD_WIN: 2,
  TRIBE_IMMUNITY_WIN: 2,
  INDIVIDUAL_IMMUNITY_WIN: 4,
  TRIBE_IMMUNITY_SECOND: 1,
  MERGE_BONUS: 5,
  FINAL_THREE_BONUS: 10,
  WINNER_BONUS: 30,
  EPISODE_TITLE_SPEAKER: 3,
  WINNER_DIFFERENTIAL: 20,
} as const;

export type ScoringConfig = {
  TRIBE_REWARD_WIN?: number;
  INDIVIDUAL_REWARD_WIN?: number;
  TRIBE_IMMUNITY_WIN?: number;
  INDIVIDUAL_IMMUNITY_WIN?: number;
  TRIBE_IMMUNITY_SECOND?: number;
  MERGE_BONUS?: number;
  FINAL_THREE_BONUS?: number;
  WINNER_BONUS?: number;
  EPISODE_TITLE_SPEAKER?: number;
  enable_confessionals?: boolean;
  enable_idols?: boolean;
  enable_advantages?: boolean;
  CONFESSIONAL_POINT?: number;
  IDOL_PLAY_POINT?: number;
  ADVANTAGE_POINT?: number;
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
    case "individual_reward":
      return config.INDIVIDUAL_REWARD_WIN;
    case "tribe_immunity":
      return config.TRIBE_IMMUNITY_WIN;
    case "individual_immunity":
      return config.INDIVIDUAL_IMMUNITY_WIN;
    case "second_place_immunity":
      return config.TRIBE_IMMUNITY_SECOND;
    case "merge":
      return config.MERGE_BONUS;
    case "final_three":
      return config.FINAL_THREE_BONUS;
    case "winner":
      return config.WINNER_BONUS;
    case "episode_title":
      return config.EPISODE_TITLE_SPEAKER;
    case "confessional":
      return config.CONFESSIONAL_POINT ?? 1;
    case "idol_play":
      return config.IDOL_PLAY_POINT ?? 3;
    case "advantage":
      return config.ADVANTAGE_POINT ?? 2;
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
};

export const CHALLENGE_CATEGORIES: ScoringCategory[] = [
  "tribe_reward",
  "individual_reward",
  "tribe_immunity",
  "individual_immunity",
  "second_place_immunity",
  "episode_title",
];

export const MILESTONE_CATEGORIES: ScoringCategory[] = [
  "merge",
  "final_three",
  "winner",
];
