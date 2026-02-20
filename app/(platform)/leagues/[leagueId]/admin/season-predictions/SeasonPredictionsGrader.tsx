"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SEASON_CATEGORIES } from "../../predictions/season/SeasonPredictionsForm";
import type { SeasonPrediction } from "@/types/database";

interface Team {
  id: string;
  name: string;
  user_id: string | null;
}

interface SeasonPredictionsGraderProps {
  leagueId: string;
  teams: Team[];
  predictions: SeasonPrediction[];
  isLocked: boolean;
}

export default function SeasonPredictionsGrader({
  leagueId,
  teams,
  predictions,
  isLocked,
}: SeasonPredictionsGraderProps) {
  const router = useRouter();

  // Build a lookup: predMap[teamId][category] = prediction
  const predMap = predictions.reduce<Record<string, Record<string, SeasonPrediction>>>((acc, pred) => {
    if (!acc[pred.team_id]) acc[pred.team_id] = {};
    acc[pred.team_id][pred.category] = pred;
    return acc;
  }, {});

  // Per-category correct-answer selection state
  const [categoryAnswer, setCategoryAnswer] = useState<Record<string, string>>({});
  const [categoryGrading, setCategoryGrading] = useState<Record<string, boolean>>({});
  const [categorySuccess, setCategorySuccess] = useState<Record<string, boolean>>({});

  function teamCatKey(teamId: string, category: string) {
    return `${teamId}::${category}`;
  }

  // Per-team manual grade state (for text categories) — lazy-initialized from props
  const [manualPoints, setManualPoints] = useState<Record<string, string>>(() => {
    const pts: Record<string, string> = {};
    for (const pred of predictions) {
      pts[`${pred.team_id}::${pred.category}`] = String(pred.points_earned ?? 0);
    }
    return pts;
  });
  const [manualCorrect, setManualCorrect] = useState<Record<string, boolean | null>>(() => {
    const correct: Record<string, boolean | null> = {};
    for (const pred of predictions) {
      correct[`${pred.team_id}::${pred.category}`] = pred.is_correct ?? null;
    }
    return correct;
  });
  const [manualSaving, setManualSaving] = useState<Record<string, boolean>>({});
  const [manualSuccess, setManualSuccess] = useState<Record<string, boolean>>({});

  async function gradeCategory(category: string, correctAnswer: string) {
    setCategoryGrading((g) => ({ ...g, [category]: true }));
    const res = await fetch(`/api/leagues/${leagueId}/season-predictions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, correct_answer: correctAnswer }),
    });
    setCategoryGrading((g) => ({ ...g, [category]: false }));
    if (res.ok) {
      setCategorySuccess((s) => ({ ...s, [category]: true }));
      setTimeout(() => setCategorySuccess((s) => ({ ...s, [category]: false })), 3000);
      router.refresh();
    }
  }

  async function saveManualGrade(teamId: string, category: string) {
    const k = teamCatKey(teamId, category);
    setManualSaving((s) => ({ ...s, [k]: true }));

    const pts = parseInt(manualPoints[k] ?? "0", 10) || 0;
    const isCorrect = manualCorrect[k] ?? null;

    const res = await fetch(`/api/leagues/${leagueId}/season-predictions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        team_id: teamId,
        is_correct: isCorrect,
        points_earned: pts,
      }),
    });

    setManualSaving((s) => ({ ...s, [k]: false }));
    if (res.ok) {
      setManualSuccess((s) => ({ ...s, [k]: true }));
      setTimeout(() => setManualSuccess((s) => ({ ...s, [k]: false })), 2000);
      router.refresh();
    }
  }

  // Count how many teams have submitted a prediction for a category
  function submissionCount(category: string) {
    return teams.filter((t) => predMap[t.id]?.[category]?.answer).length;
  }

  // Count how many are already graded
  function gradedCount(category: string) {
    return teams.filter(
      (t) => predMap[t.id]?.[category]?.is_correct !== null &&
             predMap[t.id]?.[category]?.is_correct !== undefined
    ).length;
  }

  return (
    <div className="space-y-6">
      {SEASON_CATEGORIES.map((cat) => {
        const submitted = submissionCount(cat.key);
        const graded = gradedCount(cat.key);
        const isTextCategory = !cat.options;

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
                <p className="text-xs text-text-muted">
                  {submitted}/{teams.length} submitted
                </p>
                <p className="text-xs text-text-muted">
                  {graded}/{teams.length} graded
                </p>
              </div>
            </div>

            {/* Multiple-choice categories: auto-grade panel */}
            {cat.options && isLocked && (
              <div className="mb-4 p-3 rounded-lg bg-bg-surface border border-border">
                <p className="text-xs text-text-muted mb-2 font-medium">Set correct answer (auto-grades all teams):</p>
                <div className="flex flex-wrap gap-2">
                  {cat.options.map((opt) => {
                    const isSelected = categoryAnswer[cat.key] === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setCategoryAnswer((a) => ({ ...a, [cat.key]: opt }));
                          gradeCategory(cat.key, opt);
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
                  <p className="text-xs text-green-400 mt-2">Graded all teams!</p>
                )}
              </div>
            )}

            {/* Team answers list */}
            <div className="space-y-2">
              {teams.map((team) => {
                const pred = predMap[team.id]?.[cat.key];
                const k = teamCatKey(team.id, cat.key);
                const isGraded = pred?.is_correct !== null && pred?.is_correct !== undefined;

                return (
                  <div
                    key={team.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                      isGraded
                        ? pred!.is_correct
                          ? "border-green-700/30 bg-green-900/10"
                          : "border-red-700/30 bg-red-900/10"
                        : "border-border bg-bg-surface"
                    }`}
                  >
                    {/* Team name */}
                    <span className="text-sm font-medium text-text-primary w-32 shrink-0 truncate">
                      {team.name}
                    </span>

                    {/* Answer */}
                    <span className={`text-sm flex-1 ${pred?.answer ? "text-text-primary" : "text-text-muted italic"}`}>
                      {pred?.answer || "—"}
                    </span>

                    {/* Grade indicator for option-based */}
                    {cat.options && isGraded && (
                      <span className={`text-sm shrink-0 ${pred!.is_correct ? "text-green-400" : "text-red-400"}`}>
                        {pred!.is_correct ? "✅" : "❌"}
                        {pred!.points_earned > 0 && (
                          <span className="text-xs text-accent-orange ml-1">+{pred!.points_earned}</span>
                        )}
                      </span>
                    )}

                    {/* Manual grading controls for text categories */}
                    {isTextCategory && isLocked && (
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Correct toggle */}
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

                        {/* Points input */}
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={manualPoints[k] ?? "0"}
                          onChange={(e) => setManualPoints((p) => ({ ...p, [k]: e.target.value }))}
                          className="input text-xs w-16 py-1 text-center"
                          placeholder="pts"
                        />

                        {/* Save button */}
                        <button
                          type="button"
                          onClick={() => saveManualGrade(team.id, cat.key)}
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

            {teams.length === 0 && (
              <p className="text-sm text-text-muted text-center py-4">No teams in this league yet.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
