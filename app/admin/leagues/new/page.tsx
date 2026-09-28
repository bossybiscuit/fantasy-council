"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/ui/PageHeader";
import { LEAGUE_FORMATS, hasDraft } from "@/lib/league-format";
import {
  calculateRosterSize,
  MAX_DRAFT_LEAGUE_TEAMS,
  MAX_PREDICTIONS_LEAGUE_TEAMS,
} from "@/lib/utils";
import type { LeagueFormat, Season } from "@/types/database";

export default function AdminNewLeaguePage() {
  const router = useRouter();
  const supabase = createClient();

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState("");
  const [name, setName] = useState("");
  const [format, setFormat] = useState<LeagueFormat>("survivor_pool");
  const [draftType, setDraftType] = useState<"snake" | "auction">("snake");
  const [numTeams, setNumTeams] = useState(20);
  const [budget, setBudget] = useState(100);
  const [playerCount, setPlayerCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("seasons")
      .select("*")
      .order("season_number", { ascending: false })
      .then(({ data }) => {
        setSeasons(data || []);
        const live = (data || []).find((s) => s.status === "active") ?? (data || [])[0];
        if (live) setSeasonId(live.id);
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

  const maxTeams = hasDraft(format) ? MAX_DRAFT_LEAGUE_TEAMS : MAX_PREDICTIONS_LEAGUE_TEAMS;
  const { rosterSize } = calculateRosterSize(playerCount, numTeams);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/leagues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        season_id: seasonId,
        name,
        format,
        draft_type: draftType,
        num_teams: numTeams,
        budget,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create league");
      setLoading(false);
      return;
    }
    router.push(`/leagues/${data.league.id}`);
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Create a League" subtitle="Set the season, format, and size" />

      <div className="card space-y-5">
        <div>
          <label className="label">Season</label>
          <select className="input" value={seasonId} onChange={(e) => setSeasonId(e.target.value)}>
            {seasons.length === 0 && <option value="">No seasons yet</option>}
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.status})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">League Name</label>
          <input
            className="input"
            placeholder="e.g. The Outcasts League"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
          />
        </div>

        <div>
          <label className="label">Format</label>
          <div className="grid gap-2 sm:grid-cols-3">
            {LEAGUE_FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setFormat(f.id);
                  setNumTeams(hasDraft(f.id) ? 8 : 20);
                }}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  format === f.id
                    ? "border-accent-orange bg-accent-orange/10"
                    : "border-border hover:border-accent-orange/40"
                }`}
              >
                <p className="font-semibold text-text-primary text-sm">{f.title}</p>
                <p className="text-xs text-text-muted">{f.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {hasDraft(format) && (
          <>
            <div>
              <label className="label">Draft Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(["snake", "auction"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDraftType(t)}
                    className={`p-3 rounded-lg border-2 text-center capitalize transition-all ${
                      draftType === t
                        ? "border-accent-orange bg-accent-orange/10 text-accent-orange"
                        : "border-border text-text-muted hover:border-accent-orange/40"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            {draftType === "auction" && (
              <div>
                <label className="label">Budget per Team ($)</label>
                <input
                  type="number"
                  className="input"
                  value={budget}
                  min={50}
                  max={500}
                  onChange={(e) => setBudget(Number(e.target.value))}
                />
              </div>
            )}
          </>
        )}

        <div>
          <label className="label">{hasDraft(format) ? "Teams" : "Max Players"}</label>
          <input
            type="number"
            className="input"
            value={numTeams}
            min={2}
            max={maxTeams}
            onChange={(e) =>
              setNumTeams(Math.max(2, Math.min(maxTeams, Math.floor(Number(e.target.value) || 2))))
            }
          />
          <p className="text-xs text-text-muted mt-2">
            {hasDraft(format)
              ? `${playerCount} castaways · ${rosterSize} picks per team · up to ${maxTeams} teams`
              : `Players create their own team when they join with the invite code. Up to ${maxTeams}.`}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <Link href="/admin/leagues" className="btn-secondary text-sm">
            ← All Leagues
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !seasonId || !name.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Igniting…" : "🔥 Create League"}
          </button>
        </div>
      </div>
    </div>
  );
}
