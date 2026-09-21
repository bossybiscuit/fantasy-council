export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import StandingsTable from "@/components/ui/StandingsTable";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import LobbyView, { InviteShare } from "./LobbyView";
import Link from "next/link";
import {
  computeTeamStreaks,
  getSurvivorPoolSettings,
  isSurvivorPoolEnabled,
  type PoolPick,
} from "@/lib/survivor-pool";

export default async function LeagueHomePage({
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

  // Use service client for league data reads — the viewing user may be a super admin
  // who is not a member/commissioner of this league, which would cause RLS to silently
  // return empty results for draft_picks, scoring events, and episode_team_scores.
  const db = createServiceClient();

  const { data: myTeam } = await supabase
    .from("teams")
    .select("id")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .single();

  // Fetch teams without the profiles() join — that join errors silently
  // (returns null data) likely due to RLS on profiles during PostgREST join.
  // Instead: get teams, then look up profiles separately and merge.
  const { data: teamsData } = await db
    .from("teams")
    .select("id, name, user_id, budget_remaining")
    .eq("league_id", leagueId)
    .order("created_at");

  const claimedUserIds = (teamsData || [])
    .map((t) => t.user_id)
    .filter(Boolean) as string[];

  const { data: profilesList } = claimedUserIds.length > 0
    ? await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", claimedUserIds)
    : { data: [] };

  const profileMap = new Map((profilesList || []).map((p) => [p.id, p]));

  const teams = (teamsData || []).map((t) => ({
    id: t.id,
    name: t.name,
    user_id: t.user_id,
    budget_remaining: t.budget_remaining,
    profiles: t.user_id ? (profileMap.get(t.user_id) ?? null) : null,
  }));

  const season = league.seasons as any;
  const isCommissioner = league.commissioner_id === user.id;

  // Get commissioner's display name for invite templates
  const { data: commissionerProfile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", league.commissioner_id)
    .single();
  const commissionerName =
    commissionerProfile?.display_name || commissionerProfile?.username || undefined;

  // Newer seasons of this league (started via "Start a New Season")
  const { data: nextSeasons } = await db
    .from("leagues")
    .select("id, name, seasons(name)")
    .eq("parent_league_id", leagueId);
  const continuationBanner =
    nextSeasons && nextSeasons.length > 0 ? (
      <div className="card mb-6 border-accent-orange/30 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-primary">
          🔥 This league has moved on to{" "}
          <strong>{(nextSeasons[0].seasons as any)?.name || "a new season"}</strong>.
        </p>
        <Link href={`/leagues/${nextSeasons[0].id}`} className="btn-primary text-sm">
          Go to {nextSeasons[0].name} →
        </Link>
      </div>
    ) : null;

  // ── Pre-draft lobby ──────────────────────────────────────────────────
  if (league.draft_status === "pending") {
    return (
      <div>
        <PageHeader
          title={league.name}
          subtitle={season?.name}
        />
        <LobbyView
          league={league}
          teams={teams}
          isCommissioner={isCommissioner}
          myTeamId={myTeam?.id}
          commissionerName={commissionerName}
          seasonName={season?.name}
        />
      </div>
    );
  }

  // ── Active / completed: standings view ───────────────────────────────
  const { data: latestEpisodeArr } = await supabase
    .from("episodes")
    .select("*")
    .eq("season_id", season?.id)
    .eq("is_scored", true)
    .order("episode_number", { ascending: false })
    .limit(1);

  const latestEpisode = latestEpisodeArr?.[0] || null;

  const { data: previousEpisodeArr } = latestEpisode
    ? await supabase
        .from("episodes")
        .select("*")
        .eq("season_id", season?.id)
        .eq("is_scored", true)
        .lt("episode_number", latestEpisode.episode_number)
        .order("episode_number", { ascending: false })
        .limit(1)
    : { data: [] };

  const previousEpisode = (previousEpisodeArr as any[])?.[0] || null;

  // Draft picks with player data for roster previews
  const { data: draftPicksRaw } = await db
    .from("draft_picks")
    .select("team_id, player_id, players(id, name, slug, is_active, tribe, tribe_color)")
    .eq("league_id", leagueId);

  // All scoring events to compute per-player point contributions per team
  const { data: scoringEventsRaw } = await db
    .from("scoring_events")
    .select("team_id, player_id, points")
    .eq("league_id", leagueId);

  // Build a team+player → points map
  const playerPointsMap = new Map<string, number>();
  for (const ev of scoringEventsRaw || []) {
    if (!ev.team_id || !ev.player_id) continue;
    const key = `${ev.team_id}:${ev.player_id}`;
    playerPointsMap.set(key, (playerPointsMap.get(key) || 0) + (ev.points || 0));
  }

  let standingsRows: any[] = [];

  if (latestEpisode && teams) {
    const { data: currentScores } = await db
      .from("episode_team_scores")
      .select("*")
      .eq("league_id", leagueId)
      .eq("episode_id", latestEpisode.id);

    const { data: previousScores } = previousEpisode
      ? await db
          .from("episode_team_scores")
          .select("*")
          .eq("league_id", leagueId)
          .eq("episode_id", previousEpisode.id)
      : { data: [] };

    const { data: allPredictions } = await db
      .from("predictions")
      .select("team_id, points_allocated, points_earned")
      .eq("league_id", leagueId);

    // Season prediction totals per team
    const { data: seasonPredRows } = await db
      .from("season_predictions")
      .select("team_id, points_earned")
      .eq("league_id", leagueId);

    const seasonPredMap = new Map<string, number>();
    for (const row of seasonPredRows || []) {
      seasonPredMap.set(row.team_id, (seasonPredMap.get(row.team_id) || 0) + (row.points_earned || 0));
    }

    // Weekly prediction totals per team (vote preds + title picks, all episodes)
    const { data: allEpisodeScores } = await db
      .from("episode_team_scores")
      .select("team_id, prediction_points, survivor_points")
      .eq("league_id", leagueId);

    const weeklyPredPointsMap = new Map<string, number>();
    const survivorPointsMap = new Map<string, number>();
    for (const row of allEpisodeScores || []) {
      weeklyPredPointsMap.set(
        row.team_id,
        (weeklyPredPointsMap.get(row.team_id) || 0) + (row.prediction_points || 0)
      );
      survivorPointsMap.set(
        row.team_id,
        (survivorPointsMap.get(row.team_id) || 0) + Number(row.survivor_points || 0)
      );
    }

    // Survivor Pool streaks (shown next to each team's points)
    const poolEnabled = isSurvivorPoolEnabled(league);
    const streakByTeam = new Map<string, number>();
    if (poolEnabled) {
      const [{ data: seasonEps }, { data: poolPicks }] = await Promise.all([
        db
          .from("episodes")
          .select("id, is_scored")
          .eq("season_id", season?.id)
          .order("episode_number", { ascending: true }),
        db
          .from("survivor_picks")
          .select("episode_id, team_id, player_id, survived")
          .eq("league_id", leagueId),
      ]);
      const epIds = (seasonEps || []).map((e) => e.id);
      const graded = new Set((seasonEps || []).filter((e) => e.is_scored).map((e) => e.id));
      const settings = getSurvivorPoolSettings(league.scoring_config);
      for (const team of teams) {
        const picks = new Map<string, PoolPick>();
        for (const p of poolPicks || []) if (p.team_id === team.id) picks.set(p.episode_id, p);
        streakByTeam.set(team.id, computeTeamStreaks(epIds, graded, picks, settings).currentStreak);
      }
    }

    standingsRows = teams
      .map((team) => {
        const currentScore =
          currentScores?.find((s) => s.team_id === team.id) || null;
        const previousScore =
          (previousScores as any[])?.find((s) => s.team_id === team.id) || null;
        const seasonPredTotal = seasonPredMap.get(team.id) || 0;
        const weeklyPredPoints = weeklyPredPointsMap.get(team.id) || 0;
        const teamPreds = (allPredictions || []).filter(
          (p) => p.team_id === team.id
        );
        const totalAllocated = teamPreds.reduce(
          (sum, p) => sum + (p.points_allocated || 0),
          0
        );
        const totalEarned = teamPreds.reduce(
          (sum, p) => sum + (p.points_earned || 0),
          0
        );
        const predictionAccuracy =
          totalAllocated > 0
            ? Math.round((totalEarned / totalAllocated) * 100)
            : 0;

        // Build roster picks for this team
        const picks = (draftPicksRaw || [])
          .filter((dp) => dp.team_id === team.id)
          .map((dp) => {
            const player = dp.players as any;
            return {
              playerId: dp.player_id,
              playerName: player?.name || "Unknown",
              slug: player?.slug || null,
              isActive: player?.is_active ?? true,
              points: playerPointsMap.get(`${team.id}:${dp.player_id}`) || 0,
              tribe: player?.tribe || null,
              tribeColor: player?.tribe_color || null,
            };
          })
          .sort((a, b) => b.points - a.points);

        return {
          team,
          profile: team.profiles,
          currentScore,
          previousScore,
          predictionAccuracy,
          totalPoints: (currentScore?.cumulative_total || 0) + seasonPredTotal,
          weeklyPredPoints,
          seasonPredTotal,
          survivorPoints: survivorPointsMap.get(team.id) || 0,
          survivorStreak: poolEnabled ? streakByTeam.get(team.id) || 0 : undefined,
          rank: 0, // assigned after sort
          picks,
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((row, idx) => ({ ...row, rank: idx + 1 }));
  }

  return (
    <div>
      <PageHeader
        title={league.name}
        subtitle={season?.name}
        action={
          isCommissioner ? (
            <Link
              href={`/leagues/${league.id}/admin/teams`}
              className="btn-secondary text-sm"
            >
              Manage Teams
            </Link>
          ) : undefined
        }
      />

      {continuationBanner}

      {/* Predictions leagues skip the draft lobby — keep the invite handy until scoring starts */}
      {league.format === "predictions" && !latestEpisode && isCommissioner && (
        <div className="mb-6">
          <InviteShare
            league={league}
            commissionerName={commissionerName}
            seasonName={season?.name}
            isPredictions
          />
        </div>
      )}
      {league.format === "predictions" && (latestEpisode || !isCommissioner) && (
        <div className="card mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider">Invite friends</p>
            <p className="text-sm text-text-muted">
              {teams.length} / {league.num_teams} spots filled · share code{" "}
              <span className="font-mono font-bold text-accent-orange tracking-widest">
                {league.invite_code}
              </span>
            </p>
          </div>
          <Link href={`/leagues/${league.id}/predictions`} className="btn-primary text-sm">
            Make This Week&rsquo;s Picks →
          </Link>
        </div>
      )}

      {/* Standings */}
      <div className="card mb-6">
        <h2 className="section-title mb-4">
          Standings
          {latestEpisode && (
            <span className="text-text-muted font-normal text-sm ml-2">
              through E{latestEpisode.episode_number}
            </span>
          )}
        </h2>
        {standingsRows.length > 0 ? (
          <StandingsTable
            rows={standingsRows}
            leagueId={leagueId}
            myTeamId={myTeam?.id}
            showBudget={league.format !== "predictions" && league.draft_type === "auction"}
            showRosters={league.format !== "predictions"}
          />
        ) : (
          <EmptyState
            icon="🏆"
            title="No scores yet"
            description={
              league.format === "predictions"
                ? "Standings appear once the first episode is scored. Get your weekly picks in!"
                : league.draft_status !== "completed"
                ? "Complete the draft, then the commissioner will score each episode."
                : "Waiting for the commissioner to score the first episode."
            }
          />
        )}
      </div>

      {/* Teams */}
      <div>
        <h2 className="section-title mb-3">Tribes</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams?.map((team) => (
            <Link
              key={team.id}
              href={`/leagues/${leagueId}/team/${team.id}`}
              className="card hover:border-accent-orange/30 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-text-primary">{team.name}</p>
                {team.budget_remaining != null && league.draft_type === "auction" && (
                  <span className="text-xs font-semibold text-accent-gold shrink-0">${team.budget_remaining}</span>
                )}
              </div>
              <p className="text-sm text-text-muted mt-0.5">
                {team.profiles?.display_name ||
                  team.profiles?.username ||
                  "Unknown"}
              </p>
              {team.id === myTeam?.id && (
                <p className="text-xs text-accent-orange mt-1">Your tribe</p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
