"use client";

import { useState, useEffect, use, useCallback } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { PlayerAvatar } from "@/components/ui/PlayerCard";
import { getTierBadgeClass } from "@/lib/utils";

type Player = {
  id: string;
  name: string;
  tier: string | null;
  tribe: string | null;
  img_url: string | null;
  suggested_value: number;
};

function PlayerValueRow({
  player,
  leagueId,
  onSaved,
}: {
  player: Player;
  leagueId: string;
  onSaved: (id: string, val: number) => void;
}) {
  const [value, setValue] = useState(player.suggested_value ?? 0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = value !== (player.suggested_value ?? 0);

  async function save() {
    if (!isDirty) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/leagues/${leagueId}/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggested_value: value }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      onSaved(player.id, value);
      setTimeout(() => setSaved(false), 1500);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save");
    }
  }

  return (
    <tr className="border-b border-border table-row-hover">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <PlayerAvatar name={player.name} size="sm" imgUrl={player.img_url} />
          <span className="font-medium text-text-primary">{player.name}</span>
        </div>
      </td>
      <td className="py-3 px-4 hidden sm:table-cell">
        {player.tribe ? (
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-accent-orange/10 border border-accent-orange/20 text-accent-orange">
            {player.tribe}
          </span>
        ) : (
          <span className="text-text-muted/30 text-xs">—</span>
        )}
      </td>
      <td className="py-3 px-4 hidden md:table-cell">
        {player.tier ? (
          <span className={getTierBadgeClass(player.tier)}>Tier {player.tier}</span>
        ) : (
          <span className="text-text-muted/30 text-xs">—</span>
        )}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <span className="text-text-muted text-sm">$</span>
          <input
            type="number"
            min={0}
            max={999}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            onBlur={save}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className={`input text-sm py-1 w-20 text-center ${
              isDirty ? "border-accent-orange/60" : ""
            }`}
          />
          {saving && <span className="text-text-muted text-xs">saving…</span>}
          {saved && <span className="text-green-400 text-xs">✓</span>}
          {error && <span className="text-red-400 text-xs">{error}</span>}
        </div>
      </td>
    </tr>
  );
}

export default function AdminPlayersPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = use(params);
  const [players, setPlayers] = useState<Player[]>([]);
  const [filterTribe, setFilterTribe] = useState("");
  const [filterTier, setFilterTier] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/leagues/${leagueId}/players`);
    if (res.ok) {
      const data = await res.json();
      setPlayers(data.players || []);
    }
    setLoading(false);
  }, [leagueId]);

  useEffect(() => { load(); }, [load]);

  function handleSaved(id: string, val: number) {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, suggested_value: val } : p))
    );
  }

  const tribes = [...new Set(players.map((p) => p.tribe).filter(Boolean))] as string[];

  const filtered = players.filter((p) => {
    if (filterTribe && p.tribe !== filterTribe) return false;
    if (filterTier && p.tier !== filterTier) return false;
    if (filterSearch && !p.name.toLowerCase().includes(filterSearch.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Player Values"
        subtitle="Set suggested auction dollar amounts for each player"
      />

      {/* Filter bar */}
      <div className="card mb-4">
        <div className="flex gap-2 flex-wrap">
          <select
            className="input text-sm py-1.5 w-auto"
            value={filterTribe}
            onChange={(e) => setFilterTribe(e.target.value)}
          >
            <option value="">All Tribes</option>
            {tribes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            className="input text-sm py-1.5 w-auto"
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
          >
            <option value="">All Tiers</option>
            {["S", "A", "B", "C", "D"].map((t) => (
              <option key={t} value={t}>Tier {t}</option>
            ))}
          </select>
          <input
            type="text"
            className="input flex-1 min-w-32 text-sm py-1.5"
            placeholder="Search players…"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-text-muted py-8 text-center">Loading players…</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-text-muted font-medium text-xs uppercase tracking-wider">
                    Player
                  </th>
                  <th className="text-left py-3 px-4 text-text-muted font-medium text-xs uppercase tracking-wider hidden sm:table-cell">
                    Tribe
                  </th>
                  <th className="text-left py-3 px-4 text-text-muted font-medium text-xs uppercase tracking-wider hidden md:table-cell">
                    Tier
                  </th>
                  <th className="text-left py-3 px-4 text-text-muted font-medium text-xs uppercase tracking-wider">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((player) => (
                  <PlayerValueRow
                    key={player.id}
                    player={player}
                    leagueId={leagueId}
                    onSaved={handleSaved}
                  />
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-text-muted text-sm italic">
                      No players found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-text-muted text-xs mt-3">
        Values auto-save on blur or Enter. Changes apply immediately to the draft room.
      </p>
    </div>
  );
}
