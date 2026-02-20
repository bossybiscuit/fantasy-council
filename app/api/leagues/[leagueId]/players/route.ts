import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ leagueId: string }> };

// GET /api/leagues/[leagueId]/players
// Returns all players for the league's season, ordered by tier then name.
// Any authenticated league member can call this.
export async function GET(_req: NextRequest, { params }: Params) {
  const { leagueId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get the league to find the season
  const { data: league } = await supabase
    .from("leagues")
    .select("id, season_id")
    .eq("id", leagueId)
    .single();

  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 });

  const { data: players, error } = await supabase
    .from("players")
    .select("id, name, tribe, tier, suggested_value, img_url, is_active")
    .eq("season_id", league.season_id)
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch league-specific value overrides (commissioner can set per-league values)
  const { data: leagueValues } = await supabase
    .from("league_player_values")
    .select("player_id, value")
    .eq("league_id", leagueId);

  const overrideMap = new Map((leagueValues || []).map((v) => [v.player_id, v.value]));

  // Use league override when available, otherwise fall back to global suggested_value
  const merged = (players || []).map((p) => ({
    ...p,
    suggested_value: overrideMap.has(p.id) ? overrideMap.get(p.id)! : (p.suggested_value ?? 0),
  }));

  return NextResponse.json({ players: merged });
}
