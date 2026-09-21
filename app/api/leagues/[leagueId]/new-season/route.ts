import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  generateInviteCode,
  calculateRosterSize,
  MAX_DRAFT_LEAGUE_TEAMS,
  MAX_PREDICTIONS_LEAGUE_TEAMS,
} from "@/lib/utils";

type Params = { params: Promise<{ leagueId: string }> };

// POST /api/leagues/[leagueId]/new-season — start the next season of this league.
// Creates a new league for the chosen season, linked back to this one, with the same
// members (and team names) and scoring settings. New people join with the new invite code.
export async function POST(req: NextRequest, { params }: Params) {
  const { leagueId } = await params;

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceClient();

  const { data: oldLeague } = await db.from("leagues").select("*").eq("id", leagueId).single();
  if (!oldLeague) return NextResponse.json({ error: "League not found" }, { status: 404 });

  const { data: profile } = await authClient
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();
  if (oldLeague.commissioner_id !== user.id && !profile?.is_super_admin) {
    return NextResponse.json({ error: "Only the commissioner can start a new season" }, { status: 403 });
  }

  const body = await req.json();
  const season_id: string | undefined = body.season_id;
  const name: string = (body.name || oldLeague.name).trim();
  const format: "draft" | "predictions" = body.format === "draft" ? "draft" : "predictions";

  if (!season_id) return NextResponse.json({ error: "Pick a season" }, { status: 400 });
  if (season_id === oldLeague.season_id) {
    return NextResponse.json({ error: "This league is already playing that season" }, { status: 400 });
  }

  const { data: season } = await db.from("seasons").select("id, name").eq("id", season_id).single();
  if (!season) return NextResponse.json({ error: "Season not found" }, { status: 404 });

  // One continuation per season — don't create duplicates on a double click
  const { data: existing } = await db
    .from("leagues")
    .select("id")
    .eq("parent_league_id", leagueId)
    .eq("season_id", season_id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "This league has already been started for that season", league_id: existing.id },
      { status: 409 }
    );
  }

  // Carry over everyone who actually claimed a seat
  const { data: oldTeams } = await db
    .from("teams")
    .select("name, user_id")
    .eq("league_id", leagueId)
    .not("user_id", "is", null)
    .order("created_at");
  const members = oldTeams || [];

  const maxTeams = format === "predictions" ? MAX_PREDICTIONS_LEAGUE_TEAMS : MAX_DRAFT_LEAGUE_TEAMS;
  const requested = Number.isInteger(body.num_teams) ? body.num_teams : oldLeague.num_teams;
  const num_teams = Math.min(maxTeams, Math.max(requested, members.length, 2));
  if (members.length > maxTeams) {
    return NextResponse.json(
      { error: `This league has ${members.length} members — more than the ${maxTeams}-team limit for this format` },
      { status: 400 }
    );
  }

  let roster_size: number | null = null;
  if (format === "draft") {
    const { count } = await db
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("season_id", season_id)
      .eq("is_active", true);
    roster_size = calculateRosterSize(count || 0, num_teams).rosterSize || null;
  }

  let invite_code = generateInviteCode().toUpperCase();
  for (let i = 0; i < 10; i++) {
    const { data: clash } = await db.from("leagues").select("id").eq("invite_code", invite_code).maybeSingle();
    if (!clash) break;
    invite_code = generateInviteCode().toUpperCase();
  }

  const { data: newLeague, error: leagueError } = await db
    .from("leagues")
    .insert({
      season_id,
      name,
      commissioner_id: oldLeague.commissioner_id,
      draft_type: format === "predictions" ? "snake" : oldLeague.draft_type,
      num_teams,
      budget: oldLeague.budget,
      roster_size,
      invite_code,
      scoring_config: oldLeague.scoring_config || {},
      format,
      parent_league_id: leagueId,
      ...(format === "predictions"
        ? { draft_status: "completed" as const, status: "active" as const }
        : {}),
    })
    .select()
    .single();

  if (leagueError || !newLeague) {
    return NextResponse.json({ error: leagueError?.message || "Failed to create league" }, { status: 500 });
  }

  // Returning members keep their team names; draft leagues also get open seats up to num_teams
  const teamRows: { league_id: string; user_id: string | null; name: string; budget_remaining: number }[] =
    members.map((t) => ({
      league_id: newLeague.id,
      user_id: t.user_id,
      name: t.name,
      budget_remaining: oldLeague.budget,
    }));
  if (format === "draft") {
    for (let i = teamRows.length; i < num_teams; i++) {
      teamRows.push({ league_id: newLeague.id, user_id: null, name: `Team ${i + 1}`, budget_remaining: oldLeague.budget });
    }
  }

  if (teamRows.length > 0) {
    const { error: teamError } = await db.from("teams").insert(teamRows);
    if (teamError) {
      // Don't leave a half-built league behind
      await db.from("leagues").delete().eq("id", newLeague.id);
      return NextResponse.json({ error: `Failed to copy members: ${teamError.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ league: newLeague, members_copied: members.length });
}
