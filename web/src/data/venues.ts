import type { Venue } from "./types";
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

/* ─── Fallback inline data (no JSON needed) ─── */
const FALLBACK_VENUES: Venue[] = [
  { id: "v1", name: "Nakameguro Kiriko", address: "東京都目黒区上目黒2-19-1", location: { lat: 35.6415, lng: 139.6981 }, cuisines: ["居酒屋", "焼き鳥"], dietary_tags: [], price_tier: 2, health_score: 0.6, source: "tabelog" as const, rating: 3.58, review_count: 142 },
  { id: "v2", name: "Shibuya Yakiniku Jumbo", address: "東京都渋谷区道玄坂1-6-6", location: { lat: 35.6592, lng: 139.7003 }, cuisines: ["焼肉", "居酒屋"], dietary_tags: ["meat"], price_tier: 3, health_score: 0.5, source: "tabelog" as const, rating: 3.72, review_count: 389 },
  { id: "v3", name: "Ramen Jiro Meguro", address: "東京都目黒区目黒1-3-18", location: { lat: 35.6339, lng: 139.7157 }, cuisines: ["ラーメン"], dietary_tags: ["meat"], price_tier: 1, health_score: 0.3, source: "tabelog" as const, rating: 3.51, review_count: 567 },
  { id: "v4", name: "Sushi Saito", address: "東京都港区六本木1-4-5", location: { lat: 35.6628, lng: 139.7394 }, cuisines: ["寿司", "日本料理"], dietary_tags: ["fish"], price_tier: 4, health_score: 0.8, source: "tabelog" as const, rating: 4.77, review_count: 203 },
  { id: "v5", name: "Trattoria Dal Biassanot", address: "東京都渋谷区恵比寿1-30-10", location: { lat: 35.6467, lng: 139.7101 }, cuisines: ["イタリアン", "パスタ"], dietary_tags: ["vegetarian"], price_tier: 2, health_score: 0.7, source: "tabelog" as const, rating: 3.48, review_count: 198 },
  { id: "v6", name: "T's Restaurant", address: "東京都渋谷区神宮前6-28-5", location: { lat: 35.6614, lng: 139.7041 }, cuisines: ["カフェ", "ベジタリアン"], dietary_tags: ["vegan", "vegetarian"], price_tier: 2, health_score: 0.9, source: "tabelog" as const, rating: 3.62, review_count: 312 },
  { id: "v7", name: "Narisawa", address: "東京都港区南青山2-6-15", location: { lat: 35.6713, lng: 139.7188 }, cuisines: ["創作料理", "フレンチ"], dietary_tags: ["vegetarian"], price_tier: 4, health_score: 0.85, source: "tabelog" as const, rating: 4.65, review_count: 445 },
  { id: "v8", name: "Harajuku Gyoza Lou", address: "東京都渋谷区神宮前6-2-4", location: { lat: 35.6701, lng: 139.7026 }, cuisines: ["中華料理", "餃子"], dietary_tags: ["meat"], price_tier: 1, health_score: 0.55, source: "tabelog" as const, rating: 3.44, review_count: 876 },
  { id: "v9", name: "Afuri", address: "東京都港区六本木6-2-31", location: { lat: 35.6605, lng: 139.7292 }, cuisines: ["ラーメン", "和食"], dietary_tags: ["meat"], price_tier: 1, health_score: 0.6, source: "tabelog" as const, rating: 3.38, review_count: 654 },
  { id: "v10", name: "Teppanyaki Nakamura", address: "東京都新宿区西新宿3-7-1", location: { lat: 35.6852, lng: 139.6926 }, cuisines: ["鉄板焼き", "ステーキ"], dietary_tags: ["meat"], price_tier: 4, health_score: 0.65, source: "tabelog" as const, rating: 4.21, review_count: 178 },
  { id: "v11", name: "Tonkatsu Maisen", address: "東京都渋谷区神宮前4-8-5", location: { lat: 35.6671, lng: 139.7054 }, cuisines: ["和食", "とんかつ"], dietary_tags: ["meat"], price_tier: 2, health_score: 0.5, source: "tabelog" as const, rating: 3.56, review_count: 934 },
  { id: "v12", name: "Luke's Lobster", address: "東京都渋谷区神宮前6-7-1", location: { lat: 35.6655, lng: 139.7062 }, cuisines: ["アメリカ料理", "シーフード"], dietary_tags: ["pescatarian"], price_tier: 2, health_score: 0.7, source: "tabelog" as const, rating: 3.32, review_count: 543 },
  { id: "v13", name: "Gonpachi Nishiazabu", address: "東京都港区西麻布1-13-11", location: { lat: 35.6598, lng: 139.7228 }, cuisines: ["居酒屋", "和食"], dietary_tags: ["meat"], price_tier: 2, health_score: 0.6, source: "tabelog" as const, rating: 3.41, review_count: 421 },
  { id: "v14", name: "Sangenjaya Curry Kusamura", address: "東京都世田谷区三軒茶屋1-32-10", location: { lat: 35.6407, lng: 139.6688 }, cuisines: ["カレー", "インド料理"], dietary_tags: ["vegetarian"], price_tier: 1, health_score: 0.75, source: "tabelog" as const, rating: 3.62, review_count: 267 },
  { id: "v15", name: "Den", address: "東京都渋谷区神宮前2-3-18", location: { lat: 35.6718, lng: 139.7109 }, cuisines: ["創作料理", "居酒屋"], dietary_tags: ["meat"], price_tier: 3, health_score: 0.8, source: "tabelog" as const, rating: 4.58, review_count: 334 },
].map((v) => ({ ...v, image_url: pickImage(v.cuisines) }));

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

  // 2️⃣  Inline fallback (no external JSON needed)
  _venues = FALLBACK_VENUES;
  _loaded = true;
  console.log(`[fallback] loaded ${_venues.length} venues`);
}

/* ─── Derived helpers (read from _venues) ─── */

export function computeAllCuisines(): string[] {
  return Array.from(new Set(_venues.flatMap((v) => v.cuisines))).sort();
}

export function computeDefaultVenues(): Venue[] {
  const count = _venues.length;
  if (count === 0) return [];
  // Spread selections across available venues so we don't crash when the
  // fallback list (15 items) is active, and so we still pick diverse venues
  // when the full Supabase dataset (~200 items) is loaded.
  const indices =
    count < 202
      ? [0, Math.floor(count / 4), Math.floor(count / 2), Math.floor(count * 3 / 4), count - 1]
      : [12, 45, 88, 134, 201];
  return indices.map((i) => _venues[i]).filter((v): v is Venue => !!v);
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
