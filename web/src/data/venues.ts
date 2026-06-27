import type { Venue } from "./types";
import { supabase, hasSupabase } from "../lib/supabase";
import { loadVenuesBackend, hasBackend } from "./backendApi";

/** Generate a deterministic placeholder image URL using picsum.photos
 *  (free, no API key, consistent per seed).
 *  We use the venue ID when available, otherwise the first cuisine,
 *  so each venue gets a stable placeholder image. */
export function pickImage(cuisines: string[], venueId?: string): string {
  const seed = venueId || cuisines[0] || "default";
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/600/400`;
}

function fromRow(row: Record<string, unknown>): Venue {
  return {
    id: row.id as string,
    name: row.name as string,
    address: (row.address as string | null) ?? undefined,
    location: (() => {
      if (
        row.location &&
        typeof row.location === "object" &&
        row.location !== null
      ) {
        const loc = row.location as Record<string, unknown>;
        if (typeof loc.lat === "number" && typeof loc.lng === "number") {
          return { lat: loc.lat, lng: loc.lng };
        }
      }
      if (row.lat != null && row.lng != null) {
        return { lat: row.lat as number, lng: row.lng as number };
      }
      return null;
    })(),
    cuisines: Array.isArray(row.cuisines) ? (row.cuisines as string[]) : [],
    dietary_tags: Array.isArray(row.dietary_tags)
      ? (row.dietary_tags as string[])
      : [],
    price_tier: (row.price_tier as number | null) ?? null,
    health_score: (row.health_score as number | null) ?? null,
    source: (row.source as Venue["source"]) ?? "tabelog",
    source_url: (row.source_url as string | null) ?? undefined,
    rating: (row.rating as number | null) ?? undefined,
    review_count: (row.review_count as number | null) ?? undefined,
    image_url:
      (row.image_url as string | null) ??
      pickImage(
        Array.isArray(row.cuisines) ? (row.cuisines as string[]) : [],
        row.id as string
      ),
  };
}

import venuesJson from "./venues.json";

/* ─── Fallback inline data (loaded from canonical venues.json) ─── */
const FALLBACK_VENUES: Venue[] = venuesJson.map((raw: Record<string, unknown>) => ({
  id: (raw.venue_id ?? raw.id) as string,
  name: raw.name as string,
  address: raw.address ? String(raw.address) : undefined,
  location:
    raw.lat != null && raw.lng != null
      ? { lat: Number(raw.lat), lng: Number(raw.lng) }
      : null,
  cuisines: Array.isArray(raw.cuisines) ? (raw.cuisines as string[]) : [],
  dietary_tags: Array.isArray(raw.dietary_tags) ? (raw.dietary_tags as string[]) : [],
  price_tier: raw.price_tier != null ? Number(raw.price_tier) : null,
  health_score: raw.health_score != null ? Number(raw.health_score) : null,
  source: (raw.source as Venue["source"]) ?? "tabelog",
  source_url: raw.source_url ? String(raw.source_url) : undefined,
  rating: raw.rating != null ? Number(raw.rating) : undefined,
  review_count: raw.review_count != null ? Number(raw.review_count) : undefined,
  image_url: raw.image_url
    ? String(raw.image_url)
    : pickImage(
        Array.isArray(raw.cuisines) ? (raw.cuisines as string[]) : [],
        ((raw.venue_id ?? raw.id) as string) ?? ""
      ),
}));

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

  // 1️⃣  Try backend API first (opt-in via VITE_API_URL)
  if (hasBackend()) {
    try {
      const backendVenues = await loadVenuesBackend();
      if (backendVenues && backendVenues.length > 0) {
        _venues = backendVenues.map((v) => ({
          ...v,
          image_url: v.image_url ?? pickImage(v.cuisines, v.id),
        }));
        _loaded = true;
        console.log(`[backend] loaded ${_venues.length} venues`);
        return;
      }
    } catch (err) {
      console.warn("[backend] venue fetch failed:", err);
    }
  }

  // 2️⃣  Try Supabase
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

  // 3️⃣  Inline fallback (no external JSON needed)
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
