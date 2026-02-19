import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LeagueSidebar from "@/components/layout/LeagueSidebar";

export default async function LeagueLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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
    .select("*")
    .eq("id", leagueId)
    .single();

  if (!league) redirect("/dashboard");

  // Verify user is a member or commissioner or super admin
  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .single();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  if (!team && league.commissioner_id !== user.id && !profile?.is_super_admin) {
    redirect("/dashboard");
  }

  const isCommissioner =
    league.commissioner_id === user.id || profile?.is_super_admin === true;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex gap-6">
        <LeagueSidebar league={league} isCommissioner={isCommissioner} teamId={team?.id} />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
