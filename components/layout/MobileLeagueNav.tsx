"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { League } from "@/types/database";

interface MobileLeagueNavProps {
  league: League;
  isCommissioner: boolean;
  teamId?: string;
}

export default function MobileLeagueNav({
  league,
  isCommissioner,
  teamId,
}: MobileLeagueNavProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const base = `/leagues/${league.id}`;

  // Close drawer on navigation
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const allLinks = [
    { href: base, label: "Standings", icon: "🏆" },
    { href: `${base}/predictions`, label: "Predictions", icon: "🔮" },
    { href: `${base}/recap`, label: "Weekly Recap", icon: "📺" },
  ];

  if (teamId) {
    allLinks.push({ href: `${base}/team/${teamId}`, label: "My Team", icon: "🔥" });
  }

  if (isCommissioner) {
    allLinks.push(
      { href: `${base}/admin/teams`, label: "Manage Teams", icon: "👥" },
      { href: `${base}/admin/players`, label: "Player Values", icon: "💲" },
      { href: `${base}/admin/settings`, label: "League Settings", icon: "⚙️" }
    );
  }

  // Bottom tabs: always-visible shortcuts (max 5)
  const bottomTabs = [
    { href: base, label: "Standings", icon: "🏆" },
    { href: `${base}/predictions`, label: "Picks", icon: "🔮" },
    { href: `${base}/recap`, label: "Recap", icon: "📺" },
    teamId
      ? { href: `${base}/team/${teamId}`, label: "My Team", icon: "🔥" }
      : { href: base, label: "League", icon: "🔥" },
    isCommissioner
      ? { href: `${base}/admin/settings`, label: "Admin", icon: "⚙️" }
      : { href: base, label: "League", icon: "🔥" },
  ];

  function isActive(href: string) {
    return pathname === href || (href !== base && pathname.startsWith(href));
  }

  return (
    <>
      {/* ── Fixed top bar ─────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-50 md:hidden h-14 bg-bg-card border-b border-border flex items-center px-4 gap-3">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 -ml-2 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Open menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <rect y="3" width="20" height="2" rx="1" />
            <rect y="9" width="20" height="2" rx="1" />
            <rect y="15" width="20" height="2" rx="1" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-text-primary truncate text-sm">{league.name}</p>
        </div>
        <Link
          href="/dashboard"
          className="text-xs text-text-muted hover:text-text-primary transition-colors shrink-0"
        >
          ← Home
        </Link>
      </div>

      {/* ── Drawer backdrop ───────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden bg-black/60"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Slide-in drawer ───────────────────────────────── */}
      <div
        className={`fixed top-0 left-0 bottom-0 z-[60] md:hidden w-72 bg-bg-base border-r border-border flex flex-col transition-transform duration-200 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border shrink-0">
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-2 -ml-2 text-text-muted hover:text-text-primary transition-colors"
            aria-label="Close menu"
          >
            ✕
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-text-muted uppercase tracking-wider">League</p>
            <p className="font-semibold text-text-primary truncate text-sm">{league.name}</p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {allLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive(link.href)
                  ? "bg-accent-orange/10 text-accent-orange border border-accent-orange/20"
                  : "text-text-muted hover:text-text-primary hover:bg-bg-surface"
              }`}
            >
              <span className="text-base">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        {/* Drawer footer */}
        <div className="px-4 py-4 border-t border-border shrink-0">
          <Link
            href="/dashboard"
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            ← All Leagues
          </Link>
        </div>
      </div>

      {/* ── Fixed bottom tab bar ──────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden h-16 bg-bg-card border-t border-border flex">
        {bottomTabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href + tab.label}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors ${
                active ? "text-accent-orange" : "text-text-muted hover:text-text-primary"
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span className="leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
