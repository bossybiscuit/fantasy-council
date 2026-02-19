import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Public redirect to the current active season's cast page
export default async function CastRedirectPage() {
  const supabase = await createServiceClient();

  // Prefer an airing season, fall back to most recent
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("status", "active")
    .order("season_number", { ascending: false })
    .limit(1)
    .single();

  if (season) {
    redirect(`/season/${season.id}/castaways`);
  }

  // Fall back to the most recently created season
  const { data: fallback } = await supabase
    .from("seasons")
    .select("id")
    .order("season_number", { ascending: false })
    .limit(1)
    .single();

  if (fallback) {
    redirect(`/season/${fallback.id}/castaways`);
  }

  redirect("/login");
}
