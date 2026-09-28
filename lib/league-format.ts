import type { LeagueFormat } from "@/types/database";

// League formats:
//   draft         — classic rosters drafted from the cast, plus weekly predictions
//   predictions   — no draft: weekly vote predictions, Survivor Pool, season predictions
//   survivor_pool — the Survivor Pool on its own: one pick a week, nothing else

export const LEAGUE_FORMATS: { id: LeagueFormat; title: string; desc: string }[] = [
  {
    id: "predictions",
    title: "Predictions",
    desc: "No draft. Weekly vote picks, Survivor Pool & season predictions.",
  },
  {
    id: "survivor_pool",
    title: "Survivor Pool Only",
    desc: "Just the pool — pick one castaway to survive each week.",
  },
  {
    id: "draft",
    title: "Draft",
    desc: "Classic fantasy — draft castaway rosters plus weekly predictions.",
  },
];

export function parseFormat(value: unknown): LeagueFormat {
  return value === "draft" || value === "survivor_pool" ? value : "predictions";
}

/** Rosters, draft room, auction budgets, player values */
export function hasDraft(format: string | null | undefined): boolean {
  return format === "draft" || !format;
}

/** Weekly vote allocations, title picks, finale picks */
export function hasWeeklyPredictions(format: string | null | undefined): boolean {
  return format !== "survivor_pool";
}

/** Season-long predictions (winner, Top 3, etc.) */
export function hasSeasonPredictions(format: string | null | undefined): boolean {
  return format !== "survivor_pool";
}

export function formatLabel(format: string | null | undefined): string {
  if (format === "survivor_pool") return "Survivor Pool";
  if (format === "predictions") return "Predictions";
  return "Draft";
}
