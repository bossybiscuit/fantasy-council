// Shared component — no server-only imports. Safe to use from both server and client components.

export function LeagueWideTable({
  teams,
  predsByTeam,
  titlePickByTeam,
  finalePicksByTeam,
  isScored,
  isFinale = false,
}: {
  teams: { id: string; name: string }[];
  predsByTeam: Map<string, any[]>;
  titlePickByTeam: Map<string, any>;
  finalePicksByTeam?: Map<string, any[]>;
  isScored: boolean;
  isFinale?: boolean;
}) {
  if (isFinale) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-text-muted font-medium">Team</th>
              <th className="text-left py-3 px-4 text-text-muted font-medium">5th Place</th>
              <th className="text-left py-3 px-4 text-text-muted font-medium">4th Place</th>
              <th className="text-left py-3 px-4 text-text-muted font-medium">Final 3</th>
              <th className="text-left py-3 px-4 text-text-muted font-medium">Winner</th>
              {isScored && (
                <th className="text-right py-3 px-4 text-text-muted font-medium">Pts</th>
              )}
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => {
              const picks: any[] = finalePicksByTeam?.get(team.id) || [];
              const titlePick = titlePickByTeam.get(team.id);
              const fifth = picks.filter((p) => p.pick_type === "fifth_place");
              const fourth = picks.filter((p) => p.pick_type === "fourth_place");
              const finalThree = picks.filter((p) => p.pick_type === "final_three");
              const winner = picks.find((p) => p.pick_type === "winner");
              const totalEarned = picks.reduce((s, p) => s + (p.points_earned || 0), 0);

              const fmtAlloc = (arr: any[]) =>
                arr.length === 0
                  ? null
                  : arr.map((p) => `${(p.players as any)?.name ?? "?"} (${p.points_allocated}pt)`).join(" · ");
              const fmtList = (arr: any[]) =>
                arr.length === 0
                  ? null
                  : arr.map((p) => (p.players as any)?.name ?? "?").join(", ");
              const dash = <span className="italic text-text-muted/50">—</span>;
              const hasSubmitted = picks.length > 0;

              return (
                <>
                  <tr key={team.id} className="border-b border-border">
                    <td className="py-3 px-4 font-medium text-text-primary align-top">
                      {team.name}
                    </td>
                    <td className="py-3 px-4 text-text-muted text-xs align-top">
                      {fmtAlloc(fifth) ?? (hasSubmitted ? dash : <span className="text-amber-500 italic">⚠ No prediction submitted</span>)}
                    </td>
                    <td className="py-3 px-4 text-text-muted text-xs align-top">
                      {fmtAlloc(fourth) ?? dash}
                    </td>
                    <td className="py-3 px-4 text-text-muted text-xs align-top">
                      {fmtList(finalThree) ?? dash}
                    </td>
                    <td className="py-3 px-4 text-text-muted text-xs align-top">
                      {winner ? (winner.players as any)?.name ?? "?" : dash}
                    </td>
                    {isScored && (
                      <td className="py-3 px-4 text-right text-xs font-semibold align-top">
                        {totalEarned}pts
                      </td>
                    )}
                  </tr>
                  {titlePick && (
                    <tr
                      key={`${team.id}-title`}
                      className="border-b border-border bg-bg-surface/40"
                    >
                      <td className="py-2 px-4" />
                      <td className="py-2 px-4 text-xs text-text-muted" colSpan={isScored ? 5 : 4}>
                        🎙️ Title Speaker:{" "}
                        <span className="text-text-primary">
                          {titlePick.is_host_pick
                            ? "Jeff Probst (Host)"
                            : (titlePick.players as any)?.name ?? "?"}
                        </span>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-text-muted font-medium">Team</th>
            <th className="text-left py-3 px-4 text-text-muted font-medium">Predictions</th>
            <th className="text-right py-3 px-4 text-text-muted font-medium">Total</th>
            {isScored && (
              <th className="text-right py-3 px-4 text-text-muted font-medium">Result</th>
            )}
            {isScored && (
              <th className="text-right py-3 px-4 text-text-muted font-medium">Pts</th>
            )}
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => {
            const preds: any[] = predsByTeam.get(team.id) || [];
            const titlePick = titlePickByTeam.get(team.id);
            const hasSubmitted = preds.length > 0;
            const totalAllocated = preds.reduce((s: number, p: any) => s + p.points_allocated, 0);
            const totalEarned = preds.reduce(
              (s: number, p: any) => s + (p.points_earned ?? 0),
              0
            );
            const isRightSide = totalEarned > 0;

            return (
              <>
                <tr key={team.id} className="border-b border-border">
                  <td className="py-3 px-4 font-medium text-text-primary align-top">
                    {team.name}
                  </td>
                  <td className="py-3 px-4 text-text-muted text-xs align-top">
                    {hasSubmitted ? (
                      preds
                        .map(
                          (p: any) =>
                            `${(p.players as any)?.name ?? "?"} (${p.points_allocated}pt)`
                        )
                        .join(" · ")
                    ) : (
                      <span className="text-amber-500 italic">⚠ No prediction submitted</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-text-muted text-xs align-top">
                    {hasSubmitted ? `${totalAllocated}pts` : "—"}
                  </td>
                  {isScored && (
                    <td className="py-3 px-4 text-right text-xs align-top">
                      {hasSubmitted ? (
                        isRightSide ? (
                          <span className="text-green-400">✓ Right side of the vote</span>
                        ) : (
                          <span className="text-red-400">✗ Wrong side of the vote</span>
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                  {isScored && (
                    <td className="py-3 px-4 text-right text-xs font-semibold align-top">
                      {hasSubmitted ? `${totalEarned}pts` : "0pts"}
                    </td>
                  )}
                </tr>
                {titlePick && (
                  <tr
                    key={`${team.id}-title`}
                    className="border-b border-border bg-bg-surface/40"
                  >
                    <td className="py-2 px-4" />
                    <td className="py-2 px-4 text-xs text-text-muted" colSpan={isScored ? 2 : 2}>
                      🎙️ Title Speaker:{" "}
                      <span className="text-text-primary">
                        {titlePick.is_host_pick
                          ? "Jeff Probst (Host)"
                          : (titlePick.players as any)?.name ?? "?"}
                      </span>
                    </td>
                    {isScored && <td colSpan={2} />}
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
