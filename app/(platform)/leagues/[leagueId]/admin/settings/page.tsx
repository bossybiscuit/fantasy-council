"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/ui/PageHeader";
import { DEFAULT_SCORING } from "@/lib/scoring";

type TabId = "challenges" | "milestones" | "optional" | "title";

const TABS: { id: TabId; label: string }[] = [
  { id: "challenges", label: "Challenge Points" },
  { id: "milestones", label: "Milestone Points" },
  { id: "optional", label: "Optional Scoring" },
  { id: "title", label: "Episode Title" },
];

// ── Point Stepper ─────────────────────────────────────────────────────────────

function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  hasError,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  hasError?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        className="w-7 h-7 rounded-full bg-bg-surface border border-border text-accent-orange hover:bg-accent-orange/10 transition-colors text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed"
      >
        −
      </button>
      <input
        type="number"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        className={`w-14 text-center bg-bg-surface border rounded-lg py-1 text-sm font-semibold focus:outline-none transition-colors
          ${disabled ? "opacity-30 cursor-not-allowed text-text-muted border-border" : "text-text-primary focus:border-accent-orange"}
          ${hasError ? "border-red-500 text-red-400" : "border-border"}`}
        min={min}
        max={max}
      />
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        className="w-7 h-7 rounded-full bg-bg-surface border border-border text-accent-orange hover:bg-accent-orange/10 transition-colors text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed"
      >
        +
      </button>
    </div>
  );
}

// ── Score Row ─────────────────────────────────────────────────────────────────

function ScoreRow({
  icon,
  label,
  description,
  value,
  onChange,
  min = 0,
  max = 99,
  hasError,
  note,
}: {
  icon: string;
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  hasError?: boolean;
  note?: React.ReactNode;
}) {
  return (
    <div
      className={`p-4 rounded-lg bg-bg-card border-l-4 mb-3 ${
        hasError ? "border-red-500" : "border-accent-gold"
      }`}
    >
      <div className="flex items-center gap-4">
        <span className="text-2xl shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-text-primary font-medium">{label}</p>
          <p className="text-text-muted text-xs mt-0.5">{description}</p>
        </div>
        <Stepper value={value} onChange={onChange} min={min} max={max} hasError={hasError} />
      </div>
      {note && <div className="mt-2 ml-10">{note}</div>}
    </div>
  );
}

// ── Toggle Row ────────────────────────────────────────────────────────────────

function ToggleRow({
  icon,
  label,
  description,
  enabled,
  onToggle,
  children,
}: {
  icon: string;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border-l-4 border-accent-gold mb-3 overflow-hidden transition-colors ${
        enabled ? "bg-accent-orange/5" : "bg-bg-card"
      }`}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl shrink-0">{icon}</span>
          <div className="min-w-0">
            <p className={`font-medium ${enabled ? "text-text-primary" : "text-text-muted"}`}>
              {label}
            </p>
            <p className="text-text-muted text-xs mt-0.5">{description}</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-orange" />
        </label>
      </div>
      {enabled && children && (
        <div className="px-4 pb-4 border-t border-border/50 pt-3 ml-10">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LeagueSettingsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const [league, setLeague] = useState<any>(null);
  const [config, setConfig] = useState<any>({});
  const [activeTab, setActiveTab] = useState<TabId>("challenges");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("leagues")
      .select("*")
      .eq("id", leagueId)
      .single()
      .then(({ data }) => {
        if (data) {
          setLeague(data);
          setConfig((data.scoring_config as any) || {});
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // Get value from config, falling back to DEFAULT_SCORING, then a hardcoded fallback
  function val(key: string, fallback: number): number {
    return config[key] ?? (DEFAULT_SCORING as any)[key] ?? fallback;
  }

  function set(key: string, v: number) {
    setConfig((prev: any) => ({ ...prev, [key]: v }));
    setValidationErrors((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  function validate(): boolean {
    const errors = new Set<string>();
    const numericKeys = [
      "TRIBE_REWARD_WIN", "INDIVIDUAL_REWARD_WIN", "TRIBE_IMMUNITY_WIN",
      "INDIVIDUAL_IMMUNITY_WIN", "TRIBE_IMMUNITY_SECOND", "MERGE_BONUS",
      "FINAL_THREE_BONUS", "WINNER_BONUS", "EPISODE_TITLE_SPEAKER", "WINNER_DIFFERENTIAL",
    ];
    for (const key of numericKeys) {
      if (val(key, 0) < 0) errors.add(key);
    }
    if (config.enable_confessionals && val("CONFESSIONAL_POINT", 1) < 0) errors.add("CONFESSIONAL_POINT");
    if (config.enable_idols && val("IDOL_PLAY_POINT", 3) < 0) errors.add("IDOL_PLAY_POINT");
    if (config.enable_advantages && val("ADVANTAGE_POINT", 2) < 0) errors.add("ADVANTAGE_POINT");
    setValidationErrors(errors);
    return errors.size === 0;
  }

  async function saveSettings() {
    if (!validate()) {
      showToast("Some values are out of range — please correct them.", "error");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("leagues")
      .update({ scoring_config: config })
      .eq("id", leagueId);
    setLoading(false);
    if (!error) {
      showToast("The council has spoken. Scoring updated.");
    } else {
      showToast("Failed to save settings.", "error");
    }
  }

  function handleResetToDefaults() {
    if (!window.confirm("Reset all scoring to default values? This cannot be undone.")) return;
    setConfig({});
    setValidationErrors(new Set());
    showToast("Scoring reset to defaults.");
  }

  async function handleDelete() {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/leagues/${leagueId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || `Error ${res.status}`);
        setDeleteLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      setDeleteError("Failed to delete league — check your connection and try again");
      setDeleteLoading(false);
    }
  }

  if (!league) return <div className="text-text-muted p-8">Loading...</div>;

  const winnerDiff = val("WINNER_DIFFERENTIAL", DEFAULT_SCORING.WINNER_DIFFERENTIAL);

  return (
    <div className="pb-28">
      <PageHeader title="Scoring Settings" subtitle="Customize how points are awarded in your league" />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-medium border animate-in fade-in slide-in-from-top-2 duration-200 ${
            toast.type === "success"
              ? "bg-green-950/95 border-green-700/50 text-green-300"
              : "bg-red-950/95 border-red-700/50 text-red-300"
          }`}
        >
          {toast.type === "success" ? "🔥 " : "⚠️ "}{toast.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
              activeTab === tab.id
                ? "text-accent-orange"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-orange rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Challenge Points ──────────────────────────────────────────── */}
      {activeTab === "challenges" && (
        <div>
          <ScoreRow
            icon="🏆"
            label="Tribe Reward Win"
            description="Awarded to each member of the winning tribe in a reward challenge."
            value={val("TRIBE_REWARD_WIN", DEFAULT_SCORING.TRIBE_REWARD_WIN)}
            onChange={(v) => set("TRIBE_REWARD_WIN", v)}
            hasError={validationErrors.has("TRIBE_REWARD_WIN")}
          />
          <ScoreRow
            icon="⚔️"
            label="Individual Reward Win"
            description="Awarded to the sole winner of an individual reward challenge."
            value={val("INDIVIDUAL_REWARD_WIN", DEFAULT_SCORING.INDIVIDUAL_REWARD_WIN)}
            onChange={(v) => set("INDIVIDUAL_REWARD_WIN", v)}
            hasError={validationErrors.has("INDIVIDUAL_REWARD_WIN")}
          />
          <ScoreRow
            icon="🛡️"
            label="Tribe Immunity Win"
            description="Awarded to each member of the tribe that wins immunity."
            value={val("TRIBE_IMMUNITY_WIN", DEFAULT_SCORING.TRIBE_IMMUNITY_WIN)}
            onChange={(v) => set("TRIBE_IMMUNITY_WIN", v)}
            hasError={validationErrors.has("TRIBE_IMMUNITY_WIN")}
          />
          <ScoreRow
            icon="👑"
            label="Individual Immunity Win"
            description="Awarded to the holder of the individual immunity necklace."
            value={val("INDIVIDUAL_IMMUNITY_WIN", DEFAULT_SCORING.INDIVIDUAL_IMMUNITY_WIN)}
            onChange={(v) => set("INDIVIDUAL_IMMUNITY_WIN", v)}
            hasError={validationErrors.has("INDIVIDUAL_IMMUNITY_WIN")}
          />
          <ScoreRow
            icon="🥈"
            label="Tribe Immunity Second Place"
            description="Awarded to each member of the second-place tribe in three-tribe seasons."
            value={val("TRIBE_IMMUNITY_SECOND", DEFAULT_SCORING.TRIBE_IMMUNITY_SECOND)}
            onChange={(v) => set("TRIBE_IMMUNITY_SECOND", v)}
            hasError={validationErrors.has("TRIBE_IMMUNITY_SECOND")}
          />
        </div>
      )}

      {/* ── Tab: Milestone Points ──────────────────────────────────────────── */}
      {activeTab === "milestones" && (
        <div>
          <ScoreRow
            icon="🤝"
            label="Merge Bonus"
            description="One-time bonus awarded to each player that survives to the merge episode."
            value={val("MERGE_BONUS", DEFAULT_SCORING.MERGE_BONUS)}
            onChange={(v) => set("MERGE_BONUS", v)}
            hasError={validationErrors.has("MERGE_BONUS")}
          />
          <ScoreRow
            icon="🔥"
            label="Final Three Bonus"
            description="Awarded to each castaway who makes it to the Final Three."
            value={val("FINAL_THREE_BONUS", DEFAULT_SCORING.FINAL_THREE_BONUS)}
            onChange={(v) => set("FINAL_THREE_BONUS", v)}
            hasError={validationErrors.has("FINAL_THREE_BONUS")}
          />
          <ScoreRow
            icon="👸"
            label="Winner Bonus"
            description="Awarded to the Sole Survivor — the winner of the game."
            value={val("WINNER_BONUS", DEFAULT_SCORING.WINNER_BONUS)}
            onChange={(v) => set("WINNER_BONUS", v)}
            hasError={validationErrors.has("WINNER_BONUS")}
          />
          <ScoreRow
            icon="📏"
            label="Winner Differential Required"
            description="Minimum point gap the winning fantasy team must have over the runner-up."
            value={winnerDiff}
            onChange={(v) => set("WINNER_DIFFERENTIAL", v)}
            hasError={validationErrors.has("WINNER_DIFFERENTIAL")}
            note={
              <p className="text-xs text-accent-gold/80">
                ⚠️ If the winner does not have a{" "}
                <strong className="text-accent-gold">{winnerDiff}-point</strong> lead over the
                runner-up, the system will flag it for review before saving.
              </p>
            }
          />
        </div>
      )}

      {/* ── Tab: Optional Scoring ──────────────────────────────────────────── */}
      {activeTab === "optional" && (
        <div>
          <ToggleRow
            icon="🎬"
            label="Confessional Count Scoring"
            description="Points awarded based on the number of confessionals shown per episode. Commissioner enters the count weekly."
            enabled={!!config.enable_confessionals}
            onToggle={(v) => setConfig((prev: any) => ({ ...prev, enable_confessionals: v }))}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Points per confessional</span>
              <Stepper
                value={val("CONFESSIONAL_POINT", 1)}
                onChange={(v) => set("CONFESSIONAL_POINT", v)}
                hasError={validationErrors.has("CONFESSIONAL_POINT")}
              />
            </div>
          </ToggleRow>

          <ToggleRow
            icon="🏺"
            label="Idol Play Scoring"
            description="Points awarded when a player successfully plays a hidden immunity idol."
            enabled={!!config.enable_idols}
            onToggle={(v) => setConfig((prev: any) => ({ ...prev, enable_idols: v }))}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Points per idol play</span>
              <Stepper
                value={val("IDOL_PLAY_POINT", 3)}
                onChange={(v) => set("IDOL_PLAY_POINT", v)}
                hasError={validationErrors.has("IDOL_PLAY_POINT")}
              />
            </div>
          </ToggleRow>

          <ToggleRow
            icon="⚡"
            label="Advantage Scoring"
            description="Points for finding or playing advantages (steal-a-vote, extra vote, etc.)."
            enabled={!!config.enable_advantages}
            onToggle={(v) => setConfig((prev: any) => ({ ...prev, enable_advantages: v }))}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Points per advantage used</span>
              <Stepper
                value={val("ADVANTAGE_POINT", 2)}
                onChange={(v) => set("ADVANTAGE_POINT", v)}
                hasError={validationErrors.has("ADVANTAGE_POINT")}
              />
            </div>
          </ToggleRow>

          <ToggleRow
            icon="✨"
            label="Custom Bonus Category"
            description="Define your own scoring event with a custom label and point value."
            enabled={!!config.enable_custom_bonus}
            onToggle={(v) => setConfig((prev: any) => ({ ...prev, enable_custom_bonus: v }))}
          >
            <div className="space-y-3">
              <div>
                <label className="text-xs text-text-muted block mb-1">Category label</label>
                <input
                  type="text"
                  className="input text-sm py-1.5 w-full"
                  placeholder="e.g. Fire-Making Win"
                  value={config.CUSTOM_BONUS_LABEL || ""}
                  onChange={(e) =>
                    setConfig((prev: any) => ({ ...prev, CUSTOM_BONUS_LABEL: e.target.value }))
                  }
                  maxLength={50}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Points per event</span>
                <Stepper
                  value={val("CUSTOM_BONUS_POINT", 5)}
                  onChange={(v) => set("CUSTOM_BONUS_POINT", v)}
                />
              </div>
            </div>
          </ToggleRow>
        </div>
      )}

      {/* ── Tab: Episode Title ─────────────────────────────────────────────── */}
      {activeTab === "title" && (
        <div>
          <ScoreRow
            icon="🎙️"
            label="Episode Title Speaker Points"
            description='Awarded to the castaway whose quote becomes the episode title (e.g. "I want to play like a lion, not a mouse").'
            value={val("EPISODE_TITLE_SPEAKER", DEFAULT_SCORING.EPISODE_TITLE_SPEAKER)}
            onChange={(v) => set("EPISODE_TITLE_SPEAKER", v)}
            hasError={validationErrors.has("EPISODE_TITLE_SPEAKER")}
          />
          <div className="mt-4 p-4 rounded-lg bg-bg-surface border border-border flex gap-3 items-start">
            <span className="text-lg shrink-0 mt-0.5">ℹ️</span>
            <p className="text-text-muted text-sm">
              The commissioner assigns the episode title speaker manually each week in the{" "}
              <strong className="text-text-primary">Score Episode</strong> panel.
            </p>
          </div>
        </div>
      )}

      {/* ── Fixed Save Bar ─────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-bg-base/95 backdrop-blur-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={handleResetToDefaults}
            className="text-sm text-text-muted hover:text-red-400 transition-colors underline-offset-2 hover:underline"
          >
            Reset to Defaults
          </button>
          <button
            onClick={saveSettings}
            disabled={loading}
            className="btn-primary px-8 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save Scoring Settings"}
          </button>
        </div>
      </div>

      {/* ── Danger Zone ────────────────────────────────────────────────────── */}
      <div className="mt-10 card border-red-700/40">
        <h3 className="section-title text-red-400 mb-1">Danger Zone</h3>
        <p className="text-text-muted text-sm mb-4">
          Permanently delete this league and all its teams, picks, and scores. This cannot be undone.
        </p>

        {deleteError && (
          <div className="mb-3 p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
            {deleteError}
          </div>
        )}

        <p className="text-text-muted text-sm mb-2">
          Type <span className="font-mono text-text-primary">{league.name}</span> to confirm:
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            className="input flex-1"
            placeholder={league.name}
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
          />
          <button
            onClick={handleDelete}
            disabled={deleteConfirm !== league.name || deleteLoading}
            className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {deleteLoading ? "Deleting..." : "Delete League"}
          </button>
        </div>
      </div>
    </div>
  );
}
