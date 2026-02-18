"use client";

import { useRouter } from "next/navigation";
import type { Episode } from "@/types/database";

interface RecapEpisodeSelectorProps {
  episodes: Episode[];
  selectedId: string;
  leagueId: string;
}

export default function RecapEpisodeSelector({
  episodes,
  selectedId,
  leagueId,
}: RecapEpisodeSelectorProps) {
  const router = useRouter();

  return (
    <div className="mb-6">
      <label className="label">Select Episode</label>
      <select
        className="input max-w-xs"
        value={selectedId}
        onChange={(e) => {
          router.push(`/leagues/${leagueId}/recap?episode=${e.target.value}`);
        }}
      >
        {episodes.map((ep) => (
          <option key={ep.id} value={ep.id}>
            E{ep.episode_number} — {ep.title || "Untitled"}
            {ep.is_merge ? " (Merge)" : ""}
            {ep.is_finale ? " (Finale)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
