import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import SeasonPredictionsForm from "./SeasonPredictionsForm";

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

  const isLocked = ep1?.is_scored === true;

  // Fetch my predictions
  const { data: myPredictions } = await supabase
    .from("season_predictions")
    .select("*")
    .eq("league_id", leagueId)
    .eq("team_id", myTeam.id);

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
      />
    </div>
  );
}
