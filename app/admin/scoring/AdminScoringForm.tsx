"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import { DEFAULT_SCORING } from "@/lib/scoring";
import type { Season, Episode, Player } from "@/types/database";

interface ScoringEvent {
  episode_id: string;
  player_id: string;
  category: string;
}

interface AdminScoringFormProps {
  seasons: Season[];
  episodes: Episode[];
  players: Player[];
  scoringEvents: ScoringEvent[];
}

export default function AdminScoringForm({
  seasons,
  episodes,
  players,
  scoringEvents,
}: AdminScoringFormProps) {
  const router = useRouter();

  const activeSeason = seasons[0] || null;
  const [selectedSeasonId, setSelectedSeasonId] = useState(activeSeason?.id || "");

  const currentSeasonEpisodes = episodes.filter((e) => e.season_id === selectedSeasonId);
  const firstUnscored = currentSeasonEpisodes.find((e) => !e.is_scored);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState(
    firstUnscored?.id || currentSeasonEpisodes[currentSeasonEpisodes.length - 1]?.id || ""
  );

  const seasonPlayerList = players.filter((p) => (p as any).season_id === selectedSeasonId);
  const activePlayers = seasonPlayerList.filter((p) => p.is_active);
  const allSeasonPlayers = seasonPlayerList;

  const selectedEpisode = episodes.find((e) => e.id === selectedEpisodeId);
  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId);
  const lastScoredEp = [...currentSeasonEpisodes]
    .reverse()
    .find((ep) => ep.is_scored && ep.id !== selectedEpisodeId);

  const mergeLockedEpisode = currentSeasonEpisodes.find(
    (ep) => ep.is_merge && ep.id !== selectedEpisodeId
  );
  const finaleLockedEpisode = currentSeasonEpisodes.find(
    (ep) => ep.is_finale && ep.id !== selectedEpisodeId
  );

  // Tribe-grouped players for the tribe immunity grids
  const tribeGroups = activePlayers.reduce(
    (acc, p) => {
      const tribe = p.tribe || "No Tribe";
      if (!acc[tribe]) acc[tribe] = { players: [], color: p.tribe_color };
      acc[tribe].players.push(p);
      return acc;
    },
    {} as Record<string, { players: Player[]; color: string | null }>
  );
  const tribeEntries = Object.entries(tribeGroups);

  // Form state
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [foundIdolPlayer, setFoundIdolPlayer] = useState("");
  const [successfulIdolPlayPlayer, setSuccessfulIdolPlayPlayer] = useState("");
  const [tribeImmunityWinners, setTribeImmunityWinners] = useState<string[]>([]);
  const [tribeImmunitySecond, setTribeImmunitySecond] = useState<string[]>([]);
  const [individualRewardWinner, setIndividualRewardWinner] = useState("");
  const [votesReceivedPlayers, setVotesReceivedPlayers] = useState<string[]>([]);
  const [votedOutPlayers, setVotedOutPlayers] = useState<string[]>([]);
  const [isMerge, setIsMerge] = useState(false);
  const [isFinalThree, setIsFinalThree] = useState(false);
  const [finalThreePlayers, setFinalThreePlayers] = useState<string[]>([]);
  const [winnerPlayer, setWinnerPlayer] = useState("");

  function clearForm() {
    setFoundIdolPlayer("");
    setSuccessfulIdolPlayPlayer("");
    setTribeImmunityWinners([]);
    setTribeImmunitySecond([]);
    setIndividualRewardWinner("");
    setVotesReceivedPlayers([]);
    setVotedOutPlayers([]);
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
      setTribeImmunityWinners(playersByCategory("tribe_immunity"));
      setTribeImmunitySecond(playersByCategory("second_place_immunity"));
      setIndividualRewardWinner(firstByCategory("individual_reward"));
      setVotesReceivedPlayers(playersByCategory("votes_received"));
      setVotedOutPlayers(playersByCategory("voted_out_prediction"));
      setIsMerge(ep.is_merge);
      setIsFinalThree(ep.is_finale);
      setFinalThreePlayers(playersByCategory("final_three"));
      setWinnerPlayer(firstByCategory("winner"));
    },
    [episodes, scoringEvents]
  );

  useEffect(() => {
    const eps = episodes.filter((e) => e.season_id === selectedSeasonId);
    const first = eps.find((e) => !e.is_scored) || eps[eps.length - 1];
    setSelectedEpisodeId(first?.id || "");
  }, [selectedSeasonId, episodes]);

  useEffect(() => {
    if (selectedEpisodeId) loadEpisodeData(selectedEpisodeId);
  }, [selectedEpisodeId, loadEpisodeData]);

  function toggleInArray(arr: string[], id: string, setArr: (v: string[]) => void) {
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEpisodeId || !selectedSeasonId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (winnerPlayer && !isFinalThree) {
      setError("Must mark Final Three before declaring a winner");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/admin/scoring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        season_id: selectedSeasonId,
        episode_id: selectedEpisodeId,
        found_idol_players: foundIdolPlayer ? [foundIdolPlayer] : [],
        successful_idol_play_players: successfulIdolPlayPlayer ? [successfulIdolPlayPlayer] : [],
        tribe_immunity_winners: tribeImmunityWinners,
        tribe_immunity_second: tribeImmunitySecond,
        individual_reward_winner: individualRewardWinner || null,
        votes_received_players: votesReceivedPlayers,
        voted_out_players: votedOutPlayers,
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
      setSuccess(
        `The tribe has spoken. Scored across ${data.leagues_count} league${data.leagues_count !== 1 ? "s" : ""} — ${data.events_count} events recorded.`
      );
      router.refresh();
    }
  }

  async function handleReset() {
    if (!selectedEpisodeId || !selectedSeasonId) return;
    if (
      !confirm(
        "Reset scoring for this episode across ALL leagues? This clears events, team scores, and prediction results."
      )
    )
      return;

    setResetting(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/admin/scoring", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ season_id: selectedSeasonId, episode_id: selectedEpisodeId }),
    });

    const data = await res.json();
    setResetting(false);

    if (!res.ok) {
      setError(data.error);
    } else {
      setSuccess("Episode scoring cleared across all leagues.");
      clearForm();
      router.refresh();
    }
  }

  return (
    <div>
      <PageHeader title="Scoring" subtitle="Score episodes across all leagues" />

      {/* Season + Episode Selectors */}
      <div className="card mb-6 space-y-4">
        <div>
          <label className="label">Season</label>
          <select
            className="input"
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
          >
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Episode</label>
          <select
            className="input"
            value={selectedEpisodeId}
            onChange={(e) => setSelectedEpisodeId(e.target.value)}
          >
            {currentSeasonEpisodes.map((ep) => (
              <option key={ep.id} value={ep.id}>
                E{ep.episode_number} — {ep.title || "Untitled"}
                {ep.is_scored ? " ✓" : ""}
              </option>
            ))}
          </select>
          {selectedEpisode?.is_scored && (
            <div className="flex items-center justify-between mt-2 gap-4">
              <p className="text-yellow-400 text-xs">
                ⚠️ Already scored. Form is pre-filled — re-submit to recalculate all leagues.
              </p>
              <button
                type="button"
                onClick={handleReset}
                disabled={resetting}
                className="text-xs text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 rounded px-2 py-1 shrink-0 transition-colors disabled:opacity-40"
              >
                {resetting ? "Clearing…" : "Reset All Leagues"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary bar */}
      {selectedSeason && selectedEpisode && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm mb-6 px-1">
          <span className="font-medium text-text-primary">{selectedSeason.name}</span>
          <span className="text-text-muted">·</span>
          <span className="text-text-muted">Episode {selectedEpisode.episode_number}</span>
          <span className="text-text-muted">·</span>
          <span className="text-text-muted">{activePlayers.length} castaways remaining</span>
          {lastScoredEp && (
            <>
              <span className="text-text-muted">·</span>
              <span className="text-text-muted">Last scored: E{lastScoredEp.episode_number}</span>
            </>
          )}
        </div>
      )}

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

      {!selectedSeasonId || !selectedEpisodeId ? (
        <p className="text-text-muted text-center py-8">Select a season and episode to begin.</p>
      ) : (
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

          {/* Tribe Immunity */}
          <div className="card">
            <h3 className="section-title mb-4">Tribe Immunity</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Immunity Win */}
              <div>
                <p className="text-xs font-medium text-text-muted mb-3">
                  Immunity Win ({DEFAULT_SCORING.TRIBE_IMMUNITY_WIN}pt each)
                </p>
                <TribePlayerGrid
                  tribeEntries={tribeEntries}
                  allPlayers={activePlayers}
                  selected={tribeImmunityWinners}
                  onToggle={(id) => toggleInArray(tribeImmunityWinners, id, setTribeImmunityWinners)}
                  accentClass="accent-accent-orange"
                />
              </div>

              {/* Immunity 2nd Place */}
              <div>
                <p className="text-xs font-medium text-text-muted mb-3">
                  Immunity 2nd ({DEFAULT_SCORING.TRIBE_IMMUNITY_SECOND}pt each)
                </p>
                <TribePlayerGrid
                  tribeEntries={tribeEntries}
                  allPlayers={activePlayers}
                  selected={tribeImmunitySecond}
                  onToggle={(id) => toggleInArray(tribeImmunitySecond, id, setTribeImmunitySecond)}
                  accentClass="accent-accent-orange"
                />
              </div>
            </div>
          </div>

          {/* Individual Reward */}
          <div className="card">
            <h3 className="section-title mb-4">Individual Reward</h3>
            <SingleSelect
              label={`Reward Winner (${DEFAULT_SCORING.INDIVIDUAL_REWARD_WIN}pt)`}
              players={activePlayers}
              value={individualRewardWinner}
              onChange={setIndividualRewardWinner}
            />
          </div>

          {/* Votes Received */}
          <div className="card">
            <h3 className="section-title mb-2">
              Votes Received at Tribal ({DEFAULT_SCORING.VOTES_RECEIVED}pt each)
            </h3>
            <p className="text-xs text-text-muted mb-3">Select players who received votes this episode</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {allSeasonPlayers
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
            <p className="text-xs text-text-muted mb-3">
              These players will be marked as eliminated across all leagues
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {allSeasonPlayers
                .filter((p) => p.is_active || votedOutPlayers.includes(p.id))
                .map((p) => (
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
                    <span className="text-sm text-text-primary">
                      {p.name}
                      {!p.is_active && (
                        <span className="text-xs text-text-muted ml-1">(inactive)</span>
                      )}
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
            } ${mergeLockedEpisode ? "opacity-60 pointer-events-none" : ""}`}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-text-primary">Merge Bonus</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {DEFAULT_SCORING.MERGE_BONUS}pt awarded to all remaining castaways
                </p>
                {mergeLockedEpisode && (
                  <p className="text-xs text-yellow-400 mt-1">
                    Scored in Episode {mergeLockedEpisode.episode_number}
                  </p>
                )}
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
            } ${finaleLockedEpisode ? "opacity-60 pointer-events-none" : ""}`}
          >
            <div className="flex items-center justify-between gap-4 mb-3">
              <div>
                <p className="font-medium text-text-primary">Final Three</p>
                <p className="text-xs text-text-muted mt-0.5">{DEFAULT_SCORING.FINAL_THREE_BONUS}pt each</p>
                {finaleLockedEpisode && (
                  <p className="text-xs text-yellow-400 mt-1">
                    Scored in Episode {finaleLockedEpisode.episode_number}
                  </p>
                )}
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
                    ? allSeasonPlayers.filter((p) => finalThreePlayers.includes(p.id))
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
              {loading ? "Tallying the votes…" : "Votes Are Final 🗳️ (All Leagues)"}
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
      )}
    </div>
  );
}

function TribePlayerGrid({
  tribeEntries,
  allPlayers,
  selected,
  onToggle,
  accentClass,
}: {
  tribeEntries: [string, { players: Player[]; color: string | null }][];
  allPlayers: Player[];
  selected: string[];
  onToggle: (id: string) => void;
  accentClass: string;
}) {
  if (tribeEntries.length > 0) {
    return (
      <div className="space-y-3">
        {tribeEntries.map(([tribe, { players: tribePlayers, color }]) => (
          <div key={tribe}>
            <div className="flex items-center gap-2 mb-1.5">
              {color && (
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
              )}
              <span className="text-xs font-medium text-text-muted">{tribe}</span>
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
                    className={accentClass}
                  />
                  <span className="text-sm text-text-primary">{p.name}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
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
            className={accentClass}
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
