import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get user's teams + league info
  const { data: teams } = await supabase
    .from("teams")
    .select(`
      *,
      leagues (
        id, name, status, draft_status, draft_type, num_teams,
        seasons (id, name, season_number, status)
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <PageHeader
        title={`Welcome back, ${profile?.display_name || profile?.username || "Survivor"}`}
        subtitle="Your alliances"
        action={
          <div className="flex gap-2 flex-wrap justify-end">
            <Link href="/leagues/join" className="btn-secondary">
              Join an Alliance
            </Link>
            {profile?.is_super_admin && (
              <Link href="/leagues/new" className="btn-primary">
                🔥 Create a League
              </Link>
            )}
          </div>
        }
      />

      {teams && teams.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => {
            const league = team.leagues as any;
            const season = league?.seasons as any;
            return (
              <Link
                key={team.id}
                href={`/leagues/${league.id}`}
                className="card hover:border-accent-orange/30 hover:shadow-ember transition-all block"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-text-primary truncate">
                      {league.name}
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5 truncate">
                      {season?.name}
                    </p>
                  </div>
                  <StatusBadge status={league.status} />
                </div>

                <div className="torch-divider my-3" />

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-text-muted shrink-0">Your Tribe</span>
                    <span className="text-text-primary font-medium truncate text-right">
                      {team.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Draft</span>
                    <span className="text-text-primary capitalize">
                      {league.draft_type} — {league.draft_status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Teams</span>
                    <span className="text-text-primary">
                      {league.num_teams}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="🔥"
          title="You haven't joined a tribe yet"
          description="Ask your commissioner for an invite code to enter the game."
          action={{ label: "Find Your Tribe", href: "/leagues/join" }}
        />
      )}

      {/* Quick Join */}
      <div className="mt-8 card">
        <h3 className="section-title mb-3">Enter a Tribal Code</h3>
        <p className="text-text-muted text-sm mb-4">
          Got an invite code? Enter it below to find your alliance.
        </p>
        <JoinForm />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    setup: "text-text-muted bg-bg-surface border-border",
    drafting: "text-accent-orange bg-accent-orange/10 border-accent-orange/20",
    active: "text-green-400 bg-green-400/10 border-green-400/20",
    completed: "text-text-muted bg-bg-surface border-border",
  };
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${
        colors[status] || colors.setup
      }`}
    >
      {status}
    </span>
  );
}

function JoinForm() {
  return (
    <form action="/leagues/join" method="get" className="flex gap-2">
      <input
        type="text"
        name="code"
        className="input flex-1 min-w-0"
        placeholder="Enter 6-character invite code"
        maxLength={6}
        style={{ textTransform: "uppercase" }}
      />
      <button type="submit" className="btn-secondary shrink-0">
        Join
      </button>
    </form>
  );
}
