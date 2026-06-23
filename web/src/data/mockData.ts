import type { Venue, TasteProfile, Recommendation, Filters, RankStatus } from "./types";
import rawVenues from "./venues.json";

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

const VENUE_DATA: Venue[] = (rawVenues as unknown as Array<Record<string, unknown>>).map((v) => ({
  id: v.venue_id as string,
  name: v.name as string,
  location: v.lat != null && v.lng != null ? { lat: v.lat as number, lng: v.lng as number } : null,
  cuisines: v.cuisines as string[],
  dietary_tags: v.dietary_tags as string[],
  price_tier: v.price_tier as number | null,
  health_score: v.health_score as number | null,
  source: v.source as Venue["source"],
  image_url: pickImage(v.cuisines as string[]),
}));

export const CLUSTER_PEERS = ["alex_12", "jordan_34", "sam_88", "taylor_09", "casey_22", "morgan_45"];

export const FOLLOWED_USERS = ["alex_12", "jordan_34", "sam_88"];

export const SEED_POSTS: import("./types").Post[] = [
  {
    id: "seed_001",
    author_id: "alex_12",
    author_name: "Alex M.",
    text: "The omakase here was unreal. Every course built on the last — the chūtoro melted like butter.",
    venue_id: VENUE_DATA[5]?.id,
    venue_name: VENUE_DATA[5]?.name,
    image_url: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=800&h=500&fit=crop",
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "seed_002",
    author_id: "jordan_34",
    author_name: "Jordan T.",
    text: "Finally found a proper Neapolitan pizza in this city. Leopard-spotted crust, San Marzano tomatoes, buffalo mozzarella.",
    venue_id: VENUE_DATA[6]?.id,
    venue_name: VENUE_DATA[6]?.name,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: "seed_003",
    author_id: "sam_88",
    author_name: "Sam K.",
    text: "This tiny Korean BBQ joint doesn't take reservations and the wait is always 40 mins. Worth it.",
    venue_id: VENUE_DATA[7]?.id,
    venue_name: VENUE_DATA[7]?.name,
    image_url: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800&h=500&fit=crop",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: "seed_004",
    author_id: "taylor_09",
    author_name: "Taylor R.",
    text: "Hidden vegan tasting menu. 10 courses, no repeats, all plant-based. Who knew cashew cream could do that?",
    venue_id: VENUE_DATA[8]?.id,
    venue_name: VENUE_DATA[8]?.name,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: "seed_005",
    author_id: "demo_user",
    author_name: "You",
    text: "My new favourite lunch spot. The salmon bowl is exactly what I needed.",
    venue_id: VENUE_DATA[2]?.id,
    venue_name: VENUE_DATA[2]?.name,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
].filter((p) => p.venue_id);

export const MOCK_VENUES: Venue[] = VENUE_DATA;
export const ALL_VENUES = MOCK_VENUES;

export const ALL_CUISINES: string[] = Array.from(new Set(MOCK_VENUES.flatMap((v) => v.cuisines))).sort();

export const DEFAULT_VENUES = [MOCK_VENUES[0], MOCK_VENUES[1], MOCK_VENUES[2], MOCK_VENUES[3], MOCK_VENUES[4]];

const validLocs = MOCK_VENUES.map((v) => v.location).filter((l): l is { lat: number; lng: number } => l != null);
const USER_LOCATION = validLocs.length > 0
  ? {
      lat: validLocs.reduce((s, l) => s + l.lat, 0) / validLocs.length,
      lng: validLocs.reduce((s, l) => s + l.lng, 0) / validLocs.length,
    }
  : { lat: 35.659, lng: 139.701 };

export const DEFAULT_PROFILE: TasteProfile = {
  user_id: "demo_user",
  contexts: {
    default: {
      context_id: "default",
      ranked_list: [
        { venue: MOCK_VENUES[0], visited_at: "2025-01-10T18:00:00+00:00", added_at: "2026-06-22T10:00:00+00:00", occasion_tag: "solo", is_classic: false, status: "favourite" },
        { venue: MOCK_VENUES[1], visited_at: "2025-02-14T19:00:00+00:00", added_at: "2026-06-22T10:00:00+00:00", occasion_tag: "date", is_classic: true, status: "favourite" },
        { venue: MOCK_VENUES[2], visited_at: "2025-03-01T12:00:00+00:00", added_at: "2026-06-22T10:00:00+00:00", occasion_tag: "group", is_classic: false, status: "visited" },
        { venue: MOCK_VENUES[3], visited_at: "2025-04-20T19:30:00+00:00", added_at: "2026-06-22T10:00:00+00:00", occasion_tag: "date", is_classic: false, status: "visited" },
        { venue: MOCK_VENUES[4], visited_at: "2025-05-15T13:00:00+00:00", added_at: "2026-06-22T10:00:00+00:00", occasion_tag: "comfort", is_classic: false, status: "visited" },
      ],
      created_at: "2026-06-22T10:00:00+00:00",
      updated_at: "2026-06-22T10:00:00+00:00",
    },
  },
  default_context: "default",
};

export function getClusterLabel(profile: TasteProfile): { label: string; tagline: string } {
  const list = profile.contexts[profile.default_context]?.ranked_list ?? [];
  const topCuisines = new Set<string>();
  list.slice(0, 5).forEach((item) => item.venue.cuisines.forEach((c) => topCuisines.add(c)));
  const cuisines = Array.from(topCuisines).slice(0, 2);
  const label = cuisines.length > 0 ? `${cuisines.join(" & ")} Collective` : "The Undecideds";
  const tagline = `You and ${CLUSTER_PEERS.length} others rank ${cuisines[0] ?? "food"} spots almost identically.`;
  return { label, tagline };
}

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function computeRecommendations(profile: TasteProfile, filters: Filters): Recommendation[] {
  const userLoc = USER_LOCATION;
  const context = profile.contexts[profile.default_context];
  const existingIds = new Set(context?.ranked_list.map((r) => r.venue.id) ?? []);
  const userCuisines = new Set<string>();
  context?.ranked_list.forEach((r) => r.venue.cuisines.forEach((c) => userCuisines.add(c)));

  let pool = MOCK_VENUES.filter((v) => !existingIds.has(v.id));

  if (filters.cuisine) {
    pool = pool.filter((v) => v.cuisines.includes(filters.cuisine));
  }
  if (filters.diet) {
    const dietMap: Record<string, string[]> = {
      meat: [],
      fish: ["pescatarian"],
      veg: ["vegetarian"],
      vegan: ["vegan"],
    };
    const required = dietMap[filters.diet] ?? [];
    if (required.length > 0) {
      pool = pool.filter((v) => required.some((tag) => v.dietary_tags.includes(tag)));
    }
  }
  if (filters.price_tier) {
    pool = pool.filter((v) => v.price_tier === filters.price_tier);
  }
  if (filters.healthiness_min > 0) {
    pool = pool.filter((v) => (v.health_score ?? 0) >= filters.healthiness_min);
  }
  pool = pool.filter((v) => {
    if (!v.location) return false;
    return haversine(userLoc, v.location) <= filters.radius_km;
  });

  const scored = pool.map((venue) => {
    let score = 0.45;
    const sharedCuisine = venue.cuisines.filter((c) => userCuisines.has(c)).length;
    score += Math.min(sharedCuisine * 0.18, 0.35);
    if (venue.health_score) score += venue.health_score * 0.1;
    if (venue.price_tier && filters.price_tier && venue.price_tier === filters.price_tier) score += 0.07;
    score = Math.min(score, 0.98);
    const refVenue = context?.ranked_list[0]?.venue.name ?? "a similar spot";
    const explanation = `${CLUSTER_PEERS.length} people in your taste cluster ranked this in their top 3 after visiting ${refVenue}.`;
    return { venue, score: Math.round(score * 100) / 100, explanation, context_id: profile.default_context };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, 12);
}

export function sortRecommendations(recs: Recommendation[], sortBy: string): Recommendation[] {
  const copy = [...recs];
  switch (sortBy) {
    case "price_asc":
      return copy.sort((a, b) => (a.venue.price_tier ?? 99) - (b.venue.price_tier ?? 99));
    case "price_desc":
      return copy.sort((a, b) => (b.venue.price_tier ?? 0) - (a.venue.price_tier ?? 0));
    case "health_desc":
      return copy.sort((a, b) => (b.venue.health_score ?? 0) - (a.venue.health_score ?? 0));
    case "distance":
      return copy.sort((a, b) => {
        const ua = a.venue.location ? haversine(USER_LOCATION, a.venue.location) : Infinity;
        const ub = b.venue.location ? haversine(USER_LOCATION, b.venue.location) : Infinity;
        return ua - ub;
      });
    default:
      return copy.sort((a, b) => b.score - a.score);
  }
}

export function searchVenues(query: string): Venue[] {
  const q = query.toLowerCase().trim();
  if (!q) return MOCK_VENUES;
  return MOCK_VENUES.filter((v) =>
    v.name.toLowerCase().includes(q) || v.cuisines.some((c) => c.toLowerCase().includes(q))
  );
}

export function statusLabel(s: RankStatus | undefined): string {
  const map: Record<string, string> = {
    want_to_try: "Want to try",
    visited: "Visited",
    favourite: "Favourite",
    regular: "Regular",
  };
  return map[s ?? "visited"] ?? "Visited";
}

export function statusColor(s: RankStatus | undefined): string {
  const map: Record<string, string> = {
    want_to_try: "bg-amber-50 text-amber-700 ring-amber-200",
    visited: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    favourite: "bg-brand-50 text-brand-700 ring-brand-200",
    regular: "bg-blue-50 text-blue-700 ring-blue-200",
  };
  return map[s ?? "visited"] ?? map.visited;
}
