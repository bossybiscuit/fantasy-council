import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { CATEGORY_LABELS } from "@/lib/scoring";
import type { ScoringCategory } from "@/types/database";
import RecapEpisodeSelector from "./RecapEpisodeSelector";

export default async function RecapPage({
  params,
  searchParams,
}: {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ episode?: string }>;
}) {
  const { leagueId } = await params;
  const { episode: episodeParam } = await searchParams;
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

  const season = league.seasons as any;

  // Get all scored episodes
  const { data: scoredEpisodes } = await supabase
    .from("episodes")
    .select("*")
    .eq("season_id", season.id)
    .eq("is_scored", true)
    .order("episode_number", { ascending: false });

  if (!scoredEpisodes || scoredEpisodes.length === 0) {
    return (
      <div>
        <PageHeader title="Weekly Recap" />
        <EmptyState
          icon="📺"
          title="No scored episodes yet"
          description="Once the commissioner scores an episode, the recap will appear here."
        />
      </div>
    );
  }

  // Select episode from query param or latest
  const selectedEpId =
    episodeParam ||
    scoredEpisodes[0]?.id;

  const selectedEpisode = scoredEpisodes.find((e) => e.id === selectedEpId) || scoredEpisodes[0];

  // Get scoring events for selected episode
  const { data: scoringEvents } = await supabase
    .from("scoring_events")
    .select("*, players(name, tribe), teams(name)")
    .eq("league_id", leagueId)
    .eq("episode_id", selectedEpisode.id)
    .order("points", { ascending: false });

  // Get episode team scores
  const { data: teamScores } = await supabase
    .from("episode_team_scores")
    .select("*, teams(name)")
    .eq("league_id", leagueId)
    .eq("episode_id", selectedEpisode.id)
    .order("total_points", { ascending: false });

  // Get predictions that hit (voted_out_prediction events)
  const correctPredictions = (scoringEvents || []).filter(
    (e) => e.category === "voted_out_prediction" && e.points > 0
  );

  // Group scoring events by category
  const eventsByCategory = new Map<string, typeof scoringEvents>();
  for (const event of scoringEvents || []) {
    const existing = eventsByCategory.get(event.category) || [];
    existing.push(event);
    eventsByCategory.set(event.category, existing);
  }

  const challengeCategories = [
    "tribe_reward", "individual_reward", "tribe_immunity",
    "individual_immunity", "second_place_immunity", "episode_title"
  ];
  const milestoneCategories = ["merge", "final_three", "winner"];

  return (
    <div>
      <PageHeader
        title="Weekly Recap"
        subtitle={`${season.name} — Episode ${selectedEpisode.episode_number}`}
      />

      {/* Episode Selector */}
      <RecapEpisodeSelector
        episodes={scoredEpisodes}
        selectedId={selectedEpisode.id}
        leagueId={leagueId}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Episode Summary */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="section-title mb-3">
              E{selectedEpisode.episode_number} — {selectedEpisode.title || "Untitled"}
            </h2>
            <div className="flex gap-2 flex-wrap">
              {selectedEpisode.is_merge && (
                <span className="text-xs font-bold px-2 py-1 rounded bg-accent-gold/20 text-accent-gold border border-accent-gold/30">
                  MERGE
                </span>
              )}
              {selectedEpisode.is_finale && (
                <span className="text-xs font-bold px-2 py-1 rounded bg-accent-orange/20 text-accent-orange border border-accent-orange/30">
                  FINALE
                </span>
              )}
            </div>
          </div>

          {/* Challenges */}
          {challengeCategories.some((cat) => eventsByCategory.has(cat)) && (
            <div className="card">
              <h3 className="section-title mb-3">Challenge Results</h3>
              <div className="space-y-2">
                {challengeCategories.map((cat) => {
                  const events = eventsByCategory.get(cat);
                  if (!events || events.length === 0) return null;
                  return (
                    <div key={cat} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                      <span className="text-text-muted text-sm capitalize">
                        {CATEGORY_LABELS[cat as ScoringCategory] || cat}
                      </span>
                      <div className="text-right">
                        {events.map((e) => (
                          <div key={e.id} className="text-sm">
                            <span className="text-text-primary">{(e.players as any)?.name}</span>
                            <span className="text-accent-orange ml-2 font-semibold">+{e.points}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Milestones */}
          {milestoneCategories.some((cat) => eventsByCategory.has(cat)) && (
            <div className="card">
              <h3 className="section-title mb-3">Milestones</h3>
              <div className="space-y-2">
                {milestoneCategories.map((cat) => {
                  const events = eventsByCategory.get(cat);
                  if (!events || events.length === 0) return null;
                  const label = CATEGORY_LABELS[cat as ScoringCategory];
                  const isMerge = cat === "merge";
                  return (
                    <div key={cat} className="py-1.5 border-b border-border last:border-0">
                      <p className="text-text-muted text-sm mb-1">{label}</p>
                      {isMerge ? (
                        <p className="text-text-primary text-sm">
                          {events.length} player(s) reached the merge (+{events[0]?.points}pt each)
                        </p>
                      ) : (
                        events.map((e) => (
                          <div key={e.id} className="flex justify-between text-sm">
                            <span className="text-text-primary">{(e.players as any)?.name}</span>
                            <span className="text-accent-gold font-semibold">+{e.points}</span>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Correct Predictions */}
          {correctPredictions.length > 0 && (
            <div className="card border-green-700/20">
              <h3 className="section-title mb-3 text-green-400">Correct Predictions</h3>
              <div className="space-y-2">
                {correctPredictions.map((event) => (
                  <div key={event.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-text-primary text-sm">{(event.teams as any)?.name}</p>
                      <p className="text-text-muted text-xs">
                        predicted {(event.players as any)?.name} — correct!
                      </p>
                    </div>
                    <span className="text-green-400 font-semibold">+{event.points}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Team Scores This Episode */}
        <div className="card">
          <h3 className="section-title mb-4">This Week&apos;s Scores</h3>
          {teamScores && teamScores.length > 0 ? (
            <div className="space-y-2">
              {teamScores.map((score, idx) => (
                <div
                  key={score.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    idx === 0 ? "bg-accent-orange/10 border border-accent-orange/20" : "bg-bg-surface border border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-bold w-6 ${
                        idx === 0 ? "text-accent-gold" : "text-text-muted"
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <span className="text-text-primary font-medium">
                      {(score.teams as any)?.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-text-primary">{score.total_points} pts</span>
                    <span className="text-text-muted text-xs ml-2">
                      ({score.cumulative_total} total)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-sm">No score data available</p>
          )}
        </div>
      </div>
    </div>
  );
}
