"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/ui/PageHeader";
import { DEFAULT_SCORING } from "@/lib/scoring";

export default function LeagueSettingsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = use(params);
  const supabase = createClient();
  const [league, setLeague] = useState<any>(null);
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

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

  async function saveSettings() {
    setLoading(true);
    const { error } = await supabase
      .from("leagues")
      .update({ scoring_config: config })
      .eq("id", leagueId);

    setLoading(false);
    if (!error) {
      setSuccess("Settings saved");
      setTimeout(() => setSuccess(null), 3000);
    }
  }

  if (!league) return <div className="text-text-muted p-8">Loading...</div>;

  return (
    <div>
      <PageHeader title="League Settings" subtitle="Customize scoring and league options" />

      {success && (
        <div className="mb-4 p-3 rounded-lg bg-green-900/20 border border-green-700/30 text-green-400 text-sm">
          {success}
        </div>
      )}

      <div className="space-y-6">
        {/* Point Values */}
        <div className="card">
          <h3 className="section-title mb-4">Point Values</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { key: "TRIBE_REWARD_WIN", label: "Tribe Reward Win", default: DEFAULT_SCORING.TRIBE_REWARD_WIN },
              { key: "INDIVIDUAL_REWARD_WIN", label: "Individual Reward Win", default: DEFAULT_SCORING.INDIVIDUAL_REWARD_WIN },
              { key: "TRIBE_IMMUNITY_WIN", label: "Tribe Immunity Win", default: DEFAULT_SCORING.TRIBE_IMMUNITY_WIN },
              { key: "INDIVIDUAL_IMMUNITY_WIN", label: "Individual Immunity Win", default: DEFAULT_SCORING.INDIVIDUAL_IMMUNITY_WIN },
              { key: "TRIBE_IMMUNITY_SECOND", label: "2nd Place Immunity", default: DEFAULT_SCORING.TRIBE_IMMUNITY_SECOND },
              { key: "MERGE_BONUS", label: "Merge Bonus (per player)", default: DEFAULT_SCORING.MERGE_BONUS },
              { key: "FINAL_THREE_BONUS", label: "Final Three Bonus", default: DEFAULT_SCORING.FINAL_THREE_BONUS },
              { key: "WINNER_BONUS", label: "Winner Bonus", default: DEFAULT_SCORING.WINNER_BONUS },
              { key: "EPISODE_TITLE_SPEAKER", label: "Episode Title Speaker", default: DEFAULT_SCORING.EPISODE_TITLE_SPEAKER },
            ].map(({ key, label, default: def }) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input
                  type="number"
                  className="input"
                  value={config[key] ?? def}
                  onChange={(e) => setConfig({ ...config, [key]: Number(e.target.value) })}
                  min={0}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Optional Scoring Categories */}
        <div className="card">
          <h3 className="section-title mb-4">Optional Categories</h3>
          <div className="space-y-4">
            <ToggleSetting
              label="Confessional Count"
              description="Award points per confessional appearance"
              enabled={!!config.enable_confessionals}
              onToggle={(v) => setConfig({ ...config, enable_confessionals: v })}
              pointValue={config.CONFESSIONAL_POINT ?? 1}
              onPointChange={(v) => setConfig({ ...config, CONFESSIONAL_POINT: v })}
            />
            <ToggleSetting
              label="Idol Play Scoring"
              description="Points for playing a hidden immunity idol"
              enabled={!!config.enable_idols}
              onToggle={(v) => setConfig({ ...config, enable_idols: v })}
              pointValue={config.IDOL_PLAY_POINT ?? 3}
              onPointChange={(v) => setConfig({ ...config, IDOL_PLAY_POINT: v })}
            />
            <ToggleSetting
              label="Advantage Scoring"
              description="Points for using a game advantage"
              enabled={!!config.enable_advantages}
              onToggle={(v) => setConfig({ ...config, enable_advantages: v })}
              pointValue={config.ADVANTAGE_POINT ?? 2}
              onPointChange={(v) => setConfig({ ...config, ADVANTAGE_POINT: v })}
            />
          </div>
        </div>

        <button
          onClick={saveSettings}
          disabled={loading}
          className="btn-primary px-8 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

function ToggleSetting({
  label,
  description,
  enabled,
  onToggle,
  pointValue,
  onPointChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  pointValue: number;
  onPointChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-bg-surface border border-border">
      <div>
        <p className="text-text-primary font-medium">{label}</p>
        <p className="text-text-muted text-xs">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        {enabled && (
          <input
            type="number"
            className="input w-16 text-sm py-1"
            value={pointValue}
            onChange={(e) => onPointChange(Number(e.target.value))}
            min={0}
          />
        )}
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-orange" />
        </label>
      </div>
    </div>
  );
}
