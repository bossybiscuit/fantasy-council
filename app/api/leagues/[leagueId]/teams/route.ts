import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ leagueId: string }> };

async function authorize(leagueId: string) {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) return { error: "Unauthorized", status: 401, db: null, user: null, league: null };

  const db = createServiceClient();

  const { data: league } = await db
    .from("leagues")
    .select("id, name, commissioner_id, budget, num_teams, draft_type, draft_status")
    .eq("id", leagueId)
    .single();

  if (!league) return { error: "League not found", status: 404, db: null, user, league: null };

  const { data: profile } = await authClient
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  const isAuthorized = league.commissioner_id === user.id || !!profile?.is_super_admin;
  if (!isAuthorized) return { error: "Forbidden", status: 403, db: null, user, league: null };

  return { error: null, status: 200, db, user, league };
}

// GET /api/leagues/[leagueId]/teams — list all teams with owner info + available users
export async function GET(_req: NextRequest, { params }: Params) {
  const { leagueId } = await params;
  const { error, status, db, league } = await authorize(leagueId);
  if (error || !league || !db) return NextResponse.json({ error }, { status });

  // Fetch teams without profiles() join (join silently fails with service client)
  const { data: teamsData } = await db
    .from("teams")
    .select("id, name, user_id, draft_order")
    .eq("league_id", leagueId)
    .order("created_at");

  // Fetch profiles for claimed seats separately
  const claimedUserIds = (teamsData || [])
    .map((t) => t.user_id)
    .filter(Boolean) as string[];

  const { data: profilesList } = claimedUserIds.length > 0
    ? await db.from("profiles").select("id, display_name, username").in("id", claimedUserIds)
    : { data: [] };

  const profileMap = new Map((profilesList || []).map((p) => [p.id, p]));

  const teams = (teamsData || []).map((t) => ({
    id: t.id,
    name: t.name,
    user_id: t.user_id,
    draft_order: t.draft_order,
    ownerName: t.user_id
      ? (profileMap.get(t.user_id)?.display_name || profileMap.get(t.user_id)?.username || null)
      : null,
  }));

  // Fetch users not already in this league for the assign dropdown
  const { data: availableUsers } = claimedUserIds.length > 0
    ? await db
        .from("profiles")
        .select("id, display_name, username")
        .not("id", "in", `(${claimedUserIds.join(",")})`)
        .order("display_name")
    : await db.from("profiles").select("id, display_name, username").order("display_name");

  return NextResponse.json({ teams, availableUsers: availableUsers || [], league });
}

// POST /api/leagues/[leagueId]/teams — create unclaimed team
export async function POST(req: NextRequest, { params }: Params) {
  const { leagueId } = await params;
  const { error, status, db, league } = await authorize(leagueId);
  if (error || !league || !db) return NextResponse.json({ error }, { status });

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Team name required" }, { status: 400 });
  }

  const { data: team, error: insertError } = await db
    .from("teams")
    .insert({
      league_id: leagueId,
      name: name.trim(),
      budget_remaining: league.budget,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ team });
}

// PATCH /api/leagues/[leagueId]/teams — rename or assign/unassign a team
// Commissioner/super-admin: rename any team, assign or clear user_id.
// Team owner: rename only their own team.
export async function PATCH(req: NextRequest, { params }: Params) {
  const { leagueId } = await params;
  const body = await req.json();
  const { teamId, name, userId } = body;
  if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceClient();

  const { data: league } = await db
    .from("leagues")
    .select("id, commissioner_id")
    .eq("id", leagueId)
    .single();
  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 });

  const { data: profile } = await authClient
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  const isAdmin = league.commissioner_id === user.id || !!profile?.is_super_admin;

  if (!isAdmin) {
    // Team owner path — rename only their own team, no userId changes
    if (userId !== undefined) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { data: ownerCheck } = await db
      .from("teams")
      .select("id")
      .eq("id", teamId)
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .single();
    if (!ownerCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) {
    const trimmedName = name.trim();
    // Check uniqueness within this league (case-insensitive, exclude current team)
    const { data: conflict } = await db
      .from("teams")
      .select("id")
      .eq("league_id", leagueId)
      .ilike("name", trimmedName)
      .neq("id", teamId)
      .maybeSingle();
    if (conflict) {
      return NextResponse.json(
        { error: "Another team in this league already has that name" },
        { status: 409 }
      );
    }
    updates.name = trimmedName;
  }
  // userId can be a string (assign) or null (kick/unassign) — both valid for admins
  if (userId !== undefined && isAdmin) updates.user_id = userId;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data: team, error: updateError } = await db
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

// DELETE /api/leagues/[leagueId]/teams — delete an unclaimed team slot
export async function DELETE(req: NextRequest, { params }: Params) {
  const { leagueId } = await params;
  const { error, status, db, league } = await authorize(leagueId);
  if (error || !league || !db) return NextResponse.json({ error }, { status });

  const { teamId } = await req.json();
  if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

  const { data: team } = await db
    .from("teams")
    .select("id, user_id")
    .eq("id", teamId)
    .eq("league_id", leagueId)
    .single();

  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  if (team.user_id) {
    return NextResponse.json({ error: "Cannot delete a claimed team" }, { status: 409 });
  }

  const { error: deleteError } = await db
    .from("teams")
    .delete()
    .eq("id", teamId)
    .eq("league_id", leagueId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
