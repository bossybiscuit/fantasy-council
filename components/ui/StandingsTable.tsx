import Link from "next/link";
import { getRankIndicator } from "@/lib/utils";
import type { EpisodeTeamScore, Team, Profile } from "@/types/database";

interface StandingsRow {
  team: Team;
  profile: Profile | null;
  currentScore: EpisodeTeamScore | null;
  previousScore: EpisodeTeamScore | null;
  predictionAccuracy: number;
  totalPoints: number;
  rank: number;
}

interface StandingsTableProps {
  rows: StandingsRow[];
  leagueId: string;
  myTeamId?: string;
}

export default function StandingsTable({
  rows,
  leagueId,
  myTeamId,
}: StandingsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-text-muted font-medium">
              Rank
            </th>
            <th className="text-left py-3 px-4 text-text-muted font-medium">
              Team
            </th>
            <th className="text-right py-3 px-4 text-text-muted font-medium">
              This Week
            </th>
            <th className="text-right py-3 px-4 text-text-muted font-medium">
              Total
            </th>
            <th className="text-right py-3 px-4 text-text-muted font-medium hidden md:table-cell">
              Predictions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const indicator = getRankIndicator(
              row.rank,
              row.previousScore?.rank ?? null
            );
            const isMe = row.team.id === myTeamId;

            return (
              <tr
                key={row.team.id}
                className={`border-b border-border table-row-hover ${
                  isMe ? "bg-accent-orange/5" : ""
                }`}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-bold text-base ${
                        row.rank === 1
                          ? "text-accent-gold"
                          : row.rank === 2
                          ? "text-gray-300"
                          : row.rank === 3
                          ? "text-orange-600"
                          : "text-text-primary"
                      }`}
                    >
                      #{row.rank}
                    </span>
                    <RankIndicator indicator={indicator} />
                  </div>
                </td>
                <td className="py-3 px-4">
                  <Link
                    href={`/leagues/${leagueId}/team/${row.team.id}`}
                    className="hover:text-accent-orange transition-colors"
                  >
                    <p className="font-medium text-text-primary">
                      {row.team.name}
                      {isMe && (
                        <span className="ml-2 text-xs text-accent-orange">
                          (You)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-text-muted">
                      {row.profile?.display_name || row.profile?.username || "—"}
                    </p>
                  </Link>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-text-primary font-medium">
                    {row.currentScore?.total_points ?? 0}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-accent-gold font-bold text-base">
                    {row.totalPoints}
                  </span>
                </td>
                <td className="py-3 px-4 text-right hidden md:table-cell">
                  <span className="text-text-muted">
                    {row.predictionAccuracy}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="text-center py-12 text-text-muted">
          No standings yet. Draft must complete first.
        </div>
      )}
    </div>
  );
}

function RankIndicator({
  indicator,
}: {
  indicator: "up" | "down" | "same" | "new";
}) {
  if (indicator === "up") {
    return <span className="text-green-400 text-xs">▲</span>;
  }
  if (indicator === "down") {
    return <span className="text-red-400 text-xs">▼</span>;
  }
  if (indicator === "new") {
    return (
      <span className="text-accent-orange text-xs font-bold">NEW</span>
    );
  }
  return <span className="text-text-muted text-xs">—</span>;
}
