import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync } from "fs";
import { resolve } from "path";

// Seeds Survivor 51: creates the season (if missing), upserts all 21 castaways from
// stuff/season51_cast.json, and adds the premiere episode (if the season has none).
// Safe to re-run. Requires migration 027_season51_survivor_pool.sql.

config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

type CastMember = {
  name: string;
  slug: string;
  age: number;
  hometown: string;
  residence: string;
  occupation: string;
  bio: string;
  img_url: string;
};

const cast: CastMember[] = JSON.parse(
  readFileSync(resolve(process.cwd(), "stuff/season51_cast.json"), "utf-8")
);

async function main() {
  console.log(`🔥 Seeding Survivor 51 (${cast.length} castaways)...\n`);

  let { data: season } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("season_number", 51)
    .maybeSingle();

  if (!season) {
    const { data: newSeason, error } = await supabase
      .from("seasons")
      .insert({ name: "Survivor 51", season_number: 51, status: "active" })
      .select("id, name")
      .single();
    if (error || !newSeason) {
      console.error("Failed to create season:", error);
      process.exit(1);
    }
    season = newSeason;
  }
  console.log(`✅ Season: ${season.name} (${season.id})\n`);

  const players = cast.map((c) => ({
    season_id: season!.id,
    name: c.name,
    slug: c.slug,
    age: c.age,
    hometown: c.hometown,
    residence: c.residence,
    occupation: c.occupation,
    bio: c.bio,
    img_url: c.img_url,
    previous_seasons: [],
    is_active: true,
    suggested_value: 10,
  }));

  const { data: upserted, error: upsertErr } = await supabase
    .from("players")
    .upsert(players, { onConflict: "season_id,slug", ignoreDuplicates: false })
    .select("id, name");

  if (upsertErr) {
    if (/column .* does not exist|schema cache/i.test(upsertErr.message)) {
      console.error(
        "❌ Players table is missing the new columns. Run supabase/migrations/027_season51_survivor_pool.sql in the Supabase SQL editor first."
      );
    } else {
      console.error("Failed to upsert players:", upsertErr);
    }
    process.exit(1);
  }
  console.log(`✅ Upserted ${upserted?.length ?? 0} castaways`);
  for (const p of upserted ?? []) console.log(`  - ${p.name}`);

  // Premiere: Wed Sept 23, 2026, 8 PM ET (= 00:00 UTC Sept 24). Picks lock at airtime.
  const { count } = await supabase
    .from("episodes")
    .select("*", { count: "exact", head: true })
    .eq("season_id", season.id);

  if (!count) {
    const { error } = await supabase.from("episodes").insert({
      season_id: season.id,
      episode_number: 1,
      title: null,
      air_date: "2026-09-23",
      prediction_deadline: "2026-09-24T00:00:00Z",
    });
    if (error) console.error("Failed to create premiere episode:", error.message);
    else console.log("\n✅ Created Episode 1 (Sept 23, picks lock 8 PM ET)");
  }

  console.log("\n🎉 Season 51 seed complete!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
