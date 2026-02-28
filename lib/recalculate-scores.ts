// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function recalculateScores(supabase: any, league_id: string, episode_id: string, season_id: string) {
  const { data: teams } = await supabase
    .from("teams")
    .select("id")
    .eq("league_id", league_id);

  if (!teams) return;

  const { data: allScoredEpisodes } = await supabase
    .from("episodes")
    .select("id, episode_number")
    .eq("season_id", season_id)
    .eq("is_scored", true)
    .order("episode_number", { ascending: true });

  const scoredIds = new Set((allScoredEpisodes || []).map((e: any) => e.id));
  if (!scoredIds.has(episode_id)) {
    const { data: thisEp } = await supabase
      .from("episodes")
      .select("id, episode_number")
      .eq("id", episode_id)
      .single();
    if (thisEp) {
      allScoredEpisodes.push(thisEp);
      allScoredEpisodes.sort((a: any, b: any) => a.episode_number - b.episode_number);
    }
  }

  const challengeCats = new Set(["tribe_reward", "individual_reward", "individual_immunity", "tribe_immunity", "second_place_immunity", "found_idol", "successful_idol_play", "episode_title", "votes_received"]);
  const milestoneCats = new Set(["merge", "final_three", "winner"]);

  for (const team of teams) {
    let cumulative = 0;

    for (const ep of allScoredEpisodes || []) {
      const { data: events } = await supabase
        .from("scoring_events")
        .select("points, category")
        .eq("league_id", league_id)
        .eq("episode_id", ep.id)
        .eq("team_id", team.id);

      const challengePoints = (events || [])
        .filter((e: any) => challengeCats.has(e.category))
        .reduce((sum: number, e: any) => sum + e.points, 0);

      const milestonePoints = (events || [])
        .filter((e: any) => milestoneCats.has(e.category))
        .reduce((sum: number, e: any) => sum + e.points, 0);

      const { data: preds } = await supabase
        .from("predictions")
        .select("points_earned")
        .eq("league_id", league_id)
        .eq("episode_id", ep.id)
        .eq("team_id", team.id);

      const votePredPoints = (preds || []).reduce(
        (sum: number, p: any) => sum + (p.points_earned || 0),
        0
      );

      const { data: titlePick } = await supabase
        .from("title_picks")
        .select("points_earned")
        .eq("league_id", league_id)
        .eq("episode_id", ep.id)
        .eq("team_id", team.id)
        .maybeSingle();

      const titlePickPoints = titlePick?.points_earned || 0;
      const predictionPoints = votePredPoints + titlePickPoints;
      const total = challengePoints + milestonePoints + predictionPoints;
      cumulative += total;

      await supabase
        .from("episode_team_scores")
        .upsert(
          {
            league_id,
            episode_id: ep.id,
            team_id: team.id,
            challenge_points: challengePoints,
            milestone_points: milestonePoints,
            prediction_points: predictionPoints,
            total_points: total,
            cumulative_total: cumulative,
          },
          { onConflict: "league_id,episode_id,team_id" }
        );
    }
  }

  // Update ranks for the target episode
  const { data: scores } = await supabase
    .from("episode_team_scores")
    .select("id, cumulative_total")
    .eq("league_id", league_id)
    .eq("episode_id", episode_id)
    .order("cumulative_total", { ascending: false });

  for (let i = 0; i < (scores || []).length; i++) {
    await supabase
      .from("episode_team_scores")
      .update({ rank: i + 1 })
      .eq("id", scores![i].id);
  }
}
