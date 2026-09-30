import type { Json } from "@/types/database";

// Sole Survivor pick: in Survivor Pool leagues (which have no season predictions),
// each team can also pick who wins the season. Unlike season predictions — which lock
// when Episode 1 is scored — this stays open until the commissioner closes it.
// It's stored as a season_predictions row with category 'winner', so the existing
// finale auto-grading and standings totals pick it up.

export const WINNER_PICK_CATEGORY = "winner";
export const DEFAULT_WINNER_PICK_POINTS = 10;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cfg(scoring_config: Json | null | undefined): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (scoring_config as Record<string, any>) || {};
}

/** On by default in Survivor Pool leagues; other formats ask it as a season prediction instead. */
export function isWinnerPickEnabled(league: {
  format?: string | null;
  scoring_config: Json;
}): boolean {
  const flag = cfg(league.scoring_config).WINNER_PICK_ENABLED;
  if (typeof flag === "boolean") return flag;
  return league.format === "survivor_pool";
}

export function winnerPickPoints(scoring_config: Json | null | undefined): number {
  const v = cfg(scoring_config).WINNER_PICK_POINTS;
  return typeof v === "number" ? v : DEFAULT_WINNER_PICK_POINTS;
}

/** Commissioners close voting from League Settings whenever they like. */
export function isWinnerPickClosed(scoring_config: Json | null | undefined): boolean {
  return cfg(scoring_config).WINNER_PICK_CLOSED === true;
}
