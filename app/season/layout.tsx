import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SeasonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let isLoggedIn = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isLoggedIn = !!user;
  } catch {
    // not critical — fall through to show Sign In
  }

  return (
    <div className="min-h-screen bg-bg-base">
      <nav className="bg-bg-surface sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link
              href={isLoggedIn ? "/dashboard" : "/login"}
              className="flex items-center gap-2 group"
            >
              <span className="text-xl">🔥</span>
              <span
                className="text-base text-gradient-fire tracking-wide"
                style={{
                  fontFamily: "var(--font-playfair, \"Playfair Display\", serif)",
                  fontWeight: 800,
                  fontStyle: "italic",
                }}
              >
                The Council
              </span>
            </Link>

            <div className="flex items-center gap-2">
              {isLoggedIn ? (
                <Link href="/dashboard" className="btn-secondary text-xs py-1.5 px-3">
                  My Leagues
                </Link>
              ) : (
                <>
                  <Link href="/login" className="btn-secondary text-xs py-1.5 px-3">
                    Sign In
                  </Link>
                  <Link href="/register" className="btn-primary text-xs py-1.5 px-3">
                    Join
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        <div
          style={{
            height: "1px",
            background:
              "linear-gradient(to right, transparent, rgba(255,106,0,0.5), rgba(201,168,76,0.85), rgba(255,106,0,0.5), transparent)",
            opacity: 0.7,
          }}
        />
      </nav>
      <main>{children}</main>
    </div>
  );
}
