"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/ui/PageHeader";
import { getTierBadgeClass } from "@/lib/utils";
import type { Player, Season } from "@/types/database";

const TIERS = ["S", "A", "B", "C", "D"] as const;

export default function AdminPlayersPage() {
  const supabase = createClient();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [editing, setEditing] = useState<Partial<Player> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [bulkMode, setBulkMode] = useState(false);

  useEffect(() => {
    supabase
      .from("seasons")
      .select("*")
      .order("season_number", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setSeasons(data);
          if (data.length > 0) setSelectedSeason(data[0].id);
        }
      });
  }, []);

  useEffect(() => {
    if (selectedSeason) loadPlayers(selectedSeason);
  }, [selectedSeason]);

  async function loadPlayers(seasonId: string) {
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("season_id", seasonId)
      .order("name");
    if (data) setPlayers(data);
  }

  async function savePlayer() {
    if (!editing || !selectedSeason) return;
    setLoading(true);
    setError(null);

    const method = editing.id ? "PATCH" : "POST";
    const payload = editing.id
      ? editing
      : { ...editing, season_id: selectedSeason };

    const res = await fetch("/api/admin/players", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
    } else {
      setEditing(null);
      loadPlayers(selectedSeason);
    }
  }

  async function deletePlayer(id: string) {
    if (!confirm("Delete this player?")) return;
    await fetch(`/api/admin/players?id=${id}`, { method: "DELETE" });
    loadPlayers(selectedSeason);
  }

  async function toggleActive(player: Player) {
    await fetch("/api/admin/players", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: player.id, is_active: !player.is_active }),
    });
    loadPlayers(selectedSeason);
  }

  async function bulkImport() {
    if (!selectedSeason || !bulkText.trim()) return;
    setLoading(true);
    // Format: Name | Tribe | Tier | Value
    const lines = bulkText.trim().split("\n");
    for (const line of lines) {
      const parts = line.split("|").map((p) => p.trim());
      if (!parts[0]) continue;
      await supabase.from("players").insert({
        season_id: selectedSeason,
        name: parts[0],
        tribe: parts[1] || null,
        tier: (parts[2] as any) || null,
        suggested_value: Number(parts[3]) || 10,
      });
    }
    setBulkText("");
    setBulkMode(false);
    setLoading(false);
    loadPlayers(selectedSeason);
  }

  return (
    <div>
      <PageHeader
        title="Player Management"
        subtitle="Add and manage castaways per season"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setBulkMode(!bulkMode)}
              className="btn-secondary"
            >
              Bulk Import
            </button>
            <button
              onClick={() =>
                setEditing({ is_active: true, suggested_value: 10 })
              }
              className="btn-primary"
            >
              + Add Player
            </button>
          </div>
        }
      />

      {/* Season Selector */}
      <div className="flex gap-3 mb-6 items-center">
        <label className="text-sm text-text-muted whitespace-nowrap">Season:</label>
        <select
          className="input max-w-xs"
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(e.target.value)}
        >
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <span className="text-text-muted text-sm">{players.length} players</span>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Bulk Import */}
      {bulkMode && (
        <div className="card mb-6 border-accent-gold/20">
          <h3 className="section-title mb-2">Bulk Import</h3>
          <p className="text-text-muted text-xs mb-3">
            One player per line: <code className="text-accent-orange">Name | Tribe | Tier (S/A/B/C/D) | Value</code>
          </p>
          <textarea
            className="input h-40 font-mono text-sm"
            placeholder="Marcus Firewalker | Ember | S | 20&#10;Yara Moonstone | Ember | A | 15"
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
          />
          <div className="flex gap-2 mt-3">
            <button onClick={bulkImport} disabled={loading} className="btn-primary">
              {loading ? "Importing..." : "Import Players"}
            </button>
            <button onClick={() => setBulkMode(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Player Form */}
      {editing !== null && (
        <div className="card mb-6 border-accent-orange/20">
          <h3 className="section-title mb-4">
            {editing.id ? "Edit Player" : "New Player"}
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Name *</label>
              <input
                type="text"
                className="input"
                placeholder="Player name"
                value={editing.name || ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Tribe</label>
              <input
                type="text"
                className="input"
                placeholder="Tribe name"
                value={editing.tribe || ""}
                onChange={(e) => setEditing({ ...editing, tribe: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label">Tier</label>
              <select
                className="input"
                value={editing.tier || ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    tier: (e.target.value as Player["tier"]) || null,
                  })
                }
              >
                <option value="">No tier</option>
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    Tier {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Suggested Value</label>
              <input
                type="number"
                className="input"
                value={editing.suggested_value || 10}
                onChange={(e) =>
                  setEditing({ ...editing, suggested_value: Number(e.target.value) })
                }
                min={1}
                max={100}
              />
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.is_active !== false}
                  onChange={(e) =>
                    setEditing({ ...editing, is_active: e.target.checked })
                  }
                  className="accent-accent-orange w-4 h-4"
                />
                <span className="text-sm text-text-primary">Active</span>
              </label>
            </div>
          </div>
          <div className="mb-4">
            <label className="label">Bio</label>
            <textarea
              className="input h-20 resize-none"
              placeholder="Short bio..."
              value={editing.bio || ""}
              onChange={(e) => setEditing({ ...editing, bio: e.target.value })}
            />
          </div>
          <div className="mb-4">
            <label className="label">Image URL</label>
            <input
              type="url"
              className="input"
              placeholder="https://..."
              value={editing.img_url || ""}
              onChange={(e) => setEditing({ ...editing, img_url: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={savePlayer}
              disabled={loading || !editing.name}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Player"}
            </button>
            <button onClick={() => setEditing(null)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Players Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-text-muted font-medium">Name</th>
                <th className="text-left py-3 px-4 text-text-muted font-medium">Tribe</th>
                <th className="text-left py-3 px-4 text-text-muted font-medium">Tier</th>
                <th className="text-right py-3 px-4 text-text-muted font-medium">Value</th>
                <th className="text-left py-3 px-4 text-text-muted font-medium">Status</th>
                <th className="text-right py-3 px-4 text-text-muted font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr
                  key={player.id}
                  className={`border-b border-border table-row-hover ${
                    !player.is_active ? "opacity-50" : ""
                  }`}
                >
                  <td className="py-3 px-4 text-text-primary font-medium">
                    {player.name}
                  </td>
                  <td className="py-3 px-4 text-text-muted">{player.tribe || "—"}</td>
                  <td className="py-3 px-4">
                    {player.tier ? (
                      <span className={getTierBadgeClass(player.tier)}>
                        {player.tier}
                      </span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-accent-gold">
                    {player.suggested_value}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs ${
                        player.is_active ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {player.is_active ? "Active" : "Voted Out"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-3">
                    <button
                      onClick={() => setEditing(player)}
                      className="text-accent-orange hover:text-orange-400 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(player)}
                      className="text-text-muted hover:text-text-primary text-xs"
                    >
                      {player.is_active ? "Deactivate" : "Reactivate"}
                    </button>
                    <button
                      onClick={() => deletePlayer(player.id)}
                      className="text-red-500 hover:text-red-400 text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {players.length === 0 && (
            <div className="text-center py-8 text-text-muted">
              No players yet. Add players or use bulk import.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
