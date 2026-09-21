"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { League, Season } from "@/types/database";

type Continuation = { id: string; name: string; season_id: string };

export default function NewSeasonCard({ league }: { league: League }) {
  const router = useRouter();
  const supabase = createClient();

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [continuations, setContinuations] = useState<Continuation[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [seasonId, setSeasonId] = useState("");
  const [name, setName] = useState(league.name);
  const [format, setFormat] = useState<"predictions" | "draft">("predictions");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("seasons").select("*").order("season_number", { ascending: false }),
      supabase.from("leagues").select("id, name, season_id").eq("parent_league_id", league.id),
      supabase
        .from("teams")
        .select("id", { count: "exact", head: true })
        .eq("league_id", league.id)
        .not("user_id", "is", null),
    ]).then(([s, c, t]) => {
      const current = (s.data || []).find((x) => x.id === league.season_id);
      const taken = new Set((c.data || []).map((x) => x.season_id));
      // Only newer seasons that this league hasn't already moved on to
      const options = (s.data || []).filter(
        (x) =>
          x.id !== league.season_id &&
          !taken.has(x.id) &&
          x.status !== "completed" &&
          (!current || x.season_number > current.season_number)
      );
      setSeasons(options);
      setSeasonId(options[options.length - 1]?.id ?? "");
      setContinuations(c.data || []);
      setMemberCount(t.count || 0);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [league.id]);

  async function handleStart() {
    const season = seasons.find((s) => s.id === seasonId);
    if (!season) return;
    if (
      !window.confirm(
        `Start "${name}" for ${season.name}? All ${memberCount} current members will be added automatically.`
      )
    )
      return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/leagues/${league.id}/new-season`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ season_id: seasonId, name, format }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to start new season");
      setLoading(false);
      if (data.league_id) router.push(`/leagues/${data.league_id}`);
      return;
    }
    router.push(`/leagues/${data.league.id}`);
  }

  return (
    <div className="card mt-8 border-accent-gold/20">
      <h3 className="section-title mb-1">Start a New Season</h3>
      <p className="text-text-muted text-sm mb-4">
        Carry this league into the next season. All{" "}
        <strong className="text-text-primary">{memberCount}</strong> current members come along
        automatically with their team names and your scoring settings. New people can join with the
        new league&rsquo;s invite code. This season stays in League History.
      </p>

      {continuations.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-bg-surface border border-border text-sm">
          <p className="text-text-muted text-xs mb-1">Already continued as:</p>
          {continuations.map((c) => (
            <Link
              key={c.id}
              href={`/leagues/${c.id}`}
              className="block text-accent-orange hover:underline"
            >
              {c.name} →
            </Link>
          ))}
        </div>
      )}

      {seasons.length === 0 ? (
        <p className="text-sm text-text-muted">
          No newer season is available yet. A super admin needs to create it first.
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="label">Season</label>
            <select className="input" value={seasonId} onChange={(e) => setSeasonId(e.target.value)}>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">League Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </div>
          <div>
            <label className="label">Format</label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: "predictions", title: "Predictions", desc: "No draft — room for everyone" },
                  { id: "draft", title: "Draft", desc: "Rosters via snake/auction draft" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id)}
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

          {error && (
            <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleStart}
            disabled={loading || !seasonId || !name.trim()}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Lighting the torches…" : "🔥 Start New Season"}
          </button>
        </div>
      )}
    </div>
  );
}
