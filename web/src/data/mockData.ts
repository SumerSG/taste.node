import type { TasteProfile, Recommendation, Filters, RankStatus, Post, RankedItem, Venue } from "./types";
import {
  getAllVenues,
  computeDefaultVenues,
  computeUserLocation,
  haversine,
} from "./venues";
import { SAMPLE_USERS, GENERATED_POSTS } from "./generatedUsers";

/* ─── Sample users imported from generatedUsers.ts (100 accounts) ─── */

export { SAMPLE_USERS };

export const CLUSTER_PEERS = [
  "u001",
  "u002",
  "u003",
  "u004",
  "u005",
  "u006",
];
export const FOLLOWED_USERS = SAMPLE_USERS.slice(0, 3).map((u) => u.id);

/* ─── Deterministic random utilities ─── */

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state;
  };
}

function pick<T>(arr: T[], rnd: () => number): T {
  return arr[rnd() % arr.length];
}

function pickN<T>(arr: T[], n: number, rnd: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = rnd() % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

/* ─── Content pools ─── */

const REACTION_POOLS: Record<string, string[]> = {
  ラーメン: ["broth was deep and rich", "noodles had perfect bite", "chashu melted on the tongue", "late-night comfort bowl"],
  寿司: ["every piece showed restraint and precision", "itamae was a master", "wasabi was fresh-grated", "uni was from Hokkaido"],
  イタリアン: ["carbonara was textbook", "burrata was still warm inside", "pasta had that perfect al dente pull", "wine list was smarter than me"],
  中華料理: ["wok hei was loud and clear", "har gow wrappers were translucent", "mapo tofu numbed everything perfectly", "xiao long bao had that soup burst"],
  焼肉: ["meat was dry-aged beautifully", "smoke was just right", "sauce was house-made and complex", "marbling was off the charts"],
  居酒屋: ["izakaya energy was unmatched", "yakitori was charred just right", "atmosphere was loud and perfect", "everything grilled tasted like fire"],
  カフェ: ["latte art was gallery-worthy", "pastry case was dangerous", "third-wave coffee done right", "brunch menu was inventive"],
  カレー: ["spice built slowly — warm then honest", "roux was dark and nutty", "naan was blistered and pillowy", "complex layers in every bite"],
  創作料理: ["chef was playing with flavours I didn't know existed", "tasting menu was a geography lesson", "presentation was gallery-worthy", "every course surprised me"],
  鉄板焼き: ["showmanship matched the flavour", "beef was A5 and you could taste it", "garlic rice on the teppan was the sleeper hit", "flames made the whole room gasp"],
};

const GENERIC_REACTIONS = [
  "everything was on point", "can't wait to come back", "one of the best meals I've had this year",
  "staff was warm and genuinely knowledgeable", "came for the hype, stayed for the flavour",
  "my new favourite spot", "exactly what I needed", "memorable from start to finish",
  "price-to-quality ratio is outstanding", "left already planning the next visit",
];

const DISH_POOLS: Record<string, string[]> = {
  ラーメン: ["Tonkotsu Ramen", "Chashu", "Gyoza", "Beer"],
  寿司: ["Omakase", "Chūtoro", "Uni", "Sake"],
  イタリアン: ["Carbonara", "Burrata", "Ossobuco", "Tiramisu"],
  中華料理: ["Mapo Tofu", "Har Gow", "Xiao Long Bao", "Peking Duck"],
  焼肉: ["A5 Wagyu", "Kalbi", "Tongue", "Garlic Rice"],
  居酒屋: ["Yakitori Platter", "Edamame", "Karaage", "Highball"],
  カフェ: ["Avocado Toast", "Flat White", "Croissant", "Granola Bowl"],
  カレー: ["Tonkatsu Curry", "Naan", "Beef Vindaloo", "Mango Lassi"],
  創作料理: ["Tasting Menu", "Foie Gras", "Lobster Bisque", "Wine Pairing"],
  鉄板焼き: ["Wagyu Steak", "Garlic Fried Rice", "Seared Scallops", "Japanese Whisky"],
  シーフード: ["Grilled Lobster", "Oyster Platter", "Grilled Fish", "White Wine"],
  パスタ: ["Aglio e Olio", "Bucatini", "Cacio e Pepe", "Chianti"],
  鍋: ["Shabu-Shabu Set", "Vegetables", "Udon", "Ponzu"],
  しゃぶしゃぶ: ["Premium Beef", "Vegetable Platter", "Dipping Sauces", "Rice"],
  ステーキ: ["Bone-in Ribeye", "Peppercorn Sauce", "Frites", "Cabernet"],
  韓国料理: ["Galbi", "Kimchi Stew", "Banchan Spread", "Soju"],
  海鮮: ["Sashimi Platter", "Grilled Squid", "Crab", "Sake"],
  焼き鳥: ["Negima", "Tsukune", "Tebasaki", "Yuzu Highball"],
  とんかつ: ["Rosukatsu", "Cabbage Salad", "Miso Soup", "Rice"],
  日本料理: ["Kaiseki Course", "Tempura", "Miso Soup", "Matcha"],
};

const OCCASIONS: RankedItem["occasion_tag"][] = ["solo", "date", "group", "business", "comfort"];
const MEALS: ("lunch" | "dinner" | undefined)[] = ["lunch", "dinner", undefined];

function getReaction(venue: Venue, rnd: () => number): string {
  for (const cuisine of venue.cuisines) {
    const pool = REACTION_POOLS[cuisine];
    if (pool && pool.length) return `"${pick(pool, rnd)}"`;
  }
  return `"${pick(GENERIC_REACTIONS, rnd)}"`;
}

function getDishes(venue: Venue, rnd: () => number): string[] | undefined {
  for (const cuisine of venue.cuisines) {
    const pool = DISH_POOLS[cuisine];
    if (pool && pool.length) {
      const n = 2 + (rnd() % 2);
      return pickN(pool, n, rnd);
    }
  }
  return undefined;
}

function getPersonalRating(rnd: () => number): number | undefined {
  const r = rnd() % 100;
  if (r < 8) return undefined;
  if (r < 25) return 3;
  if (r < 50) return 4;
  if (r < 80) return 5;
  return rnd() % 2 === 0 ? 4 : 5;
}

/* ─── Deterministic profile generator ─── */

const _profileCache = new Map<string, TasteProfile>();

export function getSampleUserProfile(userId: string): TasteProfile | null {
  if (_profileCache.has(userId)) return _profileCache.get(userId)!;

  const pool = getAllVenues();
  if (pool.length === 0) return null;

  const seed = hashString(userId);
  const rnd = seededRandom(seed);
  const count = 8 + (rnd() % 7); // 8 to 14 venues
  const selected: RankedItem[] = [];

  // Deterministic shuffle
  const indices: number[] = [];
  let idx = seed % pool.length;
  for (let i = 0; i < pool.length; i++) {
    idx = (idx * 7 + i * 13 + 31) % pool.length;
    if (!indices.includes(idx)) indices.push(idx);
  }

  for (let i = 0; i < indices.length && selected.length < count; i++) {
    const venue = pool[indices[i]];
    if (!selected.find((r) => r.venue.id === venue.id)) {
      const status = STATUS_WEIGHTS[rnd() % STATUS_WEIGHTS.length];
      selected.push({
        venue,
        visited_at: offsetDate(rnd(), -90 - (rnd() % 180)),
        added_at: "2026-06-22T10:00:00+00:00",
        occasion_tag: OCCASIONS[rnd() % OCCASIONS.length],
        is_classic: (rnd() % 100) < 15,
        status,
        personal_rating: getPersonalRating(rnd),
        reaction: status === "favourite" || status === "visited" ? getReaction(venue, rnd) : undefined,
        meal_type: MEALS[rnd() % MEALS.length],
        dishes: status !== "wishlist" ? getDishes(venue, rnd) : undefined,
        rank: selected.length + 1,
      });
    }
  }

  // Build following list based on cuisine affinity
  const myCuisines = new Set<string>();
  selected.forEach((r) => r.venue.cuisines.forEach((c) => myCuisines.add(c)));

  const following: string[] = [];
  for (const u of SAMPLE_USERS) {
    if (u.id === userId) continue;
    const affinity = Math.abs(hashString(u.id) % 100);
    // 15-30% chance of following another user, weighted by taste overlap via hash
    if (affinity < 25) following.push(u.id);
  }

  // Build extra contexts (personal lists)
  const contexts: Record<string, TasteProfile["contexts"][string]> = {
    default: {
      context_id: "default",
      ranked_list: selected.filter((_, i) => i < Math.ceil(selected.length * 0.7)),
      created_at: "2026-01-01T00:00:00+00:00",
      updated_at: "2026-01-01T00:00:00+00:00",
    },
  };

  // Add 1-2 extra contexts for ~40% of users
  if ((rnd() % 100) < 40) {
    const extraNames = ["date_nights", "solo_spots", "group_dinners", "lunch_hunts", "cheap_eats", "splurge_worthy"];
    const ctxName = extraNames[rnd() % extraNames.length];
    if (!contexts[ctxName]) {
      const subset = selected.filter((_, i) => i % 3 === 0).slice(0, 5 + (rnd() % 4));
      contexts[ctxName] = {
        context_id: ctxName,
        ranked_list: subset,
        created_at: "2026-02-01T00:00:00+00:00",
        updated_at: "2026-02-01T00:00:00+00:00",
      };
    }
  }

  const profile: TasteProfile = {
    user_id: userId,
    contexts,
    default_context: "default",
    following,
  };

  _profileCache.set(userId, profile);
  return profile;
}

const STATUS_WEIGHTS: RankStatus[] = [
  "favourite", "favourite", "favourite",
  "favourite", "favourite",
  "visited", "visited", "visited", "visited", "visited", "visited",
  "wishlist", "wishlist",
];

function offsetDate(rndVal: number, daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(12 + (rndVal % 12), rndVal % 60, 0, 0);
  return d.toISOString();
}

/* ─── Post generation ─── */

export function buildSeedPosts(): Post[] {
  // Return the pre-generated realistic posts from generatedUsers.ts
  return [...GENERATED_POSTS].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/* ─── Top cuisines ─── */

export const TOP_CUISINES = [
  "居酒屋", "海鮮", "焼き鳥", "焼肉", "日本料理", "イタリアン",
  "中華料理", "寿司", "韓国料理", "ステーキ", "パスタ", "鍋",
  "カフェ", "鉄板焼き", "しゃぶしゃぶ", "創作料理",
];

/* ─── Default profile (generated after venues load) ─── */

export function getDefaultProfile(): TasteProfile {
  const dv = computeDefaultVenues();

  const defaultItems: RankedItem[] = [0, 1, 2, 3, 4].map((i) => ({
    venue: dv[i] ?? ({} as Venue), // placeholder for tests where venues aren't loaded
    visited_at: new Date(2025, 0 + i, 10, 18, 0, 0).toISOString(),
    added_at: "2026-06-22T10:00:00+00:00",
    occasion_tag: (i === 1 ? "date" : i === 2 ? "group" : i === 4 ? "comfort" : "solo"),
    is_classic: i === 1,
    status: i < 2 ? "favourite" : i === 2 ? "visited" : i === 3 ? "visited" : "visited" as RankStatus,
    personal_rating: i < 2 ? 5 : i === 2 ? 4 : undefined,
    reaction: i === 1 ? "\"The best date night spot in the city.\"" : i === 0 ? "\"My go-to. Always consistent.\"" : undefined,
    meal_type: i === 2 ? "lunch" : i < 2 ? "dinner" : undefined,
    dishes: i === 1 ? ["Omakase", "Sake"]
      : i === 0 ? ["Chef's Tasting", "Wine Pairing"]
        : undefined,
    rank: i + 1,
  }));

  // Add a second context
  const cheapEatsItem: RankedItem[] = dv.slice(1, 4).map((venue, i) => ({
    venue,
    visited_at: new Date(2025, 3 + i, 15, 12, 0, 0).toISOString(),
    added_at: "2026-06-22T10:00:00+00:00",
    occasion_tag: "solo",
    is_classic: false,
    status: "visited" as RankStatus,
    rank: i + 1,
  }));

  // Following: pick users who have similar taste (first 6 + a few others)
  const following = [
    ...FOLLOWED_USERS,
    ...SAMPLE_USERS.slice(6, 12).map((u) => u.id),
    ...SAMPLE_USERS.slice(24, 30).map((u) => u.id),
  ].filter((id, i, arr) => arr.indexOf(id) === i);

  return {
    user_id: "demo_user",
    contexts: {
      default: {
        context_id: "default",
        ranked_list: defaultItems,
        created_at: "2026-06-22T10:00:00+00:00",
        updated_at: "2026-06-22T10:00:00+00:00",
      },
      lunch_hunts: {
        context_id: "lunch_hunts",
        ranked_list: cheapEatsItem,
        created_at: "2026-03-01T00:00:00+00:00",
        updated_at: "2026-03-01T00:00:00+00:00",
      },
    },
    default_context: "default",
    following,
  };
}

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
    const q = filters.cuisine.toLowerCase();
    candidates = candidates.filter((v) =>
      v.cuisines.some((c) => c.toLowerCase().includes(q))
    );
  }
  if (filters.diet) {
    const dietMap: Record<string, string[]> = {
      meat: ["meat"],
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

  /* ─── mutual friend context ─── */
  const friendIds = filters.with_users ?? [];
  const friends: TasteProfile[] = [];
  const friendCuisines = new Set<string>();
  const friendNames: string[] = [];
  for (const fid of friendIds) {
    const f = getSampleUserProfile(fid);
    if (f) {
      friends.push(f);
      const fCtx = f.contexts[f.default_context];
      fCtx?.ranked_list.forEach((r) => r.venue.cuisines.forEach((c) => friendCuisines.add(c)));
      const name = SAMPLE_USERS.find((u) => u.id === fid)?.name ?? "Your friend";
      friendNames.push(name);
    }
  }

  const scored = candidates.map((venue) => {
    let score = 0.45;
    const sharedCuisine = venue.cuisines.filter((c) => userCuisines.has(c)).length;
    score += Math.min(sharedCuisine * 0.18, 0.35);
    if (venue.health_score) score += venue.health_score * 0.1;
    if (venue.price_tier && filters.price_tier && venue.price_tier === filters.price_tier) score += 0.07;

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

    score = Math.min(score, 0.98);

    let explanation: string;
    if (friendCuisines.size > 0) {
      const mutualCs = venue.cuisines.filter((c) => userCuisines.has(c) && friendCuisines.has(c));

      let bestFriendRank = -1;
      let bestFriendName = friendNames[0] ?? "Your friend";
      for (let i = 0; i < friends.length; i++) {
        const fCtx = friends[i].contexts[friends[i].default_context];
        const fRank = fCtx?.ranked_list.findIndex((r) => r.venue.id === venue.id) ?? -1;
        if (fRank !== -1 && (bestFriendRank === -1 || fRank < bestFriendRank)) {
          bestFriendRank = fRank;
          bestFriendName = friendNames[i] ?? "Your friend";
        }
      }

      const formatFriendNames = (names: string[]) => {
        if (names.length === 0) return "";
        if (names.length === 1) return names[0];
        if (names.length === 2) return `${names[0]} and ${names[1]}`;
        return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
      };
      const allFriendNames = formatFriendNames(friendNames);

      if (mutualCs.length > 0 && bestFriendRank !== -1) {
        explanation = `${bestFriendName} ranked this #${bestFriendRank + 1} — both of you love ${mutualCs[0]}.`;
      } else if (mutualCs.length > 0) {
        explanation = `You and ${allFriendNames} both love ${mutualCs[0]}. Strong mutual match.`;
      } else if (bestFriendRank !== -1) {
        explanation = `${bestFriendName} placed this in their top ${bestFriendRank < 3 ? "3" : "10"}. You might like it as well.`;
      } else {
        explanation = `${friendNames[0] ?? "Your friend"}'s taste overlaps with this place. Worth trying together.`;
      }
    } else {
      const refVenue = context?.ranked_list[0]?.venue.name ?? "a similar spot";
      explanation = `${CLUSTER_PEERS.length} people in your taste cluster ranked this in their top 3 after visiting ${refVenue}.`;
    }
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
    wishlist: "Wishlist",
    visited: "Visited",
    favourite: "Favourite",
    not_for_me: "Not for me",
  };
  return map[s ?? "visited"] ?? "Visited";
}

export function statusDescription(s: RankStatus | undefined): string {
  const map: Record<string, string> = {
    wishlist: "Haven't been yet. Save for later.",
    visited: "Been there. It was okay.",
    favourite: "Loved it. You'd recommend it.",
    not_for_me: "Didn't enjoy it. You'd skip it.",
  };
  return map[s ?? "visited"] ?? "";
}

export function statusColor(s: RankStatus | undefined): string {
  const map: Record<string, string> = {
    wishlist: "bg-amber-50 text-amber-700 ring-amber-200",
    visited: "bg-stone-100 text-stone-600 ring-stone-200",
    favourite: "bg-brand-50 text-brand-700 ring-brand-200",
    not_for_me: "bg-gray-100 text-gray-500 ring-gray-200",
  };
  return map[s ?? "visited"] ?? map.visited;
}

export function parseListSentiment(name: string): number {
  const lower = name.toLowerCase();
  const positive = [
    "fav", "best", "love", "good", "great", "amazing", "top", "recommend",
    "like", "enjoy", "top pick", "essential", "must", "perfect", "wonderful",
  ];
  const negative = [
    "bad", "worst", "never", "avoid", "hate", "disappoint", "terrible",
    "awful", "regret", "nope", "skip", "pass", "avoid", "meh", "overrated",
    "wouldnt", "wouldn't", "dont go", "don't go",
  ];
  const posCount = positive.filter((w) => lower.includes(w)).length;
  const negCount = negative.filter((w) => lower.includes(w)).length;
  if (posCount > negCount) return 1;
  if (negCount > posCount) return -1;
  return 0;
}
