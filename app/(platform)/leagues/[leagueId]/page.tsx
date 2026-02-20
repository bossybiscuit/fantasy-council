export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StandingsTable from "@/components/ui/StandingsTable";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import LobbyView from "./LobbyView";
import Link from "next/link";

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

  const { data: myTeam } = await supabase
    .from("teams")
    .select("id")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .single();

  // Fetch teams without the profiles() join — that join errors silently
  // (returns null data) likely due to RLS on profiles during PostgREST join.
  // Instead: get teams, then look up profiles separately and merge.
  const { data: teamsData } = await supabase
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
  const { data: draftPicksRaw } = await supabase
    .from("draft_picks")
    .select("team_id, player_id, players(id, name, slug, is_active, tribe, tribe_color)")
    .eq("league_id", leagueId);

  // All scoring events to compute per-player point contributions per team
  const { data: scoringEventsRaw } = await supabase
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
    const { data: currentScores } = await supabase
      .from("episode_team_scores")
      .select("*")
      .eq("league_id", leagueId)
      .eq("episode_id", latestEpisode.id);

    const { data: previousScores } = previousEpisode
      ? await supabase
          .from("episode_team_scores")
          .select("*")
          .eq("league_id", leagueId)
          .eq("episode_id", previousEpisode.id)
      : { data: [] };

    const { data: allPredictions } = await supabase
      .from("predictions")
      .select("team_id, points_allocated, points_earned")
      .eq("league_id", leagueId);

    standingsRows = teams
      .map((team) => {
        const currentScore =
          currentScores?.find((s) => s.team_id === team.id) || null;
        const previousScore =
          (previousScores as any[])?.find((s) => s.team_id === team.id) || null;
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
          totalPoints: currentScore?.cumulative_total || 0,
          rank: currentScore?.rank || 999,
          picks,
        };
      })
      .sort((a, b) => a.rank - b.rank);
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
            showBudget={league.draft_type === "auction"}
          />
        ) : (
          <EmptyState
            icon="🏆"
            title="No scores yet"
            description={
              league.draft_status !== "completed"
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
