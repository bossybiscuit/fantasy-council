import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { parseFormat } from "@/lib/league-format";

// PATCH /api/admin/leagues — change a league's format (super admin only).
// Switching format only changes which features show; nothing is deleted.
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_super_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { league_id, format } = await req.json();
  if (!league_id) return NextResponse.json({ error: "league_id required" }, { status: 400 });

  const db = createServiceClient();
  const parsed = parseFormat(format);

  const updates: Record<string, unknown> = { format: parsed };
  // Non-draft leagues have no draft to run, so don't leave them stuck in the lobby
  if (parsed !== "draft") {
    updates.draft_status = "completed";
    updates.status = "active";
  }

  const { data: league, error } = await db
    .from("leagues")
    .update(updates)
    .eq("id", league_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ league });
}
