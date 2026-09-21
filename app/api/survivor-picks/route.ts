import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isSurvivorPoolEnabled } from "@/lib/survivor-pool";

// POST — set (or clear, with player_id = null) the current user's survivor pool pick for an episode
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { league_id, episode_id, player_id } = await request.json();
  if (!league_id || !episode_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = createServiceClient();

  const { data: team } = await db
    .from("teams")
    .select("id")
    .eq("league_id", league_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!team) return NextResponse.json({ error: "No team found" }, { status: 403 });

  const { data: league } = await db
    .from("leagues")
    .select("id, season_id, format, scoring_config")
    .eq("id", league_id)
    .single();
  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 });
  if (!isSurvivorPoolEnabled(league)) {
    return NextResponse.json({ error: "The Survivor Pool isn't enabled for this league" }, { status: 400 });
  }

  const { data: episode } = await db
    .from("episodes")
    .select("id, season_id, is_scored, prediction_deadline")
    .eq("id", episode_id)
    .single();
  if (!episode || episode.season_id !== league.season_id) {
    return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  }
  if (episode.is_scored) {
    return NextResponse.json({ error: "Episode already scored" }, { status: 400 });
  }
  if (episode.prediction_deadline && new Date() > new Date(episode.prediction_deadline)) {
    return NextResponse.json({ error: "Pick deadline has passed" }, { status: 400 });
  }

  if (!player_id) {
    await db
      .from("survivor_picks")
      .delete()
      .eq("league_id", league_id)
      .eq("episode_id", episode_id)
      .eq("team_id", team.id);
    return NextResponse.json({ success: true, pick: null });
  }

  const { data: player } = await db
    .from("players")
    .select("id, season_id, is_active, name")
    .eq("id", player_id)
    .single();
  if (!player || player.season_id !== league.season_id) {
    return NextResponse.json({ error: "Castaway not found" }, { status: 404 });
  }
  if (!player.is_active) {
    return NextResponse.json({ error: `${player.name} is no longer in the game` }, { status: 400 });
  }

  // No repeats: this castaway can't have been used by this team in any other episode
  const { data: usedElsewhere } = await db
    .from("survivor_picks")
    .select("id")
    .eq("league_id", league_id)
    .eq("team_id", team.id)
    .eq("player_id", player_id)
    .neq("episode_id", episode_id)
    .limit(1);
  if ((usedElsewhere || []).length > 0) {
    return NextResponse.json(
      { error: `You've already used ${player.name} — each castaway can only be picked once` },
      { status: 400 }
    );
  }

  const { data: pick, error } = await db
    .from("survivor_picks")
    .upsert(
      {
        league_id,
        episode_id,
        team_id: team.id,
        player_id,
        survived: null,
        streak: 0,
        points_earned: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "league_id,episode_id,team_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, pick });
}
