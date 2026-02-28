"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import { getRankIndicator } from "@/lib/utils";
import type { EpisodeTeamScore, Team, Profile } from "@/types/database";

type PlayerPick = {
  playerId: string;
  playerName: string;
  slug: string | null;
  isActive: boolean;
  points: number;
  tribe: string | null;
  tribeColor: string | null;
};

interface StandingsRow {
  team: Team;
  profile: Profile | null;
  currentScore: EpisodeTeamScore | null;
  previousScore: EpisodeTeamScore | null;
  predictionAccuracy: number;
  totalPoints: number;
  weeklyPredPoints: number;
  seasonPredTotal: number;
  rank: number;
  picks: PlayerPick[];
}

interface StandingsTableProps {
  rows: StandingsRow[];
  leagueId: string;
  myTeamId?: string;
  showBudget?: boolean;
}

export default function StandingsTable({
  rows,
  leagueId,
  myTeamId,
  showBudget = false,
}: StandingsTableProps) {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [hoveredTeamId, setHoveredTeamId] = useState<string | null>(null);

  function toggleExpand(teamId: string) {
    setExpandedTeamId((prev) => (prev === teamId ? null : teamId));
  }

  return (
    <div>
      {/* ── Podium ── */}
      <PodiumDisplay rows={rows} leagueId={leagueId} />

      {/* ── Mobile card list ── */}
      <div className="md:hidden space-y-2">
        {rows.map((row, idx) => {
          const indicator = getRankIndicator(row.rank, row.previousScore?.rank ?? null);
          const isMe = row.team.id === myTeamId;
          const isExpanded = expandedTeamId === row.team.id;
          const hasPicks = row.picks && row.picks.length > 0;

          return (
            <Fragment key={row.team.id}>
            <div
              className={`rounded-xl border ${
                isMe
                  ? "border-accent-orange/30 bg-accent-orange/5"
                  : row.rank === 1
                  ? "border-accent-gold/25 bg-accent-gold/8"
                  : row.rank === 2
                  ? "border-zinc-400/20 bg-zinc-400/5"
                  : row.rank === 3
                  ? "border-orange-700/20 bg-orange-700/5"
                  : "border-border bg-bg-card"
              }`}
            >
              <div className="flex items-center gap-3 p-3">
                {/* Rank */}
                <div className="flex items-center gap-1 w-10 shrink-0">
                  <span
                    className={`font-bold text-base ${
                      row.rank === 1
                        ? "text-accent-gold"
                        : row.rank === 2
                        ? "text-gray-300"
                        : row.rank === 3
                        ? "text-orange-600"
                        : "text-text-primary"
                    }`}
                  >
                    #{row.rank}
                  </span>
                  <RankIndicator indicator={indicator} />
                </div>

                {/* Team info */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/leagues/${leagueId}/team/${row.team.id}`}
                    className="hover:text-accent-orange transition-colors"
                  >
                    <p className="font-medium text-text-primary text-sm truncate">
                      {row.team.name}
                      {isMe && (
                        <span className="ml-1 text-xs text-accent-orange">(You)</span>
                      )}
                    </p>
                    <p className="text-xs text-text-muted truncate">
                      {row.profile?.display_name || row.profile?.username || "—"}
                    </p>
                  </Link>
                </div>

                {/* Points */}
                <div className="text-right shrink-0">
                  <p className="text-accent-gold font-bold">{row.totalPoints}</p>
                  {showBudget && row.team.budget_remaining != null ? (
                    <p className="text-xs text-accent-gold/70">${row.team.budget_remaining} left</p>
                  ) : (
                    <p className="text-xs text-text-muted">{row.currentScore?.total_points ?? 0} this wk</p>
                  )}
                </div>

                {/* Chevron */}
                {hasPicks && (
                  <button
                    onClick={() => toggleExpand(row.team.id)}
                    className="text-text-muted hover:text-accent-orange transition-colors p-1 shrink-0"
                  >
                    <span
                      className={`inline-block text-[10px] transition-transform duration-150 ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    >
                      ▶
                    </span>
                  </button>
                )}
              </div>

              {/* Expanded roster + prediction chips */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-2">
                  {hasPicks && (
                    <RosterChips picks={row.picks} leagueId={leagueId} compact />
                  )}
                  <PredictionChips
                    weeklyPredPoints={row.weeklyPredPoints}
                    seasonPredTotal={row.seasonPredTotal}
                    compact
                  />
                </div>
              )}
            </div>
            {idx === 2 && rows.length > 3 && (
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 border-t border-dashed border-border/60" />
                <span className="text-[10px] text-text-muted uppercase tracking-widest shrink-0">
                  rest
                </span>
                <div className="flex-1 border-t border-dashed border-border/60" />
              </div>
            )}
            </Fragment>
          );
        })}
        {rows.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            No standings yet. Draft must complete first.
          </div>
        )}
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-text-muted font-medium">
              Rank
            </th>
            <th className="text-left py-3 px-4 text-text-muted font-medium">
              Team
            </th>
            <th className="text-right py-3 px-4 text-text-muted font-medium">
              This Week
            </th>
            <th className="text-right py-3 px-4 text-text-muted font-medium">
              Total
            </th>
            <th className="text-right py-3 px-4 text-text-muted font-medium hidden md:table-cell">
              Predictions
            </th>
            <th className="py-3 px-2 w-8" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const indicator = getRankIndicator(
              row.rank,
              row.previousScore?.rank ?? null
            );
            const isMe = row.team.id === myTeamId;
            const isExpanded = expandedTeamId === row.team.id;
            const isHovered = hoveredTeamId === row.team.id;
            const hasPicks = row.picks && row.picks.length > 0;

            return (
              <Fragment key={row.team.id}>
                <tr
                  className={`border-border table-row-hover ${
                    isMe
                      ? "bg-accent-orange/5"
                      : row.rank === 1
                      ? "bg-accent-gold/8"
                      : row.rank === 2
                      ? "bg-zinc-400/5"
                      : row.rank === 3
                      ? "bg-orange-700/5"
                      : ""
                  } ${isExpanded ? "" : "border-b"}`}
                >
                  {/* Rank */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-bold text-base ${
                          row.rank === 1
                            ? "text-accent-gold"
                            : row.rank === 2
                            ? "text-gray-300"
                            : row.rank === 3
                            ? "text-orange-600"
                            : "text-text-primary"
                        }`}
                      >
                        #{row.rank}
                      </span>
                      <RankIndicator indicator={indicator} />
                    </div>
                  </td>

                  {/* Team name + desktop hover popover */}
                  <td className="py-3 px-4">
                    <div
                      className="relative inline-block"
                      onMouseEnter={() => hasPicks && setHoveredTeamId(row.team.id)}
                      onMouseLeave={() => setHoveredTeamId(null)}
                    >
                      <Link
                        href={`/leagues/${leagueId}/team/${row.team.id}`}
                        className="hover:text-accent-orange transition-colors"
                      >
                        <p className="font-medium text-text-primary">
                          {row.team.name}
                          {isMe && (
                            <span className="ml-2 text-xs text-accent-orange">
                              (You)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-text-muted">
                          {row.profile?.display_name ||
                            row.profile?.username ||
                            "—"}
                        </p>
                        {showBudget && row.team.budget_remaining != null && (
                          <p className="text-xs text-accent-gold/70 mt-0.5">${row.team.budget_remaining} remaining</p>
                        )}
                      </Link>

                      {/* Desktop-only hover popover */}
                      {isHovered && hasPicks && (
                        <div className="hidden md:block absolute top-full left-0 z-50 mt-1.5 w-80 p-3 rounded-xl bg-bg-card border border-border shadow-2xl">
                          <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium mb-2">
                            {row.team.name}
                          </p>
                          <RosterChips
                            picks={row.picks}
                            leagueId={leagueId}
                            compact
                          />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* This Week */}
                  <td className="py-3 px-4 text-right">
                    <span className="text-text-primary font-medium">
                      {row.currentScore?.total_points ?? 0}
                    </span>
                  </td>

                  {/* Total */}
                  <td className="py-3 px-4 text-right">
                    <span className="text-accent-gold font-bold text-base">
                      {row.totalPoints}
                    </span>
                  </td>

                  {/* Predictions */}
                  <td className="py-3 px-4 text-right hidden md:table-cell">
                    <span className="text-text-muted">
                      {row.predictionAccuracy}%
                    </span>
                  </td>

                  {/* Expand/collapse chevron */}
                  <td className="py-3 px-2 text-center">
                    <button
                      onClick={() => toggleExpand(row.team.id)}
                      className="text-text-muted hover:text-accent-orange transition-colors p-1 rounded"
                      title={isExpanded ? "Collapse roster" : "Show roster"}
                    >
                      <span
                        className={`inline-block text-[10px] transition-transform duration-150 ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      >
                        ▶
                      </span>
                    </button>
                  </td>
                </tr>

                {/* Inline expanded roster */}
                {isExpanded && (
                  <tr className="border-b border-border">
                    <td colSpan={6} className="px-4 pb-4 pt-2">
                      <div className="pl-2 sm:pl-8 space-y-2">
                        {hasPicks ? (
                          <RosterChips
                            picks={row.picks}
                            leagueId={leagueId}
                          />
                        ) : (
                          <span className="text-text-muted text-xs italic">
                            No players drafted yet
                          </span>
                        )}
                        <PredictionChips
                          weeklyPredPoints={row.weeklyPredPoints}
                          seasonPredTotal={row.seasonPredTotal}
                        />
                      </div>
                    </td>
                  </tr>
                )}
                {idx === 2 && rows.length > 3 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 border-t border-dashed border-border/60" />
                        <span className="text-[10px] text-text-muted uppercase tracking-widest shrink-0">
                          rest
                        </span>
                        <div className="flex-1 border-t border-dashed border-border/60" />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
        {rows.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            No standings yet. Draft must complete first.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Podium ────────────────────────────────────────────────────────────────────

function PodiumDisplay({
  rows,
  leagueId,
}: {
  rows: StandingsRow[];
  leagueId: string;
}) {
  if (rows.length < 3) return null;

  const slots = [
    {
      row: rows[1],
      plateH: "h-16 sm:h-20",
      rankColor: "text-zinc-300",
      plateBg:
        "bg-gradient-to-b from-zinc-400/20 to-zinc-400/5 border-t-2 border-zinc-400/50",
    },
    {
      row: rows[0],
      plateH: "h-24 sm:h-32",
      rankColor: "text-accent-gold",
      plateBg:
        "bg-gradient-to-b from-accent-gold/25 to-accent-gold/5 border-t-2 border-accent-gold/80",
    },
    {
      row: rows[2],
      plateH: "h-10 sm:h-14",
      rankColor: "text-orange-500",
      plateBg:
        "bg-gradient-to-b from-orange-700/20 to-orange-700/5 border-t-2 border-orange-600/50",
    },
  ];

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-b from-bg-card to-bg-base px-4 pt-5 pb-0 mb-6 overflow-hidden">
      <p className="text-center text-[10px] uppercase tracking-[0.25em] text-text-muted font-medium mb-6">
        Leaderboard
      </p>
      <div className="flex items-end justify-center gap-2 sm:gap-4">
        {slots.map(({ row, plateH, rankColor, plateBg }) => (
          <Link
            key={row.team.id}
            href={`/leagues/${leagueId}/team/${row.team.id}`}
            className="flex flex-col items-center group flex-1 max-w-[130px] sm:max-w-[160px]"
          >
            {/* Info above platform */}
            <div className="text-center mb-2 px-1 w-full">
              <p
                className={`text-xl sm:text-2xl font-black ${rankColor} leading-none mb-1.5`}
              >
                #{row.rank}
              </p>
              <p className="font-semibold text-text-primary text-xs sm:text-sm truncate group-hover:text-accent-orange transition-colors leading-tight">
                {row.team.name}
              </p>
              <p className="text-[10px] text-text-muted truncate mb-1.5">
                {row.profile?.display_name || row.profile?.username || "—"}
              </p>
              <p className={`font-black text-sm sm:text-base ${rankColor}`}>
                {row.totalPoints}
                <span className="text-[10px] font-normal text-text-muted ml-0.5">
                  pts
                </span>
              </p>
            </div>

            {/* Platform block */}
            <div className={`w-full ${plateH} ${plateBg} rounded-t-lg`} />
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Roster chips ──────────────────────────────────────────────────────────────

function RosterChips({
  picks,
  leagueId,
  compact = false,
}: {
  picks: PlayerPick[];
  leagueId: string;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {picks.map((pick) => (
        <Link
          key={pick.playerId}
          href={`/leagues/${leagueId}/player/${pick.playerId}`}
          onClick={(e) => e.stopPropagation()}
          className={`flex items-center gap-1.5 rounded-full border text-xs transition-colors ${
            compact ? "px-2 py-1" : "px-2.5 py-1.5"
          } ${
            pick.isActive
              ? "bg-bg-surface border-border hover:border-accent-orange/50 hover:bg-accent-orange/5"
              : "bg-bg-surface/40 border-border/40 opacity-55"
          }`}
        >
          {pick.tribe && pick.tribeColor && (
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: pick.tribeColor }}
              title={pick.tribe}
            />
          )}
          <span className={pick.isActive ? "text-text-primary" : "text-text-muted"}>
            {pick.playerName}
          </span>
          {!pick.isActive && (
            <span className="text-[10px]" title="Voted out">
              🕯️
            </span>
          )}
          <span className="text-accent-gold font-semibold">
            {pick.points}
            <span className="text-text-muted font-normal">pts</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

// ── Prediction summary chips ──────────────────────────────────────────────────

function PredictionChips({
  weeklyPredPoints,
  seasonPredTotal,
  compact = false,
}: {
  weeklyPredPoints: number;
  seasonPredTotal: number;
  compact?: boolean;
}) {
  if (weeklyPredPoints === 0 && seasonPredTotal === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {weeklyPredPoints > 0 && (
        <div
          className={`flex items-center gap-1.5 rounded-full border border-border bg-bg-surface text-xs ${
            compact ? "px-2 py-1" : "px-2.5 py-1.5"
          }`}
        >
          <span className="text-text-muted">Weekly Predictions</span>
          <span className="text-accent-orange font-semibold">
            {weeklyPredPoints}
            <span className="text-text-muted font-normal">pts</span>
          </span>
        </div>
      )}
      {seasonPredTotal > 0 && (
        <div
          className={`flex items-center gap-1.5 rounded-full border border-border bg-bg-surface text-xs ${
            compact ? "px-2 py-1" : "px-2.5 py-1.5"
          }`}
        >
          <span className="text-text-muted">Season Predictions</span>
          <span className="text-accent-gold font-semibold">
            {seasonPredTotal}
            <span className="text-text-muted font-normal">pts</span>
          </span>
        </div>
      )}
    </div>
  );
}

// ── Rank indicator ────────────────────────────────────────────────────────────

function RankIndicator({
  indicator,
}: {
  indicator: "up" | "down" | "same" | "new";
}) {
  if (indicator === "up") {
    return <span className="text-green-400 text-xs">▲</span>;
  }
  if (indicator === "down") {
    return <span className="text-red-400 text-xs">▼</span>;
  }
  if (indicator === "new") {
    return (
      <span className="text-accent-orange text-xs font-bold">NEW</span>
    );
  }
  return <span className="text-text-muted text-xs">—</span>;
}
