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

// ─── Image mapping (copied from src/data/venues.ts for standalone use) ───
const IMAGES: Record<string, string> = {
  Japanese: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&h=400&fit=crop",
  Italian: "https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=600&h=400&fit=crop",
  American: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop",
  Mexican: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600&h=400&fit=crop",
  French: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop",
  Indian: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&h=400&fit=crop",
  Vietnamese: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&h=400&fit=crop",
  Korean: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&h=400&fit=crop",
  Thai: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&h=400&fit=crop",
  "Middle Eastern": "https://images.unsplash.com/photo-1541557435984-1c79685a082b?w=600&h=400&fit=crop",
  Seafood: "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=600&h=400&fit=crop",
  Steakhouse: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop",
  Salad: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop",
  Vegetarian: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop",
  Vegan: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop",
  Bakery: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&h=400&fit=crop",
  Taiwanese: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&h=400&fit=crop",
  Nordic: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop",
  Chinese: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&h=400&fit=crop",
  日本料理: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&h=400&fit=crop",
  寿司: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&h=400&fit=crop",
  ラーメン: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&h=400&fit=crop",
  居酒屋: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop",
  焼き鳥: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=600&h=400&fit=crop",
  焼肉: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop",
  天ぷら: "https://images.unsplash.com/photo-1615361200141-f45040f367be?w=600&h=400&fit=crop",
  カフェ: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&h=400&fit=crop",
  パスタ: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600&h=400&fit=crop",
  ピザ: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&h=400&fit=crop",
  中華料理: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&h=400&fit=crop",
  default: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop",
};

function pickImage(cuisines: string[]): string {
  for (const c of cuisines) {
    if (IMAGES[c]) return IMAGES[c];
  }
  return IMAGES.default;
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
    image_url: pickImage(raw.cuisines ?? []),
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
