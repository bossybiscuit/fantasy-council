import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateInviteCode, calculateRosterSize } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only super admins can create leagues
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_super_admin) {
    return NextResponse.json(
      { error: "Only admins can create leagues" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { season_id, name, draft_type, num_teams, budget, scoring_config } = body;

  if (!season_id || !name || !draft_type || !num_teams) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Count active players in season to calculate roster size
  const { count } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true })
    .eq("season_id", season_id)
    .eq("is_active", true);

  const { rosterSize } = calculateRosterSize(count || 0, num_teams);

  // Generate unique invite code
  let invite_code = generateInviteCode().trim().toUpperCase();
  let attempts = 0;
  while (attempts < 10) {
    const { data: existing } = await supabase
      .from("leagues")
      .select("id")
      .eq("invite_code", invite_code)
      .single();
    if (!existing) break;
    invite_code = generateInviteCode().trim().toUpperCase();
    attempts++;
  }

  const { data: league, error } = await supabase
    .from("leagues")
    .insert({
      season_id,
      name: name.trim(),
      commissioner_id: user.id,
      draft_type,
      num_teams,
      budget: budget || 100,
      roster_size: rosterSize || null,
      invite_code,
      scoring_config: scoring_config || {},
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create all team slots via service client (bypasses RLS for both user_id values).
  // Slot 1 belongs to the commissioner; the rest are unclaimed (user_id = null).
  const db = createServiceClient();
  const teamSlots = Array.from({ length: num_teams }, (_, i) => ({
    league_id: league.id,
    user_id: i === 0 ? user.id : null,
    name: `Team ${i + 1}`,
    budget_remaining: budget || 100,
  }));
  const { error: teamError } = await db.from("teams").insert(teamSlots);
  if (teamError) {
    // League was created — return it even if team slots failed so user can retry
    console.error("Failed to create team slots:", teamError.message);
  }

  return NextResponse.json({ league });
}
