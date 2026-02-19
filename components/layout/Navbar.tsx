"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

interface NavbarProps {
  profile: Profile | null;
}

export default function Navbar({ profile }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="bg-bg-surface sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo — Cinzel Decorative */}
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <span className="text-xl">🔥</span>
            <span
              className="text-lg text-gradient-fire tracking-wide"
              style={{ fontFamily: "var(--font-playfair, \"Playfair Display\", serif)", fontWeight: 800, fontStyle: "italic" }}
            >
              The Council
            </span>
          </Link>

          {/* Nav links — Bebas Neue */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/dashboard" current={pathname}>
              Dashboard
            </NavLink>
            <NavLink href="/cast" current={pathname} activePrefix="/season">
              Cast
            </NavLink>
            {profile?.is_super_admin && (
              <NavLink href="/admin" current={pathname}>
                Admin
              </NavLink>
            )}
          </div>

          {/* User + sign out */}
          <div className="flex items-center gap-3">
            {profile && (
              <span
                className="text-text-muted text-sm hidden sm:block"
                style={{ fontFamily: "var(--font-crimson, Georgia, serif)", fontStyle: "italic" }}
              >
                {profile.display_name || profile.username}
              </span>
            )}
            <button onClick={handleSignOut} className="btn-secondary text-xs py-1.5 px-3">
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Torch gradient bottom border */}
      <div
        style={{
          height: "1px",
          background:
            "linear-gradient(to right, transparent, rgba(255,106,0,0.5), rgba(201,168,76,0.85), rgba(255,106,0,0.5), transparent)",
          opacity: 0.7,
        }}
      />
    </nav>
  );
}

function NavLink({
  href,
  current,
  activePrefix,
  children,
}: {
  href: string;
  current: string;
  activePrefix?: string;
  children: React.ReactNode;
}) {
  const isActive =
    current === href ||
    current.startsWith(href + "/") ||
    (activePrefix ? current.startsWith(activePrefix) : false);
  return (
    <Link
      href={href}
      className="relative px-3 py-2 transition-colors"
      style={{
        fontFamily: "var(--font-bebas, sans-serif)",
        letterSpacing: "0.1em",
        fontSize: "0.92rem",
        color: isActive ? "var(--accent-orange)" : "var(--text-muted)",
      }}
    >
      {children}
      {isActive && (
        <span
          className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
          style={{
            background: "var(--accent-orange)",
            boxShadow: "0 0 4px var(--accent-orange)",
          }}
        />
      )}
    </Link>
  );
}
