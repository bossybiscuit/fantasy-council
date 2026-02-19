import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import { PlayerAvatar } from "@/components/ui/PlayerCard";
import { getTierBadgeClass, calculatePredictionAccuracy } from "@/lib/utils";
import Link from "next/link";
import RenameTeam from "./RenameTeam";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ leagueId: string; teamId: string }>;
}) {
  const { leagueId, teamId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: team } = await supabase
    .from("teams")
    .select("*, profiles(*)")
    .eq("id", teamId)
    .single();

  if (!team) redirect(`/leagues/${leagueId}`);

  const { data: league } = await supabase
    .from("leagues")
    .select("*, seasons(*)")
    .eq("id", leagueId)
    .single();

  if (!league) redirect("/dashboard");

  // Get draft picks with player info
  const { data: picks } = await supabase
    .from("draft_picks")
    .select("*, players(*)")
    .eq("league_id", leagueId)
    .eq("team_id", teamId)
    .order("pick_number");

  // Get all scored episodes for this season
  const season = league.seasons as any;
  const { data: scoredEpisodes } = await supabase
    .from("episodes")
    .select("*")
    .eq("season_id", season.id)
    .eq("is_scored", true)
    .order("episode_number");

  // Get scoring events for each player on this team
  const playerIds = (picks || []).map((p) => p.player_id);

  const { data: scoringEvents } = playerIds.length > 0
    ? await supabase
        .from("scoring_events")
        .select("*")
        .eq("league_id", leagueId)
        .in("player_id", playerIds)
    : { data: [] };

  // Get episode team scores (cumulative)
  const { data: episodeScores } = await supabase
    .from("episode_team_scores")
    .select("*, episodes(episode_number, title)")
    .eq("league_id", leagueId)
    .eq("team_id", teamId)
    .order("episodes(episode_number)");

  // Get predictions
  const { data: predictions } = await supabase
    .from("predictions")
    .select("*")
    .eq("league_id", leagueId)
    .eq("team_id", teamId);

  const totalAllocated = (predictions || []).reduce((sum, p) => sum + p.points_allocated, 0);
  const totalEarned = (predictions || []).reduce((sum, p) => sum + (p.points_earned || 0), 0);
  const predAccuracy = calculatePredictionAccuracy(totalAllocated, totalEarned);

  // Points per player across all episodes
  const playerPoints = new Map<string, number>();
  for (const event of scoringEvents || []) {
    playerPoints.set(event.player_id, (playerPoints.get(event.player_id) || 0) + event.points);
  }

  // Total team points
  const totalPoints = (episodeScores || []).reduce((sum, s) => sum + s.total_points, 0);
  const latestScore = episodeScores?.[episodeScores.length - 1];

  const profile = team.profiles as any;
  const isOwner = (team as any).user_id === user.id;

  return (
    <div>
      <PageHeader
        title={team.name}
        subtitle={`Managed by ${profile?.display_name || profile?.username || "Unknown"}`}
      />

      {/* Team rename — owner only */}
      {isOwner && (
        <RenameTeam leagueId={leagueId} teamId={teamId} currentName={team.name} />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card text-center">
          <p className="text-3xl font-bold text-gradient-fire">{totalPoints}</p>
          <p className="text-text-muted text-xs mt-1">Total Points</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-accent-gold">#{latestScore?.rank || "—"}</p>
          <p className="text-text-muted text-xs mt-1">Current Rank</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-text-primary">{predAccuracy}%</p>
          <p className="text-text-muted text-xs mt-1">Prediction Accuracy</p>
        </div>
      </div>

      {/* Roster */}
      <div className="card mb-6">
        <h2 className="section-title mb-4">Roster</h2>
        {picks && picks.length > 0 ? (
          <div className="space-y-2">
            {(picks as any[]).sort((a, b) => (playerPoints.get(b.player_id) || 0) - (playerPoints.get(a.player_id) || 0)).map((pick) => {
              const player = pick.players as any;
              const pts = playerPoints.get(pick.player_id) || 0;
              return (
                <Link
                  key={pick.id}
                  href={`/leagues/${leagueId}/player/${pick.player_id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-accent-orange/30 hover:bg-bg-surface transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <PlayerAvatar name={player?.name || "?"} size="sm" imgUrl={player?.img_url} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary">
                          {player?.name || "Unknown"}
                        </span>
                        {player?.tier && (
                          <span className={getTierBadgeClass(player.tier)}>
                            {player.tier}
                          </span>
                        )}
                        {!player?.is_active && (
                          <span className="text-xs text-red-400">Voted Out</span>
                        )}
                      </div>
                      {player?.tribe && (
                        <span className="text-xs text-text-muted">{player.tribe}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-accent-orange font-bold">{pts} pts</p>
                    {pick.amount_paid && (
                      <p className="text-xs text-accent-gold">${pick.amount_paid}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-text-muted text-sm">No players drafted yet</p>
        )}
      </div>

      {/* Episode Breakdown */}
      {episodeScores && episodeScores.length > 0 && (
        <div className="card mb-6">
          <h2 className="section-title mb-4">Episode Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-text-muted font-medium">Episode</th>
                  <th className="text-right py-3 px-4 text-text-muted font-medium">Challenge</th>
                  <th className="text-right py-3 px-4 text-text-muted font-medium">Milestones</th>
                  <th className="text-right py-3 px-4 text-text-muted font-medium">Predictions</th>
                  <th className="text-right py-3 px-4 text-text-muted font-medium">Total</th>
                  <th className="text-right py-3 px-4 text-text-muted font-medium">Cumulative</th>
                </tr>
              </thead>
              <tbody>
                {episodeScores.map((score) => {
                  const ep = score.episodes as any;
                  return (
                    <tr key={score.id} className="border-b border-border table-row-hover">
                      <td className="py-3 px-4">
                        <span className="text-text-muted text-xs">E{ep?.episode_number}</span>
                        <span className="text-text-primary ml-2">{ep?.title || "—"}</span>
                      </td>
                      <td className="py-3 px-4 text-right text-text-primary">{score.challenge_points}</td>
                      <td className="py-3 px-4 text-right text-text-primary">{score.milestone_points}</td>
                      <td className="py-3 px-4 text-right text-green-400">{score.prediction_points}</td>
                      <td className="py-3 px-4 text-right font-semibold text-text-primary">{score.total_points}</td>
                      <td className="py-3 px-4 text-right font-bold text-accent-gold">{score.cumulative_total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Player-Episode Scoring Details */}
      {scoredEpisodes && scoredEpisodes.length > 0 && playerIds.length > 0 && (
        <div className="card">
          <h2 className="section-title mb-4">Scoring Events</h2>
          <div className="space-y-4">
            {scoredEpisodes.map((ep) => {
              const epEvents = (scoringEvents || []).filter((e) => e.episode_id === ep.id);
              if (epEvents.length === 0) return null;
              return (
                <div key={ep.id}>
                  <p className="text-xs font-semibold text-text-muted uppercase mb-2">
                    E{ep.episode_number} — {ep.title || "Untitled"}
                  </p>
                  <div className="space-y-1">
                    {epEvents.map((event) => {
                      const player = (picks as any[]).find((p) => p.player_id === event.player_id)?.players;
                      return (
                        <div key={event.id} className="flex items-center justify-between text-sm py-1.5 px-3 rounded bg-bg-surface">
                          <span className="text-text-primary">{player?.name || "?"}</span>
                          <span className="text-text-muted text-xs capitalize">
                            {event.category.replace(/_/g, " ")}
                          </span>
                          <span className="text-accent-orange font-semibold">+{event.points}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
