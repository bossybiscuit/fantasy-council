"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { calculateRosterSize } from "@/lib/utils";
import type { Season } from "@/types/database";

const STEPS = [
  { num: 1, label: "Season" },
  { num: 2, label: "Name" },
  { num: 3, label: "Rules" },
  { num: 4, label: "Launch" },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, i) => (
        <div key={step.num} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                current === step.num
                  ? "border-accent-orange bg-accent-orange text-white"
                  : current > step.num
                  ? "border-accent-orange bg-accent-orange/20 text-accent-orange"
                  : "border-border bg-bg-surface text-text-muted"
              }`}
            >
              {current > step.num ? "✓" : step.num}
            </div>
            <span
              className={`text-xs mt-1 ${
                current === step.num ? "text-accent-orange" : "text-text-muted"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`w-12 h-0.5 mb-5 mx-1 transition-colors ${
                current > step.num ? "bg-accent-orange/40" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-muted text-sm">{label}</span>
      <span className="text-text-primary font-medium text-sm">{value}</span>
    </div>
  );
}

export default function NewLeaguePage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
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

  const selectedSeason = seasons.find((s) => s.id === seasonId);
  const { rosterSize, remainder } = calculateRosterSize(playerCount, numTeams);

  async function handleSubmit() {
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
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="text-4xl mb-2">🔥</div>
        <h1 className="text-2xl font-bold text-text-primary">Start Your Alliance</h1>
        <p className="text-text-muted mt-1 text-sm">Gather your tribe and draft your Survivors</p>
      </div>

      <StepIndicator current={step} />

      <div className="card">
        {/* ── Step 1: Season ── */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-1">Choose Your Season</h2>
            <p className="text-text-muted text-sm mb-5">Which Survivor season is your league playing?</p>

            {seasons.length === 0 ? (
              <div className="p-4 rounded-lg bg-yellow-900/20 border border-yellow-700/30 text-yellow-400 text-sm">
                No active seasons found. A super admin must create one first.
              </div>
            ) : (
              <div className="space-y-3">
                {seasons.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSeasonId(s.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      seasonId === s.id
                        ? "border-accent-orange bg-accent-orange/10"
                        : "border-border hover:border-accent-orange/40"
                    }`}
                  >
                    <p className="font-semibold text-text-primary">{s.name}</p>
                    <p className="text-xs text-text-muted mt-0.5">Season {s.season_number}</p>
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!seasonId}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Name ── */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-1">Name Your Tribe</h2>
            <p className="text-text-muted text-sm mb-5">
              This is what your alliance members will see when they join.
            </p>

            <div>
              <label className="label">League Name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. The Outcasts League"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-text-muted mt-2">
                Pick something memorable — your alliance is counting on you.
              </p>
            </div>

            <div className="flex justify-between mt-6">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary">
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!name.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Rules ── */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-1">Set the Rules</h2>
            <p className="text-text-muted text-sm mb-5">
              How many tribes? How do you pick your Survivors?
            </p>

            <div className="mb-5">
              <label className="label">Draft Format</label>
              <div className="grid grid-cols-2 gap-3">
                {(["snake", "auction"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDraftType(type)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      draftType === type
                        ? "border-accent-orange bg-accent-orange/10"
                        : "border-border hover:border-accent-orange/40"
                    }`}
                  >
                    <p className="font-semibold text-text-primary capitalize">{type}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {type === "snake"
                        ? "Take turns picking in order"
                        : "Bid on players with a budget"}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="label">Number of Teams</label>
              <div className="grid grid-cols-4 gap-2">
                {[6, 8, 10, 12].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNumTeams(n)}
                    className={`py-3 rounded-lg border-2 text-center font-semibold transition-all ${
                      numTeams === n
                        ? "border-accent-orange bg-accent-orange/10 text-accent-orange"
                        : "border-border text-text-muted hover:border-accent-orange/40"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {draftType === "auction" && (
              <div className="mb-5">
                <label className="label">Budget per Team ($)</label>
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
                  <span className="text-text-muted">Cast size:</span>
                  <span className="text-text-primary">{playerCount} castaways</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Roster per team:</span>
                  <span className="text-text-primary">{rosterSize} picks</span>
                </div>
                {remainder > 0 && (
                  <p className="text-yellow-400 text-xs mt-2">
                    ⚠️ {remainder} castaway(s) won't be drafted — cast doesn&apos;t divide evenly
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-between mt-6">
              <button type="button" onClick={() => setStep(2)} className="btn-secondary">
                ← Back
              </button>
              <button type="button" onClick={() => setStep(4)} className="btn-primary">
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Review & Launch ── */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-1">Ready to Start the Game?</h2>
            <p className="text-text-muted text-sm mb-5">
              Review your settings, then light the torch.
            </p>

            <div className="rounded-lg bg-bg-surface border border-border p-4 space-y-3 mb-5">
              <SummaryRow label="Season" value={selectedSeason?.name || "—"} />
              <SummaryRow label="League Name" value={name} />
              <SummaryRow
                label="Draft Format"
                value={
                  draftType === "snake"
                    ? "Snake Draft"
                    : `Auction Draft ($${budget}/team)`
                }
              />
              <SummaryRow label="Teams" value={`${numTeams} teams`} />
              {playerCount > 0 && (
                <SummaryRow
                  label="Roster Size"
                  value={`${rosterSize} picks per team`}
                />
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(3)} className="btn-secondary">
                ← Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Starting…" : "🔥 Light the Torch"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
