import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ScoringForm from "./ScoringForm";

export default async function ScoringPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: league } = await supabase
    .from("leagues")
    .select("*, seasons(*)")
    .eq("id", leagueId)
    .single();

  if (!league) redirect("/dashboard");

  // Verify commissioner or super admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  if (league.commissioner_id !== user.id && !profile?.is_super_admin) {
    redirect(`/leagues/${leagueId}`);
  }

  const season = league.seasons as any;

  // Get all players in season (active first)
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("season_id", season.id)
    .order("is_active", { ascending: false })
    .order("name");

  // Get episodes for this season
  const { data: episodes } = await supabase
    .from("episodes")
    .select("*")
    .eq("season_id", season.id)
    .order("episode_number");

  // Fetch existing scoring events for pre-fill (all scored episodes in this league)
  const { data: scoringEvents } = await supabase
    .from("scoring_events")
    .select("episode_id, player_id, category")
    .eq("league_id", leagueId);

  return (
    <ScoringForm
      league={league}
      players={players || []}
      episodes={episodes || []}
      scoringEvents={scoringEvents || []}
    />
  );
}
