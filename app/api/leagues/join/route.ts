import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// GET /api/leagues/join?code=XXXXXX — preview league info before joining
export async function GET(request: NextRequest) {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const code = request.nextUrl.searchParams.get("code")?.trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "Code required" }, { status: 400 });
  }

  // Service client bypasses RLS — league_by_invite_code needs to work for non-members
  const db = createServiceClient();
  const { data: league, error: leagueError } = await db
    .from("leagues")
    .select("*")
    .eq("invite_code", code)
    .single();

  if (leagueError || !league) {
    return NextResponse.json({ error: "Invalid invite code — no tribe found" }, { status: 404 });
  }

  if (league.status === "completed") {
    return NextResponse.json({ error: "This league has ended" }, { status: 400 });
  }

  const { data: season } = await db
    .from("seasons")
    .select("name")
    .eq("id", league.season_id)
    .single();

  const { count: teamCount } = await db
    .from("teams")
    .select("*", { count: "exact", head: true })
    .eq("league_id", league.id);

  // Check if user already has a team in this league
  const { data: existingTeam } = await db
    .from("teams")
    .select("id")
    .eq("league_id", league.id)
    .eq("user_id", user.id)
    .single();

  // Available (unclaimed) team slots
  const { data: availableTeams } = await db
    .from("teams")
    .select("id, name")
    .eq("league_id", league.id)
    .is("user_id", null)
    .order("created_at");

  return NextResponse.json({
    league_id: league.id,
    league_name: league.name,
    season_name: season?.name || null,
    num_teams: league.num_teams,
    team_count: teamCount ?? 0,
    draft_type: league.draft_type,
    already_joined: !!existingTeam,
    already_joined_league_id: existingTeam ? league.id : null,
    available_teams: (availableTeams || []).map((t) => ({ id: t.id, name: t.name })),
  });
}

export async function POST(request: NextRequest) {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { invite_code, team_name, team_id } = body;

  if (!invite_code) {
    return NextResponse.json({ error: "Invite code required" }, { status: 400 });
  }

  // Service client — league lookup must work for non-members
  const db = createServiceClient();
  const { data: league, error: leagueError } = await db
    .from("leagues")
    .select("*")
    .eq("invite_code", invite_code.trim().toUpperCase())
    .single();

  if (leagueError || !league) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  if (league.status === "completed") {
    return NextResponse.json({ error: "This league has ended" }, { status: 400 });
  }

  // Check if user already has a team in this league
  const { data: existingTeam } = await db
    .from("teams")
    .select("id")
    .eq("league_id", league.id)
    .eq("user_id", user.id)
    .single();

  if (existingTeam) {
    return NextResponse.json(
      { error: "You are already in this league", league_id: league.id },
      { status: 409 }
    );
  }

  if (team_id) {
    // Claim an unclaimed seat atomically — WHERE user_id IS NULL ensures
    // we only claim seats that haven't been taken yet (race-condition safe).
    const { data: team, error: claimError } = await db
      .from("teams")
      .update({ user_id: user.id })
      .eq("id", team_id)
      .eq("league_id", league.id)
      .is("user_id", null)
      .select()
      .single();

    if (claimError || !team) {
      return NextResponse.json(
        {
          error: claimError?.message || "Seat was just taken — please select another",
          league_id: league.id,
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ team, league_id: league.id });
  }

  // No team_id — backwards compat: no pre-created teams, user picks their own name.
  // If the league has unclaimed slots, force the user to pick one.
  const { data: unclaimed } = await db
    .from("teams")
    .select("id")
    .eq("league_id", league.id)
    .is("user_id", null)
    .limit(1);

  if ((unclaimed || []).length > 0) {
    return NextResponse.json(
      {
        error: "This league has pre-created teams — please select an open seat",
        league_id: league.id,
      },
      { status: 400 }
    );
  }

  const { count: teamCount } = await db
    .from("teams")
    .select("*", { count: "exact", head: true })
    .eq("league_id", league.id);

  if ((teamCount ?? 0) >= league.num_teams) {
    return NextResponse.json(
      { error: "This league is full", league_id: league.id },
      { status: 400 }
    );
  }

  // Backwards compat: insert a new team (no pre-created slots exist)
  const { data: team, error: insertError } = await db
    .from("teams")
    .insert({
      league_id: league.id,
      user_id: user.id,
      name: team_name?.trim() || "My Team",
      budget_remaining: league.budget,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message, league_id: league.id },
      { status: 500 }
    );
  }

  return NextResponse.json({ team, league_id: league.id });
}
