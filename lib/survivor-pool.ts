import type { Json } from "@/types/database";

// ── Survivor Pool ─────────────────────────────────────────────────────────────
// Each episode, a team picks ONE castaway they think will survive the episode.
// A castaway can only be picked once per season. A wrong (or missed) pick doesn't
// knock the team out — it resets their streak to zero. A correct pick earns
//   min(CAP, BASE + INCREMENT × (streak − 1))
// so with the defaults a streak pays 1, 2, 3, 4, 5, ...

export const SURVIVOR_POOL_DEFAULTS = {
  SURVIVOR_POOL_BASE: 1,
  SURVIVOR_POOL_INCREMENT: 1,
  SURVIVOR_POOL_CAP: 0, // 0 = uncapped
} as const;

export type SurvivorPoolSettings = {
  base: number;
  increment: number;
  cap: number;
};

export function getSurvivorPoolSettings(configJson: Json | null | undefined): SurvivorPoolSettings {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = (configJson as Record<string, any>) || {};
  return {
    base: c.SURVIVOR_POOL_BASE ?? SURVIVOR_POOL_DEFAULTS.SURVIVOR_POOL_BASE,
    increment: c.SURVIVOR_POOL_INCREMENT ?? SURVIVOR_POOL_DEFAULTS.SURVIVOR_POOL_INCREMENT,
    cap: c.SURVIVOR_POOL_CAP ?? SURVIVOR_POOL_DEFAULTS.SURVIVOR_POOL_CAP,
  };
}

// On by default for predictions-format leagues; draft leagues can opt in via settings.
export function isSurvivorPoolEnabled(league: { format?: string | null; scoring_config: Json }): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flag = ((league.scoring_config as Record<string, any>) || {}).SURVIVOR_POOL_ENABLED;
  if (typeof flag === "boolean") return flag;
  return league.format === "predictions";
}

export function survivorPointsForStreak(streak: number, s: SurvivorPoolSettings): number {
  if (streak <= 0) return 0;
  const raw = s.base + s.increment * (streak - 1);
  const capped = s.cap > 0 ? Math.min(s.cap, raw) : raw;
  return Math.round(capped * 100) / 100;
}

export type PoolPick = {
  episode_id: string;
  team_id: string;
  player_id: string;
  survived: boolean | null;
};

export type PoolPickResult = { streak: number; points: number };

/**
 * Walk a team's picks through the graded episodes (ascending) and compute each pick's
 * streak + points. Episodes not in `gradedEpisodeIds` don't affect the streak.
 * Returns per-episode results plus the streak carried into the next episode.
 */
export function computeTeamStreaks(
  episodeIdsAsc: string[],
  gradedEpisodeIds: Set<string>,
  picksByEpisode: Map<string, PoolPick>,
  settings: SurvivorPoolSettings
): { results: Map<string, PoolPickResult>; currentStreak: number; total: number } {
  const results = new Map<string, PoolPickResult>();
  let streak = 0;
  let total = 0;
  for (const epId of episodeIdsAsc) {
    const pick = picksByEpisode.get(epId);
    if (!gradedEpisodeIds.has(epId)) {
      if (pick) results.set(epId, { streak: 0, points: 0 });
      continue;
    }
    if (pick?.survived) {
      streak += 1;
      const points = survivorPointsForStreak(streak, settings);
      total += points;
      results.set(epId, { streak, points });
    } else {
      // Wrong pick or no pick at all — streak resets
      streak = 0;
      if (pick) results.set(epId, { streak: 0, points: 0 });
    }
  }
  return { results, currentStreak: streak, total };
}

/**
 * Grade (or un-grade) one episode's survivor picks for a league, then recompute every
 * team's streak/points across the season so later episodes stay consistent.
 *
 * @param eliminatedIds players eliminated this episode (voted out, medevac, finale
 *                      placements). Pass null to un-grade the episode.
 */
export async function gradeSurvivorPicks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  league: { id: string; scoring_config: Json },
  season_id: string,
  episode_id: string,
  eliminatedIds: string[] | null
) {
  const { data: episodePicks } = await db
    .from("survivor_picks")
    .select("id, player_id")
    .eq("league_id", league.id)
    .eq("episode_id", episode_id);

  const eliminated = new Set(eliminatedIds || []);
  await Promise.all(
    (episodePicks || []).map((p: { id: string; player_id: string }) =>
      db
        .from("survivor_picks")
        .update({
          survived: eliminatedIds === null ? null : !eliminated.has(p.player_id),
          updated_at: new Date().toISOString(),
        })
        .eq("id", p.id)
    )
  );

  // Graded = already-scored episodes, plus this one when grading / minus it when un-grading
  const { data: episodes } = await db
    .from("episodes")
    .select("id, episode_number, is_scored")
    .eq("season_id", season_id)
    .order("episode_number", { ascending: true });

  const episodeIdsAsc: string[] = (episodes || []).map((e: { id: string }) => e.id);
  const graded = new Set<string>(
    (episodes || []).filter((e: { is_scored: boolean }) => e.is_scored).map((e: { id: string }) => e.id)
  );
  if (eliminatedIds === null) graded.delete(episode_id);
  else graded.add(episode_id);

  const { data: allPicks } = await db
    .from("survivor_picks")
    .select("id, episode_id, team_id, player_id, survived, streak, points_earned")
    .eq("league_id", league.id);

  const byTeam = new Map<string, Map<string, PoolPick & { id: string; streak: number; points_earned: number }>>();
  for (const p of allPicks || []) {
    if (!byTeam.has(p.team_id)) byTeam.set(p.team_id, new Map());
    byTeam.get(p.team_id)!.set(p.episode_id, p);
  }

  const settings = getSurvivorPoolSettings(league.scoring_config);
  const updates: Promise<unknown>[] = [];
  byTeam.forEach((picks) => {
    const { results } = computeTeamStreaks(episodeIdsAsc, graded, picks, settings);
    results.forEach((r, epId) => {
      const row = picks.get(epId)!;
      if (row.streak !== r.streak || Number(row.points_earned) !== r.points) {
        updates.push(
          db.from("survivor_picks").update({ streak: r.streak, points_earned: r.points }).eq("id", row.id)
        );
      }
    });
  });
  await Promise.all(updates);
}
