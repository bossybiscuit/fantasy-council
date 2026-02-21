import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ leagueId: string; episodeId: string }> };

// PATCH /api/leagues/[leagueId]/episodes/[episodeId]
// Commissioner-only: update prediction_deadline for an episode.
export async function PATCH(req: NextRequest, { params }: Params) {
  const { leagueId, episodeId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: league }, { data: profile }] = await Promise.all([
    supabase.from("leagues").select("commissioner_id").eq("id", leagueId).single(),
    supabase.from("profiles").select("is_super_admin").eq("id", user.id).single(),
  ]);

  if (league?.commissioner_id !== user.id && !profile?.is_super_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { prediction_deadline } = await req.json();

  const db = createServiceClient();
  const { error } = await db
    .from("episodes")
    .update({ prediction_deadline: prediction_deadline ?? null })
    .eq("id", episodeId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
