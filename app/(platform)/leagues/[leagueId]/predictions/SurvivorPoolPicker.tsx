"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Player } from "@/types/database";
import { survivorPointsForStreak, type SurvivorPoolSettings } from "@/lib/survivor-pool";

interface SurvivorPoolPickerProps {
  leagueId: string;
  episodeId: string;
  players: Player[];
  /** player_id → episode number where this team already used them */
  usedPlayers: Record<string, number>;
  existingPickPlayerId: string | null;
  currentStreak: number;
  settings: SurvivorPoolSettings;
}

export default function SurvivorPoolPicker({
  leagueId,
  episodeId,
  players,
  usedPlayers,
  existingPickPlayerId,
  currentStreak,
  settings,
}: SurvivorPoolPickerProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>(existingPickPlayerId || "");
  const [saved, setSaved] = useState<string>(existingPickPlayerId || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextWorth = survivorPointsForStreak(currentStreak + 1, settings);
  const ladder = [1, 2, 3, 4, 5, 6].map((n) => survivorPointsForStreak(n, settings));
  const available = players.filter((p) => usedPlayers[p.id] === undefined);
  const used = players.filter((p) => usedPlayers[p.id] !== undefined);

  async function save(playerId: string) {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/survivor-picks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ league_id: leagueId, episode_id: episodeId, player_id: playerId || null }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to save pick");
      return;
    }
    setSaved(playerId);
    router.refresh();
  }

  const savedName = players.find((p) => p.id === saved)?.name;

  return (
    <div className="card mt-4 border-accent-gold/20">
      <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
        <h2 className="section-title mb-0">🛟 Survivor Pool</h2>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full border border-border bg-bg-surface text-text-muted">
            Streak <strong className="text-accent-orange">{currentStreak}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-full border border-accent-gold/30 bg-accent-gold/10 text-accent-gold font-semibold">
            Next correct pick: +{nextWorth} pts
          </span>
        </div>
      </div>
      <p className="text-xs text-text-muted mb-3">
        Pick one castaway you think will <strong className="text-text-primary">survive</strong> this
        episode. You can only use each castaway once all season. A wrong pick won&rsquo;t knock you
        out, but it resets your streak — and every correct pick in a row is worth more:{" "}
        <span className="text-text-primary">
          {ladder.join(" → ")}
          {settings.cap > 0 ? ` (max ${settings.cap})` : " → …"}
        </span>
        .
      </p>

      {saved && (
        <div className="mb-3 p-3 rounded-lg bg-green-900/20 border border-green-700/30 text-green-400 text-sm">
          ✓ Locked in: <strong>{savedName}</strong>. You can change it until the deadline.
        </div>
      )}
      {error && (
        <div className="mb-3 p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {available.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelected(p.id)}
            className={`text-left p-2.5 rounded-lg border-2 transition-colors ${
              selected === p.id
                ? "border-accent-gold bg-accent-gold/10"
                : "border-border bg-bg-surface hover:border-accent-gold/40"
            }`}
          >
            <p className="text-sm font-medium text-text-primary truncate">{p.name}</p>
            {p.tribe && <p className="text-xs text-text-muted">{p.tribe}</p>}
          </button>
        ))}
      </div>

      {used.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-text-muted mb-1.5">Already used</p>
          <div className="flex flex-wrap gap-1.5">
            {used.map((p) => (
              <span
                key={p.id}
                className="text-xs px-2 py-1 rounded border border-border bg-bg-surface text-text-muted line-through decoration-text-muted/60"
              >
                {p.name} <span className="no-underline">· E{usedPlayers[p.id]}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={() => save(selected)}
          disabled={loading || !selected || selected === saved}
          className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Saving…" : saved && selected === saved ? "Pick saved" : "Lock In Survivor Pick 🛟"}
        </button>
        {saved && (
          <button
            type="button"
            onClick={() => {
              setSelected("");
              save("");
            }}
            disabled={loading}
            className="btn-secondary text-sm"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
