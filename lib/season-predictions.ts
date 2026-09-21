// Season prediction helpers shared by the forms, grading APIs, and finale auto-grading.

export const TOP_THREE_KEY = "top_three";

/** Points for how many of the Final Three a team got right (index = number correct) */
export const TOP_THREE_POINTS = [0, 1, 5, 15] as const;

/** Top 3 answers are stored as a JSON array of castaway names (order doesn't matter) */
export function parseTopThree(answer: string | null | undefined): string[] {
  if (!answer) return [];
  try {
    const parsed = JSON.parse(answer);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string" && x) : [];
  } catch {
    return [];
  }
}

export function serializeTopThree(names: string[]): string {
  return JSON.stringify(names.filter(Boolean));
}

export function scoreTopThree(answer: string | null | undefined, finalThree: string[]) {
  const actual = new Set(finalThree);
  const correct = new Set(parseTopThree(answer).filter((n) => actual.has(n))).size;
  const points = TOP_THREE_POINTS[Math.min(correct, 3)];
  return { correct, points, isCorrect: correct > 0 };
}

/** Human-readable answer for any category */
export function formatSeasonAnswer(category: string, answer: string | null | undefined): string | null {
  if (!answer) return null;
  if (category === TOP_THREE_KEY) {
    const names = parseTopThree(answer);
    return names.length ? names.join(", ") : null;
  }
  return answer;
}

/**
 * Grade every Top 3 prediction in the given leagues (or all leagues if none given)
 * against the actual Final Three names.
 */
export async function gradeTopThree(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  finalThree: string[],
  leagueIds?: string[]
) {
  let query = db.from("season_predictions").select("id, answer").eq("category", TOP_THREE_KEY);
  if (leagueIds) query = query.in("league_id", leagueIds);
  const { data: rows, error } = await query;
  if (error) return { error: error.message };

  await Promise.all(
    (rows || []).map((row: { id: string; answer: string | null }) => {
      const { points, isCorrect } = scoreTopThree(row.answer, finalThree);
      return db
        .from("season_predictions")
        .update({ is_correct: isCorrect, points_earned: points })
        .eq("id", row.id);
    })
  );
  return { error: null };
}
