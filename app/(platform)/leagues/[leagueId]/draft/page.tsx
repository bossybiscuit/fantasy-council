import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DraftRoom from "./DraftRoom";

export default async function DraftPage({
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

  const { data: teams } = await supabase
    .from("teams")
    .select("*, profiles(*)")
    .eq("league_id", leagueId)
    .order("draft_order", { ascending: true, nullsFirst: false });

  const season = league.seasons as any;
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("season_id", season.id)
    .order("name", { ascending: true });

  const { data: draftPicks } = await supabase
    .from("draft_picks")
    .select("*, players(*)")
    .eq("league_id", leagueId)
    .order("pick_number", { ascending: true });

  const isCommissioner = league.commissioner_id === user.id;

  return (
    <DraftRoom
      league={league}
      myTeam={myTeam}
      myUserId={user.id}
      teams={teams || []}
      players={players || []}
      draftPicks={draftPicks || []}
      isCommissioner={isCommissioner}
    />
  );
}
