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

  // Auto-create all team slots. Commissioner claims slot 1; the rest are unclaimed.
  // Requires migration 005 (user_id nullable) to be applied in Supabase.
  const db = await createServiceClient();
  const teamSlots = Array.from({ length: num_teams }, (_, i) => ({
    league_id: league.id,
    user_id: i === 0 ? user.id : null,
    name: `Team ${i + 1}`,
    budget_remaining: budget || 100,
  }));
  await db.from("teams").insert(teamSlots);

  return NextResponse.json({ league });
}
