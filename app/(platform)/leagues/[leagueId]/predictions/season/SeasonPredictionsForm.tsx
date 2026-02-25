"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SeasonPrediction } from "@/types/database";

export interface ImageOption {
  label: string;
  value: string;
  image_url: string;
}

export interface Category {
  key: string;
  label: string;
  description: string;
  options: string[] | null;
  imageOptions?: ImageOption[];
  playerPicker?: boolean;
  points: number | null;
}

export const SEASON_CATEGORIES: Category[] = [
  {
    key: "rice",
    label: "Rice",
    description: "Free Rice or Earn Rice?",
    options: ["Free Rice", "Earn Rice"],
    points: 5,
  },
  {
    key: "camp_supplies",
    label: "Camp Supplies",
    description: "Camp Supplies — Given or Earned?",
    options: ["Camp Supplies Given", "Camp Supplies Earned"],
    points: 5,
  },
  {
    key: "shot_in_the_dark",
    label: "Shot in the Dark",
    description: "Will the Shot in the Dark exist this season?",
    options: ["Yes", "No"],
    points: 5,
  },
  {
    key: "final_immunity",
    label: "Final Immunity Challenge",
    description: "What will the final immunity challenge be?",
    options: ["Pinball Wizard", "Obstacle Course", "Simmotion"],
    points: 5,
  },
  {
    key: "tribe_swap",
    label: "Tribe Swap",
    description: "Will there be a tribe swap?",
    options: ["Yes", "No"],
    points: 5,
  },
  {
    key: "immunity_necklace",
    label: "Immunity Necklace",
    description: "What will the immunity necklace look like?",
    options: null,
    imageOptions: [
      {
        label: "Tooth Necklace",
        value: "tooth_necklace",
        image_url: "/images/predictions/tooth.PNG",
      },
      {
        label: "Bird Necklace",
        value: "bird_necklace",
        image_url: "/images/predictions/bird.PNG",
      },
    ],
    points: 5,
  },
  {
    key: "winner",
    label: "Season Winner",
    description: "Who will be the Sole Survivor this season?",
    options: null,
    playerPicker: true,
    points: 10,
  },
];

interface SeasonPredictionsFormProps {
  leagueId: string;
  myPredictions: SeasonPrediction[];
  isLocked: boolean;
  isCommissioner: boolean;
  players: { id: string; name: string; tribe: string | null }[];
}

export default function SeasonPredictionsForm({
  leagueId,
  myPredictions,
  isLocked,
  isCommissioner,
  players,
}: SeasonPredictionsFormProps) {
  const router = useRouter();

  const initialAnswers: Record<string, string> = {};
  for (const pred of myPredictions) {
    initialAnswers[pred.category] = pred.answer ?? "";
  }

  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
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

    setErrors((e) => ({ ...e, [category]: "" }));

    const res = await fetch(`/api/leagues/${leagueId}/season-predictions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, answer }),
    });

    if (!res.ok) {
      const data = await res.json();
      setErrors((e) => ({ ...e, [category]: data.error || "Failed to save" }));
    } else {
      setSaved((s) => ({ ...s, [category]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [category]: false })), 2000);
      router.refresh();
    }
  }

  async function gradeCategory(category: string, correctAnswer: string, points: number) {
    setGrading((g) => ({ ...g, [category]: true }));

    const res = await fetch(`/api/leagues/${leagueId}/season-predictions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, correct_answer: correctAnswer, points }),
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

            {/* Image option cards (immunity necklace) */}
            {cat.imageOptions ? (
              <div className="grid grid-cols-2 gap-3 mt-3">
                {cat.imageOptions.map((opt) => {
                  const isSelected = currentAnswer === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={isLocked}
                      onClick={() => {
                        if (!isLocked) {
                          setAnswers((a) => ({ ...a, [cat.key]: opt.value }));
                          saveAnswer(cat.key, opt.value);
                        }
                      }}
                      className={`rounded-xl overflow-hidden border-2 transition-all text-left disabled:cursor-default ${
                        isSelected
                          ? isGraded
                            ? pred!.is_correct
                              ? "border-green-500"
                              : "border-red-500"
                            : "border-accent-orange shadow-[0_0_12px_rgba(234,88,12,0.3)]"
                          : "border-border hover:border-accent-orange/40"
                      }`}
                    >
                      {/* Image with placeholder fallback */}
                      <div className="aspect-[4/3] bg-bg-surface relative overflow-hidden">
                        {/* Placeholder always behind */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-card gap-1">
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
                      <div className="px-3 py-2 bg-bg-surface border-t border-border">
                        <span
                          className={`text-sm font-medium ${
                            isSelected ? "text-accent-orange" : "text-text-primary"
                          }`}
                        >
                          {opt.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : cat.options ? (
              /* Text pill options */
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
            ) : cat.playerPicker ? (
              /* Player dropdown */
              <div className="mt-3">
                <select
                  className="input text-sm"
                  value={currentAnswer}
                  disabled={isLocked}
                  onChange={(e) => {
                    if (!isLocked && e.target.value) {
                      setAnswers((a) => ({ ...a, [cat.key]: e.target.value }));
                      saveAnswer(cat.key, e.target.value);
                    }
                  }}
                >
                  <option value="">— Select a player —</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}{p.tribe ? ` (${p.tribe})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {wasSaved && <p className="text-xs text-green-400 mt-2">✓ Saved</p>}
            {err && <p className="text-xs text-red-400 mt-2">{err}</p>}

            {/* Commissioner grading — regular options */}
            {isCommissioner && isLocked && cat.options && !isGraded && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-text-muted mb-2">Grade this category:</p>
                <div className="flex flex-wrap gap-2">
                  {cat.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => gradeCategory(cat.key, opt, cat.points ?? 5)}
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

            {/* Commissioner grading — image options */}
            {isCommissioner && isLocked && cat.imageOptions && !isGraded && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-text-muted mb-2">Grade this category:</p>
                <div className="flex gap-2">
                  {cat.imageOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setGradeInputs((g) => ({ ...g, [cat.key]: opt.value }));
                        gradeCategory(cat.key, opt.value, cat.points ?? 5);
                      }}
                      disabled={grading[cat.key]}
                      className={`px-3 py-1 rounded border text-xs transition-colors disabled:opacity-50 ${
                        gradeInputs[cat.key] === opt.value
                          ? "border-accent-gold bg-accent-gold/10 text-accent-gold"
                          : "border-accent-gold/30 text-accent-gold hover:bg-accent-gold/10"
                      }`}
                    >
                      ✓ {opt.label}
                    </button>
                  ))}
                </div>
                {gradeSuccess[cat.key] && (
                  <p className="text-xs text-green-400 mt-2">✓ Graded!</p>
                )}
              </div>
            )}

            {/* Commissioner grading — player picker */}
            {isCommissioner && isLocked && cat.playerPicker && !isGraded && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-text-muted mb-2">Grade — select the correct answer:</p>
                <select
                  className="input text-sm"
                  defaultValue=""
                  disabled={grading[cat.key]}
                  onChange={(e) => {
                    if (e.target.value) gradeCategory(cat.key, e.target.value, cat.points ?? 10);
                  }}
                >
                  <option value="">— Select answer —</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
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
