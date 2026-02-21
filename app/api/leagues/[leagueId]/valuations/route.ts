import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ leagueId: string }> };

// GET /api/leagues/[leagueId]/valuations
// Returns the current user's team's valuations for this league.
export async function GET(_req: NextRequest, { params }: Params) {
  const { leagueId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find the user's team in this league
  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .single();

  if (!team) return NextResponse.json({ error: "No team in this league" }, { status: 404 });

  const { data: valuations } = await supabase
    .from("draft_valuations")
    .select("player_id, my_value, max_bid")
    .eq("league_id", leagueId)
    .eq("team_id", team.id);

  return NextResponse.json({ teamId: team.id, valuations: valuations || [] });
}

// PUT /api/leagues/[leagueId]/valuations
// Upsert a valuation for a single player.
export async function PUT(req: NextRequest, { params }: Params) {
  const { leagueId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { player_id, my_value, max_bid } = body;

  if (!player_id) {
    return NextResponse.json({ error: "player_id required" }, { status: 400 });
  }

  // Find the user's team
  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .single();

  if (!team) return NextResponse.json({ error: "No team in this league" }, { status: 404 });

  const { data: valuation, error } = await supabase
    .from("draft_valuations")
    .upsert(
      {
        league_id: leagueId,
        team_id: team.id,
        player_id,
        my_value: my_value ?? 0,
        max_bid: max_bid ?? null,
      },
      { onConflict: "league_id,team_id,player_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath(`/leagues/${leagueId}/team/${team.id}`);

  return NextResponse.json({ valuation });
}
