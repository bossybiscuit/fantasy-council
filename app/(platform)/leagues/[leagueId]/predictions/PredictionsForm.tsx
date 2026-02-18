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
}

export default function PredictionsForm({
  leagueId,
  episodeId,
  teamId,
  players,
  existingPredictions,
}: PredictionsFormProps) {
  const router = useRouter();

  // Initialize allocations from existing predictions
  const initialAllocations: Record<string, number> = {};
  for (const pred of existingPredictions) {
    initialAllocations[pred.player_id] = pred.points_allocated;
  }

  const [allocations, setAllocations] = useState<Record<string, number>>(initialAllocations);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const totalAllocated = Object.values(allocations).reduce((sum, v) => sum + v, 0);
  const remaining = 10 - totalAllocated;

  function setAllocation(playerId: string, value: number) {
    const clamped = Math.max(0, Math.min(value, value + remaining));
    const newTotal = totalAllocated - (allocations[playerId] || 0) + clamped;
    if (newTotal > 10) return;
    setAllocations({ ...allocations, [playerId]: clamped });
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

    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        league_id: leagueId,
        episode_id: episodeId,
        team_id: teamId,
        allocations: allocationList,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
    } else {
      setSuccess(true);
      router.refresh();
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Allocate Points</h2>
        <div
          className={`text-lg font-bold ${
            remaining === 0
              ? "text-green-400"
              : remaining < 0
              ? "text-red-400"
              : "text-accent-orange"
          }`}
        >
          {remaining} pts remaining
        </div>
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

      <p className="text-xs text-text-muted mb-4">
        Allocate points across players you think will be voted out this episode. If your predicted player is eliminated, you earn those points.
      </p>

      {/* Visual allocation bar */}
      <div className="w-full h-2 bg-bg-surface rounded-full mb-6 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, (totalAllocated / 10) * 100)}%`,
            background:
              totalAllocated === 10
                ? "linear-gradient(90deg, #22c55e, #16a34a)"
                : "linear-gradient(90deg, #ff6a00, #c9a84c)",
          }}
        />
      </div>

      <div className="space-y-3">
        {players.map((player) => {
          const allocated = allocations[player.id] || 0;
          return (
            <div key={player.id} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-text-primary">
                    {player.name}
                  </span>
                  {player.tribe && (
                    <span className="text-xs text-text-muted">{player.tribe}</span>
                  )}
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={allocated}
                  onChange={(e) => setAllocation(player.id, Number(e.target.value))}
                  className="w-full accent-accent-orange"
                  style={{ accentColor: "#ff6a00" }}
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setAllocation(player.id, Math.max(0, allocated - 1))}
                  className="w-7 h-7 rounded bg-bg-surface border border-border text-text-primary hover:border-accent-orange transition-colors text-sm"
                >
                  −
                </button>
                <span
                  className={`w-6 text-center font-bold text-sm ${
                    allocated > 0 ? "text-accent-orange" : "text-text-muted"
                  }`}
                >
                  {allocated}
                </span>
                <button
                  type="button"
                  onClick={() => setAllocation(player.id, Math.min(10, allocated + 1))}
                  disabled={remaining === 0}
                  className="w-7 h-7 rounded bg-bg-surface border border-border text-text-primary hover:border-accent-orange transition-colors text-sm disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="torch-divider mt-6" />

      <button
        onClick={handleSubmit}
        disabled={loading || totalAllocated !== 10}
        className="btn-primary w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading
          ? "Submitting..."
          : totalAllocated === 10
          ? "Submit Predictions"
          : `Allocate ${remaining} more point${remaining !== 1 ? "s" : ""}`}
      </button>
    </div>
  );
}
