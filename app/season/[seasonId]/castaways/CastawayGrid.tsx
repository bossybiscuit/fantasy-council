"use client";

import { useState, useMemo } from "react";
import { Fragment } from "react";
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

type SortKey = "points" | "tier" | "tribe" | "name";

export default function CastawayGrid({
  players,
  seasonId,
}: {
  players: CastawayRow[];
  seasonId: string;
}) {
  const [sort, setSort] = useState<SortKey>("points");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...players].sort((a, b) => {
      let cmp = 0;
      if (sort === "points") cmp = b.total_pts - a.total_pts;
      else if (sort === "tier") {
        const ta = TIER_ORDER[a.tier || ""] ?? 99;
        const tb = TIER_ORDER[b.tier || ""] ?? 99;
        cmp = ta !== tb ? ta - tb : b.total_pts - a.total_pts;
      } else if (sort === "tribe") {
        cmp = (a.tribe || "zzz").localeCompare(b.tribe || "zzz");
        if (cmp === 0) cmp = b.total_pts - a.total_pts;
      } else if (sort === "name") {
        cmp = a.name.localeCompare(b.name);
      }
      return sortDir === "asc" ? -cmp : cmp;
    });
  }, [players, sort, sortDir]);

  function handleSort(key: SortKey) {
    if (sort === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setSortDir(key === "tier" || key === "name" ? "asc" : "desc");
    }
  }

  function toggleRow(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sort !== col) return <span className="text-text-muted/30 ml-1 text-[10px]">↕</span>;
    return (
      <span className="text-accent-orange ml-1 text-[10px]">
        {sortDir === "desc" ? "↓" : "↑"}
      </span>
    );
  }

  const thClass =
    "py-3 px-4 text-left text-text-muted font-medium text-xs uppercase tracking-wider select-none";

  return (
    <div>
      {/* Count pill */}
      <p className="text-text-muted text-xs mb-3">{players.length} castaways</p>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className={thClass} style={{ width: 40 }}>#</th>
                <th
                  className={`${thClass} cursor-pointer hover:text-text-primary`}
                  onClick={() => handleSort("name")}
                >
                  Castaway <SortIcon col="name" />
                </th>
                <th
                  className={`${thClass} cursor-pointer hover:text-text-primary hidden sm:table-cell`}
                  onClick={() => handleSort("tribe")}
                >
                  Tribe <SortIcon col="tribe" />
                </th>
                <th
                  className={`${thClass} cursor-pointer hover:text-text-primary hidden md:table-cell`}
                  onClick={() => handleSort("tier")}
                >
                  Tier <SortIcon col="tier" />
                </th>
                <th className={`${thClass} hidden lg:table-cell`}>Status</th>
                <th
                  className={`${thClass} text-right cursor-pointer hover:text-text-primary hidden sm:table-cell`}
                  onClick={() => handleSort("points")}
                >
                  This Wk <SortIcon col="points" />
                </th>
                <th
                  className={`${thClass} text-right cursor-pointer hover:text-text-primary`}
                  onClick={() => handleSort("points")}
                >
                  Total <SortIcon col="points" />
                </th>
                {/* chevron col */}
                <th className="py-3 px-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((player, idx) => {
                const isSelected = selectedId === player.id;
                const hasStats = player.episode_stats.length > 0;
                const hasBonus = player.episode_stats.some((r) => r.bonus_pts > 0);

                return (
                  <Fragment key={player.id}>
                    {/* ── Main row ── */}
                    <tr
                      onClick={() => toggleRow(player.id)}
                      className={`border-b border-border cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-accent-orange/5 border-accent-orange/20"
                          : "hover:bg-bg-surface"
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3 px-4 text-text-muted text-xs font-mono">
                        {idx + 1}
                      </td>

                      {/* Castaway */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <PlayerAvatar
                              name={player.name}
                              size="sm"
                              imgUrl={player.img_url}
                            />
                            {!player.is_active && (
                              <span className="absolute -bottom-0.5 -right-0.5 text-[10px] leading-none">
                                🪦
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`font-medium leading-tight ${
                                isSelected ? "text-accent-orange" : "text-text-primary"
                              }`}
                            >
                              {player.name}
                            </p>
                            {player.hometown && (
                              <p className="text-xs text-text-muted truncate hidden sm:block">
                                {player.hometown}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Tribe */}
                      <td className="py-3 px-4 hidden sm:table-cell">
                        {player.tribe ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-accent-orange/10 border border-accent-orange/20 text-accent-orange">
                            {player.tribe}
                          </span>
                        ) : (
                          <span className="text-text-muted/30 text-xs">—</span>
                        )}
                      </td>

                      {/* Tier */}
                      <td className="py-3 px-4 hidden md:table-cell">
                        {player.tier ? (
                          <span className={getTierBadgeClass(player.tier)}>
                            Tier {player.tier}
                          </span>
                        ) : (
                          <span className="text-text-muted/30 text-xs">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 hidden lg:table-cell">
                        {player.is_active ? (
                          <span className="text-xs text-green-400">🔥 Active</span>
                        ) : (
                          <span className="text-xs text-text-muted">
                            Out Ep {player.vote_out_episode ?? "?"}
                          </span>
                        )}
                      </td>

                      {/* This week */}
                      <td className="py-3 px-4 text-right hidden sm:table-cell">
                        <span className="text-text-primary">
                          {player.this_week_pts > 0 ? `+${player.this_week_pts}` : "—"}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-3 px-4 text-right">
                        <span className="text-accent-gold font-bold">
                          {player.total_pts}
                        </span>
                      </td>

                      {/* Chevron */}
                      <td className="py-3 px-2 text-center">
                        <span
                          className={`inline-block text-[10px] transition-transform duration-150 ${
                            isSelected
                              ? "rotate-90 text-accent-orange"
                              : "text-text-muted"
                          }`}
                        >
                          ▶
                        </span>
                      </td>
                    </tr>

                    {/* ── Expanded stats row ── */}
                    {isSelected && (
                      <tr className="border-b border-border bg-bg-surface/50">
                        <td colSpan={8} className="px-4 pb-5 pt-3">
                          <div className="max-w-3xl">
                            {/* Bio + meta */}
                            <div className="flex flex-wrap items-start gap-4 mb-4">
                              <div className="flex-1 min-w-0">
                                {player.previous_seasons &&
                                  player.previous_seasons.length > 0 && (
                                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                                      <span className="text-xs text-text-muted">
                                        Previously:
                                      </span>
                                      {player.previous_seasons.map((s) => (
                                        <span
                                          key={s}
                                          className="text-xs bg-bg-base border border-border px-1.5 py-0.5 rounded text-text-muted"
                                        >
                                          {s}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                {player.bio && (
                                  <p className="text-text-muted text-sm leading-relaxed">
                                    {player.bio}
                                  </p>
                                )}
                              </div>

                              {/* Quick stats */}
                              <div className="flex gap-3 shrink-0">
                                <div className="stat-tablet px-4 py-2">
                                  <p className="stat-number text-sm text-gradient-fire">
                                    {player.total_pts}
                                  </p>
                                  <p className="stat-label">pts</p>
                                </div>
                                <div className="stat-tablet px-4 py-2">
                                  <p className="stat-number text-sm">
                                    {player.episode_stats.length}
                                  </p>
                                  <p className="stat-label">eps</p>
                                </div>
                              </div>
                            </div>

                            {/* Episode breakdown */}
                            {hasStats ? (
                              <div className="overflow-x-auto rounded-lg border border-border">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-border bg-bg-base">
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
                                        Title
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
                                    {player.episode_stats.map((row) => (
                                      <tr
                                        key={row.episode_id}
                                        className="border-b border-border last:border-0 table-row-hover"
                                      >
                                        <td className="py-2 px-3">
                                          <span className="text-text-muted">
                                            E{row.episode_number}
                                          </span>
                                          {row.title && (
                                            <span className="text-text-primary ml-2">
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
                                    <tr className="border-t border-border bg-bg-base">
                                      <td className="py-2 px-3 font-semibold text-text-muted">
                                        Season Total
                                      </td>
                                      <td colSpan={3} className="hidden sm:table-cell" />
                                      {hasBonus && (
                                        <td className="hidden sm:table-cell" />
                                      )}
                                      <td className="py-2 px-3 text-right font-bold text-gradient-fire">
                                        {player.total_pts}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            ) : (
                              <p className="text-text-muted text-xs italic">
                                No scored episodes yet.
                              </p>
                            )}

                            {/* Full profile link */}
                            {player.slug && (
                              <div className="mt-3">
                                <Link
                                  href={`/season/${seasonId}/castaways/${player.slug}`}
                                  className="text-xs text-accent-orange hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View full profile →
                                </Link>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
