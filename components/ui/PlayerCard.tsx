import type { Player } from "@/types/database";
import { getTierBadgeClass } from "@/lib/utils";

interface PlayerCardProps {
  player: Player;
  points?: number;
  isOwned?: boolean;
  ownerName?: string;
  action?: React.ReactNode;
  compact?: boolean;
}

export default function PlayerCard({
  player,
  points,
  isOwned,
  ownerName,
  action,
  compact,
}: PlayerCardProps) {
  if (compact) {
    return (
      <div
        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
          isOwned
            ? "border-accent-orange/30 bg-accent-orange/5"
            : "border-border bg-bg-surface"
        }`}
      >
        <div className="flex items-center gap-3">
          <PlayerAvatar name={player.name} size="sm" />
          <div>
            <p className="text-sm font-medium text-text-primary">
              {player.name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {player.tribe && (
                <span className="text-xs text-text-muted">{player.tribe}</span>
              )}
              {player.tier && (
                <span className={getTierBadgeClass(player.tier)}>
                  {player.tier}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {points !== undefined && (
            <span className="text-accent-gold font-semibold text-sm">
              {points} pts
            </span>
          )}
          {ownerName && (
            <span className="text-xs text-text-muted hidden sm:block">
              {ownerName}
            </span>
          )}
          {action}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`card transition-all hover:border-accent-orange/30 ${
        isOwned ? "border-accent-orange/20 opacity-60" : ""
      } ${!player.is_active ? "opacity-40" : ""}`}
    >
      <div className="flex items-start gap-3">
        <PlayerAvatar name={player.name} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-text-primary">{player.name}</h3>
            {player.tier && (
              <span className={getTierBadgeClass(player.tier)}>
                Tier {player.tier}
              </span>
            )}
            {!player.is_active && (
              <span className="text-xs text-red-400 font-medium">Voted Out</span>
            )}
          </div>
          {player.tribe && (
            <p className="text-sm text-text-muted mt-0.5">{player.tribe} Tribe</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-sm">
            <span className="text-text-muted">
              Value: <span className="text-accent-gold">{player.suggested_value}</span>
            </span>
            {points !== undefined && (
              <span className="text-text-muted">
                Pts: <span className="text-accent-orange font-semibold">{points}</span>
              </span>
            )}
          </div>
          {player.bio && (
            <p className="text-xs text-text-muted mt-2 line-clamp-2">{player.bio}</p>
          )}
          {ownerName && (
            <p className="text-xs text-accent-orange mt-1">Owned by {ownerName}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

export function PlayerAvatar({
  name,
  size = "md",
  imgUrl,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  imgUrl?: string | null;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-base",
  };

  if (imgUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={imgUrl}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover border border-border`}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-accent-orange border border-accent-orange/20`}
      style={{
        background:
          "linear-gradient(135deg, rgba(255,106,0,0.15), rgba(201,168,76,0.15))",
      }}
    >
      {initials}
    </div>
  );
}
