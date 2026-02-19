"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PlayerAvatar } from "@/components/ui/PlayerCard";
import { getTierBadgeClass } from "@/lib/utils";

type CastawayRow = {
  id: string;
  name: string;
  tribe: string | null;
  tier: string | null;
  img_url: string | null;
  is_active: boolean;
  slug: string | null;
  vote_out_episode: number | null;
  total_pts: number;
  this_week_pts: number;
};

const TIER_ORDER: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };

type SortKey = "points" | "tier" | "tribe" | "status";

export default function CastawayGrid({
  players,
  seasonId,
}: {
  players: CastawayRow[];
  seasonId: string;
}) {
  const [sort, setSort] = useState<SortKey>("points");

  const sorted = useMemo(() => {
    return [...players].sort((a, b) => {
      if (sort === "points") return b.total_pts - a.total_pts;
      if (sort === "tier") {
        const ta = TIER_ORDER[a.tier || ""] ?? 99;
        const tb = TIER_ORDER[b.tier || ""] ?? 99;
        return ta !== tb ? ta - tb : b.total_pts - a.total_pts;
      }
      if (sort === "tribe") {
        const ta = a.tribe || "zzz";
        const tb = b.tribe || "zzz";
        return ta !== tb ? ta.localeCompare(tb) : b.total_pts - a.total_pts;
      }
      if (sort === "status") {
        // active first
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return b.total_pts - a.total_pts;
      }
      return 0;
    });
  }, [players, sort]);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "points", label: "Points" },
    { key: "tier", label: "Tier" },
    { key: "tribe", label: "Tribe" },
    { key: "status", label: "Status" },
  ];

  return (
    <div>
      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span className="text-text-muted text-sm">Sort by:</span>
        {sortOptions.map((o) => (
          <button
            key={o.key}
            onClick={() => setSort(o.key)}
            className={`text-sm px-3 py-1 rounded-full border transition-colors ${
              sort === o.key
                ? "bg-accent-orange text-white border-accent-orange"
                : "border-border text-text-muted hover:border-accent-orange/40 hover:text-text-primary"
            }`}
          >
            {o.label}
          </button>
        ))}
        <span className="text-text-muted text-xs ml-auto">{players.length} castaways</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {sorted.map((player) => (
          <Link
            key={player.id}
            href={
              player.slug
                ? `/season/${seasonId}/castaways/${player.slug}`
                : "#"
            }
            className={`card flex flex-col items-center text-center p-3 hover:border-accent-orange/40 transition-all group ${
              !player.is_active ? "opacity-70" : ""
            }`}
          >
            {/* Photo */}
            <div className="relative mb-2">
              <PlayerAvatar
                name={player.name}
                size="lg"
                imgUrl={player.img_url}
              />
              {!player.is_active && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl">🪦</span>
                </div>
              )}
            </div>

            {/* Name */}
            <p className="text-xs font-semibold text-text-primary leading-tight mb-1.5 group-hover:text-accent-orange transition-colors">
              {player.name.split(" ")[0]}
              {player.name.includes('"') ? (
                <span className="block text-text-muted font-normal">
                  &ldquo;{player.name.match(/"([^"]+)"/)?.[1]}&rdquo;
                </span>
              ) : null}
            </p>

            {/* Tribe */}
            {player.tribe && (
              <p className="text-xs text-text-muted mb-1">{player.tribe}</p>
            )}

            {/* Badges */}
            <div className="flex flex-wrap gap-1 justify-center mb-2">
              {player.tier && (
                <span className={`${getTierBadgeClass(player.tier)} text-xs`}>
                  {player.tier}
                </span>
              )}
            </div>

            {/* Points */}
            <p className="text-lg font-bold text-accent-orange mt-auto">
              {player.total_pts}
            </p>
            <p className="text-xs text-text-muted">pts</p>

            {/* Status */}
            {player.is_active ? (
              <p className="text-xs text-green-400 mt-1">🔥 Active</p>
            ) : (
              <p className="text-xs text-text-muted mt-1">
                Ep {player.vote_out_episode ?? "—"} out
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
