"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RenameTeam({
  leagueId,
  teamId,
  currentName,
}: {
  leagueId: string;
  teamId: string;
  currentName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isDirty = name.trim() !== currentName;

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed || !isDirty) return;
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/teams`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Error ${res.status}`);
        setLoading(false);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch {
      setError("Failed to save — check your connection");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
      <div className="flex gap-2">
        <input
          type="text"
          className="input flex-1 text-sm"
          value={name}
          onChange={(e) => { setName(e.target.value); setSaved(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          maxLength={40}
          placeholder="Team name"
        />
        <button
          onClick={handleSave}
          disabled={loading || !isDirty || !name.trim()}
          className="btn-primary text-sm px-4 disabled:opacity-40"
        >
          {loading ? "Saving…" : saved ? "Saved!" : "Save"}
        </button>
      </div>
    </div>
  );
}
