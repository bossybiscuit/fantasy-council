import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
