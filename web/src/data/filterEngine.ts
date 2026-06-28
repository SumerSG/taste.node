import type { Venue, TasteProfile, Filters } from "./types";
import { getAllVenues, computeUserLocation, haversine } from "./venues";
import { getSampleUserProfile, CLUSTER_PEERS } from "./mockData";

export function defaultFilters(): Filters {
  return {
    query: "",
    cuisine: "",
    diet: "",
    price_tier: null,
    healthiness_min: 0,
    radius_km: 50,
    rating_min: 0,
    review_count_min: 0,
    visit_status: "any",
    sort_by: "relevance",
    with_users: [],
  };
}

export function mergeFilters(base: Filters, updates: Partial<Filters>): Filters {
  return { ...base, ...updates };
}

/* ─── Unified cluster-aware venue scoring ─── */

export function scoreVenue(
  venue: Venue,
  filters: Filters,
  profile: TasteProfile
): number {
  const ctx = profile.contexts[profile.default_context];
  const userCuisines = new Set<string>();
  ctx?.ranked_list.forEach((r) => r.venue.cuisines.forEach((c) => userCuisines.add(c)));

  // —— Base taste-cluster signal ——
  let score = 0.45;

  // Shared cuisines with user's own ranked list
  const shared = venue.cuisines.filter((c) => userCuisines.has(c)).length;
  score += Math.min(shared * 0.18, 0.35);

  // Health bonus
  if (venue.health_score) score += venue.health_score * 0.1;

  // Price match
  if (venue.price_tier && filters.price_tier && venue.price_tier === filters.price_tier) score += 0.07;

  // —— Cluster peer popularity ——
  // Popular among cluster peers = additional boost based on their rankings
  if (profile.include_in_clustering !== false) {
    let clusterRankBonus = 0;
    for (const peerId of CLUSTER_PEERS) {
      const peer = getSampleUserProfile(peerId);
      if (!peer) continue;
      const pCtx = peer.contexts[peer.default_context];
      const pRank = pCtx?.ranked_list.findIndex((r) => r.venue.id === venue.id) ?? -1;
      if (pRank !== -1) {
        clusterRankBonus += 0.12 / (pRank + 1);
      }
    }
    score += Math.min(clusterRankBonus, 0.25); // cap cluster bonus
  }

  // —— Friend / social context ——
  const friendIds = filters.with_users ?? [];
  const friendCuisines = new Set<string>();
  const friends: TasteProfile[] = [];
  for (const fid of friendIds) {
    const friend = getSampleUserProfile(fid);
    if (friend) {
      friends.push(friend);
      const fCtx = friend.contexts[friend.default_context];
      fCtx?.ranked_list.forEach((r) => r.venue.cuisines.forEach((c) => friendCuisines.add(c)));
    }
  }

  if (friendCuisines.size > 0) {
    const friendShared = venue.cuisines.filter((c) => friendCuisines.has(c)).length;
    const mutual = venue.cuisines.filter((c) => userCuisines.has(c) && friendCuisines.has(c)).length;
    score += Math.min(friendShared * 0.08, 0.15);
    score += Math.min(mutual * 0.18, 0.30);
    for (const friend of friends) {
      const fCtx = friend.contexts[friend.default_context];
      const fRank = fCtx?.ranked_list.findIndex((r) => r.venue.id === venue.id) ?? -1;
      if (fRank !== -1) {
        score += 0.15 / (fRank + 1);
        break;
      }
    }
  }

  // —— Query-level relevance for search mode ——
  if (filters.query) {
    const q = filters.query.toLowerCase();
    if (venue.name.toLowerCase().includes(q)) score += 0.2;
    if (venue.cuisines.some((c) => c.toLowerCase().includes(q))) score += 0.15;
  }
  if (filters.cuisine && venue.cuisines.some((c) => c.toLowerCase().includes(filters.cuisine.toLowerCase()))) {
    score += 0.1;
  }

  // Quality signals
  if (venue.rating && venue.rating >= 4.0) score += 0.05;
  if (venue.review_count && venue.review_count > 50) score += 0.03;

  return Math.min(score, 0.99);
}

export function filterVenues(
  filters: Filters,
  profile: TasteProfile
): Venue[] {
  let pool = getAllVenues();
  const userLoc = computeUserLocation();
  const ctx = profile.contexts[profile.default_context];

  // Text search
  if (filters.query) {
    const q = filters.query.toLowerCase();
    pool = pool.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.cuisines.some((c) => c.toLowerCase().includes(q))
    );
  }

  // Cuisine — case-insensitive partial match so English queries can
  // match Japanese cuisine labels (e.g. "italian" matches "イタリアン")
  if (filters.cuisine) {
    const q = filters.cuisine.toLowerCase();
    pool = pool.filter((v) =>
      v.cuisines.some((c) => c.toLowerCase().includes(q))
    );
  }

  // Diet
  if (filters.diet) {
    const dietMap: Record<string, string[]> = {
      meat: ["meat"],
      fish: ["pescatarian"],
      veg: ["vegetarian"],
      vegan: ["vegan"],
    };
    const required = dietMap[filters.diet] ?? [];
    if (required.length > 0) {
      pool = pool.filter((v) =>
        required.some((tag) => v.dietary_tags.includes(tag))
      );
    }
  }

  // Price tier
  if (filters.price_tier !== null) {
    pool = pool.filter((v) => v.price_tier === filters.price_tier);
  }

  // Health
  if (filters.healthiness_min > 0) {
    pool = pool.filter((v) => (v.health_score ?? 0) >= filters.healthiness_min);
  }

  // Rating min
  if (filters.rating_min > 0) {
    pool = pool.filter((v) => (v.rating ?? 0) >= filters.rating_min);
  }

  // Review count min
  if (filters.review_count_min > 0) {
    pool = pool.filter((v) => (v.review_count ?? 0) >= filters.review_count_min);
  }

  // Radius — only apply when user explicitly narrowed it (slider max is 20)
  if (filters.radius_km > 0 && filters.radius_km <= 20) {
    pool = pool.filter((v) => {
      if (!v.location) return false;
      return haversine(userLoc, v.location) <= filters.radius_km;
    });
  }

  // Visit status filter
  if (filters.visit_status !== "any") {
    const rankedIds = new Set(
      ctx?.ranked_list
        .filter((r) => r.status === filters.visit_status)
        .map((r) => r.venue.id) ?? []
    );
    pool = pool.filter((v) => rankedIds.has(v.id));
  }

  // Sorting
  const copy = [...pool];
  switch (filters.sort_by) {
    case "name":
      copy.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "price_asc":
      copy.sort((a, b) => (a.price_tier ?? 99) - (b.price_tier ?? 99));
      break;
    case "price_desc":
      copy.sort((a, b) => (b.price_tier ?? 0) - (a.price_tier ?? 0));
      break;
    case "health_desc":
      copy.sort(
        (a, b) => (b.health_score ?? 0) - (a.health_score ?? 0)
      );
      break;
    case "distance": {
      copy.sort((a, b) => {
        const ua = a.location ? haversine(userLoc, a.location) : Infinity;
        const ub = b.location ? haversine(userLoc, b.location) : Infinity;
        return ua - ub;
      });
      break;
    }
    case "rating_desc":
      copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      break;
    case "review_count_desc":
      copy.sort(
        (a, b) => (b.review_count ?? 0) - (a.review_count ?? 0)
      );
      break;
    default: {
      // relevance: cluster-aware scoring = same signal used in Recommendations tab
      copy.sort((a, b) => scoreVenue(b, filters, profile) - scoreVenue(a, filters, profile));
      break;
    }
  }

  return copy;
}

export function scoreVenueForChat(
  venue: Venue,
  filters: Filters,
  profile: TasteProfile
): number {
  return scoreVenue(venue, filters, profile);
}

export function filterAndSortVenues(
  query: string,
  cuisines: string[],
  priceTiers: number[],
  dietaryTags: string[],
  minHealthScore: number,
  sortBy: string
): Venue[] {
  // Legacy wrapper for old API compatibility
  return filterVenues(
    {
      query,
      cuisine: cuisines[0] ?? "",
      diet: dietaryTags[0] ?? "",
      price_tier: priceTiers[0] ?? null,
      healthiness_min: minHealthScore,
    radius_km: 99999,
      rating_min: 0,
      review_count_min: 0,
      visit_status: "any",
      with_users: [],
      sort_by: sortBy,
    },
    {
      user_id: "demo_user",
      contexts: {
        default: {
          context_id: "default",
          ranked_list: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
      default_context: "default",
      following: [],
    }
  );
}
