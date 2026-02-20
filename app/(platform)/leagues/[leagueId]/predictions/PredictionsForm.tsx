"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Player, Prediction } from "@/types/database";

interface PredictionsFormProps {
  leagueId: string;
  episodeId: string;
  teamId: string;
  players: Player[];
  existingPredictions: Prediction[];
  existingTitlePickPlayerId: string | null;
}

export default function PredictionsForm({
  leagueId,
  episodeId,
  teamId,
  players,
  existingPredictions,
  existingTitlePickPlayerId,
}: PredictionsFormProps) {
  const router = useRouter();

  const initialAllocations: Record<string, number> = {};
  for (const pred of existingPredictions) {
    initialAllocations[pred.player_id] = pred.points_allocated;
  }

  const [allocations, setAllocations] = useState<Record<string, number>>(initialAllocations);
  const [titlePickPlayerId, setTitlePickPlayerId] = useState<string>(
    existingTitlePickPlayerId || ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const totalAllocated = Object.values(allocations).reduce((sum, v) => sum + v, 0);
  const remaining = 10 - totalAllocated;

  function setAllocation(playerId: string, value: number) {
    if (value < 0) return;
    const newTotal = totalAllocated - (allocations[playerId] || 0) + value;
    if (newTotal > 10) return;
    setAllocations({ ...allocations, [playerId]: value });
  }

  async function handleSubmit() {
    if (totalAllocated !== 10) {
      setError("You must allocate exactly 10 points total");
      return;
    }

    setLoading(true);
    setError(null);

    const allocationList = Object.entries(allocations)
      .filter(([, pts]) => pts > 0)
      .map(([player_id, points_allocated]) => ({ player_id, points_allocated }));

    const [predRes, titleRes] = await Promise.all([
      fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          league_id: leagueId,
          episode_id: episodeId,
          team_id: teamId,
          allocations: allocationList,
        }),
      }),
      fetch("/api/title-picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          league_id: leagueId,
          episode_id: episodeId,
          player_id: titlePickPlayerId || null,
        }),
      }),
    ]);

    setLoading(false);

    const predData = await predRes.json();
    if (!predRes.ok) {
      setError(predData.error);
      return;
    }
    const titleData = await titleRes.json();
    if (!titleRes.ok) {
      setError(titleData.error);
      return;
    }

    setSuccess(true);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Title Pick */}
      <div className="card">
        <h2 className="section-title mb-1">Episode Title Pick</h2>
        <p className="text-xs text-text-muted mb-3">
          Who says the episode title? Worth{" "}
          <strong className="text-accent-gold">3 pts</strong> if correct.
        </p>
        <select
          className="input text-sm"
          value={titlePickPlayerId}
          onChange={(e) => setTitlePickPlayerId(e.target.value)}
        >
          <option value="">— No pick —</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.tribe ? ` (${p.tribe})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Vote Allocations */}
      <div className="card">
        <div className="flex items-center justify-between mb-1">
          <h2 className="section-title mb-0">Vote Predictions</h2>
          <div
            className={`text-sm font-bold tabular-nums px-3 py-1 rounded-full border ${
              totalAllocated === 10
                ? "text-green-400 border-green-700/40 bg-green-900/20"
                : "text-accent-orange border-accent-orange/30 bg-accent-orange/5"
            }`}
          >
            {totalAllocated} / 10 pts
          </div>
        </div>
        <p className="text-xs text-text-muted mb-4">
          Allocate 10 points across players you think will be voted out. If your player is
          eliminated, you earn those points.
        </p>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-bg-surface rounded-full mb-5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{
              width: `${Math.min(100, (totalAllocated / 10) * 100)}%`,
              background:
                totalAllocated === 10
                  ? "linear-gradient(90deg, #22c55e, #16a34a)"
                  : "linear-gradient(90deg, #ff6a00, #c9a84c)",
            }}
          />
        </div>

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-900/20 border border-green-700/30 text-green-400 text-sm">
            ✓ Predictions saved! You can update them until the deadline.
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Player cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {players.map((player) => {
            const allocated = allocations[player.id] || 0;
            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  allocated > 0
                    ? "border-accent-orange/40 bg-accent-orange/5"
                    : "border-border bg-bg-surface"
                }`}
              >
                <div className="min-w-0 mr-3">
                  <p className="text-sm font-medium text-text-primary truncate">{player.name}</p>
                  {player.tribe && (
                    <p className="text-xs text-text-muted">{player.tribe}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setAllocation(player.id, Math.max(0, allocated - 1))}
                    disabled={allocated === 0}
                    className="w-7 h-7 rounded border border-border bg-bg-card text-text-primary hover:border-accent-orange transition-colors text-sm font-bold disabled:opacity-30"
                  >
                    −
                  </button>
                  <span
                    className={`w-6 text-center font-bold text-sm tabular-nums ${
                      allocated > 0 ? "text-accent-orange" : "text-text-muted"
                    }`}
                  >
                    {allocated}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAllocation(player.id, Math.min(10, allocated + 1))}
                    disabled={remaining === 0}
                    className="w-7 h-7 rounded border border-border bg-bg-card text-text-primary hover:border-accent-orange transition-colors text-sm font-bold disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || totalAllocated !== 10}
          className="btn-primary w-full mt-5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? "Submitting..."
            : totalAllocated === 10
            ? "Submit Predictions"
            : `Allocate ${remaining} more point${remaining !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}
