// Season prediction questions. Kept out of the client component so server
// components can read them too — values exported from a "use client" module are
// client references on the server, and reading them there throws at runtime.
import { TOP_THREE_KEY, TOP_THREE_POINTS } from "@/lib/season-predictions";

export interface ImageOption {
  label: string;
  value: string;
  image_url: string;
}

export interface Category {
  key: string;
  label: string;
  description: string;
  options: string[] | null;
  imageOptions?: ImageOption[];
  playerPicker?: boolean;
  /** Pick three castaways; scored 1 / 5 / 15 for 1 / 2 / 3 correct */
  topThree?: boolean;
  points: number | null;
}

export const SEASON_CATEGORIES: Category[] = [
  {
    key: "rice",
    label: "Rice",
    description: "Will rice be earned or given?",
    options: ["Given", "Earned"],
    points: 5,
  },
  {
    key: "merge_episode",
    label: "Merge Episode",
    description: "What episode will the merge happen?",
    options: ["4", "5", "6", "7", "8", "9", "10"],
    points: 5,
  },
  {
    key: "idols_played",
    label: "Idols Played",
    description: "How many idols will be played in total?",
    options: ["0", "1", "2", "3", "4", "5", "6", "7", "8"],
    points: 5,
  },
  {
    key: "quit_or_medevac",
    label: "Quit or Medevac",
    description: "Will anyone quit or be medically evacuated?",
    options: ["Yes", "No"],
    points: 5,
  },
  {
    key: "most_individual_immunities",
    label: "Most Individual Immunities",
    description: "Most individual immunity wins by any one castaway?",
    options: ["1", "2", "3", "4", "5", "6"],
    points: 5,
  },
  {
    key: "final_jury_vote",
    label: "Final Jury Vote",
    description: "What will the final jury vote be?",
    options: ["8-1", "7-2", "6-3", "5-4"],
    points: 5,
  },
  {
    key: TOP_THREE_KEY,
    label: "Top 3",
    description: `Pick the three castaways who make it to the end (any order). 1 right = ${TOP_THREE_POINTS[1]} pt, 2 right = ${TOP_THREE_POINTS[2]} pts, all 3 = ${TOP_THREE_POINTS[3]} pts.`,
    options: null,
    topThree: true,
    points: TOP_THREE_POINTS[3],
  },
  {
    key: "winner",
    label: "Season Winner",
    description: "Who will be the Sole Survivor this season?",
    options: null,
    playerPicker: true,
    points: 10,
  },
];
