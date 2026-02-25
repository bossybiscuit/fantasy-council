import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import PredictionsForm from "./PredictionsForm";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import PastPredictionsAccordion from "./PastPredictionsAccordion";
import { LeagueWideTable } from "./LeagueWideTable";

export const dynamic = "force-dynamic";

export default async function PredictionsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const supabase = await createClient();
  const db = createServiceClient();
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

  // All teams in this league
  const { data: allTeams } = await db
    .from("teams")
    .select("id, name, user_id")
    .eq("league_id", leagueId)
    .order("name");

  // Get upcoming (unscored) episode
  const { data: nextEpisode } = await supabase
    .from("episodes")
    .select("*")
    .eq("season_id", season.id)
    .eq("is_scored", false)
    .order("episode_number")
    .limit(1)
    .single();

  // Get active players (for submission form)
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("season_id", season.id)
    .eq("is_active", true)
    .order("name");

  // Current user's existing predictions & title pick for next episode
  const { data: existingPredictions } = nextEpisode
    ? await supabase
        .from("predictions")
        .select("*")
        .eq("league_id", leagueId)
        .eq("episode_id", nextEpisode.id)
        .eq("team_id", myTeam.id)
    : { data: [] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingTitlePick } = nextEpisode
    ? await (supabase as any)
        .from("title_picks")
        .select("player_id, is_host_pick")
        .eq("league_id", leagueId)
        .eq("episode_id", nextEpisode.id)
        .eq("team_id", myTeam.id)
        .maybeSingle()
    : { data: null };

  // All teams' predictions for the current episode (for States A/B/C)
  const { data: allEpisodePredictions } = nextEpisode
    ? await db
        .from("predictions")
        .select("team_id, player_id, points_allocated, points_earned, locked_at, players(name)")
        .eq("league_id", leagueId)
        .eq("episode_id", nextEpisode.id)
        .not("locked_at", "is", null)
    : { data: [] };

  // All teams' title picks for the current episode
  const { data: allEpisodeTitlePicks } = nextEpisode
    ? await db
        .from("title_picks")
        .select("team_id, player_id, players(name)")
        .eq("league_id", leagueId)
        .eq("episode_id", nextEpisode.id)
    : { data: [] };

  // Past scored episodes
  const { data: pastEpisodes } = await supabase
    .from("episodes")
    .select("id, episode_number, title, is_scored, air_date, prediction_deadline")
    .eq("season_id", season.id)
    .eq("is_scored", true)
    .order("episode_number", { ascending: false });

  const pastEpisodeIds = (pastEpisodes || []).map((e) => e.id);

  // All predictions for past scored episodes
  const { data: pastPredictions } =
    pastEpisodeIds.length > 0
      ? await db
          .from("predictions")
          .select("episode_id, team_id, player_id, points_allocated, points_earned, players(name)")
          .eq("league_id", leagueId)
          .in("episode_id", pastEpisodeIds)
          .not("locked_at", "is", null)
      : { data: [] };

  // All title picks for past scored episodes
  const { data: pastTitlePicks } =
    pastEpisodeIds.length > 0
      ? await db
          .from("title_picks")
          .select("episode_id, team_id, player_id, players(name)")
          .eq("league_id", leagueId)
          .in("episode_id", pastEpisodeIds)
      : { data: [] };

  const isPastDeadline = nextEpisode
    ? (nextEpisode as any).prediction_deadline
      ? new Date() > new Date((nextEpisode as any).prediction_deadline)
      : false
    : false;

  const isScored = (nextEpisode as any)?.is_scored ?? false;

  // Which teams have submitted for the current episode
  const submittedTeamIds = new Set((allEpisodePredictions || []).map((p) => p.team_id));

  // Group current-episode predictions and title picks by team
  const predsByTeam = new Map<string, any[]>();
  for (const team of allTeams || []) predsByTeam.set(team.id, []);
  for (const p of allEpisodePredictions || []) {
    predsByTeam.get(p.team_id)?.push(p);
  }
  const titlePickByTeam = new Map<string, any>();
  for (const tp of allEpisodeTitlePicks || []) {
    titlePickByTeam.set(tp.team_id, tp);
  }

  return (
    <div>
      <PageHeader
        title="Weekly Predictions"
        subtitle="Predict who gets voted out each week"
      />

      {/* Current episode info */}
      {nextEpisode ? (
        <div className="card mb-6 border-accent-orange/20">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-text-muted mb-1">Current Episode</p>
              <p className="font-semibold text-text-primary">
                E{(nextEpisode as any).episode_number} —{" "}
                {(nextEpisode as any).title || "Untitled"}
              </p>
              {(nextEpisode as any).air_date && (
                <p className="text-xs text-text-muted">
                  Airs {formatDate((nextEpisode as any).air_date)}
                </p>
              )}
            </div>
            {(nextEpisode as any).prediction_deadline && (
              <div className="text-right">
                <p className="text-xs text-text-muted">Deadline</p>
                <p
                  className={`text-sm font-medium ${
                    isPastDeadline ? "text-red-400" : "text-accent-orange"
                  }`}
                >
                  {formatDate((nextEpisode as any).prediction_deadline)}
                </p>
                {isPastDeadline && (
                  <p className="text-xs text-red-400">
                    The tribe has spoken — votes locked
                  </p>
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

      {/* ── STATE A: Before deadline — prediction form + submission status ── */}
      {nextEpisode && !isPastDeadline && !isScored && (
        <>
          {players && players.length > 0 && (
            <PredictionsForm
              leagueId={leagueId}
              episodeId={nextEpisode.id}
              teamId={myTeam.id}
              players={players}
              existingPredictions={existingPredictions || []}
              existingTitlePickPlayerId={
                existingTitlePick?.is_host_pick
                  ? "jeff_probst"
                  : (existingTitlePick?.player_id ?? null)
              }
            />
          )}

          {/* Submission status board */}
          <div className="card mt-6">
            <h2 className="section-title mb-4">Who&rsquo;s cast their vote?</h2>
            <div className="divide-y divide-border">
              {(allTeams || []).map((team) => {
                const submitted = submittedTeamIds.has(team.id);
                return (
                  <div
                    key={team.id}
                    className="flex items-center justify-between py-3 px-1"
                  >
                    <span className="text-sm text-text-primary font-medium">
                      {team.name}
                    </span>
                    {submitted ? (
                      <span className="text-xs text-green-400 font-medium flex items-center gap-1.5">
                        ✓ Submitted
                      </span>
                    ) : (
                      <span className="text-xs text-amber-400 flex items-center gap-1.5">
                        ⚠ Not submitted yet
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── STATE B: After deadline, not scored — reveal all picks (no results) ── */}
      {nextEpisode && isPastDeadline && !isScored && (
        <div className="card">
          <h2 className="section-title mb-1">League Predictions</h2>
          <p className="text-xs text-text-muted mb-4">
            Voting is locked — results reveal after Tribal Council.
          </p>
          <LeagueWideTable
            teams={allTeams || []}
            predsByTeam={predsByTeam}
            titlePickByTeam={titlePickByTeam}
            isScored={false}
          />
        </div>
      )}

      {/* ── STATE C: Episode scored — show results ── */}
      {nextEpisode && isScored && (
        <div className="card">
          <h2 className="section-title mb-1">Episode Results</h2>
          <p className="text-xs text-text-muted mb-4">
            The tribe has spoken. See how everyone did.
          </p>
          <LeagueWideTable
            teams={allTeams || []}
            predsByTeam={predsByTeam}
            titlePickByTeam={titlePickByTeam}
            isScored={true}
          />
        </div>
      )}

      {/* ── PAST PREDICTIONS ── */}
      {pastEpisodes && pastEpisodes.length > 0 && (
        <PastPredictionsAccordion
          episodes={pastEpisodes as any[]}
          teams={allTeams || []}
          predictions={pastPredictions as any[] || []}
          titlePicks={pastTitlePicks as any[] || []}
        />
      )}
    </div>
  );
}
