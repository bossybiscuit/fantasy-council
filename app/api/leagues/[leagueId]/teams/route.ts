import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ leagueId: string }> };

async function getCommissionerOrAdmin(leagueId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized", status: 401, supabase, user: null, league: null };

  const { data: league } = await supabase
    .from("leagues")
    .select("id, commissioner_id, budget, num_teams")
    .eq("id", leagueId)
    .single();

  if (!league) return { error: "League not found", status: 404, supabase, user, league: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  const isAuthorized = league.commissioner_id === user.id || !!profile?.is_super_admin;
  if (!isAuthorized) return { error: "Forbidden", status: 403, supabase, user, league: null };

  return { error: null, status: 200, supabase, user, league };
}

// GET /api/leagues/[leagueId]/teams — list all teams with owner info
export async function GET(_req: NextRequest, { params }: Params) {
  const { leagueId } = await params;
  const { error, status, supabase, league } = await getCommissionerOrAdmin(leagueId);
  if (error || !league) return NextResponse.json({ error }, { status });

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, user_id, draft_order, profiles(display_name, username)")
    .eq("league_id", leagueId)
    .order("created_at");

  return NextResponse.json({ teams: teams || [] });
}

// POST /api/leagues/[leagueId]/teams — create unclaimed team
export async function POST(req: NextRequest, { params }: Params) {
  const { leagueId } = await params;
  const { error, status, supabase, league } = await getCommissionerOrAdmin(leagueId);
  if (error || !league) return NextResponse.json({ error }, { status });

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Team name required" }, { status: 400 });
  }

  const { data: team, error: insertError } = await supabase
    .from("teams")
    .insert({
      league_id: leagueId,
      name: name.trim(),
      budget_remaining: league.budget,
      // user_id intentionally omitted — unclaimed seat
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ team });
}

// PATCH /api/leagues/[leagueId]/teams — rename or assign a team
export async function PATCH(req: NextRequest, { params }: Params) {
  const { leagueId } = await params;
  const { error, status, supabase, league } = await getCommissionerOrAdmin(leagueId);
  if (error || !league) return NextResponse.json({ error }, { status });

  const { teamId, name, userId } = await req.json();
  if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name.trim();
  if (userId !== undefined) updates.user_id = userId;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data: team, error: updateError } = await supabase
    .from("teams")
    .update(updates)
    .eq("id", teamId)
    .eq("league_id", leagueId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ team });
}

// DELETE /api/leagues/[leagueId]/teams — delete an unclaimed team
export async function DELETE(req: NextRequest, { params }: Params) {
  const { leagueId } = await params;
  const { error, status, supabase, league } = await getCommissionerOrAdmin(leagueId);
  if (error || !league) return NextResponse.json({ error }, { status });

  const { teamId } = await req.json();
  if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

  // Only allow deleting unclaimed teams
  const { data: team } = await supabase
    .from("teams")
    .select("id, user_id")
    .eq("id", teamId)
    .eq("league_id", leagueId)
    .single();

  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  if (team.user_id) {
    return NextResponse.json({ error: "Cannot delete a team that has been claimed" }, { status: 409 });
  }

  const { error: deleteError } = await supabase
    .from("teams")
    .delete()
    .eq("id", teamId)
    .eq("league_id", leagueId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
