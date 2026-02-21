import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PredictionsForm from "./PredictionsForm";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";

export default async function PredictionsPage({
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

  const { data: myTeam } = await supabase
    .from("teams")
    .select("*")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .single();

  if (!myTeam) redirect(`/leagues/${leagueId}`);

  const season = league.seasons as any;

  // Get upcoming (unscored) episode
  const { data: nextEpisode } = await supabase
    .from("episodes")
    .select("*")
    .eq("season_id", season.id)
    .eq("is_scored", false)
    .order("episode_number")
    .limit(1)
    .single();

  // Get active players
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("season_id", season.id)
    .eq("is_active", true)
    .order("name");

  // Get existing predictions for next episode
  const { data: existingPredictions } = nextEpisode
    ? await supabase
        .from("predictions")
        .select("*")
        .eq("league_id", leagueId)
        .eq("episode_id", nextEpisode.id)
        .eq("team_id", myTeam.id)
    : { data: [] };

  // Get existing title pick for next episode
  const { data: existingTitlePick } = nextEpisode
    ? await supabase
        .from("title_picks")
        .select("player_id")
        .eq("league_id", leagueId)
        .eq("episode_id", nextEpisode.id)
        .eq("team_id", myTeam.id)
        .maybeSingle()
    : { data: null };

  // Get past predictions (scored)
  const { data: pastPredictions } = await supabase
    .from("predictions")
    .select("*, players(name), episodes(episode_number, title)")
    .eq("league_id", leagueId)
    .eq("team_id", myTeam.id)
    .not("locked_at", "is", null)
    .order("created_at", { ascending: false });

  const isPastDeadline =
    nextEpisode?.prediction_deadline
      ? new Date() > new Date(nextEpisode.prediction_deadline)
      : false;

  return (
    <div>
      <PageHeader
        title="Vote Predictions"
        subtitle="Allocate 10 points across players you think will be voted out"
      />

      {nextEpisode ? (
        <div className="card mb-6 border-accent-orange/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted mb-1">Predicting for</p>
              <p className="font-semibold text-text-primary">
                E{nextEpisode.episode_number} — {nextEpisode.title || "Untitled"}
              </p>
              {nextEpisode.air_date && (
                <p className="text-xs text-text-muted">
                  Airs {formatDate(nextEpisode.air_date)}
                </p>
              )}
            </div>
            {nextEpisode.prediction_deadline && (
              <div className="text-right">
                <p className="text-xs text-text-muted">Deadline</p>
                <p
                  className={`text-sm font-medium ${
                    isPastDeadline ? "text-red-400" : "text-accent-orange"
                  }`}
                >
                  {formatDate(nextEpisode.prediction_deadline)}
                </p>
                {isPastDeadline && (
                  <p className="text-xs text-red-400">The tribe has spoken — votes locked</p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <EmptyState
          icon="🔮"
          title="No upcoming episodes"
          description="The commissioner hasn't added the next episode yet."
        />
      )}

      {nextEpisode && !isPastDeadline && players && players.length > 0 && (
        <PredictionsForm
          leagueId={leagueId}
          episodeId={nextEpisode.id}
          teamId={myTeam.id}
          players={players}
          existingPredictions={existingPredictions || []}
          existingTitlePickPlayerId={existingTitlePick?.player_id ?? null}
        />
      )}

      {/* Past Predictions */}
      {pastPredictions && pastPredictions.length > 0 && (
        <div className="mt-8">
          <h2 className="section-title mb-4">Past Predictions</h2>
          <div className="card">
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
                  {pastPredictions.map((pred) => {
                    const hit = pred.points_earned > 0;
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
                          <span className={hit ? "text-green-400 font-semibold" : "text-text-muted"}>
                            {pred.points_earned}pts
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {pred.points_earned > 0 ? (
                            <span className="text-green-400">🔥 Voted out</span>
                          ) : pred.locked_at ? (
                            <span className="text-red-400">✗ Survived</span>
                          ) : (
                            <span className="text-text-muted">Pending</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
