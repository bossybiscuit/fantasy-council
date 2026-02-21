import { Suspense } from "react";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import AdminPredictionsClient from "./AdminPredictionsClient";

export const dynamic = "force-dynamic";

export default async function AdminPredictionsPage() {
  const supabase = await createClient();
  const db = createServiceClient();

  // Fetch all leagues for the selector
  const { data: leagues } = await db
    .from("leagues")
    .select("id, name, season_id, draft_type")
    .order("name");

  return (
    <Suspense>
      <AdminPredictionsClient leagues={leagues || []} />
    </Suspense>
  );
}
