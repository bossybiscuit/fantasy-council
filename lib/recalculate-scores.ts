// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function recalculateScores(supabase: any, league_id: string, episode_id: string, season_id: string) {
  const { data: teams } = await supabase
    .from("teams")
    .select("id")
    .eq("league_id", league_id);

  if (!teams || teams.length === 0) return;

  // Fetch all scored episodes for this season in one query
  const { data: allScoredEpisodes } = await supabase
    .from("episodes")
    .select("id, episode_number")
    .eq("season_id", season_id)
    .eq("is_scored", true)
    .order("episode_number", { ascending: true });

  // Ensure the target episode is included (it might not be marked scored yet)
  const episodes: { id: string; episode_number: number }[] = allScoredEpisodes || [];
  if (!episodes.find((e) => e.id === episode_id)) {
    const { data: thisEp } = await supabase
      .from("episodes")
      .select("id, episode_number")
      .eq("id", episode_id)
      .single();
    if (thisEp) {
      episodes.push(thisEp);
      episodes.sort((a, b) => a.episode_number - b.episode_number);
    }
  }

  if (episodes.length === 0) return;

  const challengeCats = new Set([
    "tribe_reward", "individual_reward", "individual_immunity", "tribe_immunity",
    "second_place_immunity", "found_idol", "successful_idol_play", "episode_title", "votes_received",
  ]);
  const milestoneCats = new Set(["merge", "final_three", "winner"]);

  const allEpisodeIds = episodes.map((e) => e.id);

  // Batch-fetch all scoring events, predictions, and title_picks for this league across all episodes
  const [{ data: allEvents }, { data: allPreds }, { data: allTitlePicks }] = await Promise.all([
    supabase
      .from("scoring_events")
      .select("episode_id, team_id, points, category")
      .eq("league_id", league_id)
      .in("episode_id", allEpisodeIds),
    supabase
      .from("predictions")
      .select("episode_id, team_id, points_earned")
      .eq("league_id", league_id)
      .in("episode_id", allEpisodeIds),
    supabase
      .from("title_picks")
      .select("episode_id, team_id, points_earned")
      .eq("league_id", league_id)
      .in("episode_id", allEpisodeIds),
  ]);

  // Build lookup maps keyed by "episode_id:team_id"
  const challengeMap = new Map<string, number>();
  const milestoneMap = new Map<string, number>();
  for (const ev of allEvents || []) {
    if (!ev.team_id) continue;
    const key = `${ev.episode_id}:${ev.team_id}`;
    if (challengeCats.has(ev.category)) {
      challengeMap.set(key, (challengeMap.get(key) || 0) + ev.points);
    } else if (milestoneCats.has(ev.category)) {
      milestoneMap.set(key, (milestoneMap.get(key) || 0) + ev.points);
    }
  }

  const predMap = new Map<string, number>();
  for (const p of allPreds || []) {
    const key = `${p.episode_id}:${p.team_id}`;
    predMap.set(key, (predMap.get(key) || 0) + (p.points_earned || 0));
  }

  const titleMap = new Map<string, number>();
  for (const tp of allTitlePicks || []) {
    if (!tp.team_id) continue;
    const key = `${tp.episode_id}:${tp.team_id}`;
    titleMap.set(key, (titleMap.get(key) || 0) + (tp.points_earned || 0));
  }

  // Build all upsert rows in memory
  const upsertRows: object[] = [];
  for (const team of teams) {
    let cumulative = 0;
    for (const ep of episodes) {
      const key = `${ep.id}:${team.id}`;
      const challengePoints = challengeMap.get(key) || 0;
      const milestonePoints = milestoneMap.get(key) || 0;
      const predictionPoints = (predMap.get(key) || 0) + (titleMap.get(key) || 0);
      const total = challengePoints + milestonePoints + predictionPoints;
      cumulative += total;

      upsertRows.push({
        league_id,
        episode_id: ep.id,
        team_id: team.id,
        challenge_points: challengePoints,
        milestone_points: milestonePoints,
        prediction_points: predictionPoints,
        total_points: total,
        cumulative_total: cumulative,
      });
    }
  }

  // Single batch upsert for all teams × episodes
  if (upsertRows.length > 0) {
    await supabase
      .from("episode_team_scores")
      .upsert(upsertRows, { onConflict: "league_id,episode_id,team_id" });
  }

  // Update ranks for the target episode
  const { data: scores } = await supabase
    .from("episode_team_scores")
    .select("id, cumulative_total")
    .eq("league_id", league_id)
    .eq("episode_id", episode_id)
    .order("cumulative_total", { ascending: false });

  // Batch rank updates
  const rankUpdates = (scores || []).map((s: any, i: number) =>
    supabase.from("episode_team_scores").update({ rank: i + 1 }).eq("id", s.id)
  );
  await Promise.all(rankUpdates);
}
