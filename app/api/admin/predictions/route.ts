import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

async function verifySuperAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_super_admin) return null;
  return user;
}

// GET /api/admin/predictions?league_id=...
// Returns episodes and active players for a league (super admin only).
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const user = await verifySuperAdmin(supabase);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const leagueId = searchParams.get("league_id");
  if (!leagueId) return NextResponse.json({ error: "league_id required" }, { status: 400 });

  const db = createServiceClient();

  const { data: league } = await db
    .from("leagues")
    .select("id, season_id")
    .eq("id", leagueId)
    .single();

  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 });

  const [{ data: episodes }, { data: players }, { data: teams }] = await Promise.all([
    db
      .from("episodes")
      .select("id, episode_number, title, is_scored, prediction_deadline, air_date")
      .eq("season_id", league.season_id)
      .order("episode_number"),
    db
      .from("players")
      .select("id, name, is_active, tribe")
      .eq("season_id", league.season_id)
      .order("name"),
    db
      .from("teams")
      .select("id, name")
      .eq("league_id", leagueId)
      .order("name"),
  ]);

  return NextResponse.json({ episodes: episodes || [], players: players || [], teams: teams || [] });
}

// POST /api/admin/predictions
// Scores predictions for an episode: awards points_earned based on voted-out player,
// marks episode.is_scored = true. Super admin only.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const user = await verifySuperAdmin(supabase);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { league_id, episode_id, voted_out_player_id, title_speaker_player_id } =
    await req.json();

  if (!league_id || !episode_id || !voted_out_player_id) {
    return NextResponse.json(
      { error: "league_id, episode_id, and voted_out_player_id are required" },
      { status: 400 }
    );
  }

  const db = createServiceClient();

  // Fetch all locked predictions for this episode in this league
  const { data: predictions, error: predError } = await db
    .from("predictions")
    .select("id, team_id, player_id, points_allocated")
    .eq("league_id", league_id)
    .eq("episode_id", episode_id)
    .not("locked_at", "is", null);

  if (predError) {
    return NextResponse.json({ error: predError.message }, { status: 500 });
  }

  // Update points_earned for each prediction
  const updates = (predictions || []).map((pred) => ({
    id: pred.id,
    points_earned:
      pred.player_id === voted_out_player_id ? pred.points_allocated : 0,
  }));

  for (const update of updates) {
    const { error } = await db
      .from("predictions")
      .update({ points_earned: update.points_earned })
      .eq("id", update.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // If title speaker provided, score title picks
  if (title_speaker_player_id) {
    const { data: titlePicks } = await db
      .from("title_picks")
      .select("id, player_id")
      .eq("league_id", league_id)
      .eq("episode_id", episode_id);

    for (const pick of titlePicks || []) {
      const isCorrect = pick.player_id === title_speaker_player_id;
      await db
        .from("title_picks")
        .update({ points_earned: isCorrect ? 3 : 0 })
        .eq("id", pick.id);
    }
  }

  // Mark episode as scored
  const { error: epError } = await db
    .from("episodes")
    .update({ is_scored: true })
    .eq("id", episode_id);

  if (epError) {
    return NextResponse.json({ error: epError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    predictions_scored: updates.length,
  });
}
