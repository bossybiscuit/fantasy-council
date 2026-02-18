"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { calculateRosterSize } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import type { Season } from "@/types/database";

export default function NewLeaguePage() {
  const router = useRouter();
  const supabase = createClient();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState("");
  const [name, setName] = useState("");
  const [draftType, setDraftType] = useState<"snake" | "auction">("snake");
  const [numTeams, setNumTeams] = useState(8);
  const [budget, setBudget] = useState(100);
  const [playerCount, setPlayerCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("seasons")
      .select("*")
      .in("status", ["active", "upcoming"])
      .order("season_number", { ascending: false })
      .then(({ data }) => {
        if (data) setSeasons(data);
        if (data && data.length > 0) setSeasonId(data[0].id);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!seasonId) return;
    supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("season_id", seasonId)
      .eq("is_active", true)
      .then(({ count }) => setPlayerCount(count || 0));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonId]);

  const { rosterSize, remainder } = calculateRosterSize(playerCount, numTeams);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/leagues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        season_id: seasonId,
        name,
        draft_type: draftType,
        num_teams: numTeams,
        budget,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setLoading(false);
    } else {
      router.push(`/leagues/${data.league.id}`);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <PageHeader title="Create a League" subtitle="Set up your Survivor fantasy league" />

      <div className="card">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Season</label>
            <select
              className="input"
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              required
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {seasons.length === 0 && (
              <p className="text-yellow-400 text-xs mt-1">
                No active seasons found. A super admin must create one first.
              </p>
            )}
          </div>

          <div>
            <label className="label">League Name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. The Outcasts League"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Draft Type</label>
              <select
                className="input"
                value={draftType}
                onChange={(e) => setDraftType(e.target.value as "snake" | "auction")}
              >
                <option value="snake">Snake Draft</option>
                <option value="auction">Auction Draft</option>
              </select>
            </div>

            <div>
              <label className="label">Number of Teams</label>
              <select
                className="input"
                value={numTeams}
                onChange={(e) => setNumTeams(Number(e.target.value))}
              >
                {[6, 8, 10, 12].map((n) => (
                  <option key={n} value={n}>
                    {n} teams
                  </option>
                ))}
              </select>
            </div>
          </div>

          {draftType === "auction" && (
            <div>
              <label className="label">Budget per Team</label>
              <input
                type="number"
                className="input"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                min={50}
                max={500}
              />
            </div>
          )}

          {playerCount > 0 && (
            <div className="p-3 rounded-lg bg-bg-surface border border-border text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-text-muted">Active players in season:</span>
                <span className="text-text-primary">{playerCount}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-text-muted">Roster size per team:</span>
                <span className="text-text-primary">{rosterSize}</span>
              </div>
              {remainder > 0 && (
                <p className="text-yellow-400 text-xs mt-2">
                  ⚠️ {remainder} player(s) won&apos;t be drafted — cast size not evenly divisible by team count
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !seasonId || !name}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create League"}
          </button>
        </form>
      </div>
    </div>
  );
}
