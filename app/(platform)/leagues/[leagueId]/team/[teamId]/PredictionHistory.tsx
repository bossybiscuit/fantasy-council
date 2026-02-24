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

  // Default: most recent episode open
  const [open, setOpen] = useState<Set<number>>(
    new Set(episodes.length > 0 ? [episodes[0][0]] : [])
  );

  function toggle(num: number) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(num)) { next.delete(num); } else { next.add(num); }
      return next;
    });
  }

  return (
    <div className="card mt-6">
      <h2 className="section-title mb-4">Prediction History</h2>
      <div className="space-y-2">
        {episodes.map(([epNum, { ep, preds }]) => {
          const isOpen = open.has(epNum);
          const isScored = (ep as any)?.is_scored;
          const allocated = preds.reduce((s, p) => s + (p.points_allocated ?? 0), 0);
          const earned = preds.reduce((s, p) => s + (p.points_earned ?? 0), 0);

          return (
            <div key={epNum} className="border border-border rounded-lg overflow-hidden">
              {/* Episode header row — click to toggle */}
              <button
                type="button"
                onClick={() => toggle(epNum)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-surface transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`text-[9px] text-text-muted transition-transform duration-200 ${
                      isOpen ? "rotate-90" : ""
                    }`}
                  >
                    ▶
                  </span>
                  <span className="text-sm font-medium text-text-primary">
                    Episode {epNum}
                    {(ep as any)?.title ? ` — ${(ep as any).title}` : ""}
                  </span>
                  {!isScored && (
                    <span className="text-[10px] text-accent-gold/60 italic">unscored</span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <span className="text-text-muted">
                    {preds.length} pick{preds.length !== 1 ? "s" : ""}
                  </span>
                  {isScored ? (
                    <span className={`font-semibold ${earned > 0 ? "text-green-400" : "text-text-muted"}`}>
                      {earned}/{allocated} pts
                    </span>
                  ) : (
                    <span className="text-text-muted">{allocated} pts allocated</span>
                  )}
                </div>
              </button>

              {/* Expanded prediction rows */}
              {isOpen && (
                <div className="border-t border-border">
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
        })}
      </div>
    </div>
  );
}
