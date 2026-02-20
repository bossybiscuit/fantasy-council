"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import { PlayerAvatar } from "@/components/ui/PlayerCard";
import TribeBadge from "@/components/ui/TribeBadge";
import { getSnakeDraftOrder } from "@/lib/utils";
import type { League, Team, Player } from "@/types/database";

interface DraftRoomProps {
  league: League & { seasons: any };
  myTeam: Team | null;
  myUserId: string;
  teams: (Team & { profiles: any })[];
  players: Player[];
  draftPicks: any[];
  isCommissioner: boolean;
}


export default function DraftRoom({
  league,
  myTeam,
  myUserId: _myUserId,
  teams,
  players,
  draftPicks,
  isCommissioner,
}: DraftRoomProps) {
  const router = useRouter();
  const [filterTribe, setFilterTribe] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auction state
  const [nominatingTeamIdx, setNominatingTeamIdx] = useState(0);
  const [auctionBid, setAuctionBid] = useState(1);
  const [auctionWinnerIdx, setAuctionWinnerIdx] = useState(0);

  // Drafted player IDs
  const draftedPlayerIds = new Set(draftPicks.map((dp) => dp.player_id));

  // Roster per team
  const teamRosters = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const team of teams) map.set(team.id, []);
    for (const pick of draftPicks) {
      const roster = map.get(pick.team_id) || [];
      roster.push(pick);
      map.set(pick.team_id, roster);
    }
    return map;
  }, [draftPicks, teams]);

  const rosterSize = league.roster_size || Math.floor(players.length / teams.length);
  const totalPicks = rosterSize * teams.length;
  const currentPickNum = draftPicks.length + 1;
  const isDraftComplete = draftPicks.length >= totalPicks;

  // Snake draft: who picks now?
  const snakeOrder = useMemo(
    () => getSnakeDraftOrder(teams.length, rosterSize),
    [teams.length, rosterSize]
  );
  const currentSnakePick = snakeOrder[draftPicks.length];
  const currentTeamIdx = currentSnakePick?.team ?? 0;
  const currentTeam = teams[currentTeamIdx];
  const isMyTurn =
    league.draft_type === "snake" && myTeam && currentTeam?.id === myTeam.id;

  // Commissioner is picking for a team they don't own
  const isCommissionerPickingForOther =
    isCommissioner &&
    !isMyTurn &&
    league.draft_type === "snake";

  // Available players (unfiltered, for auto-skip)
  const availablePlayers = players.filter((p) => !draftedPlayerIds.has(p.id));

  // Available players (filtered, for display)
  const tribes = [...new Set(players.map((p) => p.tribe).filter(Boolean))];
  const filteredPlayers = availablePlayers.filter((p) => {
    if (filterTribe && p.tribe !== filterTribe) return false;
    if (filterSearch && !p.name.toLowerCase().includes(filterSearch.toLowerCase()))
      return false;
    return true;
  });

  async function startDraft() {
    setLoading(true);
    await fetch("/api/draft/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ league_id: league.id, draft_status: "active", status: "drafting" }),
    });
    setLoading(false);
    router.refresh();
  }

  async function completeDraft() {
    setLoading(true);
    await fetch("/api/draft/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ league_id: league.id, draft_status: "completed", status: "active" }),
    });
    setLoading(false);
    router.refresh();
  }

  async function snakePick(playerId: string) {
    if (!currentTeam || (!isMyTurn && !isCommissioner)) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/draft/pick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        league_id: league.id,
        team_id: currentTeam.id,
        player_id: playerId,
        round: currentSnakePick.round,
        pick_number: currentSnakePick.pick,
      }),
    });

    const data = await res.json();
    if (!res.ok) setError(data.error);
    else router.refresh();
    setLoading(false);
  }

  async function autoSkipPick() {
    if (!currentTeam || !isCommissioner) return;
    // Auto-skip: pick best available by suggested_value desc, then name
    const autoPlayer = availablePlayers
      .slice()
      .sort((a, b) => (b.suggested_value ?? 0) - (a.suggested_value ?? 0) || a.name.localeCompare(b.name))[0];
    if (!autoPlayer) return;
    await snakePick(autoPlayer.id);
  }

  async function auctionPick(playerId: string) {
    if (!isCommissioner) return;
    setLoading(true);
    setError(null);
    const winningTeam = teams[auctionWinnerIdx];
    const res = await fetch("/api/draft/pick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        league_id: league.id,
        team_id: winningTeam.id,
        player_id: playerId,
        amount_paid: auctionBid,
        pick_number: draftPicks.length + 1,
        round: 1,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
    } else {
      setNominatingTeamIdx((prev) => (prev + 1) % teams.length);
      setAuctionBid(1);
      router.refresh();
    }
    setLoading(false);
  }

  const isDraftPending = league.draft_status === "pending";
  const isDraftActive = league.draft_status === "active";
  const isDraftDone = league.draft_status === "completed";

  return (
    <div>
      <PageHeader
        title="Draft Room"
        subtitle={
          isDraftPending
            ? "The tribe awaits — start the draft when everyone is ready"
            : isDraftActive
            ? league.draft_type === "snake"
              ? `Pick ${currentPickNum} of ${totalPicks} — ${currentTeam?.name || "..."}'s turn`
              : `Auction Draft — Nominating: ${teams[nominatingTeamIdx]?.name || "..."}`
            : "Draft Complete"
        }
      />

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Commissioner Controls */}
      {isCommissioner && (
        <div className="card mb-4 border-accent-orange/20">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-text-muted">Commissioner:</span>
            {isDraftPending && (
              <button
                onClick={startDraft}
                disabled={loading || teams.length < 2}
                className="btn-primary"
              >
                {loading ? "Starting…" : "🔥 Begin the Draft"}
              </button>
            )}
            {isDraftActive && (
              <>
                <button
                  onClick={completeDraft}
                  disabled={loading}
                  className="btn-secondary"
                >
                  Force Complete Draft
                </button>
                {league.draft_type === "snake" && (
                  <button
                    onClick={autoSkipPick}
                    disabled={loading || availablePlayers.length === 0}
                    className="btn-secondary text-xs"
                    title={`Auto-pick best available for ${currentTeam?.name}`}
                  >
                    ⚡ Auto-pick for {currentTeam?.name || "..."}
                  </button>
                )}
              </>
            )}
            {isDraftComplete && !isDraftDone && (
              <button
                onClick={completeDraft}
                disabled={loading}
                className="btn-primary"
              >
                Finalize Draft
              </button>
            )}
            {isDraftDone && (
              <span className="text-green-400 text-sm font-medium">
                ✓ Draft finalized
              </span>
            )}
          </div>
        </div>
      )}

      {/* Commissioner-for-other-team banner */}
      {isDraftActive && league.draft_type === "snake" && isCommissionerPickingForOther && currentTeam && (
        <div className="mb-4 p-3 rounded-lg bg-accent-orange/10 border border-accent-orange/30 text-accent-orange text-sm flex items-center gap-2">
          <span>📋</span>
          <span>
            Drafting for <strong>{currentTeam.name}</strong>
            {currentTeam.profiles
              ? ` (${currentTeam.profiles.display_name || currentTeam.profiles.username})`
              : " (no owner — unclaimed seat)"}
            . Select a player below to pick on their behalf.
          </span>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        {/* Player Pool */}
        <div className="flex-1 min-w-0 order-2 md:order-1">
          <div className="card">
            <div className="flex gap-2 mb-4 flex-wrap">
              <select
                className="input text-sm py-1.5 w-auto"
                value={filterTribe}
                onChange={(e) => setFilterTribe(e.target.value)}
              >
                <option value="">All Tribes</option>
                {tribes.map((t) => (
                  <option key={t} value={t!}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                type="text"
                className="input flex-1 min-w-32 text-sm py-1.5"
                placeholder="Search players..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
              />
            </div>

            {/* Auction controls */}
            {isDraftActive && league.draft_type === "auction" && isCommissioner && (
              <div className="p-3 mb-4 rounded-lg bg-accent-orange/5 border border-accent-orange/20">
                <p className="text-sm text-text-muted mb-2">
                  Nominating: <strong className="text-text-primary">{teams[nominatingTeamIdx]?.name}</strong>
                </p>
                <div className="flex gap-3 items-end flex-wrap">
                  <div>
                    <label className="label text-xs">Winner Team</label>
                    <select
                      className="input text-sm py-1"
                      value={auctionWinnerIdx}
                      onChange={(e) => setAuctionWinnerIdx(Number(e.target.value))}
                    >
                      {teams.map((t, i) => (
                        <option key={t.id} value={i}>
                          {t.name} (${t.budget_remaining ?? league.budget} left)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label text-xs">Winning Bid ($)</label>
                    <input
                      type="number"
                      className="input text-sm py-1 w-20"
                      value={auctionBid}
                      onChange={(e) => setAuctionBid(Number(e.target.value))}
                      min={1}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1 max-h-[60vh] overflow-y-auto scrollbar-hide">
              {filteredPlayers.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-accent-orange/30 hover:bg-bg-surface transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <PlayerAvatar name={player.name} size="sm" imgUrl={player.img_url} />
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {player.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {player.tribe && (
                          <TribeBadge tribe={player.tribe} color={player.tribe_color} size="sm" />
                        )}
                        <span className="text-xs text-accent-gold">${player.suggested_value}</span>
                      </div>
                    </div>
                  </div>

                  {isDraftActive && (
                    league.draft_type === "snake" ? (
                      (isMyTurn || isCommissioner) && (
                        <button
                          onClick={() => snakePick(player.id)}
                          disabled={loading}
                          className="btn-primary text-xs py-1 px-3"
                        >
                          {loading ? "..." : isCommissionerPickingForOther ? "Pick for them" : "Pick"}
                        </button>
                      )
                    ) : (
                      isCommissioner && (
                        <button
                          onClick={() => auctionPick(player.id)}
                          disabled={loading}
                          className="btn-primary text-xs py-1 px-3"
                        >
                          {loading ? "..." : "Award"}
                        </button>
                      )
                    )
                  )}
                </div>
              ))}
              {filteredPlayers.length === 0 && (
                <div className="text-center py-8 text-text-muted text-sm">
                  {draftedPlayerIds.size === players.length
                    ? "All players drafted!"
                    : "No players match filter"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rosters Sidebar */}
        <div className="order-1 md:order-2 md:w-64 md:shrink-0 flex gap-2 overflow-x-auto pb-1 md:flex-col md:space-y-3 md:gap-0 md:pb-0 md:max-h-[80vh] md:overflow-y-auto scrollbar-hide">
          {teams.map((team, idx) => {
            const roster = teamRosters.get(team.id) || [];
            const budgetLeft = team.budget_remaining ?? league.budget;
            const isCurrentPick =
              league.draft_type === "snake" &&
              isDraftActive &&
              currentTeamIdx === idx;

            return (
              <div
                key={team.id}
                className={`card text-sm shrink-0 min-w-[160px] md:min-w-0 ${
                  isCurrentPick ? "border-accent-orange ember-glow" : ""
                } ${team.id === myTeam?.id ? "border-accent-gold/30" : ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-text-primary truncate">
                      {team.name}
                      {team.id === myTeam?.id && (
                        <span className="text-accent-orange ml-1 text-xs">(You)</span>
                      )}
                    </p>
                    <p className="text-xs text-text-muted">
                      {team.profiles?.display_name || team.profiles?.username || "No owner"}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    {league.draft_type === "auction" && (
                      <p className="text-accent-gold">${budgetLeft}</p>
                    )}
                    <p className="text-text-muted">
                      {roster.length}/{rosterSize}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  {roster.map((pick: any) => (
                    <div
                      key={pick.id}
                      className="flex items-center justify-between text-xs py-0.5"
                    >
                      <span className="text-text-primary truncate">
                        {pick.players?.name || "Unknown"}
                      </span>
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        {pick.commissioner_pick && (
                          <span
                            className="text-accent-orange/70 text-[10px]"
                            title="Commissioner pick"
                          >
                            📋
                          </span>
                        )}
                        {pick.amount_paid && (
                          <span className="text-accent-gold">
                            ${pick.amount_paid}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {roster.length === 0 && (
                    <p className="text-text-muted text-xs italic">No picks yet</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Snake Draft Board */}
      {league.draft_type === "snake" && isDraftActive && (
        <div className="mt-6 card">
          <h3 className="section-title mb-3">Draft Board</h3>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-text-muted">Round</th>
                  {teams.map((t) => (
                    <th key={t.id} className="text-left py-2 px-3 text-text-muted truncate max-w-24">
                      {t.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: rosterSize }, (_, r) => (
                  <tr key={r} className="border-b border-border">
                    <td className="py-2 px-3 text-text-muted font-medium">R{r + 1}</td>
                    {snakeOrder
                      .filter((s) => s.round === r + 1)
                      .sort((a, b) => a.pick - b.pick)
                      .map((slot) => {
                        const pickNum = slot.pick;
                        const pick = draftPicks.find((dp) => dp.pick_number === pickNum);
                        const isCurrentSlot = currentPickNum === pickNum;
                        return (
                          <td
                            key={slot.pick}
                            className={`py-2 px-3 max-w-28 ${
                              isCurrentSlot ? "bg-accent-orange/10" : ""
                            }`}
                          >
                            {pick ? (
                              <span className="text-text-primary truncate block">
                                {pick.players?.name || "—"}
                                {pick.commissioner_pick && (
                                  <span className="ml-1 text-accent-orange/60" title="Commissioner pick">
                                    📋
                                  </span>
                                )}
                              </span>
                            ) : isCurrentSlot ? (
                              <span className="text-accent-orange font-medium">← Now</span>
                            ) : (
                              <span className="text-border">—</span>
                            )}
                          </td>
                        );
                      })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
