"use client";

import { useState } from "react";
import { LeagueWideTable } from "./LeagueWideTable";

interface Episode {
  id: string;
  episode_number: number;
  title: string | null;
  is_scored: boolean;
}

interface PastPredictionsAccordionProps {
  episodes: Episode[];
  teams: { id: string; name: string }[];
  predictions: any[];
  titlePicks: any[];
}

export default function PastPredictionsAccordion({
  episodes,
  teams,
  predictions,
  titlePicks,
}: PastPredictionsAccordionProps) {
  const [openEpisodeIds, setOpenEpisodeIds] = useState<Set<string>>(new Set());

  function toggleEpisode(id: string) {
    setOpenEpisodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mt-8">
      <h2 className="section-title mb-4">Past Predictions</h2>
      <div className="space-y-2">
        {episodes.map((ep) => {
          const isOpen = openEpisodeIds.has(ep.id);

          // Build per-team maps for this episode
          const epPreds = predictions.filter((p) => p.episode_id === ep.id);
          const epTitlePicks = titlePicks.filter((tp) => tp.episode_id === ep.id);

          const predsByTeam = new Map<string, any[]>();
          for (const team of teams) predsByTeam.set(team.id, []);
          for (const p of epPreds) predsByTeam.get(p.team_id)?.push(p);

          const titlePickByTeam = new Map<string, any>();
          for (const tp of epTitlePicks) titlePickByTeam.set(tp.team_id, tp);

          return (
            <div key={ep.id} className="card">
              <button
                type="button"
                onClick={() => toggleEpisode(ep.id)}
                className="w-full flex items-center justify-between text-left"
              >
                <div>
                  <span className="font-medium text-text-primary text-sm">
                    E{ep.episode_number} — {ep.title || "Untitled"}
                  </span>
                  {ep.is_scored && (
                    <span className="ml-2 text-xs text-text-muted">✓ Scored</span>
                  )}
                </div>
                <span className="text-text-muted text-sm">{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && (
                <div className="mt-4">
                  {ep.is_scored ? (
                    <LeagueWideTable
                      teams={teams}
                      predsByTeam={predsByTeam}
                      titlePickByTeam={titlePickByTeam}
                      isScored={true}
                    />
                  ) : (
                    <p className="text-sm text-accent-gold/60 italic">
                      Awaiting Tribal Council...
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
