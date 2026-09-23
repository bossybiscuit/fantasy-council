"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SeasonPrediction } from "@/types/database";
import {
  TOP_THREE_KEY,
  TOP_THREE_POINTS,
  parseTopThree,
  serializeTopThree,
} from "@/lib/season-predictions";

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
  /** Pick three castaways; scored 1 / 5 / 15 for 1 / 2 / 3 correct */
  topThree?: boolean;
  points: number | null;
}

export const SEASON_CATEGORIES: Category[] = [
  {
    key: "rice",
    label: "Rice",
    description: "Will rice be earned or given?",
    options: ["Given", "Earned"],
    points: 5,
  },
  {
    key: "merge_episode",
    label: "Merge Episode",
    description: "What episode will the merge happen?",
    options: ["4", "5", "6", "7", "8", "9", "10"],
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
    key: "idols_played",
    label: "Idols Played",
    description: "How many idols will be played in total?",
    options: ["0", "1", "2", "3", "4", "5", "6", "7", "8"],
    points: 5,
  },
  {
    key: "quit_or_medevac",
    label: "Quit or Medevac",
    description: "Will anyone quit or be medically evacuated?",
    options: ["Yes", "No"],
    points: 5,
  },
  {
    key: "most_individual_immunities",
    label: "Most Individual Immunities",
    description: "Most individual immunity wins by any one castaway?",
    options: ["1", "2", "3", "4", "5", "6"],
    points: 5,
  },
  {
    key: "final_jury_vote",
    label: "Final Jury Vote",
    description: "What will the final jury vote be?",
    options: ["8-1", "7-2", "6-3", "5-4"],
    points: 5,
  },
  {
    key: TOP_THREE_KEY,
    label: "Top 3",
    description: `Pick the three castaways who make it to the end (any order). 1 right = ${TOP_THREE_POINTS[1]} pt, 2 right = ${TOP_THREE_POINTS[2]} pts, all 3 = ${TOP_THREE_POINTS[3]} pts.`,
    options: null,
    topThree: true,
    points: TOP_THREE_POINTS[3],
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

  async function gradeTopThree(names: string[]) {
    setGrading((g) => ({ ...g, [TOP_THREE_KEY]: true }));
    const res = await fetch(`/api/leagues/${leagueId}/season-predictions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: TOP_THREE_KEY, correct_answers: names }),
    });
    setGrading((g) => ({ ...g, [TOP_THREE_KEY]: false }));
    if (res.ok) {
      setGradeSuccess((s) => ({ ...s, [TOP_THREE_KEY]: true }));
      setTimeout(() => setGradeSuccess((s) => ({ ...s, [TOP_THREE_KEY]: false })), 3000);
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
                  <span className="text-xs text-accent-gold font-medium">
                    {cat.topThree ? `up to ${cat.points}` : cat.points} pts
                  </span>
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
            ) : cat.topThree ? (
              /* Three player dropdowns — no duplicates */
              <TopThreePicker
                players={players}
                value={parseTopThree(currentAnswer)}
                disabled={isLocked}
                onChange={(names) => {
                  const serialized = serializeTopThree(names);
                  setAnswers((a) => ({ ...a, [cat.key]: serialized }));
                  saveAnswer(cat.key, serialized);
                }}
              />
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

            {/* Commissioner grading — top 3 */}
            {isCommissioner && isLocked && cat.topThree && !isGraded && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-text-muted mb-2">
                  Grade — select the actual Final Three (also auto-grades when the finale is scored):
                </p>
                <TopThreePicker
                  players={players}
                  value={parseTopThree(gradeInputs[cat.key])}
                  disabled={grading[cat.key]}
                  onChange={(names) => setGradeInputs((g) => ({ ...g, [cat.key]: serializeTopThree(names) }))}
                />
                <button
                  type="button"
                  onClick={() => gradeTopThree(parseTopThree(gradeInputs[cat.key]))}
                  disabled={grading[cat.key] || parseTopThree(gradeInputs[cat.key]).length !== 3}
                  className="mt-2 px-3 py-1 rounded border border-accent-gold/30 text-accent-gold text-xs hover:bg-accent-gold/10 transition-colors disabled:opacity-50"
                >
                  ✓ Grade Top 3
                </button>
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

export function TopThreePicker({
  players,
  value,
  disabled,
  onChange,
}: {
  players: { id: string; name: string; tribe: string | null }[];
  value: string[];
  disabled?: boolean;
  onChange: (names: string[]) => void;
}) {
  const slots = [0, 1, 2].map((i) => value[i] ?? "");
  return (
    <div className="grid gap-2 sm:grid-cols-3 mt-3">
      {slots.map((current, i) => (
        <select
          key={i}
          className="input text-sm"
          value={current}
          disabled={disabled}
          onChange={(e) => {
            const next = [...slots];
            next[i] = e.target.value;
            onChange(next.filter(Boolean));
          }}
        >
          <option value="">— Pick #{i + 1} —</option>
          {players
            .filter((p) => p.name === current || !slots.includes(p.name))
            .map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
                {p.tribe ? ` (${p.tribe})` : ""}
              </option>
            ))}
        </select>
      ))}
    </div>
  );
}
