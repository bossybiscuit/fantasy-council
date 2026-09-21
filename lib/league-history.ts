// League history: every season of a league, following parent_league_id links in
// both directions, with each season's final (or current) standings.

export type HistoryStanding = {
  teamId: string;
  teamName: string;
  userId: string | null;
  ownerName: string | null;
  points: number;
  rank: number;
};

export type HistorySeason = {
  leagueId: string;
  leagueName: string;
  seasonName: string;
  seasonNumber: number;
  seasonStatus: "upcoming" | "active" | "completed";
  format: string;
  standings: HistoryStanding[];
};

export type AllTimeRow = {
  userId: string;
  ownerName: string;
  seasons: number;
  titles: number;
  podiums: number;
  bestFinish: number | null;
  totalPoints: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getLeagueLineage(db: any, leagueId: string): Promise<string[]> {
  // Walk up to the original league
  let rootId = leagueId;
  const seen = new Set<string>([leagueId]);
  for (;;) {
    const { data } = await db.from("leagues").select("parent_league_id").eq("id", rootId).single();
    const parent = data?.parent_league_id;
    if (!parent || seen.has(parent)) break;
    seen.add(parent);
    rootId = parent;
  }

  // Then collect every descendant
  const ids = [rootId];
  let frontier = [rootId];
  while (frontier.length > 0) {
    const { data } = await db.from("leagues").select("id").in("parent_league_id", frontier);
    frontier = (data || []).map((l: { id: string }) => l.id).filter((id: string) => !ids.includes(id));
    ids.push(...frontier);
  }
  return ids;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getLeagueHistory(db: any, leagueId: string): Promise<HistorySeason[]> {
  const ids = await getLeagueLineage(db, leagueId);

  const [{ data: leagues }, { data: teams }, { data: scores }, { data: seasonPreds }] = await Promise.all([
    db.from("leagues").select("id, name, format, season_id, seasons(name, season_number, status)").in("id", ids),
    db.from("teams").select("id, league_id, name, user_id").in("league_id", ids),
    db.from("episode_team_scores").select("league_id, team_id, total_points").in("league_id", ids),
    db.from("season_predictions").select("league_id, team_id, points_earned").in("league_id", ids),
  ]);

  const userIds = [...new Set((teams || []).map((t: { user_id: string | null }) => t.user_id).filter(Boolean))];
  const { data: profiles } = userIds.length
    ? await db.from("profiles").select("id, display_name, username").in("id", userIds)
    : { data: [] };
  const ownerName = new Map<string, string>(
    (profiles || []).map((p: { id: string; display_name: string | null; username: string }) => [
      p.id,
      p.display_name || p.username,
    ])
  );

  // A season counts as finished once it's marked completed or its finale has been scored
  const seasonIds = [...new Set((leagues || []).map((l: { season_id: string }) => l.season_id))];
  const { data: finales } = seasonIds.length
    ? await db.from("episodes").select("season_id").in("season_id", seasonIds).eq("is_finale", true).eq("is_scored", true)
    : { data: [] };
  const finishedSeasons = new Set((finales || []).map((e: { season_id: string }) => e.season_id));

  const points = new Map<string, number>();
  for (const s of scores || []) points.set(s.team_id, (points.get(s.team_id) || 0) + Number(s.total_points || 0));
  for (const s of seasonPreds || []) points.set(s.team_id, (points.get(s.team_id) || 0) + Number(s.points_earned || 0));

  return (leagues || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((l: any) => {
      const standings = (teams || [])
        .filter((t: { league_id: string; user_id: string | null }) => t.league_id === l.id && t.user_id)
        .map((t: { id: string; name: string; user_id: string }) => ({
          teamId: t.id,
          teamName: t.name,
          userId: t.user_id,
          ownerName: ownerName.get(t.user_id) ?? null,
          points: Math.round((points.get(t.id) || 0) * 100) / 100,
          rank: 0,
        }))
        .sort((a: HistoryStanding, b: HistoryStanding) => b.points - a.points)
        .map((row: HistoryStanding, i: number, arr: HistoryStanding[]) => ({
          ...row,
          // Ties share a rank
          rank: i > 0 && arr[i - 1].points === row.points ? 0 : i + 1,
        }));
      for (let i = 1; i < standings.length; i++) {
        if (standings[i].rank === 0) standings[i].rank = standings[i - 1].rank;
      }
      return {
        leagueId: l.id,
        leagueName: l.name,
        seasonName: l.seasons?.name ?? "Unknown season",
        seasonNumber: l.seasons?.season_number ?? 0,
        seasonStatus: finishedSeasons.has(l.season_id) ? "completed" : l.seasons?.status ?? "active",
        format: l.format,
        standings,
      };
    })
    .sort((a: HistorySeason, b: HistorySeason) => b.seasonNumber - a.seasonNumber);
}

/** All-time leaderboard across the league's seasons, keyed by user. Only completed seasons award titles/podiums. */
export function buildAllTime(history: HistorySeason[]): AllTimeRow[] {
  const rows = new Map<string, AllTimeRow>();
  for (const season of history) {
    const hasScores = season.standings.some((s) => s.points > 0);
    for (const s of season.standings) {
      if (!s.userId) continue;
      const row =
        rows.get(s.userId) ??
        { userId: s.userId, ownerName: s.ownerName || s.teamName, seasons: 0, titles: 0, podiums: 0, bestFinish: null, totalPoints: 0 };
      row.seasons += 1;
      row.totalPoints += s.points;
      if (season.seasonStatus === "completed" && hasScores) {
        if (s.rank === 1) row.titles += 1;
        if (s.rank <= 3) row.podiums += 1;
        row.bestFinish = row.bestFinish === null ? s.rank : Math.min(row.bestFinish, s.rank);
      }
      rows.set(s.userId, row);
    }
  }
  return [...rows.values()]
    .map((r) => ({ ...r, totalPoints: Math.round(r.totalPoints * 100) / 100 }))
    .sort((a, b) => b.titles - a.titles || b.podiums - a.podiums || b.totalPoints - a.totalPoints);
}
