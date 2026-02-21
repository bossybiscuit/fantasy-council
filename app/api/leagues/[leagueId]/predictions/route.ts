import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ leagueId: string }> };

// GET /api/leagues/[leagueId]/predictions?episode_id=...
// Commissioner-only: returns all team prediction submissions for a given episode.
export async function GET(req: NextRequest, { params }: Params) {
  const { leagueId } = await params;
  const { searchParams } = new URL(req.url);
  const episodeId = searchParams.get("episode_id");

  if (!episodeId) {
    return NextResponse.json({ error: "episode_id required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: league }, { data: profile }] = await Promise.all([
    supabase.from("leagues").select("commissioner_id").eq("id", leagueId).single(),
    supabase.from("profiles").select("is_super_admin").eq("id", user.id).single(),
  ]);

  if (league?.commissioner_id !== user.id && !profile?.is_super_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = createServiceClient();

  const [{ data: teams }, { data: preds }] = await Promise.all([
    db.from("teams").select("id, name").eq("league_id", leagueId).order("created_at"),
    db
      .from("predictions")
      .select("team_id, player_id, points_allocated, players(name)")
      .eq("league_id", leagueId)
      .eq("episode_id", episodeId)
      .not("locked_at", "is", null),
  ]);

  // Group predictions by team_id
  const predsByTeam = new Map<string, typeof preds>((teams || []).map((t) => [t.id, []]));
  for (const p of preds || []) {
    predsByTeam.get(p.team_id)?.push(p);
  }

  const result = (teams || []).map((team) => ({
    team,
    predictions: predsByTeam.get(team.id) || [],
  }));

  return NextResponse.json({ teams: result });
}
