import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/Navbar";

export const dynamic = "force-dynamic";

export default async function SeasonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let profile = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      profile = data;
    }
  } catch {
    // not critical — fall through with no profile
  }

  return (
    <div className="min-h-screen bg-bg-base overflow-x-hidden">
      <Navbar profile={profile} />
      <main className="overflow-x-hidden">{children}</main>
    </div>
  );
}
