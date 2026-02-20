import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// GET — fetch all season predictions for this league
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("season_predictions")
    .select("*")
    .eq("league_id", leagueId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — upsert season predictions for the calling user's team
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find the user's team in this league
  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .single();

  if (!team) return NextResponse.json({ error: "No team found" }, { status: 403 });

  // Check if locked (Episode 1 scored)
  const { data: league } = await supabase
    .from("leagues")
    .select("season_id")
    .eq("id", leagueId)
    .single();

  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 });

  const { data: ep1 } = await supabase
    .from("episodes")
    .select("is_scored")
    .eq("season_id", league.season_id)
    .eq("episode_number", 1)
    .maybeSingle();

  if (ep1?.is_scored) {
    return NextResponse.json({ error: "Season predictions are locked after Episode 1 airs" }, { status: 409 });
  }

  const body = await req.json();
  const { category, answer } = body;

  if (!category) return NextResponse.json({ error: "category is required" }, { status: 400 });

  const { error } = await supabase
    .from("season_predictions")
    .upsert(
      { league_id: leagueId, team_id: team.id, category, answer: answer ?? null },
      { onConflict: "league_id,team_id,category" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// PATCH — commissioner grades a category (sets is_correct + points_earned for all teams)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify commissioner or super admin
  const { data: league } = await supabase
    .from("leagues")
    .select("commissioner_id")
    .eq("id", leagueId)
    .single();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  if (league?.commissioner_id !== user.id && !profile?.is_super_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  // For option-based categories: provide correct_answer to auto-grade
  // For manual categories: provide { teamId, isCorrect, pointsEarned }
  const { category, correct_answer, team_id, is_correct, points_earned } = body;

  if (!category) return NextResponse.json({ error: "category is required" }, { status: 400 });

  const serviceClient = createServiceClient();

  if (correct_answer !== undefined) {
    // Auto-grade: set correct=true for matching answers, false for others
    const [correctRes, incorrectRes] = await Promise.all([
      serviceClient
        .from("season_predictions")
        .update({ is_correct: true, points_earned: 5 })
        .eq("league_id", leagueId)
        .eq("category", category)
        .eq("answer", correct_answer),
      serviceClient
        .from("season_predictions")
        .update({ is_correct: false, points_earned: 0 })
        .eq("league_id", leagueId)
        .eq("category", category)
        .neq("answer", correct_answer),
    ]);

    if (correctRes.error) return NextResponse.json({ error: correctRes.error.message }, { status: 500 });
    if (incorrectRes.error) return NextResponse.json({ error: incorrectRes.error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } else if (team_id !== undefined) {
    // Manual grade for a single team
    const { error } = await serviceClient
      .from("season_predictions")
      .update({ is_correct: is_correct ?? null, points_earned: points_earned ?? 0 })
      .eq("league_id", leagueId)
      .eq("team_id", team_id)
      .eq("category", category);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ error: "Provide correct_answer or team_id" }, { status: 400 });
  }
}
