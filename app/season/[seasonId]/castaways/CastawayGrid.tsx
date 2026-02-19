"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { PlayerAvatar } from "@/components/ui/PlayerCard";
import { getTierBadgeClass } from "@/lib/utils";
import type { EpisodeStat } from "./page";

type CastawayRow = {
  id: string;
  name: string;
  tribe: string | null;
  tier: string | null;
  img_url: string | null;
  is_active: boolean;
  slug: string | null;
  vote_out_episode: number | null;
  placement_badge: string | null;
  hometown: string | null;
  bio: string | null;
  previous_seasons: string[] | null;
  total_pts: number;
  this_week_pts: number;
  episode_stats: EpisodeStat[];
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const expandRef = useRef<HTMLDivElement>(null);

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
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return b.total_pts - a.total_pts;
      }
      return 0;
    });
  }, [players, sort]);

  const selectedPlayer = selectedId
    ? (sorted.find((p) => p.id === selectedId) ?? null)
    : null;

  function handleCardClick(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  // Scroll expanded panel into view when selection changes
  useEffect(() => {
    if (selectedId && expandRef.current) {
      setTimeout(() => {
        expandRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 60);
    }
  }, [selectedId]);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "points", label: "Points" },
    { key: "tier", label: "Tier" },
    { key: "tribe", label: "Tribe" },
    { key: "status", label: "Status" },
  ];

  const hasBonus = selectedPlayer?.episode_stats.some((r) => r.bonus_pts > 0) ?? false;

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
        {sorted.map((player) => {
          const isSelected = selectedId === player.id;
          return (
            <button
              key={player.id}
              onClick={() => handleCardClick(player.id)}
              className={`card flex flex-col items-center text-center p-3 hover:border-accent-orange/40 transition-all group w-full ${
                !player.is_active ? "opacity-70" : ""
              } ${isSelected ? "border-accent-orange/60 bg-accent-orange/5 shadow-ember" : ""}`}
            >
              {/* Photo */}
              <div className="relative mb-2">
                <PlayerAvatar name={player.name} size="lg" imgUrl={player.img_url} />
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

              {/* Tier badge */}
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

              {/* Expand indicator */}
              <span
                className={`text-[10px] mt-1.5 transition-all duration-150 ${
                  isSelected ? "text-accent-orange" : "text-text-muted/30"
                }`}
              >
                {isSelected ? "▾ collapse" : "▾ stats"}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Expanded stats panel ── */}
      {selectedPlayer && (
        <div
          ref={expandRef}
          className="mt-6 card border-accent-orange/20 scroll-mt-4"
        >
          {/* Header row */}
          <div className="flex items-start gap-4 mb-4">
            <div className="shrink-0">
              <PlayerAvatar
                name={selectedPlayer.name}
                size="lg"
                imgUrl={selectedPlayer.img_url}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h2 className="text-xl font-bold text-text-primary">
                  {selectedPlayer.name}
                </h2>
                {selectedPlayer.is_active ? (
                  <span className="text-xs font-medium text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded">
                    🔥 Active
                  </span>
                ) : (
                  <span className="text-xs text-text-muted bg-bg-surface border border-border px-2 py-0.5 rounded">
                    🪦 Voted Out
                    {selectedPlayer.vote_out_episode
                      ? ` — Ep ${selectedPlayer.vote_out_episode}`
                      : ""}
                  </span>
                )}
                {selectedPlayer.placement_badge && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded border bg-accent-gold/10 border-accent-gold/30 text-accent-gold">
                    {selectedPlayer.placement_badge}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-2">
                {selectedPlayer.tier && (
                  <span className={getTierBadgeClass(selectedPlayer.tier)}>
                    Tier {selectedPlayer.tier}
                  </span>
                )}
                {selectedPlayer.tribe && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-accent-orange/10 border border-accent-orange/20 text-accent-orange">
                    {selectedPlayer.tribe}
                  </span>
                )}
              </div>

              {selectedPlayer.hometown && (
                <p className="text-xs text-text-muted mb-1">
                  📍 {selectedPlayer.hometown}
                </p>
              )}

              {selectedPlayer.previous_seasons &&
                selectedPlayer.previous_seasons.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-text-muted">Previously:</span>
                    {selectedPlayer.previous_seasons.map((s) => (
                      <span
                        key={s}
                        className="text-xs bg-bg-surface border border-border px-1.5 py-0.5 rounded text-text-muted"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {selectedPlayer.slug && (
                <Link
                  href={`/season/${seasonId}/castaways/${selectedPlayer.slug}`}
                  className="btn-secondary text-xs py-1 px-2.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  Full Profile →
                </Link>
              )}
              <button
                onClick={() => setSelectedId(null)}
                className="text-text-muted hover:text-text-primary text-lg leading-none p-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Bio */}
          {selectedPlayer.bio && (
            <p className="text-text-muted text-sm leading-relaxed mb-4 border-t border-border pt-4">
              {selectedPlayer.bio}
            </p>
          )}

          {/* Quick stats row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="stat-tablet">
              <p className="stat-number text-gradient-fire">
                {selectedPlayer.total_pts}
              </p>
              <p className="stat-label">Fantasy Points</p>
            </div>
            <div className="stat-tablet">
              <p className="stat-number">+{selectedPlayer.this_week_pts}</p>
              <p className="stat-label">This Week</p>
            </div>
            <div className="stat-tablet">
              <p className="stat-number">{selectedPlayer.episode_stats.length}</p>
              <p className="stat-label">Episodes Scored</p>
            </div>
          </div>

          {/* Episode breakdown */}
          <div className="border-t border-border pt-4">
            <h3 className="section-title mb-3">Episode Breakdown</h3>

            {selectedPlayer.episode_stats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-text-muted font-medium">
                        Episode
                      </th>
                      <th className="text-right py-2 px-3 text-text-muted font-medium hidden sm:table-cell">
                        Challenge
                      </th>
                      <th className="text-right py-2 px-3 text-text-muted font-medium hidden sm:table-cell">
                        Milestone
                      </th>
                      <th className="text-right py-2 px-3 text-text-muted font-medium hidden sm:table-cell">
                        Title Speaker
                      </th>
                      {hasBonus && (
                        <th className="text-right py-2 px-3 text-text-muted font-medium hidden sm:table-cell">
                          Bonus
                        </th>
                      )}
                      <th className="text-right py-2 px-3 text-text-muted font-medium">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPlayer.episode_stats.map((row) => (
                      <tr
                        key={row.episode_id}
                        className="border-b border-border table-row-hover"
                      >
                        <td className="py-2 px-3">
                          <span className="text-text-muted text-xs">
                            E{row.episode_number}
                          </span>
                          {row.title && (
                            <span className="text-text-primary ml-2 text-xs">
                              {row.title}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right text-text-primary hidden sm:table-cell">
                          {row.challenge_pts > 0 ? (
                            row.challenge_pts
                          ) : (
                            <span className="text-text-muted/30">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right text-text-primary hidden sm:table-cell">
                          {row.milestone_pts > 0 ? (
                            row.milestone_pts
                          ) : (
                            <span className="text-text-muted/30">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right text-text-primary hidden sm:table-cell">
                          {row.title_pts > 0 ? (
                            row.title_pts
                          ) : (
                            <span className="text-text-muted/30">—</span>
                          )}
                        </td>
                        {hasBonus && (
                          <td className="py-2 px-3 text-right text-text-primary hidden sm:table-cell">
                            {row.bonus_pts > 0 ? (
                              row.bonus_pts
                            ) : (
                              <span className="text-text-muted/30">—</span>
                            )}
                          </td>
                        )}
                        <td className="py-2 px-3 text-right font-semibold text-accent-orange">
                          {row.total_pts}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border">
                      <td className="py-2 px-3 font-semibold text-text-primary text-xs">
                        Season Total
                      </td>
                      <td colSpan={3} className="hidden sm:table-cell" />
                      {hasBonus && <td className="hidden sm:table-cell" />}
                      <td className="py-2 px-3 text-right font-bold text-gradient-fire">
                        {selectedPlayer.total_pts}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-center py-6 text-text-muted text-sm italic">
                No scored episodes yet — check back after the premiere.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
