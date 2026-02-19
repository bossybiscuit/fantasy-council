"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

type AvailableTeam = { id: string; name: string };

type LeaguePreview = {
  league_id: string;
  league_name: string;
  season_name: string | null;
  num_teams: number;
  team_count: number;
  draft_type: string;
  already_joined: boolean;
  already_joined_league_id: string | null;
  available_teams: AvailableTeam[];
};

function JoinLeagueContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [code, setCode] = useState(searchParams.get("code")?.toUpperCase() || "");
  const [teamName, setTeamName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [preview, setPreview] = useState<LeaguePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [joining, setJoining] = useState(false);

  const hasPreCreatedTeams = (preview?.available_teams.length ?? 0) > 0;

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setLookingUp(true);
    setError(null);

    const res = await fetch(`/api/leagues/join?code=${encodeURIComponent(code)}`);
    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setLookingUp(false);
      return;
    }

    if (data.already_joined) {
      router.push(`/leagues/${data.already_joined_league_id}`);
      return;
    }

    setPreview(data);
    setSelectedTeamId(null);
    setLookingUp(false);
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setJoining(true);
    setError(null);

    const body = hasPreCreatedTeams
      ? { invite_code: code, team_id: selectedTeamId }
      : { invite_code: code, team_name: teamName };

    const res = await fetch("/api/leagues/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 409) {
        router.push(`/leagues/${data.league_id}`);
        return;
      }
      setError(data.error);
      setJoining(false);
    } else {
      router.push(`/leagues/${data.league_id}`);
    }
  }

  const canSubmit = hasPreCreatedTeams ? !!selectedTeamId : !!teamName.trim();

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="text-4xl mb-2">🪶</div>
        <h1 className="text-2xl font-bold text-text-primary">Join an Alliance</h1>
        <p className="text-text-muted mt-1 text-sm">
          Find your alliance by entering the invite code
        </p>
      </div>

      {/* ── Step 1: Enter code ── */}
      {!preview && (
        <div className="card">
          <h2 className="text-lg font-semibold text-text-primary mb-1">
            Enter the Tribal Code
          </h2>
          <p className="text-text-muted text-sm mb-5">
            Your commissioner shared a 6-character code — enter it below.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label className="label">Invite Code</label>
              <input
                type="text"
                className="input text-center text-2xl font-mono tracking-widest uppercase"
                placeholder="XXXXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={lookingUp || code.length !== 6}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {lookingUp ? "Searching…" : "Find My Tribe →"}
            </button>
          </form>
        </div>
      )}

      {/* ── Step 2: Preview + claim seat ── */}
      {preview && (
        <div className="card">
          {/* League preview */}
          <div className="rounded-lg bg-bg-surface border border-accent-orange/20 p-4 mb-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold text-text-primary text-lg leading-tight">
                  {preview.league_name}
                </p>
                {preview.season_name && (
                  <p className="text-text-muted text-sm mt-0.5">{preview.season_name}</p>
                )}
              </div>
              <span className="text-2xl">🔥</span>
            </div>
            <div className="flex gap-4 text-sm">
              <div>
                <p className="text-text-muted text-xs uppercase tracking-wider mb-0.5">Seats</p>
                <p className="font-semibold text-text-primary">
                  {preview.team_count} / {preview.num_teams}
                </p>
              </div>
              <div>
                <p className="text-text-muted text-xs uppercase tracking-wider mb-0.5">Draft</p>
                <p className="font-semibold text-text-primary capitalize">
                  {preview.draft_type}
                </p>
              </div>
              <div>
                <p className="text-text-muted text-xs uppercase tracking-wider mb-0.5">Open</p>
                <p className="font-semibold text-accent-orange">
                  {hasPreCreatedTeams
                    ? `${preview.available_teams.length} seat${preview.available_teams.length !== 1 ? "s" : ""}`
                    : `${preview.num_teams - preview.team_count} seat${preview.num_teams - preview.team_count !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            {/* Team picker (pre-created teams) */}
            {hasPreCreatedTeams ? (
              <div>
                <label className="label">Choose Your Seat</label>
                <div className="space-y-2 mt-2">
                  {preview.available_teams.map((team) => (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => setSelectedTeamId(team.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                        selectedTeamId === team.id
                          ? "border-accent-orange bg-accent-orange/10 text-text-primary"
                          : "border-border hover:border-accent-orange/40 text-text-muted"
                      }`}
                    >
                      <span className="font-medium">{team.name}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-text-muted mt-2">
                  Pick the seat your commissioner assigned to you.
                </p>
              </div>
            ) : (
              /* No pre-created teams — let user enter their own name */
              <div>
                <label className="label">Your Tribe Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Fire Walkers"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  autoFocus
                  required
                />
                <p className="text-xs text-text-muted mt-1">
                  This is how your alliance will know you.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setPreview(null); setError(null); }}
                className="btn-secondary flex-1"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={joining || !canSubmit}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {joining ? "Joining…" : "Claim My Seat 🔥"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function JoinLeaguePage() {
  return (
    <Suspense fallback={<div className="text-text-muted p-8 text-center">Loading…</div>}>
      <JoinLeagueContent />
    </Suspense>
  );
}
