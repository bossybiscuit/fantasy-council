"use client";

import { useState, useEffect, use, useCallback } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { getTierBadgeClass } from "@/lib/utils";
import { PlayerAvatar } from "@/components/ui/PlayerCard";

type Player = {
  id: string;
  name: string;
  tribe: string | null;
  tier: string | null;
  suggested_value: number;
  img_url: string | null;
};

type Valuation = {
  player_id: string;
  my_value: number;
  max_bid: number | null;
};

export default function ValuationsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = use(params);

  const [players, setPlayers] = useState<Player[]>([]);
  const [valuations, setValuations] = useState<Map<string, Valuation>>(new Map());
  const [saving, setSaving] = useState<string | null>(null); // player_id currently saving
  const [filterSearch, setFilterSearch] = useState("");
  const [filterTribe, setFilterTribe] = useState("");
  const [filterTier, setFilterTier] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2500);
  }

  const loadData = useCallback(async () => {
    // Load players via the draft page data (same season as the league)
    const [playersRes, valuationsRes] = await Promise.all([
      fetch(`/api/leagues/${leagueId}/players`),
      fetch(`/api/leagues/${leagueId}/valuations`),
    ]);

    if (playersRes.ok) {
      const d = await playersRes.json();
      setPlayers(d.players || []);
    }

    if (valuationsRes.ok) {
      const d = await valuationsRes.json();
      const map = new Map<string, Valuation>();
      for (const v of d.valuations || []) {
        map.set(v.player_id, v);
      }
      setValuations(map);
    }
  }, [leagueId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function saveValuation(playerId: string, myValue: number, maxBid: number | null) {
    setSaving(playerId);
    const res = await fetch(`/api/leagues/${leagueId}/valuations`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId, my_value: myValue, max_bid: maxBid }),
    });
    setSaving(null);
    if (res.ok) {
      const d = await res.json();
      setValuations((prev) => {
        const next = new Map(prev);
        next.set(playerId, {
          player_id: playerId,
          my_value: d.valuation.my_value,
          max_bid: d.valuation.max_bid,
        });
        return next;
      });
      showFlash("Saved");
    }
  }

  const tribes = [...new Set(players.map((p) => p.tribe).filter(Boolean))];

  const filtered = players.filter((p) => {
    if (filterSearch && !p.name.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    if (filterTribe && p.tribe !== filterTribe) return false;
    if (filterTier && p.tier !== filterTier) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Pre-Draft Valuations"
        subtitle="Set your private target values and max bids before the auction. Only you can see these."
      />

      {flash && (
        <div className="mb-4 p-3 rounded-lg bg-green-900/20 border border-green-700/30 text-green-400 text-sm">
          {flash}
        </div>
      )}

      <div className="card mb-4">
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            className="input flex-1 min-w-32 text-sm py-1.5"
            placeholder="Search players..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
          />
          <select
            className="input text-sm py-1.5 w-auto"
            value={filterTribe}
            onChange={(e) => setFilterTribe(e.target.value)}
          >
            <option value="">All Tribes</option>
            {tribes.map((t) => (
              <option key={t} value={t!}>{t}</option>
            ))}
          </select>
          <select
            className="input text-sm py-1.5 w-auto"
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
          >
            <option value="">All Tiers</option>
            {["S", "A", "B", "C", "D"].map((t) => (
              <option key={t} value={t}>Tier {t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-text-muted font-medium">Player</th>
                <th className="text-left py-3 px-4 text-text-muted font-medium">Tribe</th>
                <th className="text-left py-3 px-4 text-text-muted font-medium">Tier</th>
                <th className="text-right py-3 px-4 text-text-muted font-medium">Suggested</th>
                <th className="text-right py-3 px-4 text-text-muted font-medium">My Value</th>
                <th className="text-right py-3 px-4 text-text-muted font-medium">Max Bid</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-text-muted text-sm">
                    {players.length === 0 ? "Loading players…" : "No players match"}
                  </td>
                </tr>
              )}
              {filtered.map((player) => {
                const val = valuations.get(player.id);
                return (
                  <ValuationRow
                    key={player.id}
                    player={player}
                    valuation={val}
                    isSaving={saving === player.id}
                    onSave={(myValue, maxBid) => saveValuation(player.id, myValue, maxBid)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ValuationRow({
  player,
  valuation,
  isSaving,
  onSave,
}: {
  player: Player;
  valuation: Valuation | undefined;
  isSaving: boolean;
  onSave: (myValue: number, maxBid: number | null) => void;
}) {
  const [myValue, setMyValue] = useState(valuation?.my_value ?? player.suggested_value);
  const [maxBid, setMaxBid] = useState<string>(
    valuation?.max_bid != null ? String(valuation.max_bid) : ""
  );

  // Sync if valuation changes (e.g. after save)
  useEffect(() => {
    if (valuation) {
      setMyValue(valuation.my_value);
      setMaxBid(valuation.max_bid != null ? String(valuation.max_bid) : "");
    }
  }, [valuation]);

  return (
    <tr className="border-b border-border last:border-0 hover:bg-bg-surface transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <PlayerAvatar name={player.name} size="sm" imgUrl={player.img_url} />
          <span className="font-medium text-text-primary">{player.name}</span>
        </div>
      </td>
      <td className="py-3 px-4 text-text-muted">{player.tribe || "—"}</td>
      <td className="py-3 px-4">
        {player.tier ? (
          <span className={getTierBadgeClass(player.tier)}>{player.tier}</span>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </td>
      <td className="py-3 px-4 text-right text-accent-gold">${player.suggested_value}</td>
      <td className="py-3 px-4 text-right">
        <input
          type="number"
          className="input py-1 text-sm text-right w-20"
          value={myValue}
          onChange={(e) => setMyValue(Number(e.target.value))}
          min={0}
        />
      </td>
      <td className="py-3 px-4 text-right">
        <input
          type="number"
          className="input py-1 text-sm text-right w-20"
          placeholder="—"
          value={maxBid}
          onChange={(e) => setMaxBid(e.target.value)}
          min={1}
        />
      </td>
      <td className="py-3 px-4 text-right">
        <button
          onClick={() => onSave(myValue, maxBid ? Number(maxBid) : null)}
          disabled={isSaving}
          className="btn-primary text-xs py-1 px-3 disabled:opacity-40"
        >
          {isSaving ? "…" : "Save"}
        </button>
      </td>
    </tr>
  );
}
