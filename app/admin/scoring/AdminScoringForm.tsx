"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import { DEFAULT_SCORING } from "@/lib/scoring";
import type { Season, Episode, Player, SeasonPrediction } from "@/types/database";
import SeasonPredictionsGrader from "../../(platform)/leagues/[leagueId]/admin/season-predictions/SeasonPredictionsGrader";

interface ScoringEvent {
  episode_id: string;
  player_id: string;
  category: string;
}

interface League {
  id: string;
  name: string;
  season_id: string;
}

interface Team {
  id: string;
  name: string;
  user_id: string | null;
}

interface AdminScoringFormProps {
  seasons: Season[];
  episodes: Episode[];
  players: Player[];
  scoringEvents: ScoringEvent[];
  leagues: League[];
}

export default function AdminScoringForm({
  seasons,
  episodes,
  players,
  scoringEvents,
  leagues,
}: AdminScoringFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"episode" | "season">(
    searchParams.get("tab") === "season" ? "season" : "episode"
  );

  function switchTab(tab: "episode" | "season") {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    router.replace(url.pathname + url.search, { scroll: false });
  }

  // Season predictions state
  const [selectedLeagueId, setSelectedLeagueId] = useState("");
  const [predTeams, setPredTeams] = useState<Team[]>([]);
  const [predPredictions, setPredPredictions] = useState<SeasonPrediction[]>([]);
  const [predLoading, setPredLoading] = useState(false);

  useEffect(() => {
    if (!selectedLeagueId) return;
    setPredLoading(true);
    Promise.all([
      fetch(`/api/leagues/${selectedLeagueId}/teams`).then((r) => r.json()),
      fetch(`/api/leagues/${selectedLeagueId}/season-predictions`).then((r) => r.json()),
    ]).then(([teamsData, predictionsData]) => {
      setPredTeams(teamsData.teams || []);
      setPredPredictions(Array.isArray(predictionsData) ? predictionsData : []);
      setPredLoading(false);
    });
  }, [selectedLeagueId]);

  const activeSeason = seasons[0] || null;
  const [selectedSeasonId, setSelectedSeasonId] = useState(activeSeason?.id || "");

  const seasonEpisodes = episodes.filter((e) => e.season_id === selectedSeasonId);
  const firstUnscored = seasonEpisodes.find((e) => !e.is_scored);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState(
    firstUnscored?.id || seasonEpisodes[seasonEpisodes.length - 1]?.id || ""
  );

  const seasonPlayers = players.filter((p) => {
    // Players for this season — but we don't have season_id on player in this filtered list
    // We need to filter by the selected season's players
    return true; // will be filtered below using a map
  });

  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [tribeRewardWinners, setTribeRewardWinners] = useState<string[]>([]);
  const [individualRewardWinner, setIndividualRewardWinner] = useState("");
  const [tribeImmunityWinners, setTribeImmunityWinners] = useState<string[]>([]);
  const [individualImmunityWinner, setIndividualImmunityWinner] = useState("");
  const [tribeImmunitySecond, setTribeImmunitySecond] = useState("");
  const [episodeTitleSpeaker, setEpisodeTitleSpeaker] = useState("");
  const [votedOutPlayers, setVotedOutPlayers] = useState<string[]>([]);
  const [isMerge, setIsMerge] = useState(false);
  const [isFinalThree, setIsFinalThree] = useState(false);
  const [finalThreePlayers, setFinalThreePlayers] = useState<string[]>([]);
  const [winnerPlayer, setWinnerPlayer] = useState("");

  // Get players for selected season
  const seasonPlayerList = players.filter((p) => (p as any).season_id === selectedSeasonId);
  const activePlayers = seasonPlayerList.filter((p) => p.is_active);
  const allSeasonPlayers = seasonPlayerList;

  // Pre-fill from scoring events
  const loadEpisodeData = useCallback((episodeId: string) => {
    const ep = episodes.find((e) => e.id === episodeId);
    if (!ep?.is_scored) {
      setTribeRewardWinners([]);
      setIndividualRewardWinner("");
      setTribeImmunityWinners([]);
      setIndividualImmunityWinner("");
      setTribeImmunitySecond("");
      setEpisodeTitleSpeaker("");
      setVotedOutPlayers([]);
      setIsMerge(false);
      setIsFinalThree(false);
      setFinalThreePlayers([]);
      setWinnerPlayer("");
      return;
    }

    const epEvents = scoringEvents.filter((e) => e.episode_id === episodeId);
    const playersByCategory = (cat: string) =>
      [...new Set(epEvents.filter((e) => e.category === cat).map((e) => e.player_id))];
    const firstByCategory = (cat: string) => playersByCategory(cat)[0] || "";

    setTribeRewardWinners(playersByCategory("tribe_reward"));
    setIndividualRewardWinner(firstByCategory("individual_reward"));
    setTribeImmunityWinners(playersByCategory("tribe_immunity"));
    setIndividualImmunityWinner(firstByCategory("individual_immunity"));
    setTribeImmunitySecond(firstByCategory("second_place_immunity"));
    setEpisodeTitleSpeaker(firstByCategory("episode_title"));
    setVotedOutPlayers(playersByCategory("voted_out_prediction"));
    setIsMerge(ep.is_merge);
    setIsFinalThree(ep.is_finale);
    setFinalThreePlayers(playersByCategory("final_three"));
    setWinnerPlayer(firstByCategory("winner"));
  }, [episodes, scoringEvents]);

  // When season changes, reset episode selection
  useEffect(() => {
    const eps = episodes.filter((e) => e.season_id === selectedSeasonId);
    const first = eps.find((e) => !e.is_scored) || eps[eps.length - 1];
    setSelectedEpisodeId(first?.id || "");
  }, [selectedSeasonId, episodes]);

  // When episode changes, pre-fill
  useEffect(() => {
    if (selectedEpisodeId) {
      loadEpisodeData(selectedEpisodeId);
    }
  }, [selectedEpisodeId, loadEpisodeData]);

  function toggleInArray(arr: string[], id: string, setArr: (v: string[]) => void) {
    if (arr.includes(id)) {
      setArr(arr.filter((x) => x !== id));
    } else {
      setArr([...arr, id]);
    }
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
        tribe_reward_winners: tribeRewardWinners,
        individual_reward_winner: individualRewardWinner || null,
        tribe_immunity_winners: tribeImmunityWinners,
        individual_immunity_winner: individualImmunityWinner || null,
        tribe_immunity_second: tribeImmunitySecond || null,
        episode_title_speaker: episodeTitleSpeaker || null,
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
      loadEpisodeData(selectedEpisodeId);
      router.refresh();
    }
  }

  const selectedEpisode = episodes.find((e) => e.id === selectedEpisodeId);
  const currentSeasonEpisodes = episodes.filter((e) => e.season_id === selectedSeasonId);

  return (
    <div>
      <PageHeader
        title="Scoring"
        subtitle="Score episodes and grade season predictions"
      />

      {/* Tab toggle */}
      <div className="flex gap-1 p-1 rounded-lg bg-bg-surface border border-border mb-6">
        <button
          type="button"
          onClick={() => switchTab("episode")}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === "episode"
              ? "bg-bg-card text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          Episode Scoring
        </button>
        <button
          type="button"
          onClick={() => switchTab("season")}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === "season"
              ? "bg-bg-card text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          Season Predictions
        </button>
      </div>

      {activeTab === "season" && (
        <div>
          <div className="card mb-6">
            <label className="label">Select League</label>
            <select
              className="input"
              value={selectedLeagueId}
              onChange={(e) => setSelectedLeagueId(e.target.value)}
            >
              <option value="">— Choose a league —</option>
              {leagues.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          {selectedLeagueId && predLoading && (
            <p className="text-text-muted text-sm text-center py-8">Loading...</p>
          )}

          {selectedLeagueId && !predLoading && (
            <SeasonPredictionsGrader
              leagueId={selectedLeagueId}
              teams={predTeams}
              predictions={predPredictions}
              isLocked={true}
            />
          )}

          {!selectedLeagueId && (
            <p className="text-text-muted text-sm text-center py-8">Select a league to grade its season predictions.</p>
          )}
        </div>
      )}

      {activeTab === "episode" && (<>

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
          {/* Points reference */}
          <div className="card bg-bg-surface border-border">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs text-text-muted">
              <span>Tribe Reward: <strong className="text-accent-gold">{DEFAULT_SCORING.TRIBE_REWARD_WIN}pt</strong></span>
              <span>Ind. Reward: <strong className="text-accent-gold">{DEFAULT_SCORING.INDIVIDUAL_REWARD_WIN}pt</strong></span>
              <span>Tribe Immunity: <strong className="text-accent-gold">{DEFAULT_SCORING.TRIBE_IMMUNITY_WIN}pt</strong></span>
              <span>Ind. Immunity: <strong className="text-accent-gold">{DEFAULT_SCORING.INDIVIDUAL_IMMUNITY_WIN}pt</strong></span>
              <span>2nd Immunity: <strong className="text-accent-gold">{DEFAULT_SCORING.TRIBE_IMMUNITY_SECOND}pt</strong></span>
              <span>Merge Bonus: <strong className="text-accent-gold">{DEFAULT_SCORING.MERGE_BONUS}pt each</strong></span>
              <span>Final 3: <strong className="text-accent-gold">{DEFAULT_SCORING.FINAL_THREE_BONUS}pt</strong></span>
              <span>Winner: <strong className="text-accent-gold">{DEFAULT_SCORING.WINNER_BONUS}pt</strong></span>
              <span>Title Speaker: <strong className="text-accent-gold">{DEFAULT_SCORING.EPISODE_TITLE_SPEAKER}pt</strong></span>
            </div>
          </div>

          {/* Tribe Reward */}
          <div className="card">
            <h3 className="section-title mb-3">Tribe Reward Winners ({DEFAULT_SCORING.TRIBE_REWARD_WIN}pt each)</h3>
            <p className="text-xs text-text-muted mb-3">Select all members of the winning tribe</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto scrollbar-hide">
              {activePlayers.map((p) => (
                <label key={p.id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-bg-surface">
                  <input
                    type="checkbox"
                    checked={tribeRewardWinners.includes(p.id)}
                    onChange={() => toggleInArray(tribeRewardWinners, p.id, setTribeRewardWinners)}
                    className="accent-accent-orange"
                  />
                  <span className="text-sm text-text-primary">{p.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tribe Immunity */}
          <div className="card">
            <h3 className="section-title mb-3">Tribe Immunity Winners ({DEFAULT_SCORING.TRIBE_IMMUNITY_WIN}pt each)</h3>
            <p className="text-xs text-text-muted mb-3">Select all members of the tribe that won immunity</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto scrollbar-hide">
              {activePlayers.map((p) => (
                <label key={p.id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-bg-surface">
                  <input
                    type="checkbox"
                    checked={tribeImmunityWinners.includes(p.id)}
                    onChange={() => toggleInArray(tribeImmunityWinners, p.id, setTribeImmunityWinners)}
                    className="accent-accent-orange"
                  />
                  <span className="text-sm text-text-primary">{p.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Single Selects */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SingleSelect
              label={`Individual Reward Winner (${DEFAULT_SCORING.INDIVIDUAL_REWARD_WIN}pt)`}
              players={activePlayers}
              value={individualRewardWinner}
              onChange={setIndividualRewardWinner}
            />
            <SingleSelect
              label={`Individual Immunity Winner (${DEFAULT_SCORING.INDIVIDUAL_IMMUNITY_WIN}pt)`}
              players={activePlayers}
              value={individualImmunityWinner}
              onChange={setIndividualImmunityWinner}
            />
            <SingleSelect
              label={`2nd Place Immunity (${DEFAULT_SCORING.TRIBE_IMMUNITY_SECOND}pt)`}
              players={activePlayers}
              value={tribeImmunitySecond}
              onChange={setTribeImmunitySecond}
            />
            <SingleSelect
              label={`Episode Title Speaker (${DEFAULT_SCORING.EPISODE_TITLE_SPEAKER}pt)`}
              players={activePlayers}
              value={episodeTitleSpeaker}
              onChange={setEpisodeTitleSpeaker}
            />
          </div>

          {/* Voted Out */}
          <div className="card">
            <h3 className="section-title mb-3">Voted Out</h3>
            <p className="text-xs text-text-muted mb-3">These players will be marked as eliminated across all leagues</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto scrollbar-hide">
              {allSeasonPlayers
                .filter((p) => p.is_active || votedOutPlayers.includes(p.id))
                .map((p) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-bg-surface">
                    <input
                      type="checkbox"
                      checked={votedOutPlayers.includes(p.id)}
                      onChange={() => toggleInArray(votedOutPlayers, p.id, setVotedOutPlayers)}
                      className="accent-red-500"
                    />
                    <span className="text-sm text-text-primary">
                      {p.name}
                      {!p.is_active && <span className="text-xs text-text-muted ml-1">(inactive)</span>}
                    </span>
                  </label>
                ))}
            </div>
          </div>

          {/* Milestones */}
          <div className="card">
            <h3 className="section-title mb-3">Milestones</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMerge}
                  onChange={(e) => setIsMerge(e.target.checked)}
                  className="accent-accent-gold w-4 h-4"
                />
                <span className="text-text-primary">
                  Merge this episode ({DEFAULT_SCORING.MERGE_BONUS}pt to all remaining players)
                </span>
              </label>

              <div>
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={isFinalThree}
                    onChange={(e) => setIsFinalThree(e.target.checked)}
                    className="accent-accent-gold w-4 h-4"
                  />
                  <span className="text-text-primary">
                    Final Three ({DEFAULT_SCORING.FINAL_THREE_BONUS}pt each)
                  </span>
                </label>

                {isFinalThree && (
                  <div className="ml-7 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto scrollbar-hide">
                    {activePlayers.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-bg-surface">
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
                )}
              </div>

              {isFinalThree && (
                <SingleSelect
                  label={`Winner (${DEFAULT_SCORING.WINNER_BONUS}pt — requires 20pt differential)`}
                  players={finalThreePlayers.length > 0
                    ? allSeasonPlayers.filter((p) => finalThreePlayers.includes(p.id))
                    : activePlayers}
                  value={winnerPlayer}
                  onChange={setWinnerPlayer}
                />
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !selectedEpisodeId}
            className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Tallying the votes…" : "Votes Are Final 🗳️ (All Leagues)"}
          </button>
        </form>
      )}
      </>)}
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
