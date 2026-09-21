import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import { buildAllTime, getLeagueHistory } from "@/lib/league-history";

export const dynamic = "force-dynamic";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function LeagueHistoryPage({
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

  // Service client: past seasons are separate leagues the viewer may not be a member of.
  // Access to this page is already gated by the league layout.
  const db = createServiceClient();
  const history = await getLeagueHistory(db, leagueId);
  const allTime = buildAllTime(history);
  const completedCount = history.filter((s) => s.seasonStatus === "completed").length;

  return (
    <div>
      <PageHeader
        title="League History"
        subtitle={`${history.length} season${history.length !== 1 ? "s" : ""} of torches lit and snuffed`}
      />

      {/* ── All-time leaderboard ── */}
      <div className="card mb-6">
        <h2 className="section-title mb-1">All-Time Leaderboard</h2>
        <p className="text-xs text-text-muted mb-4">
          Titles and podiums count once a season is finished.
          {completedCount === 0 && " No seasons have finished yet."}
        </p>
        {allTime.length === 0 ? (
          <p className="text-sm text-text-muted">No members yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-text-muted font-medium">Player</th>
                  <th className="text-right py-2 px-2 text-text-muted font-medium">Titles</th>
                  <th className="text-right py-2 px-2 text-text-muted font-medium">Podiums</th>
                  <th className="text-right py-2 px-2 text-text-muted font-medium">Best</th>
                  <th className="text-right py-2 px-2 text-text-muted font-medium">Seasons</th>
                  <th className="text-right py-2 px-2 text-text-muted font-medium hidden sm:table-cell">
                    Total Pts
                  </th>
                </tr>
              </thead>
              <tbody>
                {allTime.map((row) => (
                  <tr
                    key={row.userId}
                    className={`border-b border-border ${row.userId === user.id ? "bg-accent-orange/5" : ""}`}
                  >
                    <td className="py-2 px-2 font-medium text-text-primary">
                      {row.ownerName}
                      {row.userId === user.id && <span className="text-xs text-accent-orange ml-1.5">you</span>}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums">
                      {row.titles > 0 ? (
                        <span className="text-accent-gold font-bold">{"🏆".repeat(Math.min(row.titles, 5))}{row.titles > 5 ? ` ×${row.titles}` : ""}</span>
                      ) : (
                        <span className="text-text-muted">0</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-text-primary">{row.podiums}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-text-primary">
                      {row.bestFinish ? `#${row.bestFinish}` : "—"}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-text-primary">{row.seasons}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-accent-gold hidden sm:table-cell">
                      {row.totalPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Season by season ── */}
      <h2 className="section-title mb-3">Season by Season</h2>
      <div className="space-y-4">
        {history.map((season) => {
          const finished = season.seasonStatus === "completed";
          const hasScores = season.standings.some((s) => s.points > 0);
          const leader = hasScores ? season.standings[0] : null;
          const isCurrent = season.leagueId === leagueId;
          return (
            <div
              key={season.leagueId}
              className={`card ${isCurrent ? "border-accent-orange/30" : ""}`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                <div>
                  <p className="font-semibold text-text-primary">
                    {season.seasonName}
                    {isCurrent && <span className="text-xs text-accent-orange ml-2">viewing</span>}
                  </p>
                  <p className="text-xs text-text-muted">
                    {season.leagueName} · {season.format === "predictions" ? "Predictions" : "Draft"} ·{" "}
                    {season.standings.length} players
                  </p>
                </div>
                <div className="text-right">
                  {leader ? (
                    <p className="text-sm">
                      <span className="text-text-muted">{finished ? "Champion " : "Leading "}</span>
                      <span className="font-semibold text-accent-gold">
                        {finished ? "👑 " : ""}
                        {leader.ownerName || leader.teamName}
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-text-muted">No scores yet</p>
                  )}
                  {!isCurrent && (
                    <Link
                      href={`/leagues/${season.leagueId}`}
                      className="text-xs text-text-muted hover:text-accent-orange transition-colors"
                    >
                      Open season →
                    </Link>
                  )}
                </div>
              </div>

              {hasScores && (
                <div className="grid gap-2 sm:grid-cols-3">
                  {season.standings.slice(0, 3).map((s) => (
                    <div
                      key={s.teamId}
                      className="flex items-center gap-2 p-2.5 rounded-lg bg-bg-surface border border-border"
                    >
                      <span className="text-lg">{MEDALS[s.rank - 1] ?? `#${s.rank}`}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {s.ownerName || s.teamName}
                        </p>
                        <p className="text-xs text-text-muted truncate">
                          {s.teamName} · <span className="text-accent-gold">{s.points} pts</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {hasScores && season.standings.length > 3 && (
                <details className="mt-2">
                  <summary className="text-xs text-text-muted cursor-pointer hover:text-text-primary">
                    Full standings
                  </summary>
                  <ol className="mt-2 space-y-1 text-sm">
                    {season.standings.map((s) => (
                      <li key={s.teamId} className="flex justify-between gap-3 px-1">
                        <span className="text-text-primary">
                          <span className="text-text-muted tabular-nums mr-2">#{s.rank}</span>
                          {s.ownerName || s.teamName}
                          <span className="text-text-muted text-xs ml-1.5">{s.teamName}</span>
                        </span>
                        <span className="text-accent-gold tabular-nums">{s.points}</span>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
