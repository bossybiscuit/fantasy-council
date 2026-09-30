"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface WinnerPickCardProps {
  leagueId: string;
  players: { id: string; name: string; tribe: string | null; is_active: boolean }[];
  myPick: string | null;
  points: number;
  closed: boolean;
  /** Everyone's picks — hidden until voting closes */
  allPicks: { teamName: string; answer: string | null; isMe: boolean }[];
}

export default function WinnerPickCard({
  leagueId,
  players,
  myPick,
  points,
  closed,
  allPicks,
}: WinnerPickCardProps) {
  const router = useRouter();
  const [value, setValue] = useState(myPick ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(name: string) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/leagues/${leagueId}/season-predictions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "winner", answer: name }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  const voted = allPicks.filter((p) => p.answer).length;

  return (
    <div className="card mt-4 border-accent-gold/20">
      <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
        <h2 className="section-title mb-0">👑 Sole Survivor Pick</h2>
        <span className="text-xs text-accent-gold font-medium">{points} pts</span>
      </div>
      <p className="text-xs text-text-muted mb-3">
        {closed
          ? "Voting is closed — picks are locked in."
          : `Who wins the season? You can change your pick until the commissioner closes voting. ${voted} of ${allPicks.length} have voted.`}
      </p>

      {closed ? (
        <div className="divide-y divide-border">
          {allPicks.map((p) => (
            <div key={p.teamName} className="flex items-center justify-between py-2 text-sm">
              <span className="text-text-primary">
                {p.teamName}
                {p.isMe && <span className="text-xs text-accent-orange ml-1.5">you</span>}
              </span>
              <span className={p.answer ? "text-text-primary" : "text-text-muted"}>
                {p.answer || "No pick"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <select
            className="input text-sm"
            value={value}
            disabled={saving}
            onChange={(e) => {
              setValue(e.target.value);
              if (e.target.value) save(e.target.value);
            }}
          >
            <option value="">— Select a castaway —</option>
            {players.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
                {p.tribe ? ` (${p.tribe})` : ""}
                {p.is_active ? "" : " — out"}
              </option>
            ))}
          </select>
          {saved && <p className="text-xs text-green-400 mt-2">✓ Saved</p>}
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
          {myPick && !saved && (
            <p className="text-xs text-text-muted mt-2">
              Your pick: <span className="text-text-primary">{myPick}</span>
            </p>
          )}
        </>
      )}
    </div>
  );
}
