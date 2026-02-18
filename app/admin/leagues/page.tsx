import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function AdminLeaguesPage() {
  const supabase = await createClient();

  const { data: leagues } = await supabase
    .from("leagues")
    .select(`
      *,
      seasons (name),
      teams (id)
    `)
    .order("created_at", { ascending: false });

  const statusColors: Record<string, string> = {
    setup: "text-text-muted",
    drafting: "text-accent-orange",
    active: "text-green-400",
    completed: "text-text-muted",
  };

  return (
    <div>
      <PageHeader
        title="All Leagues"
        subtitle="Platform-wide league overview"
      />

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-text-muted font-medium">League</th>
                <th className="text-left py-3 px-4 text-text-muted font-medium">Season</th>
                <th className="text-center py-3 px-4 text-text-muted font-medium">Teams</th>
                <th className="text-left py-3 px-4 text-text-muted font-medium">Draft</th>
                <th className="text-left py-3 px-4 text-text-muted font-medium">Status</th>
                <th className="text-right py-3 px-4 text-text-muted font-medium">Code</th>
                <th className="text-right py-3 px-4 text-text-muted font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(leagues || []).map((league) => (
                <tr key={league.id} className="border-b border-border table-row-hover">
                  <td className="py-3 px-4">
                    <p className="font-medium text-text-primary">{league.name}</p>
                    <p className="text-xs text-text-muted">{formatDate(league.created_at)}</p>
                  </td>
                  <td className="py-3 px-4 text-text-muted">
                    {(league.seasons as any)?.name || "—"}
                  </td>
                  <td className="py-3 px-4 text-center text-text-primary">
                    {(league.teams as any[])?.length || 0}/{league.num_teams}
                  </td>
                  <td className="py-3 px-4 text-text-muted capitalize">
                    {league.draft_type}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`capitalize font-medium ${statusColors[league.status] || "text-text-muted"}`}>
                      {league.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-accent-gold text-xs">
                    {league.invite_code}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/leagues/${league.id}`}
                      className="text-accent-orange hover:text-orange-400 text-xs"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!leagues?.length && (
            <div className="text-center py-8 text-text-muted">No leagues yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
