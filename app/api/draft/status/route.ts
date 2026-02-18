import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { league_id, draft_status, status } = body;

  // Verify commissioner
  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("id", league_id)
    .single();

  if (!league || league.commissioner_id !== user.id) {
    // Allow super admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_super_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
  }

  // If starting draft, randomize draft order
  if (draft_status === "active" && league?.draft_status === "pending") {
    const { data: teams } = await supabase
      .from("teams")
      .select("id")
      .eq("league_id", league_id);

    if (teams) {
      const shuffled = [...teams].sort(() => Math.random() - 0.5);
      for (let i = 0; i < shuffled.length; i++) {
        await supabase
          .from("teams")
          .update({ draft_order: i + 1 })
          .eq("id", shuffled[i].id);
      }
    }
  }

  const { error } = await supabase
    .from("leagues")
    .update({
      draft_status: draft_status || league?.draft_status,
      status: status || league?.status,
    })
    .eq("id", league_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
