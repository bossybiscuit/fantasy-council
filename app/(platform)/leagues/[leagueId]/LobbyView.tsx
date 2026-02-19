"use client";

import Link from "next/link";

type Team = {
  id: string;
  name: string;
  profiles: { display_name: string | null; username: string } | null;
};

type LobbyViewProps = {
  league: {
    id: string;
    name: string;
    num_teams: number;
    invite_code: string;
    commissioner_id: string;
    draft_status: string;
  };
  teams: Team[];
  isCommissioner: boolean;
  myTeamId: string | undefined;
};

function SeatAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-accent-orange border border-accent-orange/30 mx-auto mb-2"
      style={{
        background: "linear-gradient(135deg, rgba(255,106,0,0.15), rgba(201,168,76,0.1))",
      }}
    >
      {initials}
    </div>
  );
}

export default function LobbyView({
  league,
  teams,
  isCommissioner,
  myTeamId,
}: LobbyViewProps) {
  const filledSeats = teams.length;
  const totalSeats = league.num_teams;
  const emptyCount = Math.max(0, totalSeats - filledSeats);

  return (
    <div>
      {/* Fire header */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🔥</div>
        <h2 className="text-xl font-bold text-text-primary">The Tribe is Gathering</h2>
        <p className="text-text-muted text-sm mt-1">
          {filledSeats} of {totalSeats} seats claimed at the fire
        </p>
        <div className="w-24 h-0.5 bg-accent-orange/30 mx-auto mt-3 rounded-full" />
      </div>

      {/* Seat grid */}
      <div
        className={`grid gap-3 mb-8 ${
          totalSeats <= 6
            ? "grid-cols-2 sm:grid-cols-3"
            : totalSeats <= 8
            ? "grid-cols-2 sm:grid-cols-4"
            : "grid-cols-2 sm:grid-cols-4 md:grid-cols-5"
        }`}
      >
        {teams.map((team) => {
          const isMe = team.id === myTeamId;
          const displayName =
            team.profiles?.display_name || team.profiles?.username || "Survivor";
          return (
            <div
              key={team.id}
              className={`rounded-lg border-2 p-3 text-center transition-all ${
                isMe
                  ? "border-accent-orange bg-accent-orange/10"
                  : "border-accent-orange/30 bg-accent-orange/5"
              }`}
            >
              <SeatAvatar name={team.name} />
              <p className="text-xs font-semibold text-text-primary leading-tight truncate">
                {team.name}
              </p>
              <p className="text-xs text-text-muted mt-0.5 truncate">{displayName}</p>
              <p className="text-xs text-accent-orange mt-1">🔥 Claimed</p>
              {isMe && (
                <p className="text-xs text-accent-orange/60 mt-0.5">(You)</p>
              )}
            </div>
          );
        })}

        {/* Empty seats */}
        {Array.from({ length: emptyCount }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="rounded-lg border-2 border-dashed border-border p-3 text-center"
          >
            <div className="w-10 h-10 rounded-full border border-dashed border-border mx-auto mb-2 flex items-center justify-center text-text-muted text-sm">
              ?
            </div>
            <p className="text-xs text-text-muted">Open Seat</p>
            <p className="text-xs text-text-muted/50 mt-1">Awaiting survivor…</p>
          </div>
        ))}
      </div>

      {/* Invite code + actions */}
      {isCommissioner ? (
        <div className="card border-accent-orange/20 mb-4">
          <p className="text-xs text-text-muted mb-1 uppercase tracking-wider">
            Pass the Torch — share this code
          </p>
          <p className="text-4xl font-mono font-bold text-gradient-fire tracking-widest mb-3">
            {league.invite_code}
          </p>
          <p className="text-xs text-text-muted mb-4">
            Anyone who enters this code becomes part of your alliance.
          </p>
          {filledSeats >= 2 && (
            <Link
              href={`/leagues/${league.id}/draft`}
              className="btn-primary inline-block"
            >
              Head to the Draft Room →
            </Link>
          )}
        </div>
      ) : (
        <div className="card text-center text-text-muted text-sm py-6">
          <p className="text-base font-medium text-text-primary mb-1">
            Waiting for the tribe to gather…
          </p>
          <p>The commissioner will start the draft once everyone has joined.</p>
        </div>
      )}
    </div>
  );
}
