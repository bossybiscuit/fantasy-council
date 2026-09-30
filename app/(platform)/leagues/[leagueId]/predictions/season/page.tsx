import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import SeasonPredictionsForm from "./SeasonPredictionsForm";
import { SEASON_CATEGORIES } from "@/lib/season-categories";
import { hasSeasonPredictions } from "@/lib/league-format";
import { isSeasonAnswerComplete, isSeasonPredictionsLocked } from "@/lib/season-predictions";

export default async function SeasonPredictionsPage({
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
  // Survivor-pool-only leagues don't run season predictions
  if (!hasSeasonPredictions(league.format)) redirect(`/leagues/${leagueId}`);

  const { data: myTeam } = await supabase
    .from("teams")
    .select("*")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .single();

  if (!myTeam) redirect(`/leagues/${leagueId}`);

  const season = league.seasons as any;

  // Check if locked: Episode 1 scored
  const { data: ep1 } = await supabase
    .from("episodes")
    .select("is_scored")
    .eq("season_id", season.id)
    .eq("episode_number", 1)
    .maybeSingle();

  const isLocked = isSeasonPredictionsLocked(league.scoring_config, ep1?.is_scored === true);

  // Fetch my predictions
  const { data: myPredictions } = await supabase
    .from("season_predictions")
    .select("*")
    .eq("league_id", leagueId)
    .eq("team_id", myTeam.id);

  // Fetch players for winner prediction dropdown
  const { data: players } = await supabase
    .from("players")
    .select("id, name, tribe")
    .eq("season_id", season.id)
    .order("name");

  // Who's got their season predictions in? (service client so RLS doesn't hide teammates)
  const db = createServiceClient();
  const [{ data: allTeams }, { data: allSeasonPreds }] = await Promise.all([
    db.from("teams").select("id, name").eq("league_id", leagueId).order("name"),
    db.from("season_predictions").select("team_id, category, answer").eq("league_id", leagueId),
  ]);

  // Only count questions that are still being asked, and only when fully answered
  const activeKeys = new Set(SEASON_CATEGORIES.map((c) => c.key));
  const answeredByTeam = new Map<string, number>();
  for (const pred of allSeasonPreds || []) {
    if (!activeKeys.has(pred.category)) continue;
    if (!isSeasonAnswerComplete(pred.category, pred.answer)) continue;
    answeredByTeam.set(pred.team_id, (answeredByTeam.get(pred.team_id) || 0) + 1);
  }
  const totalQuestions = SEASON_CATEGORIES.length;

  // Check if commissioner
  const isCommissioner = league.commissioner_id === user.id;

  const totalPointsEarned = (myPredictions || []).reduce(
    (sum, p) => sum + (p.points_earned || 0),
    0
  );
  const gradedCount = (myPredictions || []).filter(
    (p) => p.is_correct !== null
  ).length;

  return (
    <div>
      <PageHeader
        title="Season Predictions"
        subtitle="Lock in your bold predictions before Episode 1 airs"
      />

      {isLocked && gradedCount > 0 && (
        <div className="card mb-6 border-accent-gold/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted mb-1">Season Predictions Score</p>
              <p className="text-2xl font-bold text-accent-gold">{totalPointsEarned} pts</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-muted mb-1">Graded</p>
              <p className="text-lg font-semibold text-text-primary">
                {gradedCount} / {(myPredictions || []).length}
              </p>
            </div>
          </div>
        </div>
      )}

      {!isLocked && (
        <div className="card mb-6 border-accent-orange/20">
          <p className="text-sm text-text-muted">
            <span className="text-accent-orange font-semibold">Predictions lock</span> when Episode 1 is scored.
            Make your picks before the premiere!
          </p>
        </div>
      )}

      <SeasonPredictionsForm
        leagueId={leagueId}
        myPredictions={myPredictions || []}
        isLocked={isLocked}
        isCommissioner={isCommissioner}
        players={(players || []).map((p) => ({ id: p.id, name: p.name, tribe: p.tribe }))}
      />

      {/* Who's submitted */}
      <div className="card mt-6">
        <h2 className="section-title mb-4">Who&rsquo;s locked in their predictions?</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-text-muted font-medium">Team</th>
                <th className="text-center py-2 px-2 text-text-muted font-medium w-28">Answered</th>
                <th className="text-center py-2 px-2 text-text-muted font-medium w-20">Done</th>
              </tr>
            </thead>
            <tbody>
              {(allTeams || []).map((team) => {
                const answered = answeredByTeam.get(team.id) || 0;
                const complete = answered === totalQuestions;
                return (
                  <tr key={team.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 px-2 text-text-primary font-medium">
                      {team.name}
                      {team.id === myTeam.id && (
                        <span className="text-xs text-accent-orange ml-1.5">you</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center tabular-nums text-text-muted">
                      {answered}/{totalQuestions}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {complete ? (
                        <span className="text-green-400" title="All predictions in">✓</span>
                      ) : (
                        <span className="text-text-muted" title="Still to finish">—</span>
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
  );
}
