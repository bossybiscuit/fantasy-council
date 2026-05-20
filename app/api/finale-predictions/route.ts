import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

type Allocation = { player_id: string; points_allocated: number };
type Body = {
  league_id: string;
  episode_id: string;
  fifth_place: Allocation[]; // total 10 pts
  fourth_place: Allocation[]; // total 10 pts
  final_three: string[]; // up to 3 player_ids
  winner: string | null; // single player_id
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: Body = await request.json();
  if (!body.league_id || !body.episode_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify the episode is the finale
  const db = createServiceClient();
  const { data: episode } = await db
    .from("episodes")
    .select("is_finale, prediction_deadline")
    .eq("id", body.episode_id)
    .single();
  if (!episode?.is_finale) {
    return NextResponse.json({ error: "Episode is not a finale" }, { status: 400 });
  }
  if (episode.prediction_deadline && new Date() > new Date(episode.prediction_deadline)) {
    return NextResponse.json({ error: "Prediction deadline has passed" }, { status: 400 });
  }

  // Find the user's team in this league
  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("league_id", body.league_id)
    .eq("user_id", user.id)
    .single();
  if (!team) return NextResponse.json({ error: "No team found" }, { status: 403 });

  // Validate allocation totals
  const fifthTotal = (body.fifth_place || []).reduce((s, a) => s + a.points_allocated, 0);
  const fourthTotal = (body.fourth_place || []).reduce((s, a) => s + a.points_allocated, 0);
  if (body.fifth_place?.length > 0 && fifthTotal !== 10) {
    return NextResponse.json({ error: "5th place must total 10 points" }, { status: 400 });
  }
  if (body.fourth_place?.length > 0 && fourthTotal !== 10) {
    return NextResponse.json({ error: "4th place must total 10 points" }, { status: 400 });
  }
  if (body.final_three && body.final_three.length > 3) {
    return NextResponse.json({ error: "Final 3 can have at most 3 picks" }, { status: 400 });
  }

  // Replace existing finale_predictions for this team + episode
  await db
    .from("finale_predictions")
    .delete()
    .eq("league_id", body.league_id)
    .eq("episode_id", body.episode_id)
    .eq("team_id", team.id);

  const rows: any[] = [];
  const now = new Date().toISOString();
  for (const a of body.fifth_place || []) {
    if (a.points_allocated > 0) {
      rows.push({
        league_id: body.league_id,
        episode_id: body.episode_id,
        team_id: team.id,
        pick_type: "fifth_place",
        player_id: a.player_id,
        points_allocated: a.points_allocated,
        locked_at: now,
      });
    }
  }
  for (const a of body.fourth_place || []) {
    if (a.points_allocated > 0) {
      rows.push({
        league_id: body.league_id,
        episode_id: body.episode_id,
        team_id: team.id,
        pick_type: "fourth_place",
        player_id: a.player_id,
        points_allocated: a.points_allocated,
        locked_at: now,
      });
    }
  }
  for (const pid of body.final_three || []) {
    rows.push({
      league_id: body.league_id,
      episode_id: body.episode_id,
      team_id: team.id,
      pick_type: "final_three",
      player_id: pid,
      points_allocated: 0,
      locked_at: now,
    });
  }
  if (body.winner) {
    rows.push({
      league_id: body.league_id,
      episode_id: body.episode_id,
      team_id: team.id,
      pick_type: "winner",
      player_id: body.winner,
      points_allocated: 0,
      locked_at: now,
    });
  }

  if (rows.length > 0) {
    const { error } = await db.from("finale_predictions").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: rows.length });
}
