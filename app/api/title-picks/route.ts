import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST — upsert a title pick for the current user's team
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

  const isHostPick = player_id === "jeff_probst";
  const resolvedPlayerId = isHostPick ? null : (player_id || null);

  // Find the team belonging to this user in this league
  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("league_id", league_id)
    .eq("user_id", user.id)
    .single();

  if (!team) return NextResponse.json({ error: "No team found" }, { status: 403 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("title_picks")
    .upsert(
      {
        league_id,
        episode_id,
        team_id: team.id,
        player_id: resolvedPlayerId,
        is_host_pick: isHostPick,
        points_earned: 0,
      },
      { onConflict: "league_id,episode_id,team_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ pick: data });
}

// GET — fetch current user's title pick for an episode
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const league_id = searchParams.get("league_id");
  const episode_id = searchParams.get("episode_id");

  if (!league_id || !episode_id) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("league_id", league_id)
    .eq("user_id", user.id)
    .single();

  if (!team) return NextResponse.json({ pick: null });

  const { data: pick } = await supabase
    .from("title_picks")
    .select("*")
    .eq("league_id", league_id)
    .eq("episode_id", episode_id)
    .eq("team_id", team.id)
    .maybeSingle();

  return NextResponse.json({ pick: pick || null });
}
