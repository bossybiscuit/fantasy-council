import {
  computeTeamStreaks,
  type PoolPick,
  type SurvivorPoolSettings,
} from "@/lib/survivor-pool";

type BoardPick = PoolPick & { player_name: string };

interface SurvivorPoolBoardProps {
  teams: { id: string; name: string }[];
  /** All season episodes, ascending */
  episodes: { id: string; episode_number: number; is_scored: boolean }[];
  picks: BoardPick[];
  settings: SurvivorPoolSettings;
  myTeamId: string;
  /** Current (unscored) episode — its picks stay hidden until the deadline passes */
  currentEpisodeId: string | null;
  revealCurrent: boolean;
}

export default function SurvivorPoolBoard({
  teams,
  episodes,
  picks,
  settings,
  myTeamId,
  currentEpisodeId,
  revealCurrent,
}: SurvivorPoolBoardProps) {
  const episodeIdsAsc = episodes.map((e) => e.id);
  const graded = new Set(episodes.filter((e) => e.is_scored).map((e) => e.id));
  const epNumber = new Map(episodes.map((e) => [e.id, e.episode_number]));

  const rows = teams
    .map((team) => {
      const teamPicks = new Map<string, BoardPick>();
      for (const p of picks) if (p.team_id === team.id) teamPicks.set(p.episode_id, p);
      const { results, currentStreak, total } = computeTeamStreaks(
        episodeIdsAsc,
        graded,
        teamPicks,
        settings
      );
      const history = episodeIdsAsc
        .filter((id) => graded.has(id) && teamPicks.has(id))
        .map((id) => ({ ...teamPicks.get(id)!, points: results.get(id)?.points ?? 0 }));
      const current = currentEpisodeId ? teamPicks.get(currentEpisodeId) : undefined;
      return { team, currentStreak, total, history, current };
    })
    .sort((a, b) => b.total - a.total || b.currentStreak - a.currentStreak);

  return (
    <div className="card mt-6">
      <h2 className="section-title mb-1">🛟 Survivor Pool Standings</h2>
      <p className="text-xs text-text-muted mb-4">
        Pool points count toward the overall standings.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 text-text-muted font-medium">Team</th>
              <th className="text-right py-2 px-2 text-text-muted font-medium">Streak</th>
              <th className="text-right py-2 px-2 text-text-muted font-medium">Pts</th>
              <th className="text-left py-2 px-2 text-text-muted font-medium">This Week</th>
              <th className="text-left py-2 px-2 text-text-muted font-medium hidden md:table-cell">
                History
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isMine = row.team.id === myTeamId;
              return (
                <tr
                  key={row.team.id}
                  className={`border-b border-border ${isMine ? "bg-accent-orange/5" : ""}`}
                >
                  <td className="py-2 px-2 font-medium text-text-primary">
                    {row.team.name}
                    {isMine && <span className="text-xs text-accent-orange ml-1.5">you</span>}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums">
                    {row.currentStreak > 0 ? (
                      <span className="text-accent-orange font-semibold">🔥 {row.currentStreak}</span>
                    ) : (
                      <span className="text-text-muted">0</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right font-semibold text-accent-gold tabular-nums">
                    {row.total}
                  </td>
                  <td className="py-2 px-2 text-xs">
                    {row.current ? (
                      revealCurrent || isMine ? (
                        <span className="text-text-primary">{row.current.player_name}</span>
                      ) : (
                        <span className="text-green-400">✓ Locked in</span>
                      )
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="py-2 px-2 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {row.history.map((h) => (
                        <span
                          key={h.episode_id}
                          title={h.survived ? `+${h.points} pts` : "Eliminated — streak reset"}
                          className={`text-[11px] px-1.5 py-0.5 rounded border ${
                            h.survived
                              ? "border-green-700/40 bg-green-900/20 text-green-400"
                              : "border-red-700/40 bg-red-900/20 text-red-400"
                          }`}
                        >
                          E{epNumber.get(h.episode_id)} {h.player_name.split(" ")[0]}{" "}
                          {h.survived ? `+${h.points}` : "✗"}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
