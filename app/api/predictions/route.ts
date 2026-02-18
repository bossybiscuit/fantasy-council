import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { league_id, episode_id, team_id, allocations } = body;

  if (!league_id || !episode_id || !team_id || !allocations) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify team belongs to user
  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", team_id)
    .eq("user_id", user.id)
    .single();

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Validate total = 10
  const total = allocations.reduce(
    (sum: number, a: { points_allocated: number }) => sum + (a.points_allocated || 0),
    0
  );
  if (total !== 10) {
    return NextResponse.json(
      { error: "Allocations must total exactly 10 points" },
      { status: 400 }
    );
  }

  // Check episode deadline
  const { data: episode } = await supabase
    .from("episodes")
    .select("*")
    .eq("id", episode_id)
    .single();

  if (!episode) {
    return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  }

  if (
    episode.prediction_deadline &&
    new Date() > new Date(episode.prediction_deadline)
  ) {
    return NextResponse.json(
      { error: "Prediction deadline has passed" },
      { status: 400 }
    );
  }

  if (episode.is_scored) {
    return NextResponse.json(
      { error: "Episode already scored" },
      { status: 400 }
    );
  }

  // Delete existing predictions for this team/episode
  await supabase
    .from("predictions")
    .delete()
    .eq("league_id", league_id)
    .eq("episode_id", episode_id)
    .eq("team_id", team_id);

  // Insert new predictions
  const records = allocations
    .filter((a: { points_allocated: number }) => a.points_allocated > 0)
    .map((a: { player_id: string; points_allocated: number }) => ({
      league_id,
      episode_id,
      team_id,
      player_id: a.player_id,
      points_allocated: a.points_allocated,
      locked_at: new Date().toISOString(),
    }));

  if (records.length > 0) {
    const { error } = await supabase.from("predictions").insert(records);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
