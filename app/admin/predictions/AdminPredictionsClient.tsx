"use client";

import { useState, useEffect } from "react";
import AdminSeasonPredictionsPanel from "./AdminSeasonPredictionsPanel";

interface League {
  id: string;
  name: string;
  season_id: string;
}

interface Episode {
  id: string;
  episode_number: number;
  title: string | null;
  is_scored: boolean;
  prediction_deadline: string | null;
  air_date: string | null;
}

interface Player {
  id: string;
  name: string;
  is_active: boolean;
  tribe: string | null;
}

interface Team {
  id: string;
  name: string;
}

interface TeamPred {
  team: Team;
  predictions: { team_id: string; player_id: string; points_allocated: number; players: any }[];
  title_pick_player_id: string | null;
}

interface AdminPredictionsClientProps {
  leagues: League[];
}

export default function AdminPredictionsClient({ leagues }: AdminPredictionsClientProps) {
  const [activeTab, setActiveTab] = useState<"episode" | "season">("episode");
  const [selectedLeagueId, setSelectedLeagueId] = useState(leagues[0]?.id || "");
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingLeague, setLoadingLeague] = useState(false);

  const [selectedEpisodeId, setSelectedEpisodeId] = useState("");
  const [deadlineInput, setDeadlineInput] = useState("");
  const [savingDeadline, setSavingDeadline] = useState(false);
  const [deadlineSaved, setDeadlineSaved] = useState(false);

  const [teamPreds, setTeamPreds] = useState<TeamPred[]>([]);
  const [loadingPreds, setLoadingPreds] = useState(false);

  const [votedOutPlayerId, setVotedOutPlayerId] = useState("");
  const [titleSpeakerPlayerId, setTitleSpeakerPlayerId] = useState("");
  const [scoring, setScoring] = useState(false);
  const [scoreResult, setScoreResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Fetch episodes + players when league changes
  useEffect(() => {
    if (!selectedLeagueId) return;
    setLoadingLeague(true);
    setEpisodes([]);
    setPlayers([]);
    setTeams([]);
    setSelectedEpisodeId("");
    setScoreResult(null);

    fetch(`/api/admin/predictions?league_id=${selectedLeagueId}`)
      .then((r) => r.json())
      .then((d) => {
        const eps: Episode[] = d.episodes || [];
        setEpisodes(eps);
        setPlayers(d.players || []);
        setTeams(d.teams || []);
        // Default to first unscored episode
        const defaultEp = eps.find((e) => !e.is_scored) || eps[eps.length - 1];
        if (defaultEp) setSelectedEpisodeId(defaultEp.id);
        setLoadingLeague(false);
      })
      .catch(() => setLoadingLeague(false));
  }, [selectedLeagueId]);

  // Sync deadline input when episode changes
  useEffect(() => {
    const ep = episodes.find((e) => e.id === selectedEpisodeId);
    if (ep?.prediction_deadline) {
      const d = new Date(ep.prediction_deadline);
      const pad = (n: number) => String(n).padStart(2, "0");
      const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setDeadlineInput(local);
    } else {
      setDeadlineInput("");
    }
    setDeadlineSaved(false);
    setScoreResult(null);
    setVotedOutPlayerId("");
    setTitleSpeakerPlayerId("");
  }, [selectedEpisodeId, episodes]);

  // Fetch submission status when episode changes
  useEffect(() => {
    if (!selectedLeagueId || !selectedEpisodeId) return;
    setLoadingPreds(true);
    fetch(
      `/api/leagues/${selectedLeagueId}/predictions?episode_id=${selectedEpisodeId}`
    )
      .then((r) => r.json())
      .then((d) => {
        setTeamPreds(d.teams || []);
        setLoadingPreds(false);
      })
      .catch(() => setLoadingPreds(false));
  }, [selectedLeagueId, selectedEpisodeId]);

  const selectedEp = episodes.find((e) => e.id === selectedEpisodeId);
  const storedDeadline = selectedEp?.prediction_deadline
    ? new Date(selectedEp.prediction_deadline)
    : null;
  const isLocked = storedDeadline ? new Date() > storedDeadline : false;

  async function saveDeadline() {
    if (!selectedLeagueId || !selectedEpisodeId) return;
    setSavingDeadline(true);
    const res = await fetch(
      `/api/leagues/${selectedLeagueId}/episodes/${selectedEpisodeId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prediction_deadline: deadlineInput
            ? new Date(deadlineInput).toISOString()
            : null,
        }),
      }
    );
    setSavingDeadline(false);
    if (res.ok) {
      setDeadlineSaved(true);
      // Update local episode data to reflect new deadline
      setEpisodes((prev) =>
        prev.map((e) =>
          e.id === selectedEpisodeId
            ? {
                ...e,
                prediction_deadline: deadlineInput
                  ? new Date(deadlineInput).toISOString()
                  : null,
              }
            : e
        )
      );
    }
  }

  async function scorePredictions() {
    if (!selectedLeagueId || !selectedEpisodeId || !votedOutPlayerId) return;
    if (
      !confirm(
        "Score predictions for this episode? This will award points and mark the episode as scored."
      )
    )
      return;

    setScoring(true);
    setScoreResult(null);

    const res = await fetch("/api/admin/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        league_id: selectedLeagueId,
        episode_id: selectedEpisodeId,
        voted_out_player_id: votedOutPlayerId,
        title_speaker_player_id: titleSpeakerPlayerId || null,
      }),
    });

    const data = await res.json();
    setScoring(false);

    if (!res.ok) {
      setScoreResult({ ok: false, message: data.error || "Scoring failed" });
    } else {
      setScoreResult({
        ok: true,
        message: `The tribe has spoken. ${data.predictions_scored} predictions scored.`,
      });
      // Mark episode as scored locally
      setEpisodes((prev) =>
        prev.map((e) =>
          e.id === selectedEpisodeId ? { ...e, is_scored: true } : e
        )
      );
    }
  }

  const activePlayers = players.filter((p) => p.is_active);
  const allPlayers = players;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-text-primary mb-2">Predictions</h1>
      <p className="text-text-muted text-sm mb-6">
        Manage prediction deadlines, score episodes, and grade season predictions.
      </p>

      {/* ── Tab toggle ── */}
      <div className="flex gap-1 p-1 rounded-lg bg-bg-surface border border-border mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("episode")}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === "episode"
              ? "bg-bg-card text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          Episode Predictions
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("season")}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === "season"
              ? "bg-bg-card text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          Season Predictions
        </button>
      </div>

      {/* ── Season Predictions tab ── */}
      {activeTab === "season" && <AdminSeasonPredictionsPanel />}

      {activeTab === "episode" && (
      <>
      {/* ── League selector ── */}
      <div className="card mb-6">
        <label className="label">League</label>
        <select
          className="input"
          value={selectedLeagueId}
          onChange={(e) => setSelectedLeagueId(e.target.value)}
        >
          {leagues.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      {loadingLeague && (
        <p className="text-text-muted text-sm">Loading...</p>
      )}

      {!loadingLeague && episodes.length > 0 && (
        <>
          {/* ── Episode selector ── */}
          <div className="card mb-6">
            <label className="label">Episode</label>
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
          </div>

          {selectedEpisodeId && (
            <>
              {/* ── Section A: Deadline control ── */}
              <div className="card mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="section-title">Section A — Deadline Control</h2>
                    {selectedEp && (
                      <p className="text-xs text-text-muted mt-0.5">
                        E{selectedEp.episode_number} — {selectedEp.title || "Untitled"}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      isLocked
                        ? "text-red-400 bg-red-400/10 border-red-400/20"
                        : "text-green-400 bg-green-400/10 border-green-400/20"
                    }`}
                  >
                    ● {isLocked ? "Locked" : "Open"}
                  </span>
                </div>

                <div className="flex gap-2 flex-wrap items-end mb-3">
                  <div className="flex-1 min-w-48">
                    <label className="label text-xs">Prediction Deadline (local time)</label>
                    <input
                      type="datetime-local"
                      className="input text-sm"
                      value={deadlineInput}
                      onChange={(e) => {
                        setDeadlineInput(e.target.value);
                        setDeadlineSaved(false);
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={saveDeadline}
                    disabled={savingDeadline}
                    className="btn-primary text-sm py-2 px-4 disabled:opacity-50"
                  >
                    {savingDeadline ? "Saving..." : deadlineSaved ? "Saved ✓" : "Save Deadline"}
                  </button>
                </div>

                {storedDeadline && selectedEp?.prediction_deadline && (
                  <p className="text-xs text-text-muted">
                    Current:{" "}
                    <span className="text-text-primary">
                      {new Date(selectedEp.prediction_deadline).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        timeZone: "UTC",
                      })}{" "}
                      at{" "}
                      {storedDeadline.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>{" "}
                    — {isLocked ? "predictions are locked" : "predictions still open"}
                  </p>
                )}

                {/* Submission status */}
                <div className="mt-4">
                  <p className="label mb-2">Submission Status</p>
                  {loadingPreds ? (
                    <p className="text-text-muted text-xs">Loading...</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-3 text-text-muted font-medium text-xs">
                              Team
                            </th>
                            <th className="text-left py-2 px-3 text-text-muted font-medium text-xs">
                              Vote Predictions
                            </th>
                            <th className="text-left py-2 px-3 text-text-muted font-medium text-xs">
                              Title Speaker
                            </th>
                            <th className="text-right py-2 px-3 text-text-muted font-medium text-xs">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {teamPreds.map(({ team, predictions: preds, title_pick_player_id }) => {
                            const hasVotePreds = preds.length > 0;
                            const hasTitlePick = !!title_pick_player_id;
                            const hasSubmitted = hasVotePreds || hasTitlePick;
                            const titleSpeakerName = title_pick_player_id
                              ? players.find((p) => p.id === title_pick_player_id)?.name ?? "?"
                              : null;
                            return (
                              <tr
                                key={team.id}
                                className="border-b border-border last:border-0"
                              >
                                <td className="py-2 px-3 font-medium text-text-primary text-xs">
                                  {team.name}
                                </td>
                                <td className="py-2 px-3 text-text-muted text-xs">
                                  {hasVotePreds
                                    ? preds
                                        .map(
                                          (p) =>
                                            `${(p.players as any)?.name ?? "?"} (${p.points_allocated}pt)`
                                        )
                                        .join(", ")
                                    : <span className="italic text-text-muted/50">—</span>}
                                </td>
                                <td className="py-2 px-3 text-text-muted text-xs">
                                  {hasTitlePick
                                    ? titleSpeakerName
                                    : <span className="italic text-text-muted/50">—</span>}
                                </td>
                                <td className="py-2 px-3 text-right text-xs">
                                  {hasSubmitted ? (
                                    <span className="text-green-400 font-medium">✓ Submitted</span>
                                  ) : (
                                    <span className="text-amber-400">⚠ Not yet</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Section B: Score Predictions ── */}
              <div className="card">
                <h2 className="section-title mb-1">Section B — Score Predictions</h2>
                <p className="text-xs text-text-muted mb-4">
                  After the episode airs, select who was voted out. This awards points to
                  teams that predicted correctly and marks predictions as scored.
                </p>

                {selectedEp?.is_scored && (
                  <div className="mb-4 p-3 rounded-lg bg-yellow-900/20 border border-yellow-700/30 text-yellow-400 text-xs">
                    ⚠️ This episode is already scored. Re-scoring will overwrite existing
                    prediction results.
                  </div>
                )}

                {scoreResult && (
                  <div
                    className={`mb-4 p-3 rounded-lg text-sm ${
                      scoreResult.ok
                        ? "bg-green-900/20 border border-green-700/30 text-green-400"
                        : "bg-red-900/20 border border-red-700/30 text-red-400"
                    }`}
                  >
                    {scoreResult.message}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="label text-xs">
                      Voted Out Player <span className="text-red-400">*</span>
                    </label>
                    <select
                      className="input text-sm"
                      value={votedOutPlayerId}
                      onChange={(e) => setVotedOutPlayerId(e.target.value)}
                    >
                      <option value="">— Select player —</option>
                      {/* Show all players (incl. inactive) in case this is being run after inactivation */}
                      {allPlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                          {p.tribe ? ` (${p.tribe})` : ""}
                          {!p.is_active ? " — eliminated" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label text-xs">
                      Episode Title Speaker{" "}
                      <span className="text-text-muted font-normal">(optional — awards 3pts)</span>
                    </label>
                    <select
                      className="input text-sm"
                      value={titleSpeakerPlayerId}
                      onChange={(e) => setTitleSpeakerPlayerId(e.target.value)}
                    >
                      <option value="">— None / skip title picks —</option>
                      {activePlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                          {p.tribe ? ` (${p.tribe})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={scorePredictions}
                    disabled={scoring || !votedOutPlayerId}
                    className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {scoring ? "Tallying the votes..." : "Score Predictions 🗳️"}
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {!loadingLeague && episodes.length === 0 && selectedLeagueId && (
        <div className="card text-center py-8">
          <p className="text-text-muted text-sm">
            No episodes found for this league. Add episodes in the Seasons panel.
          </p>
        </div>
      )}
      </>
      )}
    </div>
  );
}
