"use client";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { getTierBadgeClass } from "@/lib/utils";

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

type Player = {
  id: string;
  name: string;
  tribe: string | null;
  tier: string | null;
  suggested_value: number;
  img_url: string | null;
};

type Pick = {
  id: string;
  team_id: string;
  player_id: string;
  commissioner_pick: boolean;
  players: { id: string; name: string; tribe: string | null; tier: string | null } | null;
};

export default function AdminTeamsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = use(params);

  // Teams / users section
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

  // Manual player assignment section
  const [rosterPlayers, setRosterPlayers] = useState<Player[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [rosterSize, setRosterSize] = useState<number | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [playerFilter, setPlayerFilter] = useState("");
  const [assignPickLoading, setAssignPickLoading] = useState(false);

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 3000);
  }

  const loadTeamData = useCallback(async () => {
    const res = await fetch(`/api/leagues/${leagueId}/teams`);
    const data = await res.json();
    if (data.teams) setTeams(data.teams);
    if (data.availableUsers) setAvailableUsers(data.availableUsers);
    if (data.league) setLeague(data.league);
  }, [leagueId]);

  const loadRosterData = useCallback(async () => {
    const res = await fetch(`/api/leagues/${leagueId}/roster`);
    if (!res.ok) return;
    const data = await res.json();
    setRosterPlayers(data.players || []);
    setPicks(data.picks || []);
    if (data.rosterSize) setRosterSize(data.rosterSize);
  }, [leagueId]);

  useEffect(() => {
    loadTeamData();
    loadRosterData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  // ── Team management helpers ──────────────────────────────────────────────

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
    loadTeamData();
  }

  async function handleKick(teamId: string, teamName: string) {
    if (!window.confirm(`Remove the player from "${teamName}"? The seat will reopen.`)) return;
    const ok = await patch({ teamId, userId: null });
    if (!ok) return;
    showFlash("Player removed — seat is now open");
    loadTeamData();
  }

  async function handleAssign(teamId: string) {
    if (!assignUserId) return;
    const ok = await patch({ teamId, userId: assignUserId });
    if (!ok) return;
    setAssigningId(null);
    setAssignUserId("");
    showFlash("Player assigned to seat");
    loadTeamData();
  }

  // ── Manual player assignment helpers ────────────────────────────────────

  const draftedPlayerIds = new Set(picks.map((p) => p.player_id));

  const undraftedPlayers = rosterPlayers.filter(
    (p) => !draftedPlayerIds.has(p.id) &&
      (!playerFilter || p.name.toLowerCase().includes(playerFilter.toLowerCase()))
  );

  function getRoster(teamId: string) {
    return picks.filter((p) => p.team_id === teamId);
  }

  async function assignPlayerToTeam(teamId: string) {
    if (!selectedPlayerId) return;
    setAssignPickLoading(true);
    setError(null);

    const res = await fetch("/api/draft/pick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        league_id: leagueId,
        team_id: teamId,
        player_id: selectedPlayerId,
      }),
    });

    const data = await res.json();
    setAssignPickLoading(false);

    if (!res.ok) {
      setError(data.error || `Error ${res.status}`);
      return;
    }

    setSelectedPlayerId(null);
    showFlash("Player assigned");
    loadRosterData();
  }

  async function removePick(pickId: string) {
    setAssignPickLoading(true);
    setError(null);

    const res = await fetch("/api/draft/pick", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pick_id: pickId, league_id: leagueId }),
    });

    const data = await res.json();
    setAssignPickLoading(false);

    if (!res.ok) {
      setError(data.error || `Error ${res.status}`);
      return;
    }

    showFlash("Player removed from roster");
    loadRosterData();
  }

  const claimed = teams.filter((t) => t.user_id);
  const unclaimed = teams.filter((t) => !t.user_id);
  const isFull = teams.length > 0 && unclaimed.length === 0;
  const selectedPlayer = rosterPlayers.find((p) => p.id === selectedPlayerId);

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
      <div className="card overflow-hidden mb-8">
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

      {/* Manual Player Assignment */}
      <div className="mb-2">
        <h2 className="section-title">Manual Player Assignment</h2>
        <p className="text-text-muted text-sm mt-1">
          Directly assign castaway players to team rosters — useful for correcting picks or pre-filling draft results.
        </p>
      </div>

      {rosterPlayers.length === 0 ? (
        <div className="card text-center py-8 text-text-muted text-sm">
          Loading players…
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-4">
          {/* Left: Unassigned players */}
          <div className="w-full md:w-64 md:shrink-0">
            <div className="card">
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                Available Players ({undraftedPlayers.length})
              </h3>
              <input
                type="text"
                className="input text-sm py-1.5 mb-3 w-full"
                placeholder="Search…"
                value={playerFilter}
                onChange={(e) => setPlayerFilter(e.target.value)}
              />
              <div className="space-y-1 max-h-[60vh] overflow-y-auto scrollbar-hide">
                {undraftedPlayers.map((player) => (
                  <button
                    key={player.id}
                    onClick={() =>
                      setSelectedPlayerId(
                        selectedPlayerId === player.id ? null : player.id
                      )
                    }
                    className={`w-full text-left p-2 rounded-lg border transition-colors text-sm ${
                      selectedPlayerId === player.id
                        ? "border-accent-orange bg-accent-orange/10 text-accent-orange"
                        : "border-border hover:border-accent-orange/30 hover:bg-bg-surface text-text-primary"
                    }`}
                  >
                    <span className="font-medium">{player.name}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      {player.tribe && (
                        <span className="text-xs text-text-muted">{player.tribe}</span>
                      )}
                      {player.tier && (
                        <span className={getTierBadgeClass(player.tier)}>
                          {player.tier}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
                {undraftedPlayers.length === 0 && (
                  <p className="text-text-muted text-xs text-center py-4">
                    {draftedPlayerIds.size === rosterPlayers.length
                      ? "All players assigned"
                      : "No matches"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Team rosters */}
          <div className="flex-1 min-w-0 space-y-4">
            {selectedPlayer && (
              <div className="p-3 rounded-lg bg-accent-orange/10 border border-accent-orange/30 text-sm text-accent-orange">
                Selected: <strong>{selectedPlayer.name}</strong>
                {selectedPlayer.tribe && ` · ${selectedPlayer.tribe}`}
                {selectedPlayer.tier && ` · Tier ${selectedPlayer.tier}`}
                {" — click a team below to assign"}
              </div>
            )}
            {teams.map((team) => {
              const roster = getRoster(team.id);
              const isFull = rosterSize !== null && roster.length >= rosterSize;

              return (
                <div key={team.id} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-text-primary">{team.name}</p>
                      <p className="text-xs text-text-muted">
                        {team.ownerName || "No owner"} · {roster.length}
                        {rosterSize ? `/${rosterSize}` : ""} players
                      </p>
                    </div>
                    {selectedPlayerId && !isFull && (
                      <button
                        onClick={() => assignPlayerToTeam(team.id)}
                        disabled={assignPickLoading}
                        className="btn-primary text-xs py-1 px-3 disabled:opacity-40"
                      >
                        {assignPickLoading ? "…" : `Add ${selectedPlayer?.name || "player"}`}
                      </button>
                    )}
                    {isFull && (
                      <span className="text-xs text-text-muted">Roster full</span>
                    )}
                  </div>

                  {roster.length === 0 ? (
                    <p className="text-text-muted text-xs italic">No players assigned</p>
                  ) : (
                    <div className="space-y-1">
                      {roster.map((pick) => (
                        <div
                          key={pick.id}
                          className="flex items-center justify-between text-sm py-1 px-2 rounded bg-bg-surface"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-text-primary">{pick.players?.name || "—"}</span>
                            {pick.players?.tier && (
                              <span className={getTierBadgeClass(pick.players.tier)}>
                                {pick.players.tier}
                              </span>
                            )}
                            {pick.commissioner_pick && (
                              <span className="text-[10px] text-accent-orange/60" title="Commissioner pick">📋</span>
                            )}
                          </div>
                          <button
                            onClick={() => removePick(pick.id)}
                            disabled={assignPickLoading}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                            title="Remove from roster"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
