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
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === currentName) {
      setEditing(false);
      return;
    }
    setLoading(true);
    setError(null);
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
      setEditing(false);
      router.refresh();
    } catch {
      setError("Failed to rename — check your connection");
      setLoading(false);
    }
  }

  if (!editing) {
    return (
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-text-muted hover:text-accent-orange transition-colors border border-border hover:border-accent-orange/40 rounded px-3 py-1"
        >
          Rename my team
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 card py-3">
      {error && (
        <p className="text-red-400 text-xs mb-2">{error}</p>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          className="input flex-1 py-1.5 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
          maxLength={40}
          autoFocus
        />
        <button
          onClick={handleSave}
          disabled={loading || !name.trim()}
          className="btn-primary text-sm py-1.5 px-4 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => { setEditing(false); setName(currentName); }}
          className="btn-secondary text-sm py-1.5 px-3"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
