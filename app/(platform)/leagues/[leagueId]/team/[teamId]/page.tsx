import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import { PlayerAvatar } from "@/components/ui/PlayerCard";
import { calculatePredictionAccuracy } from "@/lib/utils";
import Link from "next/link";
import RenameTeam from "./RenameTeam";

export const dynamic = "force-dynamic";

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

  // Use service client for all data fetches to bypass RLS
  const db = createServiceClient();

  const { data: team, error: teamError } = await db
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();

  if (!team || teamError) redirect(`/leagues/${leagueId}`);

  // Fetch profile separately — teams.user_id references auth.users, not profiles,
  // so PostgREST can't auto-join them in a single query.
  const { data: profile } = team.user_id
    ? await db.from("profiles").select("*").eq("id", team.user_id).single()
    : { data: null };

  const { data: league } = await db
    .from("leagues")
    .select("*, seasons(*)")
    .eq("id", leagueId)
    .single();

  if (!league) redirect("/dashboard");

  // Get draft picks with player info
  const { data: picks } = await db
    .from("draft_picks")
    .select("*, players(*)")
    .eq("league_id", leagueId)
    .eq("team_id", teamId)
    .order("pick_number");

  // League-level player values set by the commissioner
  const { data: leagueValues } = await db
    .from("league_player_values")
    .select("player_id, value")
    .eq("league_id", leagueId);

  const leagueValueMap: Record<string, number> = {};
  for (const v of leagueValues || []) {
    leagueValueMap[v.player_id] = v.value;
  }

  // Display value: league_player_values.value → players.suggested_value
  const picksWithValues = (picks || []).map((pick) => {
    const player = pick.players as any;
    return {
      ...pick,
      displayValue: leagueValueMap[pick.player_id] ?? player?.suggested_value ?? 0,
    };
  });

  // Get all scored episodes for this season
  const season = league.seasons as any;
  const { data: scoredEpisodes } = await db
    .from("episodes")
    .select("*")
    .eq("season_id", season.id)
    .eq("is_scored", true)
    .order("episode_number");

  // Get scoring events for each player on this team
  const playerIds = picksWithValues.map((p) => p.player_id);

  const { data: scoringEvents } = playerIds.length > 0
    ? await db
        .from("scoring_events")
        .select("*")
        .eq("league_id", leagueId)
        .in("player_id", playerIds)
    : { data: [] };

  // Get episode team scores (cumulative), ordered by episode number
  const { data: episodeScores } = await db
    .from("episode_team_scores")
    .select("*, episodes(episode_number, title)")
    .eq("league_id", leagueId)
    .eq("team_id", teamId)
    .order("episode_number", { foreignTable: "episodes" });

  // Get predictions with player + episode info (including is_scored to gate result display)
  const { data: predictions } = await db
    .from("predictions")
    .select("*, players(name), episodes(episode_number, title, is_scored)")
    .eq("league_id", leagueId)
    .eq("team_id", teamId)
    .not("locked_at", "is", null)
    .order("created_at", { ascending: false });

  const totalAllocated = (predictions || []).reduce((sum, p) => sum + p.points_allocated, 0);
  const totalEarned = (predictions || []).reduce((sum, p) => sum + (p.points_earned || 0), 0);
  const predAccuracy = calculatePredictionAccuracy(totalAllocated, totalEarned);

  const activePlayers = picksWithValues.filter((p) => (p.players as any)?.is_active).length;

  // Points per player across all episodes
  const playerPoints = new Map<string, number>();
  for (const event of scoringEvents || []) {
    playerPoints.set(event.player_id, (playerPoints.get(event.player_id) || 0) + event.points);
  }

  // Total team points
  const totalPoints = (episodeScores || []).reduce((sum, s) => sum + s.total_points, 0);
  const latestScore = episodeScores?.[episodeScores.length - 1];

  // profile fetched separately above
  const isOwner = (team as any).user_id === user.id;

  // Budget based on displayValue (my_value ?? suggested_value) for each pick
  const budgetTotal = (league as any).budget ?? 0;
  const totalSpent = picksWithValues.reduce((sum, pick) => sum + pick.displayValue, 0);
  const budgetRemaining = budgetTotal - totalSpent;

  return (
    <div>
      <PageHeader
        title={team.name}
        subtitle={`Managed by ${profile?.display_name || profile?.username || "Unknown"}`}
      />

      {/* Team Settings — owner only */}
      {isOwner && (
        <div className="card mb-6 border-accent-orange/20">
          <h2 className="section-title mb-3">Team Settings</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-text-muted mb-1.5">Team Name</p>
              <RenameTeam leagueId={leagueId} teamId={teamId} currentName={team.name} />
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className={`grid gap-4 mb-6 ${league.draft_type === "auction" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-4"}`}>
        <div className="card text-center">
          <p className="text-3xl font-bold text-gradient-fire">{totalPoints}</p>
          <p className="text-text-muted text-xs mt-1">Total Points</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-accent-gold">#{latestScore?.rank || "—"}</p>
          <p className="text-text-muted text-xs mt-1">Current Rank</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-text-primary">{activePlayers}</p>
          <p className="text-text-muted text-xs mt-1">Players Remaining</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-text-primary">{predAccuracy}%</p>
          <p className="text-text-muted text-xs mt-1">Pred. Accuracy</p>
        </div>
        {league.draft_type === "auction" && (
          <div className="card col-span-2 sm:col-span-4">
            <div className="flex flex-wrap gap-4 justify-center text-sm">
              <span className="text-text-muted">
                Budget: <strong className="text-text-primary">${budgetTotal} total</strong>
              </span>
              <span className="text-text-muted">·</span>
              <span className="text-text-muted">
                <strong className="text-accent-gold">${totalSpent} spent</strong>
              </span>
              <span className="text-text-muted">·</span>
              <span className={budgetRemaining < 0 ? "text-red-400 font-semibold" : "text-text-muted"}>
                <strong className={budgetRemaining < 0 ? "text-red-400" : "text-green-400"}>${Math.abs(budgetRemaining)}</strong>
                {" "}{budgetRemaining < 0 ? "over" : "remaining"}
              </span>
            </div>
            {budgetRemaining < 0 && (
              <p className="text-xs text-red-400 text-center mt-2">
                ⚠️ Over budget by ${Math.abs(budgetRemaining)}. Adjust your valuations.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Roster */}
      <div className="card mb-6">
        <h2 className="section-title mb-4">Roster</h2>
        {picksWithValues.length > 0 ? (
          <div className="space-y-2">
            {picksWithValues.sort((a, b) => (playerPoints.get(b.player_id) || 0) - (playerPoints.get(a.player_id) || 0)).map((pick) => {
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
                        <span className="text-xs text-accent-gold">${pick.displayValue}</span>
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
      {/* Prediction History */}
      {predictions && predictions.length > 0 && (
        <div className="card mt-6">
          <h2 className="section-title mb-4">Prediction History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-text-muted font-medium">Episode</th>
                  <th className="text-left py-3 px-4 text-text-muted font-medium">Player</th>
                  <th className="text-right py-3 px-4 text-text-muted font-medium">Allocated</th>
                  <th className="text-right py-3 px-4 text-text-muted font-medium">Earned</th>
                  <th className="text-right py-3 px-4 text-text-muted font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((pred) => {
                  const ep = pred.episodes as any;
                  const player = pred.players as any;
                  return (
                    <tr key={pred.id} className="border-b border-border">
                      <td className="py-3 px-4 text-text-muted text-xs">
                        E{ep?.episode_number} {ep?.title}
                      </td>
                      <td className="py-3 px-4 text-text-primary">{player?.name}</td>
                      <td className="py-3 px-4 text-right text-text-muted">
                        {pred.points_allocated}pts
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={ep?.is_scored && pred.points_earned > 0 ? "text-green-400 font-semibold" : "text-text-muted"}>
                          {ep?.is_scored ? `${pred.points_earned}pts` : "—"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!ep?.is_scored ? (
                          <span className="text-accent-gold/60 italic text-xs">Awaiting Tribal Council...</span>
                        ) : pred.points_earned > 0 ? (
                          <span className="text-green-400 text-xs">✓ Right side of the vote</span>
                        ) : (
                          <span className="text-red-400 text-xs">✗ Wrong side of the vote</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
