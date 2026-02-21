import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getScoringValues, getCategoryPoints } from "@/lib/scoring";
import type { ScoringCategory } from "@/types/database";

interface AdminScoringInput {
  season_id: string;
  episode_id: string;
  found_idol_players: string[];
  successful_idol_play_players: string[];
  tribe_reward_winners: string[];
  tribe_immunity_winners: string[];
  tribe_immunity_second: string[];
  individual_reward_winner: string | null;
  votes_received_counts: Record<string, number>;
  voted_out_players: string[];
  is_merge: boolean;
  is_final_three: boolean;
  final_three_players: string[];
  winner_player: string | null;
}

type ScoringEventInput = {
  player_id: string;
  category: ScoringCategory;
  points: number;
  note?: string;
};

async function verifySuperAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_super_admin) return null;
  return user;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const user = await verifySuperAdmin(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: AdminScoringInput = await request.json();
  const { season_id, episode_id } = body;

  // Get all leagues for this season
  const { data: leagues } = await supabase
    .from("leagues")
    .select("*")
    .eq("season_id", season_id);

  if (!leagues || leagues.length === 0) {
    return NextResponse.json({ error: "No leagues found for this season" }, { status: 404 });
  }

  // Build scoring events (same results for all leagues, team mapping differs per league)
  // Use default scoring config for the events list — per-league config applied when inserting
  let totalEventsCount = 0;

  // Get active players for merge bonus (same across leagues)
  let mergePlayers: string[] = [];
  if (body.is_merge) {
    const { data: activePlayers } = await supabase
      .from("players")
      .select("id")
      .eq("season_id", season_id)
      .eq("is_active", true);
    mergePlayers = (activePlayers || []).map((p) => p.id);
  }

  for (const league of leagues) {
    const config = getScoringValues(league.scoring_config);
    const events: ScoringEventInput[] = [];

    const addEvent = (
      player_id: string,
      category: ScoringCategory,
      points?: number,
      note?: string
    ) => {
      const p = points !== undefined ? points : getCategoryPoints(category, config);
      if (player_id && p > 0) {
        events.push({ player_id, category, points: p, note });
      }
    };

    // Challenge events
    for (const pid of body.found_idol_players) addEvent(pid, "found_idol");
    for (const pid of body.successful_idol_play_players) addEvent(pid, "successful_idol_play");
    for (const pid of (body.tribe_reward_winners || [])) addEvent(pid, "tribe_reward");
    for (const pid of body.tribe_immunity_winners) addEvent(pid, "tribe_immunity");
    for (const pid of body.tribe_immunity_second) addEvent(pid, "second_place_immunity");
    if (body.individual_reward_winner) addEvent(body.individual_reward_winner, "individual_reward");
    for (const [pid, votes] of Object.entries(body.votes_received_counts || {})) {
      if (votes > 0) addEvent(pid, "votes_received", votes);
    }

    // Merge bonus
    for (const pid of mergePlayers) addEvent(pid, "merge");

    // Final three / winner
    if (body.is_final_three) {
      for (const pid of body.final_three_players) addEvent(pid, "final_three");
    }
    if (body.winner_player) addEvent(body.winner_player, "winner");

    // Get draft picks to map player -> team for this league
    const { data: draftPicks } = await supabase
      .from("draft_picks")
      .select("player_id, team_id")
      .eq("league_id", league.id);

    const playerTeamMap = new Map<string, string>();
    for (const pick of draftPicks || []) {
      playerTeamMap.set(pick.player_id, pick.team_id);
    }

    // Delete existing scoring events for this league + episode (idempotent)
    await supabase
      .from("scoring_events")
      .delete()
      .eq("league_id", league.id)
      .eq("episode_id", episode_id);

    // Insert scoring events
    if (events.length > 0) {
      const { error } = await supabase.from("scoring_events").insert(
        events.map((e) => ({
          league_id: league.id,
          episode_id,
          player_id: e.player_id,
          team_id: playerTeamMap.get(e.player_id) || null,
          category: e.category,
          points: e.points,
          note: e.note,
        }))
      );
      if (error) {
        return NextResponse.json({ error: `League ${league.id}: ${error.message}` }, { status: 500 });
      }
    }
    totalEventsCount += events.length;

    // Resolve vote predictions
    for (const votedOutId of body.voted_out_players) {
      const { data: preds } = await supabase
        .from("predictions")
        .select("*")
        .eq("league_id", league.id)
        .eq("episode_id", episode_id)
        .eq("player_id", votedOutId);

      for (const pred of preds || []) {
        const earned = pred.points_allocated;
        await supabase
          .from("predictions")
          .update({ points_earned: earned })
          .eq("id", pred.id);

        await supabase.from("scoring_events").insert({
          league_id: league.id,
          episode_id,
          player_id: votedOutId,
          team_id: pred.team_id,
          category: "voted_out_prediction" as ScoringCategory,
          points: earned,
          note: "Correct vote prediction",
        });
      }
    }

    // Recalculate episode team scores for this league
    await recalculateScores(supabase, league.id, episode_id, season_id);
  }

  // Mark players voted out as inactive (global, only needs to happen once)
  if (body.voted_out_players.length > 0) {
    await supabase
      .from("players")
      .update({ is_active: false })
      .in("id", body.voted_out_players);
  }

  // Mark episode as scored
  await supabase
    .from("episodes")
    .update({
      is_scored: true,
      is_merge: body.is_merge,
      is_finale: body.is_final_three,
    })
    .eq("id", episode_id);

  return NextResponse.json({
    success: true,
    leagues_count: leagues.length,
    events_count: totalEventsCount,
  });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const user = await verifySuperAdmin(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { season_id, episode_id } = await request.json();
  if (!season_id || !episode_id) {
    return NextResponse.json({ error: "Missing season_id or episode_id" }, { status: 400 });
  }

  // Get all leagues for this season
  const { data: leagues } = await supabase
    .from("leagues")
    .select("id")
    .eq("season_id", season_id);

  for (const league of leagues || []) {
    await supabase
      .from("scoring_events")
      .delete()
      .eq("league_id", league.id)
      .eq("episode_id", episode_id);

    await supabase
      .from("episode_team_scores")
      .delete()
      .eq("league_id", league.id)
      .eq("episode_id", episode_id);

    await supabase
      .from("title_picks")
      .update({ points_earned: 0 })
      .eq("league_id", league.id)
      .eq("episode_id", episode_id);

    await supabase
      .from("predictions")
      .update({ points_earned: 0 })
      .eq("league_id", league.id)
      .eq("episode_id", episode_id);

    await recalculateScores(supabase, league.id, episode_id, season_id);
  }

  // Unmark episode as scored
  await supabase
    .from("episodes")
    .update({ is_scored: false, is_merge: false, is_finale: false })
    .eq("id", episode_id);

  return NextResponse.json({ success: true });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recalculateScores(supabase: any, league_id: string, episode_id: string, season_id: string) {
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

  const challengeCats = new Set(["tribe_reward", "individual_reward", "tribe_immunity", "second_place_immunity", "found_idol", "successful_idol_play", "votes_received"]);
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

  // Update ranks
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
