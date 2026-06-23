import type { Venue, Post } from "./types";
import { supabase, hasSupabase } from "../lib/supabase";

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

export function pickImage(cuisines: string[]): string {
  for (const c of cuisines) {
    if (IMAGES[c]) return IMAGES[c];
  }
  return IMAGES.default;
}

function fromRow(row: Record<string, unknown>): Venue {
  return {
    id: row.id as string,
    name: row.name as string,
    address: (row.address as string | null) ?? undefined,
    location:
      row.lat != null && row.lng != null
        ? { lat: row.lat as number, lng: row.lng as number }
        : null,
    cuisines: (row.cuisines as string[] | null) ?? [],
    dietary_tags: (row.dietary_tags as string[] | null) ?? [],
    price_tier: (row.price_tier as number | null) ?? null,
    health_score: (row.health_score as number | null) ?? null,
    source: (row.source as Venue["source"]) ?? "tabelog",
    source_url: (row.source_url as string | null) ?? undefined,
    rating: (row.rating as number | null) ?? undefined,
    review_count: (row.review_count as number | null) ?? undefined,
    image_url: (row.image_url as string | null) ?? pickImage((row.cuisines as string[] | null) ?? []),
  };
}

function fromRawJson(v: Record<string, unknown>): Venue {
  return {
    id: v.venue_id as string,
    name: v.name as string,
    address: (v.address as string | undefined) || undefined,
    location:
      v.lat != null && v.lng != null
        ? { lat: v.lat as number, lng: v.lng as number }
        : null,
    cuisines: v.cuisines as string[],
    dietary_tags: v.dietary_tags as string[],
    price_tier: v.price_tier as number | null,
    health_score: v.health_score as number | null,
    source: v.source as Venue["source"],
    source_url: (v.source_url as string | undefined) || undefined,
    rating: (v.rating as number | undefined) || undefined,
    review_count: (v.review_count as number | undefined) || undefined,
    image_url: pickImage((v.cuisines as string[]) ?? []),
  };
}

/* ─── Runtime store ─── */
let _venues: Venue[] = [];
let _loaded = false;

export function isVenuesLoaded(): boolean {
  return _loaded;
}

export function getAllVenues(): Venue[] {
  return _venues;
}

export function getVenueById(id: string): Venue | undefined {
  return _venues.find((v) => v.id === id);
}

/** Reset and repopulate the in-memory venue store.  Call once on app boot. */
export async function loadVenues(): Promise<void> {
  if (_loaded) return;
  _venues = [];

  // 1️⃣  Try Supabase first
  if (hasSupabase()) {
    try {
      const { data, error } = await supabase!.from("venues").select("*");
      if (!error && data && data.length > 0) {
        _venues = data.map(fromRow);
        _loaded = true;
        console.log(`[supabase] loaded ${_venues.length} venues`);
        return;
      }
      if (error) {
        console.warn("[supabase] venue fetch failed:", error.message);
      }
    } catch (err) {
      console.warn("[supabase] network error:", err);
    }
  }

  // 2️⃣  Fall back to static JSON served from /public
  try {
    const res = await fetch("/venues.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = (await res.json()) as Array<Record<string, unknown>>;
    _venues = raw.map(fromRawJson);
    _loaded = true;
    console.log(`[json] loaded ${_venues.length} venues`);
  } catch (err) {
    console.error("[venues] failed to load:", err);
    _venues = [];
    _loaded = true;
  }
}

/* ─── Derived helpers (read from _venues) ─── */

export function computeAllCuisines(): string[] {
  return Array.from(new Set(_venues.flatMap((v) => v.cuisines))).sort();
}

export function computeDefaultVenues(): Venue[] {
  return [
    _venues[12],
    _venues[45],
    _venues[88],
    _venues[134],
    _venues[201],
  ].filter((v): v is Venue => !!v);
}

export function computeUserLocation(): { lat: number; lng: number } {
  const valid = _venues.map((v) => v.location).filter((l): l is { lat: number; lng: number } => l != null);
  return valid.length > 0
    ? {
        lat: valid.reduce((s, l) => s + l.lat, 0) / valid.length,
        lng: valid.reduce((s, l) => s + l.lng, 0) / valid.length,
      }
    : { lat: 35.659, lng: 139.701 };
}

export function searchVenues(query: string): Venue[] {
  const q = query.toLowerCase().trim();
  if (!q) return _venues;
  return _venues.filter(
    (v) =>
      v.name.toLowerCase().includes(q) || v.cuisines.some((c) => c.toLowerCase().includes(q))
  );
}

export function filterAndSortVenues(
  query: string,
  cuisines: string[],
  priceTiers: number[],
  dietaryTags: string[],
  minHealthScore: number,
  sortBy: string
): Venue[] {
  let pool = searchVenues(query);

  if (cuisines.length > 0) {
    pool = pool.filter((v) => v.cuisines.some((c) => cuisines.includes(c)));
  }
  if (priceTiers.length > 0) {
    pool = pool.filter((v) => v.price_tier !== null && priceTiers.includes(v.price_tier));
  }
  if (dietaryTags.length > 0) {
    pool = pool.filter((v) => dietaryTags.some((tag) => v.dietary_tags.includes(tag)));
  }
  if (minHealthScore > 0) {
    pool = pool.filter((v) => (v.health_score ?? 0) >= minHealthScore);
  }

  const copy = [...pool];
  switch (sortBy) {
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "price_asc":
      return copy.sort((a, b) => (a.price_tier ?? 99) - (b.price_tier ?? 99));
    case "price_desc":
      return copy.sort((a, b) => (b.price_tier ?? 0) - (a.price_tier ?? 0));
    case "health_desc":
      return copy.sort((a, b) => (b.health_score ?? 0) - (a.health_score ?? 0));
    case "distance": {
      const ref = computeUserLocation();
      return copy.sort((a, b) => {
        const ua = a.location ? haversine(ref, a.location) : Infinity;
        const ub = b.location ? haversine(ref, b.location) : Infinity;
        return ua - ub;
      });
    }
    default:
      return copy;
  }
}

/* ─── Seed posts (generated after venues are loaded) ─── */

export function buildSeedPosts(): Post[] {
  const v = _venues;
  return [
    {
      id: "seed_001",
      author_id: "alex_12",
      author_name: "Alex M.",
      text: "The omakase here was unreal. Every course built on the last — the chūtoro melted like butter.",
      venue_id: v[5]?.id,
      venue_name: v[5]?.name,
      image_url: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=800&h=500&fit=crop",
      created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    {
      id: "seed_002",
      author_id: "jordan_34",
      author_name: "Jordan T.",
      text: "Finally found a proper Neapolitan pizza in this city. Leopard-spotted crust, San Marzano tomatoes, buffalo mozzarella.",
      venue_id: v[6]?.id,
      venue_name: v[6]?.name,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    },
    {
      id: "seed_003",
      author_id: "sam_88",
      author_name: "Sam K.",
      text: "This tiny Korean BBQ joint doesn't take reservations and the wait is always 40 mins. Worth it.",
      venue_id: v[7]?.id,
      venue_name: v[7]?.name,
      image_url: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800&h=500&fit=crop",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    },
    {
      id: "seed_004",
      author_id: "taylor_09",
      author_name: "Taylor R.",
      text: "Hidden vegan tasting menu. 10 courses, no repeats, all plant-based. Who knew cashew cream could do that?",
      venue_id: v[8]?.id,
      venue_name: v[8]?.name,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    },
    {
      id: "seed_005",
      author_id: "demo_user",
      author_name: "You",
      text: "My new favourite lunch spot. The salmon bowl is exactly what I needed.",
      venue_id: v[2]?.id,
      venue_name: v[2]?.name,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
  ].filter((p) => p.venue_id) as Post[];
}

/* ─── Geometry helpers ─── */

export function haversine(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
