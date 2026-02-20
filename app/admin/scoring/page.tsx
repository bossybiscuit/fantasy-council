import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import AdminScoringForm from "./AdminScoringForm";

export const dynamic = "force-dynamic";

export default async function AdminScoringPage() {
  const supabase = await createClient();

  // Get all seasons
  const { data: seasons } = await supabase
    .from("seasons")
    .select("*")
    .order("season_number", { ascending: false });

  // Get episodes for all seasons
  const { data: episodes } = await supabase
    .from("episodes")
    .select("*")
    .order("episode_number");

  // Get all players for all seasons
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .order("name");

  // Fetch existing scoring events for pre-fill
  const { data: scoringEvents } = await supabase
    .from("scoring_events")
    .select("episode_id, player_id, category")
    .order("created_at");

  // Fetch all leagues for the season predictions tab
  const { data: leagues } = await supabase
    .from("leagues")
    .select("id, name, season_id")
    .order("name");

  return (
    <Suspense>
      <AdminScoringForm
        seasons={seasons || []}
        episodes={episodes || []}
        players={players || []}
        scoringEvents={scoringEvents || []}
        leagues={leagues || []}
      />
    </Suspense>
  );
}
