import { createServiceClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import CastawayGrid from "./CastawayGrid";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CastawaysPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  const supabase = await createServiceClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("*")
    .eq("id", seasonId)
    .single();

  if (!season) notFound();

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("season_id", seasonId)
    .order("name");

  // Get total fantasy points per player across all leagues (service role bypasses RLS)
  const playerIds = (players || []).map((p) => p.id);

  let pointsMap = new Map<string, number>();
  let latestEpPointsMap = new Map<string, number>();

  if (playerIds.length > 0) {
    // Total points per player
    const { data: events } = await supabase
      .from("scoring_events")
      .select("player_id, points, episode_id")
      .in("player_id", playerIds);

    for (const e of events || []) {
      pointsMap.set(e.player_id, (pointsMap.get(e.player_id) || 0) + e.points);
    }

    // Latest scored episode for this season
    const { data: latestEp } = await supabase
      .from("episodes")
      .select("id")
      .eq("season_id", seasonId)
      .eq("is_scored", true)
      .order("episode_number", { ascending: false })
      .limit(1)
      .single();

    if (latestEp) {
      const latestEvents = (events || []).filter((e) => e.episode_id === latestEp.id);
      for (const e of latestEvents) {
        latestEpPointsMap.set(e.player_id, (latestEpPointsMap.get(e.player_id) || 0) + e.points);
      }
    }
  }

  const enriched = (players || []).map((p) => ({
    ...p,
    total_pts: pointsMap.get(p.id) || 0,
    this_week_pts: latestEpPointsMap.get(p.id) || 0,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <PageHeader
        title={`${season.name} — Castaways`}
        subtitle={`${enriched.length} castaways · Season ${season.season_number}`}
      />
      <CastawayGrid players={enriched} seasonId={seasonId} />
    </div>
  );
}
