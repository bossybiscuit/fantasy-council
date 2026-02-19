import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/leagues/join?code=XXXXXX — preview league info before joining
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const code = request.nextUrl.searchParams.get("code")?.toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "Code required" }, { status: 400 });
  }

  const { data: league } = await supabase
    .from("leagues")
    .select("*, seasons(*)")
    .eq("invite_code", code)
    .single();

  if (!league) {
    return NextResponse.json({ error: "Invalid invite code — no tribe found" }, { status: 404 });
  }

  if (league.status === "completed") {
    return NextResponse.json({ error: "This league has ended" }, { status: 400 });
  }

  const { count: teamCount } = await supabase
    .from("teams")
    .select("*", { count: "exact", head: true })
    .eq("league_id", league.id);

  // Check if the user is already in this league
  const { data: existingTeam } = await supabase
    .from("teams")
    .select("id")
    .eq("league_id", league.id)
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({
    league_id: league.id,
    league_name: league.name,
    season_name: (league.seasons as any)?.name || null,
    num_teams: league.num_teams,
    team_count: teamCount || 0,
    draft_type: league.draft_type,
    already_joined: !!existingTeam,
    already_joined_league_id: existingTeam ? league.id : null,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { invite_code, team_name } = body;

  if (!invite_code) {
    return NextResponse.json({ error: "Invite code required" }, { status: 400 });
  }

  // Find league by invite code
  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("invite_code", invite_code.toUpperCase())
    .single();

  if (!league) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  if (league.status === "completed") {
    return NextResponse.json({ error: "This league has ended" }, { status: 400 });
  }

  // Check if already in league
  const { data: existingTeam } = await supabase
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

  // Check if league is full
  const { count: teamCount } = await supabase
    .from("teams")
    .select("*", { count: "exact", head: true })
    .eq("league_id", league.id);

  if ((teamCount || 0) >= league.num_teams) {
    return NextResponse.json({ error: "This league is full" }, { status: 400 });
  }

  // Create team
  const { data: team, error } = await supabase
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
