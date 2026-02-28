"use client";

import { useState } from "react";

interface Pred {
  id: string;
  points_allocated: number;
  points_earned: number;
  episodes: { episode_number: number; title: string | null; is_scored: boolean } | null;
  players: { name: string } | null;
}

export default function PredictionHistory({ predictions }: { predictions: Pred[] }) {
  // Group by episode number
  const episodeMap = new Map<number, { ep: Pred["episodes"]; preds: Pred[] }>();
  for (const pred of predictions) {
    const ep = pred.episodes as any;
    const num: number = ep?.episode_number ?? 0;
    if (!episodeMap.has(num)) episodeMap.set(num, { ep, preds: [] });
    episodeMap.get(num)!.preds.push(pred);
  }

  // Sort descending so newest episode is first
  const episodes = [...episodeMap.entries()].sort((a, b) => b[0] - a[0]);

  // Default: most recent episode selected
  const [selectedEpNum, setSelectedEpNum] = useState<number>(
    episodes.length > 0 ? episodes[0][0] : 0
  );

  const selected = episodeMap.get(selectedEpNum);
  const isScored = (selected?.ep as any)?.is_scored;
  const preds = selected?.preds || [];
  const allocated = preds.reduce((s, p) => s + (p.points_allocated ?? 0), 0);
  const earned = preds.reduce((s, p) => s + (p.points_earned ?? 0), 0);

  return (
    <div className="card mt-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="section-title">Prediction History</h2>
        {episodes.length > 1 && (
          <select
            className="input text-sm py-1.5 px-3 max-w-[220px]"
            value={selectedEpNum}
            onChange={(e) => setSelectedEpNum(Number(e.target.value))}
          >
            {episodes.map(([num, { ep }]) => (
              <option key={num} value={num}>
                Episode {num}{(ep as any)?.title ? ` — ${(ep as any).title}` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {episodes.length === 0 ? (
        <p className="text-text-muted text-sm">No predictions yet.</p>
      ) : (
        <div>
          {/* Summary row */}
          <div className="flex items-center justify-between px-1 mb-3">
            <span className="text-sm text-text-muted">
              {preds.length} pick{preds.length !== 1 ? "s" : ""}
              {!isScored && (
                <span className="ml-2 text-[10px] text-accent-gold/60 italic">unscored</span>
              )}
            </span>
            {isScored ? (
              <span className={`text-sm font-semibold ${earned > 0 ? "text-green-400" : "text-text-muted"}`}>
                {earned}/{allocated} pts
              </span>
            ) : (
              <span className="text-sm text-text-muted">{allocated} pts allocated</span>
            )}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-surface/50">
                <th className="text-left py-2 px-4 text-text-muted font-medium text-xs">Player</th>
                <th className="text-right py-2 px-4 text-text-muted font-medium text-xs">Allocated</th>
                <th className="text-right py-2 px-4 text-text-muted font-medium text-xs">Earned</th>
                <th className="text-right py-2 px-4 text-text-muted font-medium text-xs">Result</th>
              </tr>
            </thead>
            <tbody>
              {preds.map((pred) => {
                const player = pred.players as any;
                return (
                  <tr key={pred.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 px-4 text-text-primary">{player?.name}</td>
                    <td className="py-2.5 px-4 text-right text-text-muted">
                      {pred.points_allocated}pts
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span
                        className={
                          isScored && pred.points_earned > 0
                            ? "text-green-400 font-semibold"
                            : "text-text-muted"
                        }
                      >
                        {isScored ? `${pred.points_earned}pts` : "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {!isScored ? (
                        <span className="text-accent-gold/60 italic text-xs">
                          Awaiting Tribal Council...
                        </span>
                      ) : pred.points_earned > 0 ? (
                        <span className="text-green-400 text-xs">✓ Right side of the vote</span>
                      ) : (
                        <span className="text-red-400 text-xs">✗ Wrong side of the vote</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
