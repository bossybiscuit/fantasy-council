export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
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

  // Use service client for all league data — super admin may not be a member/commissioner
  const db = createServiceClient();
  const season = league.seasons as any;

  const { data: scoredEpisodes } = await db
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

  const selectedEpId = episodeParam || scoredEpisodes[0]?.id;
  const selectedEpisode =
    scoredEpisodes.find((e) => e.id === selectedEpId) || scoredEpisodes[0];

  // Fetch all episode data in parallel
  const [
    { data: scoringEvents },
    { data: teamScores },
    { data: titlePicks },
    { data: episodePredictions },
  ] = await Promise.all([
    db
      .from("scoring_events")
      .select("*, players(name, tribe, tribe_color), teams(name)")
      .eq("league_id", leagueId)
      .eq("episode_id", selectedEpisode.id)
      .order("points", { ascending: false }),
    db
      .from("episode_team_scores")
      .select("*, teams(name)")
      .eq("league_id", leagueId)
      .eq("episode_id", selectedEpisode.id)
      .order("total_points", { ascending: false }),
    db
      .from("title_picks")
      .select("*, teams(name), players(name)")
      .eq("league_id", leagueId)
      .eq("episode_id", selectedEpisode.id)
      .order("points_earned", { ascending: false }),
    db
      .from("predictions")
      .select("*, teams(name), players(name)")
      .eq("league_id", leagueId)
      .eq("episode_id", selectedEpisode.id)
      .order("points_earned", { ascending: false }),
  ]);

  // Group scoring events by category
  const eventsByCategory = new Map<string, typeof scoringEvents>();
  for (const event of scoringEvents || []) {
    const existing = eventsByCategory.get(event.category) || [];
    existing.push(event);
    eventsByCategory.set(event.category, existing);
  }

  const challengeCategories: ScoringCategory[] = [
    "tribe_reward",
    "individual_reward",
    "tribe_immunity",
    "individual_immunity",
    "second_place_immunity",
    "found_idol",
    "successful_idol_play",
    "episode_title",
  ];
  const milestoneCategories: ScoringCategory[] = ["merge", "final_three", "winner"];

  const votesReceivedEvents = (eventsByCategory.get("votes_received") || []).sort(
    (a, b) => b.points - a.points
  );
  const medevacEvents = eventsByCategory.get("medevac") || [];

  // Voted-out players: derive from voted_out_prediction event player_ids (unique)
  const votedOutPlayerIds = [
    ...new Set(
      (eventsByCategory.get("voted_out_prediction") || []).map((e) => e.player_id)
    ),
  ];
  const votedOutPlayers = votedOutPlayerIds.map((pid) => {
    const ev = (scoringEvents || []).find((e) => e.player_id === pid);
    return {
      id: pid,
      name: (ev?.players as any)?.name || "Unknown",
      tribe: (ev?.players as any)?.tribe || null,
    };
  });

  const hasChallengeEvents = challengeCategories.some((cat) => eventsByCategory.has(cat));
  const hasMilestoneEvents = milestoneCategories.some((cat) => eventsByCategory.has(cat));
  const hasTribalCouncil =
    votesReceivedEvents.length > 0 ||
    votedOutPlayers.length > 0 ||
    medevacEvents.length > 0;

  const titlePickCount = (titlePicks || []).length;
  const correctTitlePickCount = (titlePicks || []).filter((tp) => tp.points_earned > 0).length;
  const predictionCount = (episodePredictions || []).length;
  const correctPredictionCount = (episodePredictions || []).filter(
    (p) => (p.points_earned || 0) > 0
  ).length;

  return (
    <div>
      <PageHeader
        title="Weekly Recap"
        subtitle={`${season.name} — Episode ${selectedEpisode.episode_number}`}
      />

      <RecapEpisodeSelector
        episodes={scoredEpisodes}
        selectedId={selectedEpisode.id}
        leagueId={leagueId}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* ── Left column: what happened on the island ── */}
        <div className="space-y-4">
          {/* Episode header */}
          <div className="card">
            <h2 className="section-title mb-3">
              E{selectedEpisode.episode_number} —{" "}
              {selectedEpisode.title || "Untitled"}
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

          {/* Challenge Results */}
          {hasChallengeEvents && (
            <div className="card">
              <h3 className="section-title mb-3">Challenge Results</h3>
              <div className="space-y-2">
                {challengeCategories.map((cat) => {
                  const events = eventsByCategory.get(cat);
                  if (!events || events.length === 0) return null;
                  return (
                    <div
                      key={cat}
                      className="flex items-start justify-between py-1.5 border-b border-border last:border-0 gap-3"
                    >
                      <span className="text-text-muted text-sm shrink-0">
                        {CATEGORY_LABELS[cat]}
                      </span>
                      <div className="text-right">
                        {events.map((e) => (
                          <div key={e.id} className="text-sm">
                            <span className="text-text-primary">
                              {(e.players as any)?.name}
                            </span>
                            <span className="text-accent-orange ml-2 font-semibold">
                              +{e.points}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tribal Council */}
          {hasTribalCouncil && (
            <div className="card">
              <h3 className="section-title mb-3">Tribal Council</h3>
              <div className="space-y-4">
                {votesReceivedEvents.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-text-muted mb-2">
                      Votes Received
                    </p>
                    <div className="space-y-1">
                      {votesReceivedEvents.map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-text-primary">
                            {(e.players as any)?.name}
                          </span>
                          <span className="text-text-muted">
                            {e.points} vote{e.points !== 1 ? "s" : ""}
                            <span className="text-accent-orange ml-1.5 font-semibold">
                              +{e.points}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {votedOutPlayers.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-text-muted mb-2">Voted Out</p>
                    <div className="space-y-1">
                      {votedOutPlayers.map((p) => (
                        <div key={p.id} className="flex items-center gap-2 text-sm">
                          <span className="text-red-400">🗳️</span>
                          <span className="text-text-primary">{p.name}</span>
                          {p.tribe && (
                            <span className="text-xs text-text-muted">({p.tribe})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {medevacEvents.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-text-muted mb-2">
                      No-Vote Elimination
                    </p>
                    <div className="space-y-1">
                      {medevacEvents.map((e) => (
                        <div key={e.id} className="flex items-center gap-2 text-sm">
                          <span className="text-accent-gold">🏥</span>
                          <span className="text-text-primary">
                            {(e.players as any)?.name}
                          </span>
                          {(e.players as any)?.tribe && (
                            <span className="text-xs text-text-muted">
                              ({(e.players as any)?.tribe})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Milestones */}
          {hasMilestoneEvents && (
            <div className="card">
              <h3 className="section-title mb-3">Milestones</h3>
              <div className="space-y-2">
                {milestoneCategories.map((cat) => {
                  const events = eventsByCategory.get(cat);
                  if (!events || events.length === 0) return null;
                  const isMerge = cat === "merge";
                  return (
                    <div
                      key={cat}
                      className="py-1.5 border-b border-border last:border-0"
                    >
                      <p className="text-text-muted text-sm mb-1">
                        {CATEGORY_LABELS[cat]}
                      </p>
                      {isMerge ? (
                        <p className="text-text-primary text-sm">
                          {events.length} player(s) reached the merge (+
                          {events[0]?.points}pt each)
                        </p>
                      ) : (
                        events.map((e) => (
                          <div
                            key={e.id}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-text-primary">
                              {(e.players as any)?.name}
                            </span>
                            <span className="text-accent-gold font-semibold">
                              +{e.points}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column: predictions + scores ── */}
        <div className="space-y-4">
          {/* Title Picks */}
          {titlePickCount > 0 && (
            <div className="card">
              <h3 className="section-title mb-1">Episode Title Pick</h3>
              <p className="text-xs text-text-muted mb-3">
                {correctTitlePickCount} of {titlePickCount} correct
              </p>
              <div className="space-y-1.5">
                {(titlePicks || []).map((tp) => {
                  const correct = (tp.points_earned || 0) > 0;
                  const pickName = (tp as any).is_host_pick
                    ? "Jeff Probst (Host)"
                    : (tp.players as any)?.name || "—";
                  return (
                    <div
                      key={tp.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <div className="min-w-0">
                        <span className="text-text-primary">
                          {(tp.teams as any)?.name}
                        </span>
                        <span className="text-text-muted ml-2">→ {pickName}</span>
                      </div>
                      <span
                        className={`shrink-0 font-semibold ${
                          correct ? "text-green-400" : "text-text-muted"
                        }`}
                      >
                        {correct ? `+${tp.points_earned}` : "✗"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vote Predictions */}
          {predictionCount > 0 && (
            <div className="card">
              <h3 className="section-title mb-1">Vote Predictions</h3>
              <p className="text-xs text-text-muted mb-3">
                {correctPredictionCount} of {predictionCount} correct
              </p>
              <div className="space-y-1.5">
                {(episodePredictions || [])
                  .filter((p) => (p.points_earned || 0) > 0)
                  .map((pred) => (
                    <div
                      key={pred.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <div className="min-w-0">
                        <span className="text-text-primary">
                          {(pred.teams as any)?.name}
                        </span>
                        <span className="text-text-muted ml-2">
                          → {(pred.players as any)?.name || "Unknown"} ({pred.points_allocated}pt)
                        </span>
                      </div>
                      <span className="shrink-0 font-semibold text-green-400">
                        +{pred.points_earned}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* This Week's Scores */}
          <div className="card">
            <h3 className="section-title mb-4">This Week&apos;s Scores</h3>
            {teamScores && teamScores.length > 0 ? (
              <div className="space-y-2">
                {teamScores.map((score, idx) => (
                  <div
                    key={score.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      idx === 0
                        ? "bg-accent-orange/10 border border-accent-orange/20"
                        : "bg-bg-surface border border-border"
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
                      <span className="font-bold text-text-primary">
                        {score.total_points} pts
                      </span>
                      {(score.challenge_points > 0 ||
                        score.prediction_points > 0 ||
                        score.milestone_points > 0) && (
                        <div className="text-xs text-text-muted mt-0.5 space-x-1">
                          {score.challenge_points > 0 && (
                            <span>{score.challenge_points} challenge</span>
                          )}
                          {score.prediction_points > 0 && (
                            <span>· {score.prediction_points} prediction</span>
                          )}
                          {score.milestone_points > 0 && (
                            <span>· {score.milestone_points} milestone</span>
                          )}
                        </div>
                      )}
                      <div className="text-text-muted text-xs">
                        {score.cumulative_total} total
                      </div>
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
    </div>
  );
}
