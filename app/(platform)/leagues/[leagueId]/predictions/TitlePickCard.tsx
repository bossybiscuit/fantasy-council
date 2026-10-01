"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Player } from "@/types/database";

// Standalone episode title pick, for leagues that don't run the full weekly
// predictions form (Survivor Pool leagues).
export default function TitlePickCard({
  leagueId,
  episodeId,
  players,
  existingPickPlayerId,
  points,
}: {
  leagueId: string;
  episodeId: string;
  players: Player[];
  /** player id, or "jeff_probst" for the host */
  existingPickPlayerId: string | null;
  points: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(existingPickPlayerId ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(playerId: string) {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/title-picks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ league_id: leagueId, episode_id: episodeId, player_id: playerId || null }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save pick");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <div className="card mt-4">
      <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
        <h2 className="section-title mb-0">🎬 Episode Title Pick</h2>
        <span className="text-xs text-accent-gold font-medium">{points} pts</span>
      </div>
      <p className="text-xs text-text-muted mb-3">
        Who says the episode title? You can change your pick until the deadline.
      </p>
      <select
        className="input text-sm"
        value={value}
        disabled={saving}
        onChange={(e) => {
          setValue(e.target.value);
          save(e.target.value);
        }}
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
      {saved && <p className="text-xs text-green-400 mt-2">✓ Saved</p>}
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}
