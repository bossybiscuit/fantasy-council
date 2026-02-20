"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SeasonPrediction } from "@/types/database";

interface Category {
  key: string;
  label: string;
  description: string;
  options: string[] | null;
  points: number | null;
}

export const SEASON_CATEGORIES: Category[] = [
  {
    key: "free_rice",
    label: "Rice",
    description: "Will the tribe get Free Rice or have to Earn Rice?",
    options: ["Free Rice", "Earn Rice"],
    points: 5,
  },
  {
    key: "shot_in_dark",
    label: "Shot in the Dark",
    description: "Will someone play their Shot in the Dark?",
    options: ["Shot in the Dark", "No Shot in the Dark"],
    points: 5,
  },
  {
    key: "advantage_type",
    label: "Advantage Type",
    description: "Which type of advantage will appear this season?",
    options: ["Pinball Wizard", "Obstacle Course", "Simmotion"],
    points: 5,
  },
  {
    key: "idol_nullifier",
    label: "Idol Nullifier",
    description: "What is the Idol Nullifier? (Commissioner will verify)",
    options: null,
    points: 5,
  },
  {
    key: "tribe_switch",
    label: "Tribe Switch",
    description: "Will there be a Tribe Switch this season?",
    options: ["Yes, Tribe Switch", "No Tribe Switch"],
    points: 5,
  },
  {
    key: "necklace_type",
    label: "Immunity Necklace",
    description: "What type of immunity necklace will it be?",
    options: ["Tooth Necklace", "Bird Necklace"],
    points: 5,
  },
  {
    key: "camp_supplies",
    label: "Camp Supplies",
    description: "How will the tribe receive camp supplies?",
    options: ["Camp Supplies Given", "Camp Supplies Earned"],
    points: 5,
  },
  {
    key: "season_long",
    label: "Season Long Prediction",
    description: "Make a bold prediction for the season (commissioner scores manually)",
    options: null,
    points: null,
  },
];

interface SeasonPredictionsFormProps {
  leagueId: string;
  myPredictions: SeasonPrediction[];
  isLocked: boolean;
  isCommissioner: boolean;
}

export default function SeasonPredictionsForm({
  leagueId,
  myPredictions,
  isLocked,
  isCommissioner,
}: SeasonPredictionsFormProps) {
  const router = useRouter();

  const initialAnswers: Record<string, string> = {};
  for (const pred of myPredictions) {
    initialAnswers[pred.category] = pred.answer ?? "";
  }

  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Grading state (commissioner only)
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});
  const [grading, setGrading] = useState<Record<string, boolean>>({});
  const [gradeSuccess, setGradeSuccess] = useState<Record<string, boolean>>({});

  const predMap = new Map<string, SeasonPrediction>(
    myPredictions.map((p) => [p.category, p])
  );

  async function saveAnswer(category: string, answer: string) {
    if (isLocked) return;

    setSaving((s) => ({ ...s, [category]: true }));
    setErrors((e) => ({ ...e, [category]: "" }));

    const res = await fetch(`/api/leagues/${leagueId}/season-predictions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, answer }),
    });

    setSaving((s) => ({ ...s, [category]: false }));

    if (!res.ok) {
      const data = await res.json();
      setErrors((e) => ({ ...e, [category]: data.error || "Failed to save" }));
    } else {
      setSaved((s) => ({ ...s, [category]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [category]: false })), 2000);
      router.refresh();
    }
  }

  async function gradeCategory(category: string, correctAnswer: string) {
    setGrading((g) => ({ ...g, [category]: true }));

    const res = await fetch(`/api/leagues/${leagueId}/season-predictions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, correct_answer: correctAnswer }),
    });

    setGrading((g) => ({ ...g, [category]: false }));

    if (res.ok) {
      setGradeSuccess((s) => ({ ...s, [category]: true }));
      setTimeout(() => setGradeSuccess((s) => ({ ...s, [category]: false })), 3000);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      {isLocked && (
        <div className="p-3 rounded-lg bg-amber-900/20 border border-amber-700/30 text-amber-400 text-sm">
          🔒 Season predictions are locked — Episode 1 has aired.
        </div>
      )}

      {SEASON_CATEGORIES.map((cat) => {
        const pred = predMap.get(cat.key);
        const currentAnswer = answers[cat.key] ?? "";
        const isGraded = pred?.is_correct !== null && pred?.is_correct !== undefined;
        const isSaving = saving[cat.key];
        const wasSaved = saved[cat.key];
        const err = errors[cat.key];

        return (
          <div
            key={cat.key}
            className={`card ${
              isGraded
                ? pred!.is_correct
                  ? "border-green-700/40"
                  : "border-red-700/40"
                : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h3 className="font-semibold text-text-primary">{cat.label}</h3>
                <p className="text-xs text-text-muted mt-0.5">{cat.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {cat.points !== null && (
                  <span className="text-xs text-accent-gold font-medium">{cat.points} pts</span>
                )}
                {isGraded && (
                  <span
                    className={`text-lg leading-none ${
                      pred!.is_correct ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {pred!.is_correct ? "✅" : "❌"}
                  </span>
                )}
                {isGraded && pred!.points_earned > 0 && (
                  <span className="text-xs font-bold text-accent-orange">
                    +{pred!.points_earned}
                  </span>
                )}
              </div>
            </div>

            {/* Option pills or text input */}
            {cat.options ? (
              <div className="flex flex-wrap gap-2 mt-3">
                {cat.options.map((opt) => {
                  const isSelected = currentAnswer === opt;
                  const wasMyAnswer = pred?.answer === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={isLocked}
                      onClick={() => {
                        if (!isLocked) {
                          setAnswers((a) => ({ ...a, [cat.key]: opt }));
                          saveAnswer(cat.key, opt);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        isSelected
                          ? isGraded
                            ? pred!.is_correct && wasMyAnswer
                              ? "bg-green-900/30 border-green-500/60 text-green-400"
                              : !pred!.is_correct && wasMyAnswer
                              ? "bg-red-900/30 border-red-500/60 text-red-400"
                              : "bg-accent-orange/10 border-accent-orange/40 text-accent-orange"
                            : "bg-accent-orange/10 border-accent-orange/40 text-accent-orange"
                          : "border-border text-text-muted hover:border-accent-orange/40 hover:text-text-primary disabled:cursor-default"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={currentAnswer}
                  disabled={isLocked}
                  placeholder={cat.key === "season_long" ? "Your bold prediction..." : "Your answer..."}
                  onChange={(e) => setAnswers((a) => ({ ...a, [cat.key]: e.target.value }))}
                  onBlur={() => {
                    if (!isLocked && currentAnswer !== (pred?.answer ?? "")) {
                      saveAnswer(cat.key, currentAnswer);
                    }
                  }}
                  className="input text-sm flex-1 disabled:opacity-60"
                />
                {!isLocked && (
                  <button
                    type="button"
                    onClick={() => saveAnswer(cat.key, currentAnswer)}
                    disabled={isSaving}
                    className="btn-secondary text-xs px-3 disabled:opacity-50"
                  >
                    {isSaving ? "..." : "Save"}
                  </button>
                )}
              </div>
            )}

            {pred?.answer && !cat.options && isLocked && (
              <p className="text-xs text-text-muted mt-2">Your answer: <span className="text-text-primary">{pred.answer}</span></p>
            )}

            {wasSaved && (
              <p className="text-xs text-green-400 mt-2">✓ Saved</p>
            )}
            {err && (
              <p className="text-xs text-red-400 mt-2">{err}</p>
            )}

            {/* Commissioner grading panel */}
            {isCommissioner && isLocked && cat.options && !isGraded && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-text-muted mb-2">Grade this category:</p>
                <div className="flex flex-wrap gap-2">
                  {cat.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => gradeCategory(cat.key, opt)}
                      disabled={grading[cat.key]}
                      className="px-3 py-1 rounded border border-accent-gold/30 text-accent-gold text-xs hover:bg-accent-gold/10 transition-colors disabled:opacity-50"
                    >
                      ✓ {opt}
                    </button>
                  ))}
                </div>
                {gradeSuccess[cat.key] && (
                  <p className="text-xs text-green-400 mt-2">✓ Graded!</p>
                )}
              </div>
            )}

            {/* Commissioner manual grading for text inputs */}
            {isCommissioner && isLocked && !cat.options && cat.key !== "season_long" && !isGraded && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-text-muted mb-2">Set correct answer to auto-grade all teams:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={gradeInputs[cat.key] ?? ""}
                    onChange={(e) => setGradeInputs((g) => ({ ...g, [cat.key]: e.target.value }))}
                    placeholder="Correct answer..."
                    className="input text-xs flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => gradeCategory(cat.key, gradeInputs[cat.key] ?? "")}
                    disabled={!gradeInputs[cat.key] || grading[cat.key]}
                    className="btn-secondary text-xs px-3 disabled:opacity-50"
                  >
                    Grade
                  </button>
                </div>
                {gradeSuccess[cat.key] && (
                  <p className="text-xs text-green-400 mt-2">✓ Graded!</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
