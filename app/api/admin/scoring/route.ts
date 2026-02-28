import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getScoringValues, getCategoryPoints } from "@/lib/scoring";
import { recalculateScores } from "@/lib/recalculate-scores";
import type { ScoringCategory } from "@/types/database";

interface AdminScoringInput {
  season_id: string;
  episode_id: string;
  found_idol_players: string[];
  successful_idol_play_players: string[];
  episode_title_speaker: string | null;
  tribe_reward_winners: string[];
  tribe_immunity_winners: string[];
  tribe_immunity_second: string[];
  individual_reward_winner: string | null;
  individual_immunity_winner: string | null;
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

  // Use service client for all DB writes — the super admin is not necessarily the
  // commissioner of every league, and RLS commissioner-only policies would silently
  // block inserts/updates on scoring_events and episode_team_scores.
  const db = createServiceClient();

  const body: AdminScoringInput = await request.json();
  const { season_id, episode_id } = body;

  // Get all leagues for this season
  const { data: leagues } = await db
    .from("leagues")
    .select("*")
    .eq("season_id", season_id);

  if (!leagues || leagues.length === 0) {
    return NextResponse.json({ error: "No leagues found for this season" }, { status: 404 });
  }

  let totalEventsCount = 0;

  // Get active players for merge bonus (same across leagues)
  let mergePlayers: string[] = [];
  if (body.is_merge) {
    const { data: activePlayers } = await db
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
    if (body.episode_title_speaker && body.episode_title_speaker !== "jeff_probst") {
      addEvent(body.episode_title_speaker, "episode_title");
    }
    for (const pid of (body.tribe_reward_winners || [])) addEvent(pid, "tribe_reward");
    for (const pid of body.tribe_immunity_winners) addEvent(pid, "tribe_immunity");
    for (const pid of body.tribe_immunity_second) addEvent(pid, "second_place_immunity");
    if (body.individual_reward_winner) addEvent(body.individual_reward_winner, "individual_reward");
    if (body.individual_immunity_winner) addEvent(body.individual_immunity_winner, "individual_immunity");
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
    const { data: draftPicks } = await db
      .from("draft_picks")
      .select("player_id, team_id")
      .eq("league_id", league.id);

    const playerTeamMap = new Map<string, string>();
    for (const pick of draftPicks || []) {
      playerTeamMap.set(pick.player_id, pick.team_id);
    }

    // Delete existing scoring events for this league + episode (idempotent)
    await db
      .from("scoring_events")
      .delete()
      .eq("league_id", league.id)
      .eq("episode_id", episode_id);

    // Insert scoring events
    if (events.length > 0) {
      const { error } = await db.from("scoring_events").insert(
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
      const { data: preds } = await db
        .from("predictions")
        .select("*")
        .eq("league_id", league.id)
        .eq("episode_id", episode_id)
        .eq("player_id", votedOutId);

      for (const pred of preds || []) {
        const earned = pred.points_allocated;
        await db
          .from("predictions")
          .update({ points_earned: earned })
          .eq("id", pred.id);

        await db.from("scoring_events").insert({
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

    // Grade title picks for this episode
    if (body.episode_title_speaker) {
      const isHostSpeaker = body.episode_title_speaker === "jeff_probst";
      const titlePickPts = getCategoryPoints("episode_title", config);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: titlePicks } = await (db as any)
        .from("title_picks")
        .select("id, player_id, is_host_pick")
        .eq("league_id", league.id)
        .eq("episode_id", episode_id);

      for (const pick of titlePicks || []) {
        const isCorrect = isHostSpeaker
          ? pick.is_host_pick === true
          : pick.player_id === body.episode_title_speaker;
        await db
          .from("title_picks")
          .update({ points_earned: isCorrect ? titlePickPts : 0 })
          .eq("id", pick.id);
      }
    }

    // Recalculate episode team scores for this league
    await recalculateScores(db, league.id, episode_id, season_id);
  }

  // Auto-grade winner season predictions when a winner is declared
  if (body.winner_player) {
    const { data: winnerData } = await db
      .from("players")
      .select("name")
      .eq("id", body.winner_player)
      .single();

    if (winnerData?.name) {
      const leagueIds = leagues.map((l) => l.id);
      await Promise.all([
        db
          .from("season_predictions")
          .update({ is_correct: true, points_earned: 10 })
          .in("league_id", leagueIds)
          .eq("category", "winner")
          .eq("answer", winnerData.name),
        db
          .from("season_predictions")
          .update({ is_correct: false, points_earned: 0 })
          .in("league_id", leagueIds)
          .eq("category", "winner")
          .neq("answer", winnerData.name),
      ]);
    }
  }

  // Mark players voted out as inactive (global, only needs to happen once)
  if (body.voted_out_players.length > 0) {
    await db
      .from("players")
      .update({ is_active: false })
      .in("id", body.voted_out_players);
  }

  // Mark episode as scored
  await db
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

  const db = createServiceClient();

  const { season_id, episode_id } = await request.json();
  if (!season_id || !episode_id) {
    return NextResponse.json({ error: "Missing season_id or episode_id" }, { status: 400 });
  }

  // Get all leagues for this season
  const { data: leagues } = await db
    .from("leagues")
    .select("id, season_id")
    .eq("season_id", season_id);

  for (const league of leagues || []) {
    await db
      .from("scoring_events")
      .delete()
      .eq("league_id", league.id)
      .eq("episode_id", episode_id);

    await db
      .from("episode_team_scores")
      .delete()
      .eq("league_id", league.id)
      .eq("episode_id", episode_id);

    await db
      .from("title_picks")
      .update({ points_earned: 0 })
      .eq("league_id", league.id)
      .eq("episode_id", episode_id);

    await db
      .from("predictions")
      .update({ points_earned: 0 })
      .eq("league_id", league.id)
      .eq("episode_id", episode_id);

    await recalculateScores(db, league.id, episode_id, season_id);
  }

  // Unmark episode as scored
  await db
    .from("episodes")
    .update({ is_scored: false, is_merge: false, is_finale: false })
    .eq("id", episode_id);

  return NextResponse.json({ success: true });
}

