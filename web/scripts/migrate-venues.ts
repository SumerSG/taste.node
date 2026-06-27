/**
 * Migrate venue JSON data to Supabase
 *
 * Usage:
 *   1. Copy .env.example to .env.local and fill in SUPABASE_URL + SUPABASE_SERVICE_KEY
 *   2. npx tsx scripts/migrate-venues.ts
 *
 * This script reads src/data/venues.json, transforms each venue for the Supabase schema,
 * and upserts in batches via the service role key.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { resolve } from "path";

dotenv.config({ path: resolve(".env.local") });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) {
  console.error("Missing SUPABASE_URL (or VITE_SUPABASE_URL) in .env.local");
  process.exit(1);
}
if (!SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_SERVICE_KEY in .env.local");
  process.exit(1);
}

// ─── Image mapping (standalone copy from src/data/venues.ts) ───
function pickImage(cuisines: string[], venueId?: string): string {
  const seed = venueId || cuisines[0] || "default";
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/600/400`;
}

// ─── Schema transform ───
interface RawVenue {
  venue_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  cuisines: string[];
  dietary_tags: string[];
  price_tier: number | null;
  health_score: number | null;
  source: string;
  source_url: string | null;
  rating: number | null;
  review_count: number | null;
}

function transform(raw: RawVenue) {
  return {
    id: raw.venue_id,
    name: raw.name,
    address: raw.address,
    lat: raw.lat,
    lng: raw.lng,
    cuisines: raw.cuisines ?? [],
    dietary_tags: raw.dietary_tags ?? [],
    price_tier: raw.price_tier,
    health_score: raw.health_score,
    source: raw.source,
    source_url: raw.source_url,
    rating: raw.rating,
    review_count: raw.review_count,
    image_url: pickImage(raw.cuisines ?? [], raw.venue_id),
  };
}

// ─── Migration logic ───
async function migrate(supabase: SupabaseClient) {
  const rawPath = resolve("src/data/venues.json");
  const raw: RawVenue[] = JSON.parse(readFileSync(rawPath, "utf-8"));
  const rows = raw.map(transform);

  console.log(`Loaded ${rows.length} venues from ${rawPath}`);
  console.log(`Target: ${SUPABASE_URL}`);

  // Verify connection first
  const { error: healthErr } = await supabase.from("venues").select("id", { count: "exact", head: true });
  if (healthErr) {
    console.error("Supabase connection failed:", healthErr.message);
    console.error("Make sure the 'venues' table exists (run supabase/migrations/001_venues.sql)");
    process.exit(1);
  }
  console.log(`Connection OK — venues table exists`);

  const BATCH = 100;
  let success = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from("venues").upsert(batch, { onConflict: "id" });

    if (error) {
      console.error(`Batch ${i}-${i + batch.length} failed:`, error.message);
      failed += batch.length;
    } else {
      success += batch.length;
      console.log(`  ✓ ${Math.min(i + BATCH, rows.length)} / ${rows.length}`);
    }
  }

  console.log("\nMigration complete!");
  console.log(`  Success: ${success}`);
  console.log(`  Failed:  ${failed}`);

  if (failed === 0) {
    console.log("\nTip: After migration, the app will load venues from Supabase first.");
    console.log("If Supabase is unreachable, it falls back to the local JSON automatically.");
  }
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  await migrate(supabase);
}

main().catch((err) => {
  console.error("Migration crashed:", err);
  process.exit(1);
});
