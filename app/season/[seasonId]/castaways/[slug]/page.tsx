import { createServiceClient } from "@/lib/supabase/server";
import { PlayerAvatar } from "@/components/ui/PlayerCard";
import { getTierBadgeClass } from "@/lib/utils";
import { CHALLENGE_CATEGORIES, MILESTONE_CATEGORIES } from "@/lib/scoring";
import CumulativeChart from "@/components/ui/CumulativeChart";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function PlacementBadge({ badge }: { badge: string | null }) {
  if (!badge) return null;
  const styles: Record<string, string> = {
    Winner: "bg-accent-gold/20 border-accent-gold/40 text-accent-gold",
    "Runner Up": "bg-zinc-500/20 border-zinc-400/40 text-zinc-300",
    "2nd Runner Up": "bg-amber-900/20 border-amber-700/40 text-amber-500",
    "Fire Elimination": "bg-accent-orange/20 border-accent-orange/40 text-accent-orange",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${styles[badge] || "bg-bg-surface border-border text-text-muted"}`}>
      {badge}
    </span>
  );
}

export default async function CastawayDetailPage({
  params,
}: {
  params: Promise<{ seasonId: string; slug: string }>;
}) {
  const { seasonId, slug } = await params;
  const supabase = await createServiceClient();

  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("season_id", seasonId)
    .eq("slug", slug)
    .single();

  if (!player) notFound();

  // All scored episodes for this season
  const { data: scoredEpisodes } = await supabase
    .from("episodes")
    .select("*")
    .eq("season_id", seasonId)
    .eq("is_scored", true)
    .order("episode_number");

  // All scoring events for this player across all leagues
  const { data: allEvents } = await supabase
    .from("scoring_events")
    .select("*, episodes(episode_number, title)")
    .eq("player_id", player.id)
    .order("created_at");

  // Deduplicate across leagues: for each (episode_id, category), take average points
  // Group by episode_id
  type EpGroup = {
    episode_number: number;
    title: string | null;
    challenge_pts: number;
    milestone_pts: number;
    title_speaker_pts: number;
    total_pts: number;
    league_count: number;
  };

  const epGroups = new Map<string, EpGroup>();
  const leaguesPerEpisode = new Map<string, Set<string>>();

  for (const ev of allEvents || []) {
    const ep = ev.episodes as any;
    if (!epGroups.has(ev.episode_id)) {
      epGroups.set(ev.episode_id, {
        episode_number: ep?.episode_number ?? 0,
        title: ep?.title ?? null,
        challenge_pts: 0,
        milestone_pts: 0,
        title_speaker_pts: 0,
        total_pts: 0,
        league_count: 1,
      });
      leaguesPerEpisode.set(ev.episode_id, new Set());
    }
    leaguesPerEpisode.get(ev.episode_id)!.add(ev.league_id);
    const g = epGroups.get(ev.episode_id)!;
    if (CHALLENGE_CATEGORIES.includes(ev.category as any) && ev.category !== "episode_title") {
      g.challenge_pts += ev.points;
    } else if (ev.category === "episode_title") {
      g.title_speaker_pts += ev.points;
    } else if (MILESTONE_CATEGORIES.includes(ev.category as any)) {
      g.milestone_pts += ev.points;
    }
    g.total_pts += ev.points;
  }

  // Average across leagues per episode
  const epRows = Array.from(epGroups.entries())
    .map(([epId, g]) => {
      const lCount = leaguesPerEpisode.get(epId)?.size || 1;
      return {
        ...g,
        episode_id: epId,
        challenge_pts: Math.round(g.challenge_pts / lCount),
        milestone_pts: Math.round(g.milestone_pts / lCount),
        title_speaker_pts: Math.round(g.title_speaker_pts / lCount),
        total_pts: Math.round(g.total_pts / lCount),
      };
    })
    .sort((a, b) => b.episode_number - a.episode_number); // most recent first

  // Compute cumulative for chart (ascending order)
  const epRowsAsc = [...epRows].sort((a, b) => a.episode_number - b.episode_number);
  let cumulative = 0;
  const chartData = epRowsAsc.map((r) => {
    cumulative += r.total_pts;
    return {
      episode: r.episode_number,
      cumulative,
      label: `E${r.episode_number}`,
    };
  });

  // Stats
  const totalPoints = epRows.reduce((s, r) => s + r.total_pts, 0);
  const thisWeekPts = epRows.length > 0 ? epRows[0].total_pts : 0; // most recent ep
  const episodesPlayed = scoredEpisodes
    ? player.is_active
      ? scoredEpisodes.length
      : scoredEpisodes.filter((ep) => ep.episode_number <= (player.vote_out_episode ?? 0)).length
    : 0;

  // Challenge + immunity wins (raw event counts, de-duped per episode per league)
  const immunityWins = new Set<string>();
  const challengeWins = new Set<string>();
  for (const ev of allEvents || []) {
    if (ev.category === "individual_immunity") immunityWins.add(ev.episode_id);
    if (["tribe_immunity", "tribe_reward", "individual_reward", "individual_immunity"].includes(ev.category)) {
      challengeWins.add(ev.episode_id);
    }
  }

  // Ownership stats
  const { count: totalLeagues } = await supabase
    .from("leagues")
    .select("*", { count: "exact", head: true })
    .eq("season_id", seasonId);

  const { count: ownedCount } = await supabase
    .from("draft_picks")
    .select("*, leagues!inner(season_id)", { count: "exact", head: true })
    .eq("player_id", player.id)
    .eq("leagues.season_id", seasonId);

  const ownershipPct =
    totalLeagues && totalLeagues > 0
      ? Math.round(((ownedCount || 0) / totalLeagues) * 100)
      : 0;

  // Average auction price
  const { data: draftPicks } = await supabase
    .from("draft_picks")
    .select("amount_paid, leagues!inner(season_id)")
    .eq("player_id", player.id)
    .eq("leagues.season_id", seasonId)
    .not("amount_paid", "is", null);

  const paidPicks = (draftPicks || []).filter((d) => (d as any).amount_paid != null);
  const avgPaid =
    paidPicks.length > 0
      ? Math.round(paidPicks.reduce((s, d) => s + ((d as any).amount_paid || 0), 0) / paidPicks.length)
      : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="text-sm text-text-muted mb-6">
        <Link href={`/season/${seasonId}/castaways`} className="hover:text-accent-orange transition-colors">
          ← All Castaways
        </Link>
      </div>

      {/* Hero */}
      <div className="card mb-6">
        <div className="flex items-start gap-6 flex-wrap">
          <PlayerAvatar name={player.name} size="lg" imgUrl={player.img_url} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-text-primary">{player.name}</h1>
              {player.is_active ? (
                <span className="text-sm font-medium text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded">
                  🔥 Still Competing
                </span>
              ) : (
                <span className="text-sm text-text-muted bg-bg-surface border border-border px-2 py-0.5 rounded">
                  🪦 Voted Out{player.vote_out_episode ? ` — Ep ${player.vote_out_episode}` : ""}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {player.tier && (
                <span className={getTierBadgeClass(player.tier)}>Tier {player.tier}</span>
              )}
              {player.tribe && (
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-accent-orange/10 border border-accent-orange/20 text-accent-orange">
                  {player.tribe}
                </span>
              )}
              <PlacementBadge badge={player.placement_badge} />
            </div>

            {player.hometown && (
              <p className="text-sm text-text-muted mb-1">📍 {player.hometown}</p>
            )}

            {player.previous_seasons && player.previous_seasons.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-text-muted">Previous seasons:</span>
                {player.previous_seasons.map((s) => (
                  <span key={s} className="text-xs bg-bg-surface border border-border px-2 py-0.5 rounded text-text-muted">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {player.bio && (
          <p className="text-text-muted text-sm leading-relaxed mt-4 border-t border-border pt-4">
            {player.bio}
          </p>
        )}
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Fantasy Points", value: totalPoints, accent: true },
          { label: "This Week", value: `+${thisWeekPts}` },
          { label: "Episodes Played", value: episodesPlayed },
          { label: "Challenge Wins", value: challengeWins.size },
          { label: "Immunity Wins", value: immunityWins.size },
        ].map(({ label, value, accent }) => (
          <div key={label} className="card text-center py-3">
            <p className={`text-2xl font-bold ${accent ? "text-gradient-fire" : "text-text-primary"}`}>
              {value}
            </p>
            <p className="text-xs text-text-muted mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Cumulative Chart */}
      {chartData.length > 0 && (
        <div className="card mb-6">
          <h2 className="section-title mb-4">Cumulative Fantasy Points</h2>
          <CumulativeChart data={chartData} />
        </div>
      )}

      {/* Week-by-week Table */}
      {epRows.length > 0 && (
        <div className="card mb-6">
          <h2 className="section-title mb-4">Episode Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-text-muted font-medium">Episode</th>
                  <th className="text-right py-2 px-3 text-text-muted font-medium">Challenge</th>
                  <th className="text-right py-2 px-3 text-text-muted font-medium">Milestone</th>
                  <th className="text-right py-2 px-3 text-text-muted font-medium">Title Speaker</th>
                  <th className="text-right py-2 px-3 text-text-muted font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {epRows.map((row) => (
                  <tr key={row.episode_id} className="border-b border-border table-row-hover">
                    <td className="py-2 px-3">
                      <span className="text-text-muted text-xs">E{row.episode_number}</span>
                      {row.title && (
                        <span className="text-text-primary ml-2">{row.title}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right text-text-primary">{row.challenge_pts}</td>
                    <td className="py-2 px-3 text-right text-text-primary">{row.milestone_pts}</td>
                    <td className="py-2 px-3 text-right text-text-primary">{row.title_speaker_pts}</td>
                    <td className="py-2 px-3 text-right font-semibold text-accent-orange">{row.total_pts}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td className="py-2 px-3 font-semibold text-text-primary">Total</td>
                  <td colSpan={3} />
                  <td className="py-2 px-3 text-right font-bold text-gradient-fire">
                    {totalPoints}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Ownership */}
      <div className="card">
        <h2 className="section-title mb-4">Fantasy Ownership</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-text-primary">{ownershipPct}%</p>
            <p className="text-xs text-text-muted mt-1">Owned in leagues</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-accent-gold">
              {player.suggested_value != null ? `$${player.suggested_value}` : "—"}
            </p>
            <p className="text-xs text-text-muted mt-1">Suggested value</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">
              {avgPaid != null ? `$${avgPaid}` : "—"}
            </p>
            <p className="text-xs text-text-muted mt-1">Avg auction paid</p>
          </div>
        </div>
      </div>
    </div>
  );
}
