"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import { Suspense } from "react";

function JoinLeagueContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code")?.toUpperCase() || "");
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/leagues/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_code: code, team_name: teamName }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 409) {
        router.push(`/leagues/${data.league_id}`);
        return;
      }
      setError(data.error);
      setLoading(false);
    } else {
      router.push(`/leagues/${data.league_id}`);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <PageHeader title="Join a League" subtitle="Enter your invite code to join" />

      <div className="card">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="label">Invite Code</label>
            <input
              type="text"
              className="input text-center text-2xl font-mono tracking-widest uppercase"
              placeholder="XXXXXX"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
            />
          </div>

          <div>
            <label className="label">Your Team Name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Fire Walkers"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6 || !teamName}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Joining..." : "Join League"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function JoinLeaguePage() {
  return (
    <Suspense fallback={<div className="text-text-muted p-8">Loading...</div>}>
      <JoinLeagueContent />
    </Suspense>
  );
}
