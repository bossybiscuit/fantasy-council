"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/ui/PageHeader";

type Team = {
  id: string;
  name: string;
  user_id: string | null;
  draft_order: number | null;
  profiles?: { display_name: string | null; username: string } | null;
};

export default function AdminTeamsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = use(params);
  const supabase = createClient();

  const [teams, setTeams] = useState<Team[]>([]);
  const [league, setLeague] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
    supabase
      .from("leagues")
      .select("id, name, num_teams, budget")
      .eq("id", leagueId)
      .single()
      .then(({ data }) => { if (data) setLeague(data); });
    loadTeams();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  async function loadTeams() {
    const res = await fetch(`/api/leagues/${leagueId}/teams`);
    const data = await res.json();
    if (data.teams) setTeams(data.teams);
  }

  function flash(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  }

  async function handleAddTeam() {
    if (!newTeamName.trim()) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/leagues/${leagueId}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTeamName }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setNewTeamName("");
    flash("Team added");
    loadTeams();
  }

  async function handleRename(teamId: string) {
    if (!editingName.trim()) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/leagues/${leagueId}/teams`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, name: editingName }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setEditingId(null);
    setEditingName("");
    flash("Team renamed");
    loadTeams();
  }

  async function handleClaimSeat(teamId: string) {
    if (!currentUserId) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/leagues/${leagueId}/teams`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, userId: currentUserId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    flash("Seat claimed!");
    loadTeams();
  }

  async function handleDelete(teamId: string) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/leagues/${leagueId}/teams`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    flash("Team removed");
    loadTeams();
  }

  const claimed = teams.filter((t) => t.user_id);
  const unclaimed = teams.filter((t) => !t.user_id);
  const iAlreadyHaveTeam = teams.some((t) => t.user_id === currentUserId);

  return (
    <div>
      <PageHeader
        title="Manage Teams"
        subtitle="Pre-create named seats for your tribe — players claim them when they join"
      />

      {/* Seat counter */}
      {league && (
        <div className="flex gap-4 mb-6">
          <div className="stat-tablet flex-1">
            <p className="stat-number">{teams.length}</p>
            <p className="stat-label">Teams created</p>
          </div>
          <div className="stat-tablet flex-1">
            <p className="stat-number">{claimed.length}</p>
            <p className="stat-label">Claimed</p>
          </div>
          <div className="stat-tablet flex-1">
            <p className="stat-number">{unclaimed.length}</p>
            <p className="stat-label">Open seats</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-lg bg-green-900/20 border border-green-700/30 text-green-400 text-sm">
          {success}
        </div>
      )}

      {/* Add team */}
      <div className="card mb-6">
        <h3 className="section-title mb-3">Add a Team</h3>
        <div className="flex gap-2">
          <input
            type="text"
            className="input flex-1"
            placeholder="e.g. Luzon, Solana, Coyopa…"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTeam()}
            maxLength={50}
          />
          <button
            onClick={handleAddTeam}
            disabled={loading || !newTeamName.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Team
          </button>
        </div>
      </div>

      {/* Team list */}
      <div className="card">
        <h3 className="section-title mb-4">All Teams</h3>

        {teams.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-6">
            No teams yet — add some above and share your invite code.
          </p>
        ) : (
          <div className="space-y-2">
            {teams.map((team) => {
              const owner = team.profiles as any;
              const ownerName = owner?.display_name || owner?.username || null;
              const isMyTeam = team.user_id === currentUserId;

              return (
                <div
                  key={team.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    team.user_id
                      ? "border-accent-orange/20 bg-accent-orange/5"
                      : "border-border bg-bg-surface"
                  }`}
                >
                  {/* Status dot */}
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      team.user_id ? "bg-accent-orange" : "bg-border"
                    }`}
                  />

                  {/* Name (editable) */}
                  <div className="flex-1 min-w-0">
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
                          disabled={loading}
                          className="btn-primary text-xs py-1 px-3"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="btn-secondary text-xs py-1 px-3"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div>
                        <span className="text-text-primary font-medium">{team.name}</span>
                        {isMyTeam && (
                          <span className="ml-2 text-xs text-accent-orange">(you)</span>
                        )}
                      </div>
                    )}
                    {team.user_id && ownerName && editingId !== team.id && (
                      <p className="text-text-muted text-xs mt-0.5">Claimed by {ownerName}</p>
                    )}
                    {!team.user_id && editingId !== team.id && (
                      <p className="text-text-muted text-xs mt-0.5">Open seat</p>
                    )}
                  </div>

                  {/* Actions */}
                  {editingId !== team.id && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setEditingId(team.id);
                          setEditingName(team.name);
                        }}
                        className="text-xs text-text-muted hover:text-text-primary transition-colors"
                      >
                        Rename
                      </button>
                      {!team.user_id && !iAlreadyHaveTeam && (
                        <button
                          onClick={() => handleClaimSeat(team.id)}
                          disabled={loading}
                          className="text-xs text-accent-orange hover:text-accent-gold transition-colors disabled:opacity-50"
                        >
                          Claim
                        </button>
                      )}
                      {!team.user_id && (
                        <button
                          onClick={() => handleDelete(team.id)}
                          disabled={loading}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
