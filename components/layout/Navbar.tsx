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
    <nav className="bg-bg-surface border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <span className="text-2xl">🔥</span>
            <span className="font-bold text-lg text-gradient-fire">
              The Council
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/dashboard" current={pathname}>
              Dashboard
            </NavLink>
            {profile?.is_super_admin && (
              <NavLink href="/admin" current={pathname}>
                Admin
              </NavLink>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            {profile && (
              <span className="text-text-muted text-sm hidden sm:block">
                {profile.display_name || profile.username}
              </span>
            )}
            <button
              onClick={handleSignOut}
              className="btn-secondary text-sm py-1.5"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  current,
  children,
}: {
  href: string;
  current: string;
  children: React.ReactNode;
}) {
  const isActive = current === href || current.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive
          ? "text-accent-orange bg-bg-card"
          : "text-text-muted hover:text-text-primary hover:bg-bg-card"
      }`}
    >
      {children}
    </Link>
  );
}
