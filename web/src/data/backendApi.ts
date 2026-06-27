/**
 * taste.node — Backend API adapter (opt-in via VITE_API_URL).
 *
 * If VITE_API_URL is set, the frontend will try to fetch venues and
 * (eventually) profiles from the taste.node FastAPI backend.
 * If not set, everything falls back to localStorage / Supabase / inline
 * mocks exactly as before.
 */

import type { Venue, TasteProfile, Filters, Recommendation, RankedItem } from "./types";
import { pickImage } from "./venues";

const API_BASE = import.meta.env.VITE_API_URL;

export function hasBackend(): boolean {
  return !!API_BASE;
}

/** Normalize a raw venue from the backend so missing frontend fields
 *  (image_url, etc.) are backfilled deterministically. */
function normalizeVenue(v: Venue): Venue {
  return {
    ...v,
    image_url: v.image_url ?? pickImage(v.cuisines, v.id),
  };
}

async function _fetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!API_BASE) return null;
  try {
    const resp = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    if (!resp.ok) {
      console.warn(`[backend] ${path} → ${resp.status}`);
      return null;
    }
    return (await resp.json()) as T;
  } catch (err) {
    console.warn("[backend] network error:", err);
    return null;
  }
}

/** Load all venues from the backend DB (seeded from the static pool). */
export async function loadVenuesBackend(): Promise<Venue[] | null> {
  const data = await _fetch<Venue[]>("/venues");
  return data ? data.map(normalizeVenue) : null;
}

/** Load a user's profile from the backend. */
export async function loadProfileBackend(userId: string): Promise<TasteProfile | null> {
  return _fetch<TasteProfile>(`/users/${encodeURIComponent(userId)}`);
}

/** Create a user on the backend. */
export async function createUserBackend(userId: string): Promise<TasteProfile | null> {
  return _fetch<TasteProfile>("/users", {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}

/** Save a context ranked list to the backend. */
export async function saveContextBackend(
  userId: string,
  contextId: string,
  items: RankedItem[]
): Promise<unknown | null> {
  const payload = items.map((item) => ({
    venue_id: item.venue.id,
    venue_name: item.venue.name,
    visited_at: item.visited_at,
    occasion_tag: item.occasion_tag,
    is_classic: item.is_classic,
    status: item.status,
    personal_rating: item.personal_rating,
    reaction: item.reaction,
    meal_type: item.meal_type,
    dishes: item.dishes,
  }));
  return _fetch(`/users/${encodeURIComponent(userId)}/contexts/${encodeURIComponent(contextId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** Get recommendations from the backend clustering engine. */
export async function getRecommendationsBackend(
  userId: string,
  filters: Filters
): Promise<Recommendation[] | null> {
  const params = new URLSearchParams({ user: userId });
  if (filters.cuisine) params.set("cuisine", filters.cuisine);
  if (filters.diet) params.set("diet", filters.diet);
  if (filters.price_tier !== null) params.set("price_tier", String(filters.price_tier));
  if (filters.with_users && filters.with_users.length > 0) {
    for (const uid of filters.with_users) {
      params.append("with_users", uid);
    }
  }
  if (filters.radius_km && filters.radius_km < 50) {
    // backend expects lat/lng/radius; we don't have user GPS, so skip geo filter for now
  }
  const data = await _fetch<Recommendation[]>(`/recommendations?${params.toString()}`);
  return data ? data.map((rec) => ({ ...rec, venue: normalizeVenue(rec.venue) })) : null;
}
