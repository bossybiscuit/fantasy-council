"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { League } from "@/types/database";

interface LeagueSidebarProps {
  league: League;
  isCommissioner: boolean;
  teamId?: string;
}

export default function LeagueSidebar({
  league,
  isCommissioner,
  teamId,
}: LeagueSidebarProps) {
  const pathname = usePathname();
  const base = `/leagues/${league.id}`;

  const links = [
    { href: base, label: "Standings", icon: "🏆" },
    { href: `${base}/draft`, label: "Draft Room", icon: "📋" },
    { href: `${base}/predictions`, label: "Predictions", icon: "🔮" },
    { href: `${base}/recap`, label: "Weekly Recap", icon: "📺" },
  ];

  if (teamId) {
    links.push({ href: `${base}/team/${teamId}`, label: "My Team", icon: "🔥" });
  }

  // Pre-draft valuations — available for auction leagues before draft completes
  if (
    teamId &&
    league.draft_type === "auction" &&
    league.draft_status !== "completed"
  ) {
    links.push({ href: `${base}/draft/valuations`, label: "My Valuations", icon: "💰" });
  }

  if (isCommissioner) {
    links.push(
      { href: `${base}/admin/teams`, label: "Manage Teams", icon: "👥" },
      { href: `${base}/admin/scoring`, label: "Score Episode", icon: "⚡" },
      { href: `${base}/admin/settings`, label: "League Settings", icon: "⚙️" }
    );
  }

  return (
    <aside className="w-56 shrink-0">
      <div className="card sticky top-20">
        <div className="mb-3">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">
            League
          </p>
          <p className="font-semibold text-text-primary truncate">
            {league.name}
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            {league.draft_type === "auction" ? "Auction" : "Snake"} Draft
          </p>
        </div>
        <div className="torch-divider" />
        <nav className="space-y-1 mt-3">
          {links.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== base && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-accent-orange/10 text-accent-orange border border-accent-orange/20"
                    : "text-text-muted hover:text-text-primary hover:bg-bg-surface"
                }`}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="torch-divider mt-3" />
        <div className="mt-3">
          <Link
            href="/dashboard"
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            ← All Leagues
          </Link>
        </div>
      </div>
    </aside>
  );
}
