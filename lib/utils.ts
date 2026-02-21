export function cn(...inputs: string[]): string {
  return inputs.filter(Boolean).join(" ");
}

export function generateInviteCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "TBD";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function getRankIndicator(
  current: number | null,
  previous: number | null
): "up" | "down" | "same" | "new" {
  if (previous === null) return "new";
  if (current === null) return "same";
  if (current < previous) return "up";
  if (current > previous) return "down";
  return "same";
}

export function calculatePredictionAccuracy(
  totalAllocated: number,
  totalEarned: number
): number {
  if (totalAllocated === 0) return 0;
  return Math.round((totalEarned / totalAllocated) * 100);
}

export function calculateRosterSize(
  activePlayers: number,
  numTeams: number
): { rosterSize: number; remainder: number } {
  const rosterSize = Math.floor(activePlayers / numTeams);
  const remainder = activePlayers % numTeams;
  return { rosterSize, remainder };
}


export function getSnakeDraftOrder(
  numTeams: number,
  numRounds: number
): { team: number; round: number; pick: number }[] {
  const picks: { team: number; round: number; pick: number }[] = [];
  let pickNum = 1;
  for (let r = 0; r < numRounds; r++) {
    const order =
      r % 2 === 0
        ? Array.from({ length: numTeams }, (_, i) => i)
        : Array.from({ length: numTeams }, (_, i) => numTeams - 1 - i);
    for (const teamIdx of order) {
      picks.push({ team: teamIdx, round: r + 1, pick: pickNum++ });
    }
  }
  return picks;
}
