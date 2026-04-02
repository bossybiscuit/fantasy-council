"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import { DEFAULT_SCORING } from "@/lib/scoring";
import type { League, Player, Episode } from "@/types/database";

interface ScoringEvent {
  episode_id: string;
  player_id: string;
  category: string;
}

interface ScoringFormProps {
  league: League & { seasons: any };
  players: Player[];
  episodes: Episode[];
  scoringEvents: ScoringEvent[];
}

export default function ScoringForm({ league, players, episodes, scoringEvents }: ScoringFormProps) {
  const router = useRouter();
  const [selectedEpisodeId, setSelectedEpisodeId] = useState(
    episodes.find((e) => !e.is_scored)?.id || episodes[episodes.length - 1]?.id || ""
  );
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [foundIdolPlayer, setFoundIdolPlayer] = useState("");
  const [successfulIdolPlayPlayer, setSuccessfulIdolPlayPlayer] = useState("");
  const [tribeRewardWinners, setTribeRewardWinners] = useState<string[]>([]);
  const [tribeRewardSecond, setTribeRewardSecond] = useState<string[]>([]);
  const [tribeImmunityWinners, setTribeImmunityWinners] = useState<string[]>([]);
  const [tribeImmunitySecond, setTribeImmunitySecond] = useState<string[]>([]);
  const [individualRewardWinners, setIndividualRewardWinners] = useState<string[]>([]);
  const [individualImmunityWinners, setIndividualImmunityWinners] = useState<string[]>([]);
  const [votesReceivedPlayers, setVotesReceivedPlayers] = useState<string[]>([]);
  const [votedOutPlayers, setVotedOutPlayers] = useState<string[]>([]);
  const [medevacPlayers, setMedevacPlayers] = useState<string[]>([]);
  const [isMerge, setIsMerge] = useState(false);
  const [isFinalThree, setIsFinalThree] = useState(false);
  const [finalThreePlayers, setFinalThreePlayers] = useState<string[]>([]);
  const [winnerPlayer, setWinnerPlayer] = useState("");

  const activePlayers = players.filter((p) => p.is_active).sort((a, b) => a.name.localeCompare(b.name));
  const allPlayers = [...players].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  // Check if post-merge (all active players on same tribe)
  const uniqueActiveTribes = new Set(activePlayers.map((p) => p.tribe || "No Tribe"));
  const isMerged = uniqueActiveTribes.size <= 1;

  // Tribe-grouped players — if merged, single group with eliminated at bottom
  const buildTribeEntries = (playerList: Player[]): [string, { players: Player[]; color: string | null }][] => {
    if (isMerged) {
      const sorted = [...playerList].sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      const tribeName = activePlayers[0]?.tribe || "Merged Tribe";
      const tribeColor = activePlayers[0]?.tribe_color || null;
      return [[tribeName, { players: sorted, color: tribeColor }]];
    }
    const groups = playerList.reduce(
      (acc, p) => {
        const tribe = p.tribe || "No Tribe";
        if (!acc[tribe]) acc[tribe] = { players: [], color: p.tribe_color };
        acc[tribe].players.push(p);
        return acc;
      },
      {} as Record<string, { players: Player[]; color: string | null }>
    );
    return Object.entries(groups);
  };

  const tribeEntries = buildTribeEntries(activePlayers);

  function clearForm() {
    setFoundIdolPlayer("");
    setSuccessfulIdolPlayPlayer("");
    setTribeRewardWinners([]);
    setTribeRewardSecond([]);
    setTribeImmunityWinners([]);
    setTribeImmunitySecond([]);
    setIndividualRewardWinners([]);
    setIndividualImmunityWinners([]);
    setVotesReceivedPlayers([]);
    setVotedOutPlayers([]);
    setMedevacPlayers([]);
    setIsMerge(false);
    setIsFinalThree(false);
    setFinalThreePlayers([]);
    setWinnerPlayer("");
  }

  const loadEpisodeData = useCallback(
    (episodeId: string) => {
      const ep = episodes.find((e) => e.id === episodeId);
      if (!ep?.is_scored) {
        clearForm();
        return;
      }

      const epEvents = scoringEvents.filter((e) => e.episode_id === episodeId);
      const playersByCategory = (cat: string) =>
        [...new Set(epEvents.filter((e) => e.category === cat).map((e) => e.player_id))];
      const firstByCategory = (cat: string) => playersByCategory(cat)[0] || "";

      setFoundIdolPlayer(firstByCategory("found_idol"));
      setSuccessfulIdolPlayPlayer(firstByCategory("successful_idol_play"));
      setTribeRewardWinners(playersByCategory("tribe_reward"));
      setTribeRewardSecond(playersByCategory("tribe_reward_second"));
      setTribeImmunityWinners(playersByCategory("tribe_immunity"));
      setTribeImmunitySecond(playersByCategory("second_place_immunity"));
      setIndividualRewardWinners(playersByCategory("individual_reward"));
      setIndividualImmunityWinners(playersByCategory("individual_immunity"));
      setVotesReceivedPlayers(playersByCategory("votes_received"));
      setVotedOutPlayers(playersByCategory("voted_out_prediction"));
      setMedevacPlayers(playersByCategory("medevac"));
      setIsMerge(ep.is_merge);
      setIsFinalThree(ep.is_finale);
      setFinalThreePlayers(playersByCategory("final_three"));
      setWinnerPlayer(firstByCategory("winner"));
    },
    [episodes, scoringEvents]
  );

  useEffect(() => {
    if (selectedEpisodeId) loadEpisodeData(selectedEpisodeId);
  }, [selectedEpisodeId, loadEpisodeData]);

  function toggleInArray(arr: string[], id: string, setArr: (v: string[]) => void) {
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  }

  function toggleTribeInArray(arr: string[], ids: string[], allSelected: boolean, setArr: (v: string[]) => void) {
    if (allSelected) {
      setArr(arr.filter((x) => !ids.includes(x)));
    } else {
      setArr([...arr, ...ids.filter((id) => !arr.includes(id))]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEpisodeId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (winnerPlayer && !isFinalThree) {
      setError("Must mark Final Three before declaring a winner");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/scoring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        league_id: league.id,
        episode_id: selectedEpisodeId,
        found_idol_players: foundIdolPlayer ? [foundIdolPlayer] : [],
        successful_idol_play_players: successfulIdolPlayPlayer ? [successfulIdolPlayPlayer] : [],
        tribe_reward_winners: tribeRewardWinners,
        tribe_reward_second: tribeRewardSecond,
        tribe_immunity_winners: tribeImmunityWinners,
        tribe_immunity_second: tribeImmunitySecond,
        individual_reward_winners: individualRewardWinners,
        individual_immunity_winners: individualImmunityWinners,
        votes_received_players: votesReceivedPlayers,
        voted_out_players: votedOutPlayers,
        medevac_players: medevacPlayers,
        is_merge: isMerge,
        is_final_three: isFinalThree,
        final_three_players: finalThreePlayers,
        winner_player: winnerPlayer || null,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
    } else {
      setSuccess(`The tribe has spoken. Episode scored — ${data.events_count} events recorded.`);
      router.refresh();
    }
  }

  async function handleReset() {
    if (!selectedEpisodeId) return;
    if (
      !confirm(
        "Reset all scoring for this episode? This clears events, team scores, and prediction results. Voted-out players will need to be manually re-activated."
      )
    )
      return;

    setResetting(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/scoring", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ league_id: league.id, episode_id: selectedEpisodeId }),
    });

    const data = await res.json();
    setResetting(false);

    if (!res.ok) {
      setError(data.error);
    } else {
      setSuccess("Episode scoring cleared. Re-enter the results below.");
      clearForm();
      router.refresh();
    }
  }

  const selectedEpisode = episodes.find((e) => e.id === selectedEpisodeId);

  return (
    <div>
      <PageHeader title="Scoring" subtitle="Score episodes and grade season predictions" />

      {/* Episode Selector */}
      <div className="card mb-6">
        <label className="label">Select Episode</label>
        <select
          className="input"
          value={selectedEpisodeId}
          onChange={(e) => setSelectedEpisodeId(e.target.value)}
        >
          {episodes.map((ep) => (
            <option key={ep.id} value={ep.id}>
              E{ep.episode_number} — {ep.title || "Untitled"}
              {ep.is_scored ? " ✓" : ""}
            </option>
          ))}
        </select>
        {selectedEpisode?.is_scored && (
          <div className="flex items-center justify-between mt-2 gap-4">
            <p className="text-yellow-400 text-xs">
              ⚠️ This episode is already scored. Form is pre-filled — re-submit to recalculate.
            </p>
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting}
              className="text-xs text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 rounded px-2 py-1 shrink-0 transition-colors disabled:opacity-40"
            >
              {resetting ? "Clearing…" : "Reset Episode"}
            </button>
          </div>
        )}
      </div>

      {success && (
        <div className="mb-4 p-3 rounded-lg bg-green-900/20 border border-green-700/30 text-green-400 text-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ---- Section 1: Episode Scoring ---- */}
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider pb-1">
          Episode Scoring
        </p>

        {/* Idol Activity */}
        <div className="card">
          <h3 className="section-title mb-4">Idol Activity</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SingleSelect
              label={`Found Idol (${DEFAULT_SCORING.FOUND_IDOL}pt)`}
              players={activePlayers}
              value={foundIdolPlayer}
              onChange={setFoundIdolPlayer}
            />
            <SingleSelect
              label={`Played Idol Successfully (${DEFAULT_SCORING.SUCCESSFUL_IDOL_PLAY}pt)`}
              players={activePlayers}
              value={successfulIdolPlayPlayer}
              onChange={setSuccessfulIdolPlayPlayer}
            />
          </div>
        </div>

        {/* Tribe Reward */}
        <div className="card">
          <h3 className="section-title mb-4">Tribe Reward</h3>
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex-1">
              <p className="text-xs font-medium text-text-muted mb-3">
                Reward Win ({DEFAULT_SCORING.TRIBE_REWARD_WIN}pt each)
              </p>
              <TribePlayerGrid
                tribeEntries={tribeEntries}
                allPlayers={activePlayers}
                selected={tribeRewardWinners}
                onToggle={(id) => toggleInArray(tribeRewardWinners, id, setTribeRewardWinners)}
                onToggleTribe={(ids, allSelected) =>
                  toggleTribeInArray(tribeRewardWinners, ids, allSelected, setTribeRewardWinners)
                }
              />
            </div>

            {/* Vertical divider */}
            <div className="hidden sm:block border-l border-border" />

            <div className="flex-1">
              <p className="text-xs font-medium text-text-muted mb-3">
                Reward 2nd ({DEFAULT_SCORING.TRIBE_REWARD_SECOND}pt each)
              </p>
              <TribePlayerGrid
                tribeEntries={tribeEntries}
                allPlayers={activePlayers}
                selected={tribeRewardSecond}
                onToggle={(id) => toggleInArray(tribeRewardSecond, id, setTribeRewardSecond)}
                onToggleTribe={(ids, allSelected) =>
                  toggleTribeInArray(tribeRewardSecond, ids, allSelected, setTribeRewardSecond)
                }
              />
            </div>
          </div>
        </div>

        {/* Tribe Immunity */}
        <div className="card">
          <h3 className="section-title mb-4">Tribe Immunity</h3>
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex-1">
              <p className="text-xs font-medium text-text-muted mb-3">
                Immunity Win ({DEFAULT_SCORING.TRIBE_IMMUNITY_WIN}pt each)
              </p>
              <TribePlayerGrid
                tribeEntries={tribeEntries}
                allPlayers={activePlayers}
                selected={tribeImmunityWinners}
                onToggle={(id) => toggleInArray(tribeImmunityWinners, id, setTribeImmunityWinners)}
                onToggleTribe={(ids, allSelected) =>
                  toggleTribeInArray(tribeImmunityWinners, ids, allSelected, setTribeImmunityWinners)
                }
              />
            </div>

            {/* Vertical divider */}
            <div className="hidden sm:block border-l border-border" />

            <div className="flex-1">
              <p className="text-xs font-medium text-text-muted mb-3">
                Immunity 2nd ({DEFAULT_SCORING.TRIBE_IMMUNITY_SECOND}pt each)
              </p>
              <TribePlayerGrid
                tribeEntries={tribeEntries}
                allPlayers={activePlayers}
                selected={tribeImmunitySecond}
                onToggle={(id) => toggleInArray(tribeImmunitySecond, id, setTribeImmunitySecond)}
                onToggleTribe={(ids, allSelected) =>
                  toggleTribeInArray(tribeImmunitySecond, ids, allSelected, setTribeImmunitySecond)
                }
              />
            </div>
          </div>
        </div>

        {/* Individual Challenges */}
        <div className="card">
          <h3 className="section-title mb-4">Individual Challenges</h3>
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex-1">
              <p className="text-xs font-medium text-text-muted mb-3">
                Individual Reward ({DEFAULT_SCORING.INDIVIDUAL_REWARD_WIN}pt each)
              </p>
              <div className="grid grid-cols-2 gap-1">
                {activePlayers.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-bg-surface">
                    <input
                      type="checkbox"
                      checked={individualRewardWinners.includes(p.id)}
                      onChange={() => toggleInArray(individualRewardWinners, p.id, setIndividualRewardWinners)}
                      className="accent-accent-orange"
                    />
                    <span className="text-sm text-text-primary">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="hidden sm:block border-l border-border" />

            <div className="flex-1">
              <p className="text-xs font-medium text-text-muted mb-3">
                Individual Immunity ({DEFAULT_SCORING.INDIVIDUAL_IMMUNITY_WIN}pt each)
              </p>
              <div className="grid grid-cols-2 gap-1">
                {activePlayers.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-bg-surface">
                    <input
                      type="checkbox"
                      checked={individualImmunityWinners.includes(p.id)}
                      onChange={() => toggleInArray(individualImmunityWinners, p.id, setIndividualImmunityWinners)}
                      className="accent-accent-orange"
                    />
                    <span className="text-sm text-text-primary">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Votes Received */}
        <div className="card">
          <h3 className="section-title mb-2">
            Votes Received at Tribal ({DEFAULT_SCORING.VOTES_RECEIVED}pt each)
          </h3>
          <p className="text-xs text-text-muted mb-3">Select players who received votes this episode</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {allPlayers
              .filter((p) => p.is_active || votedOutPlayers.includes(p.id))
              .map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-bg-surface"
                >
                  <input
                    type="checkbox"
                    checked={votesReceivedPlayers.includes(p.id)}
                    onChange={() => toggleInArray(votesReceivedPlayers, p.id, setVotesReceivedPlayers)}
                    className="accent-accent-orange"
                  />
                  <span className="text-sm text-text-primary">{p.name}</span>
                </label>
              ))}
          </div>
        </div>

        {/* Voted Out */}
        <div className="card">
          <h3 className="section-title mb-2">Voted Out</h3>
          <p className="text-xs text-text-muted mb-3">Marked as eliminated — vote prediction points awarded</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {allPlayers.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-bg-surface"
              >
                <input
                  type="checkbox"
                  checked={votedOutPlayers.includes(p.id)}
                  onChange={() => toggleInArray(votedOutPlayers, p.id, setVotedOutPlayers)}
                  className="accent-red-500"
                />
                <span className={`text-sm ${p.is_active ? "text-text-primary" : "text-text-muted line-through"}`}>
                  {p.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* No-Vote Elimination (Medevac / Quit) */}
        <div className="card border-border/50">
          <h3 className="section-title mb-1">No-Vote Elimination</h3>
          <p className="text-xs text-text-muted mb-3">Medevac, quit, etc. — marked as eliminated, <span className="font-medium text-accent-gold">no prediction points awarded</span></p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {allPlayers.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-bg-surface"
              >
                <input
                  type="checkbox"
                  checked={medevacPlayers.includes(p.id)}
                  onChange={() => toggleInArray(medevacPlayers, p.id, setMedevacPlayers)}
                  className="accent-accent-gold"
                />
                <span className={`text-sm ${p.is_active ? "text-text-primary" : "text-text-muted line-through"}`}>
                  {p.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Torch divider */}
        <div className="flex items-center gap-4 py-2">
          <div className="flex-1 border-t border-border" />
          <span className="text-xl select-none">🔥</span>
          <div className="flex-1 border-t border-border" />
        </div>

        {/* ---- Section 2: Season Milestones ---- */}
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider pb-1">
          Season Milestones
        </p>

        {/* Merge */}
        <div
          className={`card border transition-colors ${
            isMerge ? "border-accent-gold/40 bg-accent-gold/5" : "border-border"
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-text-primary">Merge Bonus</p>
              <p className="text-xs text-text-muted mt-0.5">
                {DEFAULT_SCORING.MERGE_BONUS}pt awarded to all remaining castaways
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsMerge(!isMerge)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                isMerge ? "bg-accent-gold" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                  isMerge ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Final Three */}
        <div
          className={`card border transition-colors ${
            isFinalThree ? "border-accent-gold/40 bg-accent-gold/5" : "border-border"
          }`}
        >
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <p className="font-medium text-text-primary">Final Three</p>
              <p className="text-xs text-text-muted mt-0.5">{DEFAULT_SCORING.FINAL_THREE_BONUS}pt each</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !isFinalThree;
                setIsFinalThree(next);
                if (!next) {
                  setFinalThreePlayers([]);
                  setWinnerPlayer("");
                }
              }}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                isFinalThree ? "bg-accent-gold" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                  isFinalThree ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          {isFinalThree && (
            <div>
              <p className="text-xs text-text-muted mb-2">Select finalists (up to 3)</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {activePlayers.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-bg-base"
                  >
                    <input
                      type="checkbox"
                      checked={finalThreePlayers.includes(p.id)}
                      onChange={() => toggleInArray(finalThreePlayers, p.id, setFinalThreePlayers)}
                      disabled={!finalThreePlayers.includes(p.id) && finalThreePlayers.length >= 3}
                      className="accent-accent-gold"
                    />
                    <span className="text-sm text-text-primary">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Winner */}
        {isFinalThree && (
          <div
            className={`card border transition-colors ${
              winnerPlayer ? "border-accent-gold/40 bg-accent-gold/5" : "border-border"
            }`}
          >
            <h3 className="font-medium text-text-primary mb-3">Sole Survivor</h3>
            <SingleSelect
              label={`Winner (${DEFAULT_SCORING.WINNER_BONUS}pt)`}
              players={
                finalThreePlayers.length > 0
                  ? allPlayers.filter((p) => finalThreePlayers.includes(p.id))
                  : activePlayers
              }
              value={winnerPlayer}
              onChange={setWinnerPlayer}
            />
          </div>
        )}

        {/* Bottom actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || !selectedEpisodeId}
            className="btn-primary flex-1 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Tallying the votes..." : "Votes Are Final 🗳️"}
          </button>
          <button
            type="button"
            onClick={clearForm}
            className="btn-secondary px-5 py-3 text-sm"
          >
            Clear Form
          </button>
        </div>
      </form>
    </div>
  );
}

function TribePlayerGrid({
  tribeEntries,
  allPlayers,
  selected,
  onToggle,
  onToggleTribe,
}: {
  tribeEntries: [string, { players: Player[]; color: string | null }][];
  allPlayers: Player[];
  selected: string[];
  onToggle: (id: string) => void;
  onToggleTribe?: (ids: string[], allSelected: boolean) => void;
}) {
  if (tribeEntries.length > 0) {
    return (
      <div className="space-y-3">
        {tribeEntries.map(([tribe, { players: tribePlayers, color }]) => {
          const tribeIds = tribePlayers.map((p) => p.id);
          const allSelected = tribeIds.length > 0 && tribeIds.every((id) => selected.includes(id));
          return (
            <div key={tribe}>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  {color && (
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                  )}
                  <span className="text-xs font-medium text-text-muted">{tribe}</span>
                </div>
                {onToggleTribe && (
                  <button
                    type="button"
                    onClick={() => onToggleTribe(tribeIds, allSelected)}
                    className="text-xs text-text-muted hover:text-text-primary transition-colors"
                  >
                    {allSelected ? "Deselect all" : "Select all"}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1">
                {tribePlayers.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-bg-surface"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(p.id)}
                      onChange={() => onToggle(p.id)}
                      className="accent-accent-orange"
                    />
                    <span className="text-sm text-text-primary">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1">
      {allPlayers.map((p) => (
        <label
          key={p.id}
          className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-bg-surface"
        >
          <input
            type="checkbox"
            checked={selected.includes(p.id)}
            onChange={() => onToggle(p.id)}
            className="accent-accent-orange"
          />
          <span className="text-sm text-text-primary">{p.name}</span>
        </label>
      ))}
    </div>
  );
}

function SingleSelect({
  label,
  players,
  value,
  onChange,
}: {
  label: string;
  players: Player[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="label text-xs">{label}</label>
      <select
        className="input text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— None —</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.tribe ? ` (${p.tribe})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
