import { createServiceClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import CastawayGrid from "./CastawayGrid";
import { notFound } from "next/navigation";
import { CHALLENGE_CATEGORIES, MILESTONE_CATEGORIES } from "@/lib/scoring";
import type { ScoringCategory } from "@/types/database";

export const dynamic = "force-dynamic";

export type EpisodeStat = {
  episode_id: string;
  episode_number: number;
  title: string | null;
  challenge_pts: number;
  milestone_pts: number;
  title_pts: number;
  bonus_pts: number;
  total_pts: number;
};

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

  const playerIds = (players || []).map((p) => p.id);

  const episodeStatsMap = new Map<string, EpisodeStat[]>();
  const totalPtsMap = new Map<string, number>();
  let latestEpisodeId: string | null = null;

  if (playerIds.length > 0) {
    // Fetch all scoring events with episode info + league tracking
    const { data: events } = await supabase
      .from("scoring_events")
      .select("player_id, points, episode_id, category, league_id, episodes(episode_number, title, is_scored)")
      .in("player_id", playerIds);

    // Latest scored episode
    const { data: latestEp } = await supabase
      .from("episodes")
      .select("id")
      .eq("season_id", seasonId)
      .eq("is_scored", true)
      .order("episode_number", { ascending: false })
      .limit(1)
      .single();

    latestEpisodeId = latestEp?.id ?? null;

    // Per-player → per-episode → accumulate, then average across leagues
    type EpEntry = {
      episode_number: number;
      title: string | null;
      challenge_pts: number;
      milestone_pts: number;
      title_pts: number;
      bonus_pts: number;
      total_pts: number;
      leagueIds: Set<string>;
    };

    const playerEpMap = new Map<string, Map<string, EpEntry>>();

    for (const ev of events || []) {
      const ep = ev.episodes as any;
      if (!ep?.is_scored) continue;

      if (!playerEpMap.has(ev.player_id)) {
        playerEpMap.set(ev.player_id, new Map());
      }
      const epMap = playerEpMap.get(ev.player_id)!;

      if (!epMap.has(ev.episode_id)) {
        epMap.set(ev.episode_id, {
          episode_number: ep.episode_number,
          title: ep.title,
          challenge_pts: 0,
          milestone_pts: 0,
          title_pts: 0,
          bonus_pts: 0,
          total_pts: 0,
          leagueIds: new Set(),
        });
      }

      const entry = epMap.get(ev.episode_id)!;
      entry.leagueIds.add(ev.league_id);

      const cat = ev.category as ScoringCategory;
      // Skip events that reward teams for predictions, not the player themselves
      if (cat === "voted_out_prediction" || cat === "medevac") continue;

      if (CHALLENGE_CATEGORIES.includes(cat) && cat !== "episode_title") {
        entry.challenge_pts += ev.points;
      } else if (cat === "episode_title") {
        entry.title_pts += ev.points;
      } else if (MILESTONE_CATEGORIES.includes(cat)) {
        entry.milestone_pts += ev.points;
      } else {
        entry.bonus_pts += ev.points;
      }
      entry.total_pts += ev.points;
    }

    // Average across leagues and sort most-recent first
    for (const pid of playerIds) {
      const epMap = playerEpMap.get(pid);
      if (!epMap) {
        episodeStatsMap.set(pid, []);
        totalPtsMap.set(pid, 0);
        continue;
      }

      const stats: EpisodeStat[] = [];
      for (const [epId, e] of epMap) {
        const lc = e.leagueIds.size;
        stats.push({
          episode_id: epId,
          episode_number: e.episode_number,
          title: e.title,
          challenge_pts: Math.round(e.challenge_pts / lc),
          milestone_pts: Math.round(e.milestone_pts / lc),
          title_pts: Math.round(e.title_pts / lc),
          bonus_pts: Math.round(e.bonus_pts / lc),
          total_pts: Math.round(e.total_pts / lc),
        });
      }

      stats.sort((a, b) => b.episode_number - a.episode_number);
      episodeStatsMap.set(pid, stats);
      totalPtsMap.set(
        pid,
        stats.reduce((s, r) => s + r.total_pts, 0)
      );
    }
  }

  const enriched = (players || []).map((p) => {
    const stats = episodeStatsMap.get(p.id) || [];
    const thisWeek = latestEpisodeId
      ? (stats.find((s) => s.episode_id === latestEpisodeId)?.total_pts ?? 0)
      : 0;
    return {
      ...p,
      total_pts: totalPtsMap.get(p.id) || 0,
      this_week_pts: thisWeek,
      episode_stats: stats,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <PageHeader
        title={`${season.name} — Cast`}
        subtitle={`${enriched.length} castaways · Season ${season.season_number}`}
      />
      <CastawayGrid players={enriched} seasonId={seasonId} />
    </div>
  );
}
