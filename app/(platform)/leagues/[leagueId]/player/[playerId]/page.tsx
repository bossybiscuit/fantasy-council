import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import { PlayerAvatar } from "@/components/ui/PlayerCard";
import { CATEGORY_LABELS } from "@/lib/scoring";
import type { ScoringCategory } from "@/types/database";

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ leagueId: string; playerId: string }>;
}) {
  const { leagueId, playerId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .single();

  if (!player) redirect(`/leagues/${leagueId}`);

  const { data: league } = await supabase
    .from("leagues")
    .select("*, seasons(*)")
    .eq("id", leagueId)
    .single();

  if (!league) redirect("/dashboard");

  // Who owns this player in this league?
  const { data: draftPick } = await supabase
    .from("draft_picks")
    .select("*, teams(id, name, user_id, profiles(username, display_name))")
    .eq("league_id", leagueId)
    .eq("player_id", playerId)
    .single();

  // Scoring events for this player in this league
  const { data: scoringEvents } = await supabase
    .from("scoring_events")
    .select("*, episodes(episode_number, title)")
    .eq("league_id", leagueId)
    .eq("player_id", playerId)
    .order("created_at");

  const totalPoints = (scoringEvents || []).reduce((sum, e) => sum + e.points, 0);

  // Points breakdown by category
  const categoryTotals = new Map<string, number>();
  for (const event of scoringEvents || []) {
    categoryTotals.set(event.category, (categoryTotals.get(event.category) || 0) + event.points);
  }

  // Scored episodes
  const season = league.seasons as any;
  const { data: allScoredEpisodes } = await supabase
    .from("episodes")
    .select("*")
    .eq("season_id", season.id)
    .eq("is_scored", true)
    .order("episode_number");

  // Ownership % across all leagues in season
  const { count: totalLeagues } = await supabase
    .from("leagues")
    .select("*", { count: "exact", head: true })
    .eq("season_id", season.id);

  const { count: ownedInLeagues } = await supabase
    .from("draft_picks")
    .select("*, leagues!inner(season_id)", { count: "exact", head: true })
    .eq("player_id", playerId)
    .eq("leagues.season_id", season.id);

  const ownershipPct =
    totalLeagues && totalLeagues > 0
      ? Math.round(((ownedInLeagues || 0) / totalLeagues) * 100)
      : 0;

  const ownerTeam = draftPick?.teams as any;
  const ownerProfile = ownerTeam?.profiles as any;

  return (
    <div>
      <PageHeader
        title={player.name}
        subtitle={`${player.tribe ? `${player.tribe} Tribe` : ""} ${!player.is_active ? "• Voted Out" : "• Active"}`}
      />

      {/* Player Card */}
      <div className="card mb-6">
        <div className="flex items-start gap-4">
          <PlayerAvatar name={player.name} size="lg" imgUrl={player.img_url} />
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-3">
              {!player.is_active && (
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-red-900/20 border border-red-700/30 text-red-400">
                  Voted Out
                </span>
              )}
            </div>
            {player.bio && (
              <p className="text-text-muted text-sm">{player.bio}</p>
            )}
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-xs text-text-muted">Fantasy Points</p>
                <p className="text-xl font-bold text-accent-orange">{totalPoints}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Suggested Value</p>
                <p className="text-xl font-bold text-accent-gold">${player.suggested_value}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Ownership</p>
                <p className="text-xl font-bold text-text-primary">{ownershipPct}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Owner */}
      {ownerTeam ? (
        <div className="card mb-6">
          <h2 className="section-title mb-2">Owned By</h2>
          <p className="text-text-primary font-medium">{ownerTeam.name}</p>
          <p className="text-text-muted text-sm">
            {ownerProfile?.display_name || ownerProfile?.username || "Unknown"}
          </p>
          {draftPick?.amount_paid && (
            <p className="text-accent-gold text-sm mt-1">Drafted for ${draftPick.amount_paid}</p>
          )}
        </div>
      ) : (
        <div className="card mb-6 border-text-muted/20">
          <p className="text-text-muted text-sm">Not drafted in this league</p>
        </div>
      )}

      {/* Points Breakdown */}
      {categoryTotals.size > 0 && (
        <div className="card mb-6">
          <h2 className="section-title mb-4">Points by Category</h2>
          <div className="space-y-2">
            {[...categoryTotals.entries()].sort((a, b) => b[1] - a[1]).map(([cat, pts]) => (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-text-muted text-sm capitalize">
                  {CATEGORY_LABELS[cat as ScoringCategory] || cat.replace(/_/g, " ")}
                </span>
                <span className="text-accent-orange font-semibold">{pts} pts</span>
              </div>
            ))}
            <div className="torch-divider my-2" />
            <div className="flex items-center justify-between">
              <span className="font-semibold text-text-primary">Total</span>
              <span className="text-xl font-bold text-gradient-fire">{totalPoints} pts</span>
            </div>
          </div>
        </div>
      )}

      {/* Episode by Episode */}
      {allScoredEpisodes && allScoredEpisodes.length > 0 && (
        <div className="card">
          <h2 className="section-title mb-4">Episode History</h2>
          <div className="space-y-3">
            {allScoredEpisodes.map((ep) => {
              const epEvents = (scoringEvents || []).filter((e) => e.episode_id === ep.id);
              const epPts = epEvents.reduce((sum, e) => sum + e.points, 0);

              return (
                <div key={ep.id} className={`p-3 rounded-lg border ${epPts > 0 ? "border-accent-orange/20 bg-accent-orange/5" : "border-border bg-bg-surface"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-text-primary">
                      E{ep.episode_number} — {ep.title || "Untitled"}
                    </span>
                    <span className={`text-sm font-bold ${epPts > 0 ? "text-accent-orange" : "text-text-muted"}`}>
                      {epPts > 0 ? `+${epPts} pts` : "0 pts"}
                    </span>
                  </div>
                  {epEvents.map((event) => (
                    <div key={event.id} className="text-xs text-text-muted flex justify-between">
                      <span className="capitalize">{event.category.replace(/_/g, " ")}</span>
                      <span className="text-accent-orange">+{event.points}</span>
                    </div>
                  ))}
                  {epEvents.length === 0 && (
                    <p className="text-xs text-text-muted italic">No points this episode</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
