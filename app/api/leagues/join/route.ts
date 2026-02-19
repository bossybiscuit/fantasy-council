import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  // Security-definer RPC bypasses leagues RLS — works without service role key
  const { data: leagueRows } = await authClient.rpc("league_by_invite_code", { p_code: code });
  const league = leagueRows?.[0] as any;

  if (!league) {
    return NextResponse.json({ error: "Invalid invite code — no tribe found" }, { status: 404 });
  }

  if (league.status === "completed") {
    return NextResponse.json({ error: "This league has ended" }, { status: 400 });
  }

  const { data: season } = await authClient
    .from("seasons")
    .select("name")
    .eq("id", league.season_id)
    .single();

  const { data: teamCountResult } = await authClient.rpc("team_count_for_league", {
    p_league_id: league.id,
  });

  // Regular auth works here — if user is in the league, my_league_ids() includes it
  const { data: existingTeam } = await authClient
    .from("teams")
    .select("id")
    .eq("league_id", league.id)
    .eq("user_id", user.id)
    .single();

  // Security-definer RPC: unclaimed teams visible to non-members
  const { data: availableTeams } = await authClient.rpc("unclaimed_teams_for_league", {
    p_league_id: league.id,
  });

  return NextResponse.json({
    league_id: league.id,
    league_name: league.name,
    season_name: season?.name || null,
    num_teams: league.num_teams,
    team_count: Number(teamCountResult || 0),
    draft_type: league.draft_type,
    already_joined: !!existingTeam,
    already_joined_league_id: existingTeam ? league.id : null,
    available_teams: ((availableTeams as any[]) || []).map((t) => ({ id: t.id, name: t.name })),
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

  // Security-definer RPC: bypasses leagues RLS
  const { data: leagueRows } = await authClient.rpc("league_by_invite_code", {
    p_code: invite_code.trim().toUpperCase(),
  });
  const league = leagueRows?.[0] as any;

  if (!league) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  if (league.status === "completed") {
    return NextResponse.json({ error: "This league has ended" }, { status: 400 });
  }

  // Check if already in league (regular auth — if in league, team is visible)
  const { data: existingTeam } = await authClient
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
    // Atomically claim an unclaimed seat — security-definer ensures auth.uid() is used
    const { data: claimedRows, error } = await authClient.rpc("claim_team_seat", {
      p_team_id: team_id,
      p_league_id: league.id,
    });
    const team = (claimedRows as any[])?.[0];
    if (error || !team) {
      return NextResponse.json(
        { error: error?.message || "Seat was just taken — try another" },
        { status: 409 }
      );
    }
    return NextResponse.json({ team, league_id: league.id });
  }

  // No team_id — backwards compat: no pre-created teams, user picks their own name
  const { data: unclaimed } = await authClient.rpc("unclaimed_teams_for_league", {
    p_league_id: league.id,
  });
  if (((unclaimed as any[]) || []).length > 0) {
    return NextResponse.json(
      { error: "This league has pre-created teams — please select an open seat" },
      { status: 400 }
    );
  }

  const { data: teamCountResult } = await authClient.rpc("team_count_for_league", {
    p_league_id: league.id,
  });
  if (Number(teamCountResult || 0) >= league.num_teams) {
    return NextResponse.json({ error: "This league is full" }, { status: 400 });
  }

  // Regular insert works — user_id = auth.uid() satisfies the INSERT RLS policy
  const { data: team, error } = await authClient
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
