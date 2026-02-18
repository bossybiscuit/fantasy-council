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
  const { league_id, team_id, player_id, round, pick_number, amount_paid } = body;

  if (!league_id || !team_id || !player_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify league is in draft status
  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("id", league_id)
    .single();

  if (!league || league.draft_status !== "active") {
    return NextResponse.json({ error: "Draft is not active" }, { status: 400 });
  }

  // Verify team exists
  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", team_id)
    .single();

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const isCommissioner = league.commissioner_id === user.id;
  const isTeamOwner = team.user_id === user.id;

  if (!isCommissioner && !isTeamOwner) {
    return NextResponse.json(
      { error: "Not authorized to pick for this team" },
      { status: 403 }
    );
  }

  // Check player not already drafted in this league
  const { data: existingPick } = await supabase
    .from("draft_picks")
    .select("id")
    .eq("league_id", league_id)
    .eq("player_id", player_id)
    .single();

  if (existingPick) {
    return NextResponse.json({ error: "Player already drafted" }, { status: 409 });
  }

  // Check roster not full
  const { count: rosterCount } = await supabase
    .from("draft_picks")
    .select("*", { count: "exact", head: true })
    .eq("league_id", league_id)
    .eq("team_id", team_id);

  if (league.roster_size && (rosterCount || 0) >= league.roster_size) {
    return NextResponse.json({ error: "Roster is full" }, { status: 400 });
  }

  // For auction: check budget
  if (league.draft_type === "auction" && amount_paid !== undefined) {
    if (amount_paid > (team.budget_remaining || 0)) {
      return NextResponse.json({ error: "Insufficient budget" }, { status: 400 });
    }

    // Update budget
    await supabase
      .from("teams")
      .update({ budget_remaining: (team.budget_remaining || 0) - amount_paid })
      .eq("id", team_id);
  }

  // Insert draft pick
  const { data: pick, error } = await supabase
    .from("draft_picks")
    .insert({
      league_id,
      team_id,
      player_id,
      round: round || null,
      pick_number: pick_number || null,
      amount_paid: amount_paid || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pick });
}
