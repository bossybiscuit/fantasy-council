"use client";

import React, { useState, useMemo, Fragment } from "react";
import Link from "next/link";
import { PlayerAvatar } from "@/components/ui/PlayerCard";
import TribeBadge from "@/components/ui/TribeBadge";
import type { EpisodeStat } from "./page";

type CastawayRow = {
  id: string;
  name: string;
  tribe: string | null;
  tribe_color: string | null;
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

type SortKey = "points" | "tribe" | "name";
type ViewMode = "grid" | "tribes";

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
  const [showSpoilers, setShowSpoilers] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Filters
  const [filterTribe, setFilterTribe] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");

  // Unique tribes (preserving order by first occurrence, sorted alpha)
  const tribes = useMemo(() => {
    const seen = new Map<string, string>(); // tribe → color
    for (const p of players) {
      if (p.tribe && !seen.has(p.tribe)) seen.set(p.tribe, p.tribe_color || "#FF6B00");
    }
    return Array.from(seen.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [players]);

  const filtered = useMemo(() => {
    return players.filter((p) => {
      if (filterTribe !== "All" && p.tribe !== filterTribe) return false;
        if (filterStatus === "active" && !p.is_active) return false;
      if (filterStatus === "out" && p.is_active) return false;
      return true;
    });
  }, [players, filterTribe, filterStatus]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sort === "points") cmp = b.total_pts - a.total_pts; else if (sort === "tribe") {
        cmp = (a.tribe || "zzz").localeCompare(b.tribe || "zzz");
        if (cmp === 0) cmp = b.total_pts - a.total_pts;
      } else if (sort === "name") {
        cmp = a.name.localeCompare(b.name);
      }
      return sortDir === "asc" ? -cmp : cmp;
    });
  }, [filtered, sort, sortDir]);

  function handleSort(key: SortKey) {
    if (sort === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setSortDir(key === "name" ? "asc" : "desc");
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

  // ── Tribe view ─────────────────────────────────────────────────────────────
  if (viewMode === "tribes" && tribes.length > 0) {
    const byTribe = new Map<string, CastawayRow[]>();
    for (const [t] of tribes) byTribe.set(t, []);
    for (const p of players) {
      if (p.tribe && byTribe.has(p.tribe)) {
        byTribe.get(p.tribe)!.push(p);
      }
    }
    // Sort each tribe column by points desc
    for (const [, arr] of byTribe) {
      arr.sort((a, b) => b.total_pts - a.total_pts);
    }

    return (
      <div>
        <Toolbar
          players={players}
          tribes={tribes}
          filterTribe={filterTribe}
          setFilterTribe={setFilterTribe}          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          showSpoilers={showSpoilers}
          setShowSpoilers={setShowSpoilers}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />

        <div className={`grid gap-4 mt-4`} style={{ gridTemplateColumns: `repeat(${tribes.length}, minmax(0, 1fr))` }}>
          {tribes.map(([tribe, color]) => {
            const members = byTribe.get(tribe) || [];
            return (
              <div key={tribe}>
                {/* Column header */}
                <div
                  className="rounded-t-lg px-3 py-2 mb-0 text-center font-bold text-sm uppercase tracking-wide"
                  style={{ backgroundColor: `${color}25`, borderBottom: `2px solid ${color}60`, color }}
                >
                  {tribe}
                </div>
                <div className="border border-t-0 border-border rounded-b-lg overflow-hidden">
                  {members.map((player) => (
                    <Link
                      key={player.id}
                      href={`/season/${seasonId}/castaways/${player.slug || player.id}`}
                      className={`flex items-center gap-2 px-3 py-2.5 border-b border-border last:border-0 hover:bg-bg-surface transition-colors ${
                        !player.is_active ? "opacity-50" : ""
                      }`}
                    >
                      <PlayerAvatar name={player.name} size="sm" imgUrl={player.img_url} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {player.name}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-accent-gold font-bold text-sm">{player.total_pts}</p>
                        {showSpoilers && !player.is_active && (
                          <span className="text-[10px] text-text-muted">🪦 Ep {player.vote_out_episode}</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Grid / table view ──────────────────────────────────────────────────────
  return (
    <div>
      <Toolbar
        players={players}
        tribes={tribes}
        filterTribe={filterTribe}
        setFilterTribe={setFilterTribe}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        showSpoilers={showSpoilers}
        setShowSpoilers={setShowSpoilers}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      <div className="card p-0 overflow-hidden mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
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
                {showSpoilers && (
                  <th className={`${thClass} hidden lg:table-cell`}>Status</th>
                )}
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
                      {/* Castaway */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <PlayerAvatar
                              name={player.name}
                              size="sm"
                              imgUrl={player.img_url}
                            />
                            {showSpoilers && !player.is_active && (
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
                          <TribeBadge tribe={player.tribe} color={player.tribe_color} />
                        ) : (
                          <span className="text-text-muted/30 text-xs">—</span>
                        )}
                      </td>

                      {/* Status — spoiler gated */}
                      {showSpoilers && (
                        <td className="py-3 px-4 hidden lg:table-cell">
                          {player.is_active ? (
                            <span className="text-xs text-green-400">🔥 Active</span>
                          ) : (
                            <span className="text-xs text-text-muted">
                              Out Ep {player.vote_out_episode ?? "?"}
                            </span>
                          )}
                        </td>
                      )}

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
                        <td colSpan={showSpoilers ? 7 : 6} className="px-4 pb-5 pt-3">
                          <div className="max-w-3xl">
                            {/* Bio + meta */}
                            <div className="mb-4">
                              {/* Row: photo + (bio on sm+) + stats */}
                              <div className="flex items-center gap-4 mb-3">
                                {player.img_url && (
                                  <img
                                    src={player.img_url}
                                    alt={player.name}
                                    className="w-20 h-20 rounded-full object-cover border border-border shrink-0"
                                  />
                                )}
                                {/* Bio in the middle — sm+ only */}
                                <div className="flex-1 min-w-0 hidden sm:block">
                                  {player.previous_seasons &&
                                    player.previous_seasons.length > 0 && (
                                      <div className="flex items-center gap-1.5 flex-wrap mb-2">
                                        <span className="text-xs text-text-muted">Previously:</span>
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
                                {/* Quick stats — pushed right on mobile */}
                                <div className="flex gap-3 shrink-0 ml-auto sm:ml-0">
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
                              {/* Bio below — mobile only */}
                              <div className="sm:hidden">
                                {player.previous_seasons &&
                                  player.previous_seasons.length > 0 && (
                                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                                      <span className="text-xs text-text-muted">Previously:</span>
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

// ── Toolbar ────────────────────────────────────────────────────────────────

function Toolbar({
  players,
  tribes,
  filterTribe,
  setFilterTribe,  filterStatus,
  setFilterStatus,
  showSpoilers,
  setShowSpoilers,
  viewMode,
  setViewMode,
}: {
  players: CastawayRow[];
  tribes: [string, string][];
  filterTribe: string;
  setFilterTribe: (v: string) => void;  filterStatus: string;
  setFilterStatus: (v: string) => void;
  showSpoilers: boolean;
  setShowSpoilers: React.Dispatch<React.SetStateAction<boolean>>;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
}) {
  const hasTribeColors = tribes.some(([, c]) => c !== "#FF6B00");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-text-muted text-xs">{players.length} castaways</p>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          {tribes.length > 0 && (
            <div className="flex rounded-lg border border-border overflow-hidden text-xs">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 transition-colors ${
                  viewMode === "grid"
                    ? "bg-accent-orange/10 text-accent-orange border-r border-accent-orange/20"
                    : "text-text-muted hover:text-text-primary border-r border-border"
                }`}
              >
                ☰ Grid
              </button>
              <button
                onClick={() => setViewMode("tribes")}
                className={`px-3 py-1.5 transition-colors ${
                  viewMode === "tribes"
                    ? "bg-accent-orange/10 text-accent-orange"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                ⬛ Tribes
              </button>
            </div>
          )}

          {/* Spoiler toggle */}
          <button
            onClick={() => setShowSpoilers((s) => !s)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              showSpoilers
                ? "border-accent-orange/40 text-accent-orange bg-accent-orange/10"
                : "border-border text-text-muted hover:border-accent-orange/40 hover:text-text-primary"
            }`}
          >
            <span>{showSpoilers ? "🔓" : "🔒"}</span>
            <span>{showSpoilers ? "Hide Spoilers" : "Reveal Spoilers"}</span>
          </button>
        </div>
      </div>

      {/* Filter rows */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {/* Tribe filter */}
        {tribes.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-text-muted">Tribe:</span>
            <button
              onClick={() => setFilterTribe("All")}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                filterTribe === "All"
                  ? "border-accent-orange text-accent-orange bg-accent-orange/10"
                  : "border-border text-text-muted hover:border-accent-orange/40"
              }`}
            >
              All
            </button>
            {tribes.map(([tribe, color]) => (
              <button
                key={tribe}
                onClick={() => setFilterTribe(tribe)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors font-medium ${
                  filterTribe === tribe ? "opacity-100" : "opacity-60 hover:opacity-90"
                }`}
                style={
                  filterTribe === tribe
                    ? {
                        borderColor: color,
                        backgroundColor: `${color}20`,
                        color,
                      }
                    : {
                        borderColor: `${color}60`,
                        color,
                      }
                }
              >
                {tribe}
              </button>
            ))}
          </div>
        )}

        {/* Status filter — only useful when spoilers on */}
        {showSpoilers && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-text-muted">Status:</span>
            {[
              { key: "All", label: "All" },
              { key: "active", label: "🔥 Active" },
              { key: "out", label: "🪦 Voted Out" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  filterStatus === key
                    ? "border-accent-orange text-accent-orange bg-accent-orange/10"
                    : "border-border text-text-muted hover:border-accent-orange/40"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
