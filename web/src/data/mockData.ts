import type { TasteProfile, Recommendation, Filters, RankStatus, Post, RankedItem } from "./types";
import {
  getAllVenues,
  computeDefaultVenues,
  computeUserLocation,
  haversine,
} from "./venues";

export const SAMPLE_USERS: { id: string; name: string }[] = [
  { id: "alex_12", name: "Alex M." },
  { id: "jordan_34", name: "Jordan T." },
  { id: "sam_88", name: "Sam K." },
  { id: "taylor_09", name: "Taylor R." },
  { id: "casey_22", name: "Casey L." },
  { id: "morgan_45", name: "Morgan B." },
  { id: "riley_17", name: "Riley S." },
  { id: "quinn_63", name: "Quinn J." },
  { id: "avery_29", name: "Avery P." },
  { id: "jules_51", name: "Jules D." },
  { id: "kenji_08", name: "Kenji Y." },
  { id: "priya_41", name: "Priya N." },
  { id: "luca_77", name: "Luca R." },
  { id: "sofia_33", name: "Sofia G." },
  { id: "hugo_19", name: "Hugo B." },
  { id: "mei_55", name: "Mei L." },
  { id: "omar_02", name: "Omar F." },
  { id: "inara_66", name: "Inara K." },
  { id: "dmitri_24", name: "Dmitri V." },
  { id: "yuki_11", name: "Yuki S." },
  { id: "eloise_38", name: "Eloise M." },
  { id: "rafael_49", name: "Rafael C." },
  { id: "zara_72", name: "Zara A." },
  { id: "nico_05", name: "Nico P." },
];

export const CLUSTER_PEERS = SAMPLE_USERS.slice(0, 6).map((u) => u.id);
export const FOLLOWED_USERS = SAMPLE_USERS.slice(0, 3).map((u) => u.id);

/* ─── Deterministic mock profile for any sample user ─── */

export function getSampleUserProfile(userId: string): TasteProfile | null {
  const pool = getAllVenues();
  if (pool.length === 0) return null;

  const seed = [...userId].reduce((s, c) => s + c.charCodeAt(0), 0);
  const count = 3 + (seed % 5);
  const selected: RankedItem[] = [];

  for (let i = 0; i < count + 5; i++) {
    if (selected.length >= count) break;
    const idx = (seed * 7 + i * 11 + (i * i) % 3 * 13) % pool.length;
    const venue = pool[idx];
    if (venue && !selected.find((r) => r.venue.id === venue.id)) {
      selected.push({
        venue,
        visited_at: new Date(2025, 0, 10 + i, 18, 0, 0).toISOString(),
        added_at: "2026-06-22T10:00:00+00:00",
        occasion_tag: (["solo", "date", "group", "business", "comfort"] as const)[(seed + i) % 5],
        is_classic: (seed + i) % 7 === 0,
        status: (["visited", "favourite", "regular", "want_to_try"] as const)[(seed + i) % 4],
      });
    }
  }

  return {
    user_id: userId,
    contexts: {
      default: {
        context_id: "default",
        ranked_list: selected,
        created_at: "2026-01-01T00:00:00+00:00",
        updated_at: "2026-01-01T00:00:00+00:00",
      },
    },
    default_context: "default",
    following: [],
  };
}

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
    following: [],
  };
}

/* ─── Seed posts (generated after venues load) ─── */

const SEED_QUOTES: string[] = [
  "The omakase here was unreal. Every course built on the last — the chūtoro melted like butter.",
  "Finally found a proper Neapolitan pizza in this city. Leopard-spotted crust, San Marzano tomatoes, buffalo mozzarella.",
  "This tiny Korean BBQ joint doesn't take reservations and the wait is always 40 mins. Worth it.",
  "Hidden vegan tasting menu. 10 courses, no repeats, all plant-based. Who knew cashew cream could do that?",
  "My new favourite lunch spot. The salmon bowl is exactly what I needed.",
  "The tonkatsu was so light it practically floated. Homemade sauce deserves its own cult.",
  "Ordered the chef's whim and got seven dishes I would never have picked. Loved all of them.",
  "Ramen broth simmered for 18 hours — you can taste every minute.",
  "Best steak I've had outside of Kobe. Marbling score off the charts.",
  "Late-night izakaya energy. Grilled everything, cold beer, no pretence.",
  "Sourdough pizza with burrata and nduja. Crunchy, gooey, spicy — the trifecta.",
  "Took a date here. The lighting is perfect, the wine list is smarter than I am, and the pasta is handmade.",
  "Fish so fresh it was still deciding if it wanted to be cooked.",
  "Curry that builds heat slowly — starts gentle, ends with a polite kick. Layered.",
  "Tempura vanishes on your tongue. Not heavy, not greasy — just golden air.",
  "The burger is a two-hander. Juice everywhere, no regrets.",
  "Dim sum cart service on weekends. Har gow with translucent wrappers — textbook.",
  "Tasting menu was a geography lesson: Hokkaido scallop, Kyushu wagyu, Okinawa pork.",
  "Walked in sceptical about plant-based sushi. Walked out a convert.",
  "Pho broth clarity is the real test. This one passes with honours.",
  "Gyoza bottoms are crispy lace. Top is soft. Filling is seasoned like a secret.",
  "The espresso martini here is dessert and coffee in one. Dangerous.",
  "Unagi glazed over charcoal. Smoky, sweet, fall-apart tender.",
  "Fried chicken so crispy it echoes. Kimchi slaw cuts the grease perfectly.",
];

export function buildSeedPosts(): Post[] {
  const venues = getAllVenues();
  if (venues.length === 0) return [];

  const posts: Post[] = [];
  const now = Date.now();

  for (let i = 0; i < SEED_QUOTES.length; i++) {
    const user = SAMPLE_USERS[i % SAMPLE_USERS.length];
    const venue = venues[i % venues.length];
    const minutesAgo = (i + 1) * 45 + Math.floor(Math.random() * 30);
    posts.push({
      id: `seed_${String(i + 1).padStart(3, "0")}`,
      author_id: user.id,
      author_name: user.name,
      text: SEED_QUOTES[i],
      venue_id: venue.id,
      venue_name: venue.name,
      image_url:
        i % 3 === 0
          ? venue.image_url ?? undefined
          : undefined,
      created_at: new Date(now - 1000 * 60 * minutesAgo).toISOString(),
    });
  }

  return posts;
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
    candidates = candidates.filter((v) => v.cuisines.includes(filters.cuisine));
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
  let friend: TasteProfile | null = null;
  let friendCuisines = new Set<string>();
  let friendName = "";
  if (filters.with_user) {
    friend = getSampleUserProfile(filters.with_user);
    if (friend) {
      const fCtx = friend.contexts[friend.default_context];
      fCtx?.ranked_list.forEach((r) => r.venue.cuisines.forEach((c) => friendCuisines.add(c)));
      friendName = SAMPLE_USERS.find((u) => u.id === filters.with_user)?.name ?? "Your friend";
    }
  }

  const scored = candidates.map((venue) => {
    let score = 0.45;
    const sharedCuisine = venue.cuisines.filter((c) => userCuisines.has(c)).length;
    score += Math.min(sharedCuisine * 0.18, 0.35);
    if (venue.health_score) score += venue.health_score * 0.1;
    if (venue.price_tier && filters.price_tier && venue.price_tier === filters.price_tier) score += 0.07;

    if (filters.with_user && friendCuisines.size > 0) {
      const friendShared = venue.cuisines.filter((c) => friendCuisines.has(c)).length;
      const mutual = venue.cuisines.filter((c) => userCuisines.has(c) && friendCuisines.has(c)).length;
      score += Math.min(friendShared * 0.08, 0.15);
      score += Math.min(mutual * 0.18, 0.30);
      const fCtx = friend?.contexts[friend.default_context];
      const fRank = fCtx?.ranked_list.findIndex((r) => r.venue.id === venue.id) ?? -1;
      if (fRank !== -1) score += 0.15 / (fRank + 1);
    }

    score = Math.min(score, 0.98);

    let explanation: string;
    if (filters.with_user && friendCuisines.size > 0) {
      const mutualCs = venue.cuisines.filter((c) => userCuisines.has(c) && friendCuisines.has(c));
      const fCtx = friend?.contexts[friend.default_context];
      const fRank = fCtx?.ranked_list.findIndex((r) => r.venue.id === venue.id) ?? -1;
      if (mutualCs.length > 0 && fRank !== -1) {
        explanation = `${friendName} ranked this #${fRank + 1} — both of you love ${mutualCs[0]}.`;
      } else if (mutualCs.length > 0) {
        explanation = `You and ${friendName} both love ${mutualCs[0]}. Strong mutual match.`;
      } else if (fRank !== -1) {
        explanation = `${friendName} placed this in their top ${fRank < 3 ? "3" : "10"}. You might like it as well.`;
      } else {
        explanation = `${friendName}'s taste overlaps with this place. Worth trying together.`;
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
