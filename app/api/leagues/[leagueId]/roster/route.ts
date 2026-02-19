import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ leagueId: string }> };

async function authorizeAdmin(leagueId: string) {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401, db: null, user: null };

  const db = createServiceClient();
  const { data: league } = await db
    .from("leagues")
    .select("id, season_id, commissioner_id, roster_size, draft_type")
    .eq("id", leagueId)
    .single();
  if (!league) return { error: "League not found", status: 404, db: null, user };

  const { data: profile } = await authClient
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  const isAdmin = league.commissioner_id === user.id || !!profile?.is_super_admin;
  if (!isAdmin) return { error: "Forbidden", status: 403, db: null, user };

  return { error: null, status: 200, db, user, league };
}

// GET /api/leagues/[leagueId]/roster
// Commissioner-only. Returns all players for the season, all draft picks, and all teams.
export async function GET(_req: NextRequest, { params }: Params) {
  const { leagueId } = await params;
  const { error, status, db, league } = await authorizeAdmin(leagueId);
  if (error || !db || !league) return NextResponse.json({ error }, { status });

  const [playersResult, picksResult, teamsResult] = await Promise.all([
    db
      .from("players")
      .select("id, name, tribe, tier, suggested_value, img_url")
      .eq("season_id", league.season_id)
      .order("tier", { ascending: true })
      .order("name", { ascending: true }),
    db
      .from("draft_picks")
      .select("id, team_id, player_id, players(id, name, tribe, tier), commissioner_pick")
      .eq("league_id", leagueId),
    db
      .from("teams")
      .select("id, name, user_id, draft_order")
      .eq("league_id", leagueId)
      .order("created_at"),
  ]);

  return NextResponse.json({
    players: playersResult.data || [],
    picks: picksResult.data || [],
    teams: teamsResult.data || [],
    rosterSize: league.roster_size,
  });
}
