import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// GET /api/leagues/join?code=XXXXXX — preview league info before joining
export async function GET(request: NextRequest) {
  // Auth check via regular client
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

  // Use service client for league lookup — leagues RLS only shows your own leagues,
  // so a new user can't find a league by invite code with the auth client
  const db = await createServiceClient();

  const { data: league } = await db
    .from("leagues")
    .select("*, seasons(*)")
    .ilike("invite_code", code)
    .single();

  if (!league) {
    return NextResponse.json({ error: "Invalid invite code — no tribe found" }, { status: 404 });
  }

  if (league.status === "completed") {
    return NextResponse.json({ error: "This league has ended" }, { status: 400 });
  }

  const { count: teamCount } = await db
    .from("teams")
    .select("*", { count: "exact", head: true })
    .eq("league_id", league.id);

  // Check if the user is already in this league
  const { data: existingTeam } = await db
    .from("teams")
    .select("id")
    .eq("league_id", league.id)
    .eq("user_id", user.id)
    .single();

  // Fetch unclaimed pre-created teams
  const { data: availableTeams } = await db
    .from("teams")
    .select("id, name")
    .eq("league_id", league.id)
    .is("user_id", null)
    .order("created_at");

  return NextResponse.json({
    league_id: league.id,
    league_name: league.name,
    season_name: (league.seasons as any)?.name || null,
    num_teams: league.num_teams,
    team_count: teamCount || 0,
    draft_type: league.draft_type,
    already_joined: !!existingTeam,
    already_joined_league_id: existingTeam ? league.id : null,
    available_teams: availableTeams || [],
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

  const db = await createServiceClient();

  // Find league by invite code (service client bypasses RLS)
  const { data: league } = await db
    .from("leagues")
    .select("*")
    .ilike("invite_code", invite_code.trim().toUpperCase())
    .single();

  if (!league) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  if (league.status === "completed") {
    return NextResponse.json({ error: "This league has ended" }, { status: 400 });
  }

  // Check if already in league
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
    // Claim a pre-created unclaimed seat
    const { data: targetTeam } = await db
      .from("teams")
      .select("id, user_id")
      .eq("id", team_id)
      .eq("league_id", league.id)
      .single();

    if (!targetTeam) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    if (targetTeam.user_id) {
      return NextResponse.json({ error: "That seat has already been claimed" }, { status: 409 });
    }

    const { data: team, error } = await db
      .from("teams")
      .update({ user_id: user.id })
      .eq("id", team_id)
      .eq("league_id", league.id)
      .is("user_id", null)
      .select()
      .single();

    if (error || !team) {
      return NextResponse.json(
        { error: error?.message || "Seat was just taken — try another" },
        { status: 409 }
      );
    }

    return NextResponse.json({ team, league_id: league.id });
  }

  // No team_id — backwards compat: create a new team
  const { count: unclaimedCount } = await db
    .from("teams")
    .select("*", { count: "exact", head: true })
    .eq("league_id", league.id)
    .is("user_id", null);

  if ((unclaimedCount || 0) > 0) {
    return NextResponse.json(
      { error: "This league has pre-created teams — please select an open seat" },
      { status: 400 }
    );
  }

  const { count: teamCount } = await db
    .from("teams")
    .select("*", { count: "exact", head: true })
    .eq("league_id", league.id);

  if ((teamCount || 0) >= league.num_teams) {
    return NextResponse.json({ error: "This league is full" }, { status: 400 });
  }

  const { data: team, error } = await db
    .from("teams")
    .insert({
      league_id: league.id,
      user_id: user.id,
      name: team_name?.trim() || "My Team",
      budget_remaining: league.budget,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ team, league_id: league.id });
}
