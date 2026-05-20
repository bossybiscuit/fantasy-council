"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Player, Prediction } from "@/types/database";

interface FinalePick {
  pick_type: "fifth_place" | "fourth_place" | "final_three" | "winner";
  player_id: string;
  points_allocated: number;
}

interface PredictionsFormProps {
  leagueId: string;
  episodeId: string;
  teamId: string;
  players: Player[];
  existingPredictions: Prediction[];
  existingTitlePickPlayerId: string | null;
  isFinale?: boolean;
  existingFinalePicks?: FinalePick[];
}

export default function PredictionsForm({
  leagueId,
  episodeId,
  teamId,
  players,
  existingPredictions,
  existingTitlePickPlayerId,
  isFinale = false,
  existingFinalePicks = [],
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

  // Finale state (only used when isFinale)
  const initialFifth: Record<string, number> = {};
  const initialFourth: Record<string, number> = {};
  const initialFinalThree: string[] = [];
  let initialWinner = "";
  for (const fp of existingFinalePicks) {
    if (fp.pick_type === "fifth_place") initialFifth[fp.player_id] = fp.points_allocated;
    else if (fp.pick_type === "fourth_place") initialFourth[fp.player_id] = fp.points_allocated;
    else if (fp.pick_type === "final_three") initialFinalThree.push(fp.player_id);
    else if (fp.pick_type === "winner") initialWinner = fp.player_id;
  }
  const [fifthAlloc, setFifthAlloc] = useState<Record<string, number>>(initialFifth);
  const [fourthAlloc, setFourthAlloc] = useState<Record<string, number>>(initialFourth);
  const [finalThree, setFinalThree] = useState<string[]>(initialFinalThree);
  const [winnerPick, setWinnerPick] = useState<string>(initialWinner);

  const fifthTotal = Object.values(fifthAlloc).reduce((s, v) => s + v, 0);
  const fourthTotal = Object.values(fourthAlloc).reduce((s, v) => s + v, 0);

  function setFifth(pid: string, value: number) {
    if (value < 0) return;
    const newTotal = fifthTotal - (fifthAlloc[pid] || 0) + value;
    if (newTotal > 10) return;
    setFifthAlloc({ ...fifthAlloc, [pid]: value });
  }
  function setFourth(pid: string, value: number) {
    if (value < 0) return;
    const newTotal = fourthTotal - (fourthAlloc[pid] || 0) + value;
    if (newTotal > 10) return;
    setFourthAlloc({ ...fourthAlloc, [pid]: value });
  }
  function toggleFinalThree(pid: string) {
    if (finalThree.includes(pid)) {
      setFinalThree(finalThree.filter((x) => x !== pid));
    } else if (finalThree.length < 3) {
      setFinalThree([...finalThree, pid]);
    }
  }

  function setAllocation(playerId: string, value: number) {
    if (value < 0) return;
    const newTotal = totalAllocated - (allocations[playerId] || 0) + value;
    if (newTotal > 10) return;
    setAllocations({ ...allocations, [playerId]: value });
  }

  async function handleSubmit() {
    if (isFinale) {
      if (fifthTotal !== 10) {
        setError("5th place must total 10 points");
        return;
      }
      if (fourthTotal !== 10) {
        setError("4th place must total 10 points");
        return;
      }
    } else if (totalAllocated !== 10) {
      setError("You must allocate exactly 10 points total");
      return;
    }

    setLoading(true);
    setError(null);

    const requests: Promise<Response>[] = [
      fetch("/api/title-picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          league_id: leagueId,
          episode_id: episodeId,
          player_id: titlePickPlayerId || null,
        }),
      }),
    ];

    if (!isFinale) {
      const allocationList = Object.entries(allocations)
        .filter(([, pts]) => pts > 0)
        .map(([player_id, points_allocated]) => ({ player_id, points_allocated }));

      requests.push(
        fetch("/api/predictions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            league_id: leagueId,
            episode_id: episodeId,
            team_id: teamId,
            allocations: allocationList,
          }),
        })
      );
    }

    if (isFinale) {
      requests.push(
        fetch("/api/finale-predictions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            league_id: leagueId,
            episode_id: episodeId,
            fifth_place: Object.entries(fifthAlloc)
              .filter(([, v]) => v > 0)
              .map(([player_id, points_allocated]) => ({ player_id, points_allocated })),
            fourth_place: Object.entries(fourthAlloc)
              .filter(([, v]) => v > 0)
              .map(([player_id, points_allocated]) => ({ player_id, points_allocated })),
            final_three: finalThree,
            winner: winnerPick || null,
          }),
        })
      );
    }

    const responses = await Promise.all(requests);
    setLoading(false);

    for (const res of responses) {
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Submission failed");
        return;
      }
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
          <option value="jeff_probst">Jeff Probst (Host)</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.tribe ? ` (${p.tribe})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Vote Allocations — hidden on finale (5th place replaces it) */}
      {!isFinale && (
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
            🔥 Votes cast! You can update them until the deadline.
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
            ? "Casting your vote..."
            : totalAllocated === 10
            ? "Cast Your Vote 🗳️"
            : `Allocate ${remaining} more point${remaining !== 1 ? "s" : ""}`}
        </button>
      </div>
      )}

      {/* Error message — shown for finale form too (only-finale flow) */}
      {isFinale && error && (
        <div className="card border border-red-700/30 bg-red-900/20 text-red-400 text-sm">
          {error}
        </div>
      )}
      {isFinale && success && (
        <div className="card border border-green-700/30 bg-green-900/20 text-green-400 text-sm">
          🏆 Finale picks locked in!
        </div>
      )}

      {/* Finale Predictions */}
      {isFinale && (
        <>
          <FinaleAllocationCard
            title="5th Place Prediction"
            description="Allocate 10 points across players you think will be voted out in 5th place."
            players={players}
            alloc={fifthAlloc}
            total={fifthTotal}
            onChange={setFifth}
          />
          <FinaleAllocationCard
            title="4th Place Prediction"
            description="Allocate 10 points across players you think will be voted out in 4th place."
            players={players}
            alloc={fourthAlloc}
            total={fourthTotal}
            onChange={setFourth}
          />

          {/* Final 3 Picks */}
          <div className="card">
            <h2 className="section-title mb-1">Final 3 Picks</h2>
            <p className="text-xs text-text-muted mb-3">
              Pick up to 3 players you think will be in the Final Tribal Council. Worth{" "}
              <strong className="text-accent-gold">2 pts</strong> for each correct ({finalThree.length}/3 selected).
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {players.map((p) => {
                const selected = finalThree.includes(p.id);
                const disabled = !selected && finalThree.length >= 3;
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-2 p-1.5 rounded ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-bg-surface"}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleFinalThree(p.id)}
                      disabled={disabled}
                      className="accent-accent-gold"
                    />
                    <span className="text-sm text-text-primary">{p.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Winner Pick */}
          <div className="card">
            <h2 className="section-title mb-1">Sole Survivor</h2>
            <p className="text-xs text-text-muted mb-3">
              Pick the winner. Worth <strong className="text-accent-gold">5 pts</strong> if correct.
            </p>
            <select
              className="input text-sm"
              value={winnerPick}
              onChange={(e) => setWinnerPick(e.target.value)}
            >
              <option value="">— No pick —</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || totalAllocated !== 10 || fifthTotal !== 10 || fourthTotal !== 10}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Casting your vote..." : "Cast Your Finale Picks 🏆"}
          </button>
        </>
      )}
    </div>
  );
}

function FinaleAllocationCard({
  title,
  description,
  players,
  alloc,
  total,
  onChange,
}: {
  title: string;
  description: string;
  players: Player[];
  alloc: Record<string, number>;
  total: number;
  onChange: (pid: string, value: number) => void;
}) {
  const remaining = 10 - total;
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-1">
        <h2 className="section-title mb-0">{title}</h2>
        <div
          className={`text-sm font-bold tabular-nums px-3 py-1 rounded-full border ${
            total === 10
              ? "text-green-400 border-green-700/40 bg-green-900/20"
              : "text-accent-orange border-accent-orange/30 bg-accent-orange/5"
          }`}
        >
          {total} / 10 pts
        </div>
      </div>
      <p className="text-xs text-text-muted mb-4">{description}</p>
      <div className="w-full h-1.5 bg-bg-surface rounded-full mb-5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{
            width: `${Math.min(100, (total / 10) * 100)}%`,
            background:
              total === 10
                ? "linear-gradient(90deg, #22c55e, #16a34a)"
                : "linear-gradient(90deg, #ff6a00, #c9a84c)",
          }}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {players.map((player) => {
          const v = alloc[player.id] || 0;
          return (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                v > 0 ? "border-accent-orange/40 bg-accent-orange/5" : "border-border bg-bg-surface"
              }`}
            >
              <div className="min-w-0 mr-3">
                <p className="text-sm font-medium text-text-primary truncate">{player.name}</p>
                {player.tribe && <p className="text-xs text-text-muted">{player.tribe}</p>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onChange(player.id, Math.max(0, v - 1))}
                  disabled={v === 0}
                  className="w-7 h-7 rounded border border-border bg-bg-card text-text-primary hover:border-accent-orange transition-colors text-sm font-bold disabled:opacity-30"
                >
                  −
                </button>
                <span className={`w-6 text-center font-bold text-sm tabular-nums ${v > 0 ? "text-accent-orange" : "text-text-muted"}`}>
                  {v}
                </span>
                <button
                  type="button"
                  onClick={() => onChange(player.id, Math.min(10, v + 1))}
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
    </div>
  );
}
