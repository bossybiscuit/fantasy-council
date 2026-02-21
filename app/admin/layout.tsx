import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_super_admin) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-bg-base">
      <div className="bg-bg-surface border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-6">
          <Link href="/dashboard" className="text-text-muted hover:text-text-primary text-sm">
            ← Dashboard
          </Link>
          <span className="text-text-muted">/</span>
          <span className="font-semibold text-accent-orange">Super Admin</span>
          <nav className="flex gap-4 ml-4">
            <Link href="/admin/seasons" className="text-sm text-text-muted hover:text-text-primary">
              Seasons
            </Link>
            <Link href="/admin/players" className="text-sm text-text-muted hover:text-text-primary">
              Players
            </Link>
            <Link href="/admin/leagues" className="text-sm text-text-muted hover:text-text-primary">
              All Leagues
            </Link>
            <Link href="/admin/scoring" className="text-sm text-text-muted hover:text-text-primary">
              Scoring
            </Link>
            <Link href="/admin/predictions" className="text-sm text-text-muted hover:text-text-primary">
              Predictions
            </Link>
          </nav>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
    </div>
  );
}
