"use client";

import Link from "next/link";
import { useState } from "react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://fantasy-council.vercel.app";

type Team = {
  id: string;
  name: string;
  user_id: string | null;
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
    draft_type: string;
  };
  teams: Team[];
  isCommissioner: boolean;
  myTeamId: string | undefined;
  commissionerName?: string;
  seasonName?: string;
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

export function InviteShare({
  league,
  commissionerName,
  seasonName = "Survivor",
  isPredictions = false,
}: {
  league: Pick<LobbyViewProps["league"], "id" | "name" | "invite_code" | "draft_type">;
  commissionerName?: string;
  seasonName?: string;
  isPredictions?: boolean;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<"group" | "email" | "text">("group");

  const joinUrl = `${APP_URL}/leagues/join?code=${league.invite_code}`;

  const templates = isPredictions
    ? {
        group: `🔥 ${seasonName} Fantasy — we're doing it.
Join my league: ${league.name}
Code: ${league.invite_code} at ${joinUrl}
No draft — just weekly vote-out picks, a Survivor Pool, and season-long predictions.
Don't get voted out before you even sign up.`,

        email: `Subject: You've been summoned — ${league.name}

Hey —

I'm running a ${seasonName} fantasy league and you're invited. There's no draft, so anyone can jump in:

• Weekly vote predictions — call who's going home
• Survivor Pool — pick someone to survive each week; streaks pay exponentially, but you can't reuse a castaway
• Season-long predictions — winner, first boot, and more

League: ${league.name}
Invite Code: ${league.invite_code}
Join at: ${joinUrl}

See you at Tribal.
— ${commissionerName || "The Commissioner"}`,

        text: `${seasonName} fantasy — join my league! No draft, just weekly picks. Code: ${league.invite_code} at ${joinUrl}`,
      }
    : {
        group: `🔥 ${seasonName} Fantasy — we're doing it.
Join my league: ${league.name}
Code: ${league.invite_code} at ${joinUrl}
Draft is ${league.draft_type} — TBD
Don't get voted out before you even sign up.`,

        email: `Subject: You've been summoned — ${league.name}

Hey —

I'm running a ${seasonName} fantasy league and you're invited.

League: ${league.name}
Draft: ${league.draft_type === "auction" ? "Auction" : "Snake"} — TBD
Invite Code: ${league.invite_code}
Join at: ${joinUrl}

Create your account, enter the code, and claim your seat before draft day. Roster locks the moment the draft ends — no trades, no second chances.

See you at Tribal.
— ${commissionerName || "The Commissioner"}`,

        text: `${seasonName} fantasy — join my league! Code: ${league.invite_code} at ${joinUrl}. Draft TBD.`,
      };

  async function copyText(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // fallback: select text
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${league.name} — Survivor Fantasy`,
          text: `Join my Survivor fantasy league! Code: ${league.invite_code}`,
          url: joinUrl,
        });
      } catch {
        // user cancelled or not supported
      }
    } else {
      copyText(joinUrl, "url");
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Code + quick copy */}
      <div className="card border-accent-orange/20">
        <p className="text-xs text-text-muted mb-1 uppercase tracking-wider">
          Pass the Torch — share this code
        </p>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <p className="text-4xl font-mono font-bold text-gradient-fire tracking-widest">
            {league.invite_code}
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => copyText(league.invite_code, "code")}
              className="btn-secondary text-sm px-3 py-1.5 shrink-0"
            >
              {copied === "code" ? "Copied!" : "Copy Code"}
            </button>
            <button
              onClick={handleShare}
              className="btn-secondary text-sm px-3 py-1.5 shrink-0"
            >
              {copied === "url" ? "Copied!" : "Share Link"}
            </button>
          </div>
        </div>
        <p className="text-xs text-text-muted">
          Join at:{" "}
          <span className="text-text-primary font-mono text-xs">{joinUrl}</span>
        </p>
      </div>

      {/* Message templates */}
      <div>
        <p className="text-xs text-text-muted uppercase tracking-wider mb-2">
          Invite Message
        </p>
        <div className="flex gap-2 mb-3">
          {(["group", "email", "text"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTemplate(t)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors capitalize ${
                activeTemplate === t
                  ? "border-accent-orange text-accent-orange bg-accent-orange/10"
                  : "border-border text-text-muted hover:border-accent-orange/40"
              }`}
            >
              {t === "group" ? "Group Chat" : t === "email" ? "Email" : "Text"}
            </button>
          ))}
        </div>
        <div className="relative">
          <pre
            className="text-xs text-text-muted bg-bg-surface border border-border rounded-lg p-4 whitespace-pre-wrap font-sans leading-relaxed"
            style={{ fontFamily: "var(--font-crimson, Georgia, serif)", fontSize: "0.85rem" }}
          >
            {templates[activeTemplate]}
          </pre>
          <button
            onClick={() => copyText(templates[activeTemplate], "template")}
            className="absolute top-2 right-2 text-xs btn-secondary py-1 px-2"
          >
            {copied === "template" ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Admin actions */}
      <div className="flex flex-wrap gap-2 pt-2">
        <Link
          href={`/leagues/${league.id}/admin/teams`}
          className="btn-secondary text-sm"
        >
          Manage Teams
        </Link>
        {!isPredictions && (
          <Link
            href={`/leagues/${league.id}/draft`}
            className="btn-primary"
          >
            Head to the Draft Room →
          </Link>
        )}
      </div>
    </div>
  );
}

export default function LobbyView({
  league,
  teams,
  isCommissioner,
  myTeamId,
  commissionerName,
  seasonName,
}: LobbyViewProps) {
  const claimedTeams = teams.filter((t) => t.user_id);
  const unclaimedTeams = teams.filter((t) => !t.user_id);
  const filledSeats = claimedTeams.length;
  const totalSeats = league.num_teams;
  const hasPreCreatedSlots = unclaimedTeams.length > 0;
  const blankEmptyCount = hasPreCreatedSlots
    ? 0
    : Math.max(0, totalSeats - teams.length);

  const myTeam = myTeamId ? teams.find((t) => t.id === myTeamId) : null;

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

      {/* My Tribe card */}
      {myTeam && (
        <div className="card border-accent-orange/30 mb-6">
          <p className="text-xs text-accent-orange uppercase tracking-wider mb-0.5">Your Tribe</p>
          <p className="text-lg font-bold text-text-primary">{myTeam.name}</p>
          <p className="text-xs text-text-muted mt-1">Manage your team from the sidebar → My Team</p>
        </div>
      )}

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
        {claimedTeams.map((team) => {
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

        {unclaimedTeams.map((team) => (
          <div
            key={team.id}
            className="rounded-lg border-2 border-dashed border-border p-3 text-center"
          >
            <div className="w-10 h-10 rounded-full border border-dashed border-border mx-auto mb-2 flex items-center justify-center text-text-muted text-sm">
              ?
            </div>
            <p className="text-xs font-semibold text-text-muted leading-tight truncate">
              {team.name}
            </p>
            <p className="text-xs text-text-muted/50 mt-1">Open seat</p>
          </div>
        ))}

        {Array.from({ length: blankEmptyCount }).map((_, i) => (
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

      {/* Commissioner: share section. Member: waiting message */}
      {isCommissioner ? (
        <InviteShare league={league} commissionerName={commissionerName} seasonName={seasonName} />
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
