"use client";

import { useState, useEffect } from "react";
import { SEASON_CATEGORIES } from "@/app/(platform)/leagues/[leagueId]/predictions/season/SeasonPredictionsForm";
import type { Category, ImageOption } from "@/app/(platform)/leagues/[leagueId]/predictions/season/SeasonPredictionsForm";

interface Prediction {
  id: string;
  league_id: string;
  team_id: string;
  category: string;
  answer: string | null;
  is_correct: boolean | null;
  points_earned: number;
  team_name: string;
  league_name: string;
}

export default function AdminSeasonPredictionsPanel() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedLeagueId, setSelectedLeagueId] = useState<string>("");

  const [categoryAnswer, setCategoryAnswer] = useState<Record<string, string>>({});
  const [categoryGrading, setCategoryGrading] = useState<Record<string, boolean>>({});
  const [categorySuccess, setCategorySuccess] = useState<Record<string, boolean>>({});

  const [manualPoints, setManualPoints] = useState<Record<string, string>>({});
  const [manualCorrect, setManualCorrect] = useState<Record<string, boolean | null>>({});
  const [manualSaving, setManualSaving] = useState<Record<string, boolean>>({});
  const [manualSuccess, setManualSuccess] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchPredictions();
  }, []);

  function fetchPredictions() {
    setLoading(true);
    fetch("/api/admin/season-predictions")
      .then((r) => r.json())
      .then((d) => {
        const preds: Prediction[] = d.predictions || [];
        setPredictions(preds);

        // Initialize manual grade state from fetched data
        const pts: Record<string, string> = {};
        const correct: Record<string, boolean | null> = {};
        for (const pred of preds) {
          const k = `${pred.team_id}::${pred.league_id}::${pred.category}`;
          pts[k] = String(pred.points_earned ?? 0);
          correct[k] = pred.is_correct ?? null;
        }
        setManualPoints(pts);
        setManualCorrect(correct);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  async function gradeCategory(category: string, correctAnswer: string, points: number) {
    setCategoryGrading((g) => ({ ...g, [category]: true }));
    const res = await fetch("/api/admin/season-predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, correct_answer: correctAnswer, points }),
    });
    setCategoryGrading((g) => ({ ...g, [category]: false }));
    if (res.ok) {
      setCategorySuccess((s) => ({ ...s, [category]: true }));
      setTimeout(() => setCategorySuccess((s) => ({ ...s, [category]: false })), 3000);
      fetchPredictions();
    }
  }

  async function saveManualGrade(teamId: string, leagueId: string, category: string) {
    const k = `${teamId}::${leagueId}::${category}`;
    setManualSaving((s) => ({ ...s, [k]: true }));

    const pts = parseInt(manualPoints[k] ?? "0", 10) || 0;
    const isCorrect = manualCorrect[k] ?? null;

    const res = await fetch("/api/admin/season-predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, team_id: teamId, league_id: leagueId, is_correct: isCorrect, points_earned: pts }),
    });

    setManualSaving((s) => ({ ...s, [k]: false }));
    if (res.ok) {
      setManualSuccess((s) => ({ ...s, [k]: true }));
      setTimeout(() => setManualSuccess((s) => ({ ...s, [k]: false })), 2000);
      fetchPredictions();
    }
  }

  if (loading) {
    return <p className="text-text-muted text-sm">Loading season predictions...</p>;
  }

  if (predictions.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-text-muted text-sm">No season predictions submitted yet.</p>
      </div>
    );
  }

  // Build predMap: category → teamId+leagueId → prediction
  const predMap: Record<string, Record<string, Prediction>> = {};
  for (const pred of predictions) {
    if (!predMap[pred.category]) predMap[pred.category] = {};
    predMap[pred.category][`${pred.team_id}::${pred.league_id}`] = pred;
  }

  // Unique teams across all leagues
  const teamKeys = [...new Set(predictions.map((p) => `${p.team_id}::${p.league_id}`))];
  const teamList = teamKeys.map((k) => {
    const [teamId, leagueId] = k.split("::");
    const pred = predictions.find((p) => p.team_id === teamId && p.league_id === leagueId);
    return { teamId, leagueId, teamName: pred?.team_name ?? "?", leagueName: pred?.league_name ?? "?" };
  });

  // Unique leagues for the dropdown
  const leagues = [
    ...new Map(
      predictions.map((p) => [p.league_id, { id: p.league_id, name: p.league_name }])
    ).values(),
  ];

  // Teams visible under the current league filter
  const visibleTeams = selectedLeagueId
    ? teamList.filter((t) => t.leagueId === selectedLeagueId)
    : teamList;

  function submissionCount(category: string) {
    return visibleTeams.filter((t) => predMap[category]?.[`${t.teamId}::${t.leagueId}`]?.answer).length;
  }

  function gradedCount(category: string) {
    return visibleTeams.filter((t) => {
      const pred = predMap[category]?.[`${t.teamId}::${t.leagueId}`];
      return pred?.is_correct !== null && pred?.is_correct !== undefined;
    }).length;
  }

  // Helper: get display label from a raw answer value (handles image option values)
  function getAnswerLabel(cat: Category, answer: string | null): string | null {
    if (!answer) return null;
    if (cat.imageOptions) {
      const opt = cat.imageOptions.find((o: ImageOption) => o.value === answer);
      return opt?.label ?? answer;
    }
    return answer;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-xs text-text-muted">
          Grade season predictions platform-wide. Scoring a category applies to all teams across all leagues simultaneously.
        </p>
        <select
          className="input text-sm shrink-0"
          value={selectedLeagueId}
          onChange={(e) => setSelectedLeagueId(e.target.value)}
        >
          <option value="">All Leagues</option>
          {leagues.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      {SEASON_CATEGORIES.map((cat) => {
        const submitted = submissionCount(cat.key);
        const graded = gradedCount(cat.key);
        const isTextCategory = !cat.options && !cat.imageOptions && !cat.playerPicker;

        return (
          <div key={cat.key} className="card">
            {/* Category header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-text-primary">{cat.label}</h3>
                  {cat.points !== null ? (
                    <span className="text-xs text-accent-gold font-medium">{cat.points} pts</span>
                  ) : (
                    <span className="text-xs text-text-muted">commissioner scored</span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-0.5">{cat.description}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-text-muted">{submitted}/{visibleTeams.length} submitted</p>
                <p className="text-xs text-text-muted">{graded}/{visibleTeams.length} graded</p>
              </div>
            </div>

            {/* Auto-grade panel for regular option categories */}
            {cat.options && (
              <div className="mb-4 p-3 rounded-lg bg-bg-surface border border-border">
                <p className="text-xs text-text-muted mb-2 font-medium">
                  Set correct answer (auto-grades all teams across all leagues):
                </p>
                <div className="flex flex-wrap gap-2">
                  {cat.options.map((opt) => {
                    const isSelected = categoryAnswer[cat.key] === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setCategoryAnswer((a) => ({ ...a, [cat.key]: opt }));
                          gradeCategory(cat.key, opt, cat.points ?? 5);
                        }}
                        disabled={categoryGrading[cat.key]}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors disabled:opacity-50 ${
                          isSelected
                            ? "bg-accent-gold/10 border-accent-gold/50 text-accent-gold"
                            : "border-border text-text-muted hover:border-accent-gold/40 hover:text-text-primary"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {categorySuccess[cat.key] && (
                  <p className="text-xs text-green-400 mt-2">✓ Graded all teams platform-wide!</p>
                )}
              </div>
            )}

            {/* Auto-grade panel for player picker categories (winner) */}
            {cat.playerPicker && (
              <div className="mb-4 p-3 rounded-lg bg-bg-surface border border-border">
                <p className="text-xs text-text-muted mb-2 font-medium">
                  Select the winner (auto-grades all teams across all leagues):
                </p>
                {(() => {
                  const uniqueAnswers = [
                    ...new Set(
                      teamList
                        .map((t) => predMap[cat.key]?.[`${t.teamId}::${t.leagueId}`]?.answer)
                        .filter(Boolean) as string[]
                    ),
                  ];
                  return uniqueAnswers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {uniqueAnswers.map((answer) => {
                        const isSelected = categoryAnswer[cat.key] === answer;
                        return (
                          <button
                            key={answer}
                            type="button"
                            onClick={() => {
                              setCategoryAnswer((a) => ({ ...a, [cat.key]: answer }));
                              gradeCategory(cat.key, answer, cat.points ?? 10);
                            }}
                            disabled={categoryGrading[cat.key]}
                            className={`px-3 py-1.5 rounded-full text-sm border transition-colors disabled:opacity-50 ${
                              isSelected
                                ? "bg-accent-gold/10 border-accent-gold/50 text-accent-gold"
                                : "border-border text-text-muted hover:border-accent-gold/40 hover:text-text-primary"
                            }`}
                          >
                            {answer}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted italic">No submissions yet.</p>
                  );
                })()}
                {categorySuccess[cat.key] && (
                  <p className="text-xs text-green-400 mt-2">✓ Graded all teams platform-wide!</p>
                )}
              </div>
            )}

            {/* Auto-grade panel for image option categories (immunity necklace) */}
            {cat.imageOptions && (
              <div className="mb-4 p-3 rounded-lg bg-bg-surface border border-border">
                <p className="text-xs text-text-muted mb-3 font-medium">
                  Set correct answer (auto-grades all teams across all leagues):
                </p>
                <div className="grid grid-cols-2 gap-3 max-w-xs">
                  {cat.imageOptions.map((opt) => {
                    const isSelected = categoryAnswer[cat.key] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setCategoryAnswer((a) => ({ ...a, [cat.key]: opt.value }));
                          gradeCategory(cat.key, opt.value, cat.points ?? 5);
                        }}
                        disabled={categoryGrading[cat.key]}
                        className={`rounded-xl overflow-hidden border-2 transition-all text-left disabled:opacity-50 ${
                          isSelected
                            ? "border-accent-gold shadow-[0_0_10px_rgba(212,175,55,0.3)]"
                            : "border-border hover:border-accent-gold/40"
                        }`}
                      >
                        <div className="aspect-[4/3] bg-bg-card relative overflow-hidden">
                          {/* Placeholder behind image */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                            <span className="text-xl">📷</span>
                            <span className="text-[10px] text-text-muted">Image coming soon</span>
                          </div>
                          <img
                            src={opt.image_url}
                            alt={opt.label}
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                        <div className="px-2 py-1.5 border-t border-border">
                          <span
                            className={`text-xs font-medium ${
                              isSelected ? "text-accent-gold" : "text-text-primary"
                            }`}
                          >
                            {isSelected && "✓ "}{opt.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {categorySuccess[cat.key] && (
                  <p className="text-xs text-green-400 mt-2">✓ Graded all teams platform-wide!</p>
                )}
              </div>
            )}

            {/* Team answers list */}
            <div className="space-y-2">
              {visibleTeams.map(({ teamId, leagueId, teamName, leagueName }) => {
                const pred = predMap[cat.key]?.[`${teamId}::${leagueId}`];
                const k = `${teamId}::${leagueId}::${cat.key}`;
                const isGraded = pred?.is_correct !== null && pred?.is_correct !== undefined;
                const answerLabel = getAnswerLabel(cat, pred?.answer ?? null);

                return (
                  <div
                    key={k}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                      isGraded
                        ? pred!.is_correct
                          ? "border-green-700/30 bg-green-900/10"
                          : "border-red-700/30 bg-red-900/10"
                        : "border-border bg-bg-surface"
                    }`}
                  >
                    {/* Team + league */}
                    <div className="shrink-0 w-44 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{teamName}</p>
                      {!selectedLeagueId && (
                        <p className="text-xs text-text-muted truncate">{leagueName}</p>
                      )}
                    </div>

                    {/* Answer */}
                    <span className={`text-sm flex-1 ${answerLabel ? "text-text-primary" : "text-text-muted italic"}`}>
                      {answerLabel || "—"}
                    </span>

                    {/* Grade indicator for option-based (regular + image + playerPicker) */}
                    {(cat.options || cat.imageOptions || cat.playerPicker) && isGraded && (
                      <span className={`text-sm shrink-0 ${pred!.is_correct ? "text-green-400" : "text-red-400"}`}>
                        {pred!.is_correct ? "✅" : "❌"}
                        {pred!.points_earned > 0 && (
                          <span className="text-xs text-accent-orange ml-1">+{pred!.points_earned}</span>
                        )}
                      </span>
                    )}

                    {/* Manual grading controls for text categories */}
                    {isTextCategory && (
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex rounded-md overflow-hidden border border-border text-xs">
                          <button
                            type="button"
                            onClick={() => setManualCorrect((c) => ({ ...c, [k]: true }))}
                            className={`px-2 py-1 transition-colors ${
                              manualCorrect[k] === true
                                ? "bg-green-700/30 text-green-400"
                                : "text-text-muted hover:text-text-primary hover:bg-bg-base"
                            }`}
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setManualCorrect((c) => ({ ...c, [k]: false }))}
                            className={`px-2 py-1 border-l border-border transition-colors ${
                              manualCorrect[k] === false
                                ? "bg-red-700/30 text-red-400"
                                : "text-text-muted hover:text-text-primary hover:bg-bg-base"
                            }`}
                          >
                            ✗
                          </button>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={manualPoints[k] ?? "0"}
                          onChange={(e) => setManualPoints((p) => ({ ...p, [k]: e.target.value }))}
                          className="input text-xs w-16 py-1 text-center"
                          placeholder="pts"
                        />
                        <button
                          type="button"
                          onClick={() => saveManualGrade(teamId, leagueId, cat.key)}
                          disabled={manualSaving[k]}
                          className="btn-secondary text-xs px-2 py-1 disabled:opacity-50"
                        >
                          {manualSaving[k] ? "..." : manualSuccess[k] ? "✓" : "Save"}
                        </button>
                      </div>
                    )}

                    {/* Graded result for text categories */}
                    {isTextCategory && isGraded && (
                      <span className={`text-xs shrink-0 font-medium ${pred!.is_correct ? "text-green-400" : "text-red-400"}`}>
                        {pred!.is_correct ? "✅" : "❌"}
                        {pred!.points_earned > 0 && (
                          <span className="text-accent-orange ml-1">+{pred!.points_earned}</span>
                        )}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
