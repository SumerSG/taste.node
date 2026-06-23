import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { resolve } from "path";

dotenv.config({ path: resolve(".env.local") });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local");
  process.exit(1);
}

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
  default: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop",
};

function pickImage(cuisines: string[]): string {
  for (const c of cuisines) {
    if (IMAGES[c]) return IMAGES[c];
  }
  return IMAGES.default;
}

function transform(raw: Record<string, unknown>) {
  const cuisines = Array.isArray(raw.cuisines) ? (raw.cuisines as string[]) : [];
  return {
    id: (raw.venue_id as string | undefined) ?? (raw.id as string | undefined) ?? "",
    name: (raw.name as string) ?? "",
    address: (raw.address as string | null | undefined) ?? null,
    lat: (raw.lat as number | null | undefined) ?? null,
    lng: (raw.lng as number | null | undefined) ?? null,
    cuisines,
    dietary_tags: Array.isArray(raw.dietary_tags) ? (raw.dietary_tags as string[]) : [],
    price_tier: (raw.price_tier as number | null | undefined) ?? null,
    health_score: (raw.health_score as number | null | undefined) ?? null,
    source: (raw.source as string) ?? "tabelog",
    source_url: (raw.source_url as string | null | undefined) ?? null,
    rating: (raw.rating as number | null | undefined) ?? null,
    review_count: (raw.review_count as number | null | undefined) ?? null,
    image_url: (raw.image_url as string | null | undefined) ?? pickImage(cuisines),
  };
}

async function seed(supabase: SupabaseClient) {
  const rawPath = resolve("src/data/venues.json");
  const raw = JSON.parse(readFileSync(rawPath, "utf-8"));
  const rows = raw.map(transform);

  console.log(`Seeding ${rows.length} venues...`);

  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from("venues").upsert(batch, { onConflict: "id" });
    if (error) {
      console.error(`Batch ${i}-${i + batch.length} failed:`, error.message);
      process.exit(1);
    }
    console.log(`  ✓ ${i + batch.length} / ${rows.length}`);
  }

  console.log("Done.");
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  await seed(supabase);
}

main();
