import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ leagueId: string }> };

// DELETE /api/leagues/[leagueId] — permanently delete a league (commissioner only)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { leagueId } = await params;

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await createServiceClient();

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

  const isAuthorized = league.commissioner_id === user.id || !!profile?.is_super_admin;
  if (!isAuthorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await db.from("leagues").delete().eq("id", leagueId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
