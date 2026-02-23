import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

async function verifySuperAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_super_admin) return null;
  return user;
}

// GET /api/admin/season-predictions
// Returns all season predictions across all leagues (super admin only).
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const user = await verifySuperAdmin(supabase);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = createServiceClient();

  const { data, error } = await db
    .from("season_predictions")
    .select("id, league_id, team_id, category, answer, is_correct, points_earned");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also fetch team names and league names for display
  const teamIds = [...new Set((data || []).map((r) => r.team_id))];
  const leagueIds = [...new Set((data || []).map((r) => r.league_id))];

  const [{ data: teams }, { data: leagues }] = await Promise.all([
    teamIds.length > 0
      ? db.from("teams").select("id, name").in("id", teamIds)
      : Promise.resolve({ data: [] }),
    leagueIds.length > 0
      ? db.from("leagues").select("id, name").in("id", leagueIds)
      : Promise.resolve({ data: [] }),
  ]);

  const teamMap: Record<string, string> = {};
  for (const t of teams || []) teamMap[t.id] = t.name;
  const leagueMap: Record<string, string> = {};
  for (const l of leagues || []) leagueMap[l.id] = l.name;

  const enriched = (data || []).map((row) => ({
    ...row,
    team_name: teamMap[row.team_id] ?? "Unknown",
    league_name: leagueMap[row.league_id] ?? "Unknown",
  }));

  return NextResponse.json({ predictions: enriched });
}

// POST /api/admin/season-predictions
// { category, correct_answer } — auto-grade all teams across all leagues
// { category, team_id, league_id, is_correct, points_earned } — manual grade one team
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const user = await verifySuperAdmin(supabase);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { category, correct_answer, team_id, league_id, is_correct, points_earned, points } = body;

  if (!category) return NextResponse.json({ error: "category is required" }, { status: 400 });

  const db = createServiceClient();

  if (correct_answer !== undefined) {
    const correctPoints = typeof points === "number" ? points : 5;
    // Platform-wide auto-grade: mark matching answers correct, others incorrect
    const [correctRes, incorrectRes] = await Promise.all([
      db
        .from("season_predictions")
        .update({ is_correct: true, points_earned: correctPoints })
        .eq("category", category)
        .eq("answer", correct_answer),
      db
        .from("season_predictions")
        .update({ is_correct: false, points_earned: 0 })
        .eq("category", category)
        .neq("answer", correct_answer),
    ]);

    if (correctRes.error) return NextResponse.json({ error: correctRes.error.message }, { status: 500 });
    if (incorrectRes.error) return NextResponse.json({ error: incorrectRes.error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } else if (team_id && league_id) {
    // Manual grade for a single team
    const { error } = await db
      .from("season_predictions")
      .update({ is_correct: is_correct ?? null, points_earned: points_earned ?? 0 })
      .eq("category", category)
      .eq("team_id", team_id)
      .eq("league_id", league_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ error: "Provide correct_answer or team_id+league_id" }, { status: 400 });
  }
}
