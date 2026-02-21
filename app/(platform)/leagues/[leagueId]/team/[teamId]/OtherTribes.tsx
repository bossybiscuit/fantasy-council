"use client";

import { useState } from "react";
import { PlayerAvatar } from "@/components/ui/PlayerCard";
import TribeBadge from "@/components/ui/TribeBadge";

interface OtherPlayer {
  id: string;
  name: string;
  tribe: string | null;
  tribe_color: string | null;
  is_active: boolean;
  img_url: string | null;
  pts: number;
}

interface OtherTeam {
  id: string;
  name: string;
  ownerName: string | null;
  totalPts: number;
  rank: number | null;
  players: OtherPlayer[];
}

export default function OtherTribes({ teams }: { teams: OtherTeam[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (teams.length === 0) return null;

  return (
    <div className="card mt-6">
      <h2 className="section-title mb-4">Other Tribes</h2>
      <div className="space-y-2">
        {teams.map((team) => {
          const isExpanded = expandedId === team.id;
          return (
            <div key={team.id} className="border border-border rounded-lg overflow-hidden">
              {/* Collapsed header row */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : team.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-surface transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`inline-block text-[10px] transition-transform duration-150 shrink-0 ${
                      isExpanded ? "rotate-90 text-accent-orange" : "text-text-muted"
                    }`}
                  >
                    ▶
                  </span>
                  <div className="min-w-0">
                    <span className="font-medium text-text-primary">{team.name}</span>
                    {team.ownerName && (
                      <span className="text-xs text-text-muted ml-2">{team.ownerName}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {team.rank && (
                    <span className="text-xs text-accent-gold font-medium">#{team.rank}</span>
                  )}
                  <span className="text-sm font-bold text-accent-gold">{team.totalPts} pts</span>
                </div>
              </button>

              {/* Expanded roster */}
              {isExpanded && (
                <div className="border-t border-border bg-bg-surface/50 px-4 py-3 space-y-2">
                  {team.players.length === 0 ? (
                    <p className="text-xs text-text-muted italic">No players drafted yet.</p>
                  ) : (
                    team.players.map((player) => (
                      <div
                        key={player.id}
                        className={`flex items-center justify-between py-2 px-3 rounded-lg border ${
                          player.is_active ? "border-border" : "border-border opacity-50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <PlayerAvatar name={player.name} size="sm" imgUrl={player.img_url} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-text-primary">
                                {player.name}
                              </span>
                              {!player.is_active && (
                                <span className="text-xs text-red-400">Voted Out</span>
                              )}
                            </div>
                            {player.tribe && (
                              <TribeBadge tribe={player.tribe} color={player.tribe_color} size="sm" />
                            )}
                          </div>
                        </div>
                        <span className="text-accent-orange font-bold text-sm shrink-0">
                          {player.pts} pts
                        </span>
                      </div>
                    ))
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
