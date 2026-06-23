import type { TasteProfile, Recommendation, Filters, RankStatus } from "./types";
import {
  getAllVenues,
  computeDefaultVenues,
  computeUserLocation,
  buildSeedPosts,
  haversine,
} from "./venues";

export const CLUSTER_PEERS = ["alex_12", "jordan_34", "sam_88", "taylor_09", "casey_22", "morgan_45"];
export const FOLLOWED_USERS = ["alex_12", "jordan_34", "sam_88"];

export const TOP_CUISINES = [
  "居酒屋", "海鮮", "焼き鳥", "焼肉", "日本料理", "イタリアン",
  "中華料理", "寿司", "韓国料理", "ステーキ", "パスタ", "鍋",
  "カフェ", "鉄板焼き", "しゃぶしゃぶ", "創作料理",
];

/* ─── Default profile (generated after venues load) ─── */

export function getDefaultProfile(): TasteProfile {
  const dv = computeDefaultVenues();
  return {
    user_id: "demo_user",
    contexts: {
      default: {
        context_id: "default",
        ranked_list: [
          { venue: dv[0], visited_at: "2025-01-10T18:00:00+00:00", added_at: "2026-06-22T10:00:00+00:00", occasion_tag: "solo", is_classic: false, status: "favourite" },
          { venue: dv[1], visited_at: "2025-02-14T19:00:00+00:00", added_at: "2026-06-22T10:00:00+00:00", occasion_tag: "date", is_classic: true, status: "favourite" },
          { venue: dv[2], visited_at: "2025-03-01T12:00:00+00:00", added_at: "2026-06-22T10:00:00+00:00", occasion_tag: "group", is_classic: false, status: "visited" },
          { venue: dv[3], visited_at: "2025-04-20T19:30:00+00:00", added_at: "2026-06-22T10:00:00+00:00", occasion_tag: "date", is_classic: false, status: "visited" },
          { venue: dv[4], visited_at: "2025-05-15T13:00:00+00:00", added_at: "2026-06-22T10:00:00+00:00", occasion_tag: "comfort", is_classic: false, status: "visited" },
        ],
        created_at: "2026-06-22T10:00:00+00:00",
        updated_at: "2026-06-22T10:00:00+00:00",
      },
    },
    default_context: "default",
  };
}

/* ─── Seed posts (generated after venues load) ─── */
export { buildSeedPosts };

/* ─── Cluster label ─── */

export function getClusterLabel(profile: TasteProfile): { label: string; tagline: string } {
  const list = profile.contexts[profile.default_context]?.ranked_list ?? [];
  const topCuisines = new Set<string>();
  list.slice(0, 5).forEach((item) => item.venue.cuisines.forEach((c) => topCuisines.add(c)));
  const cuisines = Array.from(topCuisines).slice(0, 2);
  const label = cuisines.length > 0 ? `${cuisines.join(" & ")} Collective` : "The Undecideds";
  const tagline = `You and ${CLUSTER_PEERS.length} others rank ${cuisines[0] ?? "food"} spots almost identically.`;
  return { label, tagline };
}

/* ─── Recommendations ─── */

export function computeRecommendations(profile: TasteProfile, filters: Filters): Recommendation[] {
  const pool = getAllVenues();
  const userLoc = computeUserLocation();
  const context = profile.contexts[profile.default_context];
  const existingIds = new Set(context?.ranked_list.map((r) => r.venue.id) ?? []);
  const userCuisines = new Set<string>();
  context?.ranked_list.forEach((r) => r.venue.cuisines.forEach((c) => userCuisines.add(c)));

  let candidates = pool.filter((v) => !existingIds.has(v.id));

  if (filters.cuisine) {
    candidates = candidates.filter((v) => v.cuisines.includes(filters.cuisine));
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
      candidates = candidates.filter((v) => required.some((tag) => v.dietary_tags.includes(tag)));
    }
  }
  if (filters.price_tier) {
    candidates = candidates.filter((v) => v.price_tier === filters.price_tier);
  }
  if (filters.healthiness_min > 0) {
    candidates = candidates.filter((v) => (v.health_score ?? 0) >= filters.healthiness_min);
  }
  candidates = candidates.filter((v) => {
    if (!v.location) return false;
    return haversine(userLoc, v.location) <= filters.radius_km;
  });

  const scored = candidates.map((venue) => {
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
  const ref = computeUserLocation();
  switch (sortBy) {
    case "price_asc":
      return copy.sort((a, b) => (a.venue.price_tier ?? 99) - (b.venue.price_tier ?? 99));
    case "price_desc":
      return copy.sort((a, b) => (b.venue.price_tier ?? 0) - (a.venue.price_tier ?? 0));
    case "health_desc":
      return copy.sort((a, b) => (b.venue.health_score ?? 0) - (a.venue.health_score ?? 0));
    case "distance":
      return copy.sort((a, b) => {
        const ua = a.venue.location ? haversine(ref, a.venue.location) : Infinity;
        const ub = b.venue.location ? haversine(ref, b.venue.location) : Infinity;
        return ua - ub;
      });
    default:
      return copy.sort((a, b) => b.score - a.score);
  }
}

/* ─── Status helpers ─── */

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
