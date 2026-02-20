import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ leagueId: string; playerId: string }> }
) {
  const { leagueId, playerId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Must be commissioner or super admin
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

  const isCommissioner =
    league?.commissioner_id === user.id || profile?.is_super_admin === true;

  if (!isCommissioner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { suggested_value } = body;

  if (suggested_value == null || isNaN(Number(suggested_value))) {
    return NextResponse.json({ error: "Invalid value" }, { status: 400 });
  }

  // Use service client to update players table (bypasses RLS)
  const service = await createServiceClient();
  const { error } = await service
    .from("players")
    .update({ suggested_value: Number(suggested_value) })
    .eq("id", playerId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
