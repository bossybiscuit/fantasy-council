"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/ui/PageHeader";
import type { Season } from "@/types/database";

export default function AdminSeasonsPage() {
  const supabase = createClient();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [editing, setEditing] = useState<Partial<Season> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Episode management
  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [newEpisode, setNewEpisode] = useState({
    episode_number: 1,
    title: "",
    air_date: "",
  });

  useEffect(() => {
    loadSeasons();
  }, []);

  useEffect(() => {
    if (selectedSeason) loadEpisodes(selectedSeason);
  }, [selectedSeason]);

  async function loadSeasons() {
    const { data } = await supabase
      .from("seasons")
      .select("*")
      .order("season_number", { ascending: false });
    if (data) setSeasons(data);
  }

  async function loadEpisodes(seasonId: string) {
    const { data } = await supabase
      .from("episodes")
      .select("*")
      .eq("season_id", seasonId)
      .order("episode_number");
    if (data) setEpisodes(data);
  }

  async function saveSeason() {
    if (!editing) return;
    setLoading(true);
    setError(null);

    const method = editing.id ? "PATCH" : "POST";
    const res = await fetch("/api/admin/seasons", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
    } else {
      setSuccess(editing.id ? "Season updated" : "Season created");
      setEditing(null);
      loadSeasons();
      setTimeout(() => setSuccess(null), 3000);
    }
  }

  async function addEpisode() {
    if (!selectedSeason) return;
    const { error } = await supabase.from("episodes").insert({
      season_id: selectedSeason,
      episode_number: newEpisode.episode_number,
      title: newEpisode.title,
      air_date: newEpisode.air_date || null,
    });
    if (!error) {
      loadEpisodes(selectedSeason);
      setNewEpisode((prev) => ({
        ...prev,
        episode_number: prev.episode_number + 1,
        title: "",
        air_date: "",
      }));
    }
  }

  const statusColors: Record<string, string> = {
    upcoming: "text-text-muted bg-bg-surface border-border",
    active: "text-green-400 bg-green-400/10 border-green-400/20",
    completed: "text-text-muted bg-bg-surface border-border",
  };

  return (
    <div>
      <PageHeader
        title="Seasons"
        subtitle="Manage Survivor seasons and episodes"
        action={
          <button
            onClick={() => setEditing({ status: "upcoming" })}
            className="btn-primary"
          >
            + New Season
          </button>
        }
      />

      {success && (
        <div className="mb-4 p-3 rounded-lg bg-green-900/20 border border-green-700/30 text-green-400 text-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Season Form */}
      {editing !== null && (
        <div className="card mb-6 border-accent-orange/20">
          <h3 className="section-title mb-4">
            {editing.id ? "Edit Season" : "New Season"}
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Season Name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. The Council: Season 50"
                value={editing.name || ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Season Number</label>
              <input
                type="number"
                className="input"
                value={editing.season_number || ""}
                onChange={(e) =>
                  setEditing({ ...editing, season_number: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="label">Status</label>
            <select
              className="input"
              value={editing.status || "upcoming"}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  status: e.target.value as Season["status"],
                })
              }
            >
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveSeason}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? "Saving..." : "Save Season"}
            </button>
            <button onClick={() => setEditing(null)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Seasons List */}
      <div className="card mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-text-muted font-medium">Season</th>
                <th className="text-left py-3 px-4 text-text-muted font-medium">Name</th>
                <th className="text-left py-3 px-4 text-text-muted font-medium">Status</th>
                <th className="text-right py-3 px-4 text-text-muted font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {seasons.map((season) => (
                <tr key={season.id} className="border-b border-border table-row-hover">
                  <td className="py-3 px-4 text-text-primary font-medium">#{season.season_number}</td>
                  <td className="py-3 px-4 text-text-primary">{season.name}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${
                        statusColors[season.status]
                      }`}
                    >
                      {season.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setEditing(season)}
                      className="text-accent-orange hover:text-orange-400 text-sm mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSeason(season.id);
                        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
                      }}
                      className="text-accent-gold hover:text-yellow-400 text-sm"
                    >
                      Episodes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {seasons.length === 0 && (
            <div className="text-center py-8 text-text-muted">No seasons yet</div>
          )}
        </div>
      </div>

      {/* Episode Management */}
      {selectedSeason && (
        <div className="card">
          <h3 className="section-title mb-4">
            Episodes —{" "}
            {seasons.find((s) => s.id === selectedSeason)?.name}
          </h3>

          {/* Add Episode Form */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <input
              type="number"
              className="input w-24"
              placeholder="Ep #"
              value={newEpisode.episode_number}
              onChange={(e) =>
                setNewEpisode({ ...newEpisode, episode_number: Number(e.target.value) })
              }
              min={1}
            />
            <input
              type="text"
              className="input flex-1 min-w-40"
              placeholder="Episode title"
              value={newEpisode.title}
              onChange={(e) => setNewEpisode({ ...newEpisode, title: e.target.value })}
            />
            <input
              type="date"
              className="input w-40"
              value={newEpisode.air_date}
              onChange={(e) => setNewEpisode({ ...newEpisode, air_date: e.target.value })}
            />
            <button onClick={addEpisode} className="btn-primary whitespace-nowrap">
              + Add Episode
            </button>
          </div>

          <div className="space-y-2">
            {episodes.map((ep) => (
              <div
                key={ep.id}
                className="flex items-center justify-between p-3 rounded-lg bg-bg-surface border border-border"
              >
                <div className="flex items-center gap-3">
                  <span className="text-accent-orange font-mono text-sm">E{ep.episode_number}</span>
                  <span className="text-text-primary">{ep.title || "Untitled"}</span>
                  {ep.air_date && (
                    <span className="text-text-muted text-xs">{ep.air_date}</span>
                  )}
                  {ep.is_merge && (
                    <span className="text-xs text-accent-gold">MERGE</span>
                  )}
                  {ep.is_scored && (
                    <span className="text-xs text-green-400">✓ Scored</span>
                  )}
                </div>
                <button
                  onClick={async () => {
                    await supabase.from("episodes").delete().eq("id", ep.id);
                    loadEpisodes(selectedSeason);
                  }}
                  className="text-red-500 hover:text-red-400 text-xs"
                >
                  Remove
                </button>
              </div>
            ))}
            {episodes.length === 0 && (
              <p className="text-text-muted text-sm text-center py-4">
                No episodes yet
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
