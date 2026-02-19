"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";

type Team = {
  id: string;
  name: string;
  user_id: string | null;
  ownerName: string | null;
};

type AvailableUser = {
  id: string;
  display_name: string | null;
  username: string;
};

type League = {
  id: string;
  name: string;
  num_teams: number;
  draft_type: string;
  draft_status: string;
};

export default function AdminTeamsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = use(params);

  const [teams, setTeams] = useState<Team[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [league, setLeague] = useState<League | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignUserId, setAssignUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 3000);
  }

  async function loadData() {
    const res = await fetch(`/api/leagues/${leagueId}/teams`);
    const data = await res.json();
    if (data.teams) setTeams(data.teams);
    if (data.availableUsers) setAvailableUsers(data.availableUsers);
    if (data.league) setLeague(data.league);
  }

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  async function patch(body: object) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/leagues/${leagueId}/teams`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || `Error ${res.status}`);
      return false;
    }
    return true;
  }

  async function handleRename(teamId: string) {
    if (!editingName.trim()) return;
    const ok = await patch({ teamId, name: editingName.trim() });
    if (!ok) return;
    setEditingId(null);
    setEditingName("");
    showFlash("Team renamed");
    loadData();
  }

  async function handleKick(teamId: string, teamName: string) {
    if (!window.confirm(`Remove the player from "${teamName}"? The seat will reopen.`)) return;
    const ok = await patch({ teamId, userId: null });
    if (!ok) return;
    showFlash("Player removed — seat is now open");
    loadData();
  }

  async function handleAssign(teamId: string) {
    if (!assignUserId) return;
    const ok = await patch({ teamId, userId: assignUserId });
    if (!ok) return;
    setAssigningId(null);
    setAssignUserId("");
    showFlash("Player assigned to seat");
    loadData();
  }

  const claimed = teams.filter((t) => t.user_id);
  const unclaimed = teams.filter((t) => !t.user_id);
  const isFull = teams.length > 0 && unclaimed.length === 0;
  const draftReady = isFull && league?.draft_status === "pending";

  return (
    <div>
      <PageHeader
        title="Manage Teams"
        subtitle={league ? `${league.name} · ${league.draft_type === "auction" ? "Auction" : "Snake"} Draft` : undefined}
      />

      {/* Summary bar */}
      <div className="card mb-6">
        <div className="flex items-center gap-8 mb-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-gradient-fire">{claimed.length}</p>
            <p className="text-xs text-text-muted mt-0.5">Claimed</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-text-muted">{unclaimed.length}</p>
            <p className="text-xs text-text-muted mt-0.5">Open</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-text-primary">{teams.length}</p>
            <p className="text-xs text-text-muted mt-0.5">Total</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          {isFull ? (
            <p className="text-green-400 text-sm">
              All seats claimed — you&apos;re ready to open the draft. 🔥
            </p>
          ) : (
            <p className="text-text-muted text-sm">
              {unclaimed.length} seat{unclaimed.length !== 1 ? "s" : ""} still open.
              You can assign players above or start the draft now — the commissioner can pick for empty seats.
            </p>
          )}
          <Link
            href={`/leagues/${leagueId}/draft`}
            className="btn-primary text-sm shrink-0"
          >
            Draft Room →
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
          {error}
        </div>
      )}
      {flash && (
        <div className="mb-4 p-3 rounded-lg bg-green-900/20 border border-green-700/30 text-green-400 text-sm">
          {flash}
        </div>
      )}

      {/* Team table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-text-muted font-medium w-10">#</th>
                <th className="text-left py-3 px-4 text-text-muted font-medium">Team Name</th>
                <th className="text-left py-3 px-4 text-text-muted font-medium">Owner</th>
                <th className="text-left py-3 px-4 text-text-muted font-medium">Status</th>
                <th className="text-right py-3 px-4 text-text-muted font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-text-muted text-sm">
                    No teams found.
                  </td>
                </tr>
              )}
              {teams.map((team, i) => (
                <tr
                  key={team.id}
                  className={`border-b border-border last:border-0 transition-colors ${
                    team.user_id ? "bg-accent-orange/5" : ""
                  }`}
                >
                  {/* # */}
                  <td className="py-3 px-4 text-text-muted">{i + 1}</td>

                  {/* Team name — click to rename */}
                  <td className="py-3 px-4">
                    {editingId === team.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="input py-1 text-sm flex-1"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(team.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleRename(team.id)}
                          disabled={loading || !editingName.trim()}
                          className="btn-primary text-xs py-1 px-3 disabled:opacity-40"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="btn-secondary text-xs py-1 px-2"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(team.id);
                          setEditingName(team.name);
                          setAssigningId(null);
                        }}
                        className="text-text-primary font-medium hover:text-accent-orange transition-colors text-left"
                        title="Click to rename"
                      >
                        {team.name}
                      </button>
                    )}
                  </td>

                  {/* Owner / assign dropdown */}
                  <td className="py-3 px-4">
                    {assigningId === team.id ? (
                      <div className="flex gap-2">
                        <select
                          value={assignUserId}
                          onChange={(e) => setAssignUserId(e.target.value)}
                          className="input py-1 text-sm flex-1"
                        >
                          <option value="">Select player…</option>
                          {availableUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.display_name || u.username}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAssign(team.id)}
                          disabled={loading || !assignUserId}
                          className="btn-primary text-xs py-1 px-3 disabled:opacity-40"
                        >
                          Assign
                        </button>
                        <button
                          onClick={() => { setAssigningId(null); setAssignUserId(""); }}
                          className="btn-secondary text-xs py-1 px-2"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span className={team.ownerName ? "text-text-primary" : "text-text-muted"}>
                        {team.ownerName || "—"}
                      </span>
                    )}
                  </td>

                  {/* Status badge */}
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                        team.user_id
                          ? "text-accent-orange bg-accent-orange/10 border-accent-orange/20"
                          : "text-text-muted bg-bg-surface border-border"
                      }`}
                    >
                      {team.user_id ? "Claimed" : "Open"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    {editingId !== team.id && assigningId !== team.id && (
                      <div className="flex items-center justify-end gap-4">
                        <button
                          onClick={() => {
                            setEditingId(team.id);
                            setEditingName(team.name);
                            setAssigningId(null);
                          }}
                          className="text-xs text-text-muted hover:text-text-primary transition-colors"
                        >
                          Rename
                        </button>
                        {team.user_id ? (
                          <button
                            onClick={() => handleKick(team.id, team.name)}
                            disabled={loading}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                          >
                            Kick
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setAssigningId(team.id);
                              setAssignUserId("");
                              setEditingId(null);
                            }}
                            className="text-xs text-accent-orange hover:text-accent-gold transition-colors"
                          >
                            Assign
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
