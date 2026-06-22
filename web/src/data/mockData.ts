import type { Venue, TasteProfile, Recommendation, Filters } from "./types";

const MOCK_VENUES: Venue[] = [
  { id: "ramen_ya", name: "Ramen-Ya", location: { lat: 40.728, lng: -73.994 }, cuisines: ["Japanese"], dietary_tags: [], price_tier: 2, health_score: 0.6, source: "synthetic" },
  { id: "sushi_zen", name: "Sushi-Zen", location: { lat: 40.741, lng: -73.989 }, cuisines: ["Japanese"], dietary_tags: ["pescatarian"], price_tier: 3, health_score: 0.75, source: "synthetic" },
  { id: "burger_01", name: "Burger-No1", location: { lat: 40.705, lng: -74.013 }, cuisines: ["American"], dietary_tags: [], price_tier: 2, health_score: 0.4, source: "synthetic" },
  { id: "pizza_nap", name: "Pizza-Napoli", location: { lat: 40.72, lng: -74.005 }, cuisines: ["Italian"], dietary_tags: ["vegetarian"], price_tier: 2, health_score: 0.55, source: "synthetic" },
  { id: "taco_01", name: "Tacos-Locos", location: { lat: 40.758, lng: -73.985 }, cuisines: ["Mexican"], dietary_tags: [], price_tier: 1, health_score: 0.5, source: "synthetic" },
  { id: "borgia", name: "Borgia", location: { lat: 40.732, lng: -73.998 }, cuisines: ["Italian"], dietary_tags: ["vegetarian"], price_tier: 3, health_score: 0.7, source: "synthetic" },
  { id: "golden_bistro", name: "Golden Bistro", location: { lat: 40.71, lng: -74.01 }, cuisines: ["French"], dietary_tags: ["pescatarian"], price_tier: 4, health_score: 0.8, source: "synthetic" },
  { id: "green_bowl", name: "Green Bowl", location: { lat: 40.745, lng: -73.98 }, cuisines: ["Salad", "Vegetarian"], dietary_tags: ["vegan", "gluten-free"], price_tier: 2, health_score: 0.95, source: "synthetic" },
  { id: "spice_route", name: "Spice Route", location: { lat: 40.725, lng: -73.99 }, cuisines: ["Indian"], dietary_tags: ["vegetarian"], price_tier: 2, health_score: 0.65, source: "synthetic" },
  { id: "nordic_fish", name: "Nordic Fish", location: { lat: 40.735, lng: -74.0 }, cuisines: ["Nordic", "Seafood"], dietary_tags: ["pescatarian"], price_tier: 3, health_score: 0.72, source: "synthetic" },
  { id: "coppa", name: "Coppa", location: { lat: 40.738, lng: -73.996 }, cuisines: ["Italian"], dietary_tags: [], price_tier: 3, health_score: 0.68, source: "synthetic" },
  { id: "bao_haus", name: "Bao Haus", location: { lat: 40.718, lng: -73.987 }, cuisines: ["Taiwanese"], dietary_tags: [], price_tier: 1, health_score: 0.5, source: "synthetic" },
  { id: "falafel_king", name: "Falafel King", location: { lat: 40.752, lng: -73.977 }, cuisines: ["Middle Eastern"], dietary_tags: ["vegan", "vegetarian"], price_tier: 1, health_score: 0.78, source: "synthetic" },
  { id: "steak_house_7", name: "Steak House 7", location: { lat: 40.761, lng: -73.98 }, cuisines: ["Steakhouse"], dietary_tags: [], price_tier: 4, health_score: 0.35, source: "synthetic" },
  { id: "pho_pasteur", name: "Pho Pasteur", location: { lat: 40.718, lng: -73.995 }, cuisines: ["Vietnamese"], dietary_tags: [], price_tier: 1, health_score: 0.6, source: "synthetic" },
  { id: "tandoori_flame", name: "Tandoori Flame", location: { lat: 40.74, lng: -73.985 }, cuisines: ["Indian"], dietary_tags: [], price_tier: 2, health_score: 0.58, source: "synthetic" },
  { id: "el_jefe", name: "El Jefe", location: { lat: 40.708, lng: -74.006 }, cuisines: ["Mexican"], dietary_tags: [], price_tier: 2, health_score: 0.52, source: "synthetic" },
  { id: "pastry_lab", name: "Pastry Lab", location: { lat: 40.73, lng: -73.991 }, cuisines: ["Bakery", "French"], dietary_tags: ["vegetarian"], price_tier: 2, health_score: 0.45, source: "synthetic" },
  { id: "korean_bbq_house", name: "Korean BBQ House", location: { lat: 40.747, lng: -73.986 }, cuisines: ["Korean"], dietary_tags: [], price_tier: 3, health_score: 0.4, source: "synthetic" },
  { id: "the_salmon_bar", name: "The Salmon Bar", location: { lat: 40.739, lng: -74.002 }, cuisines: ["Nordic", "Seafood"], dietary_tags: ["pescatarian"], price_tier: 3, health_score: 0.8, source: "synthetic" },
  { id: "molcajete", name: "Molcajete", location: { lat: 40.715, lng: -73.992 }, cuisines: ["Mexican"], dietary_tags: ["gluten-free"], price_tier: 2, health_score: 0.62, source: "synthetic" },
  { id: "umami_burger", name: "Umami Burger", location: { lat: 40.722, lng: -73.988 }, cuisines: ["American"], dietary_tags: [], price_tier: 2, health_score: 0.42, source: "synthetic" },
  { id: "roots_cafe", name: "Roots Cafe", location: { lat: 40.744, lng: -73.982 }, cuisines: ["Vegetarian", "Vegan"], dietary_tags: ["vegan", "gluten-free"], price_tier: 2, health_score: 0.92, source: "synthetic" },
  { id: "coq_au_vin", name: "Coq au Vin", location: { lat: 40.728, lng: -74.003 }, cuisines: ["French"], dietary_tags: [], price_tier: 3, health_score: 0.55, source: "synthetic" },
  { id: "donburi_den", name: "Donburi Den", location: { lat: 40.733, lng: -73.994 }, cuisines: ["Japanese"], dietary_tags: [], price_tier: 1, health_score: 0.65, source: "synthetic" },
  { id: "carbonara_club", name: "Carbonara Club", location: { lat: 40.721, lng: -73.997 }, cuisines: ["Italian"], dietary_tags: [], price_tier: 2, health_score: 0.48, source: "synthetic" },
  { id: "seoul_kitchen", name: "Seoul Kitchen", location: { lat: 40.749, lng: -73.988 }, cuisines: ["Korean"], dietary_tags: [], price_tier: 2, health_score: 0.5, source: "synthetic" },
  { id: "shawarma_spot", name: "Shawarma Spot", location: { lat: 40.736, lng: -73.981 }, cuisines: ["Middle Eastern"], dietary_tags: [], price_tier: 1, health_score: 0.58, source: "synthetic" },
  { id: "oyster_bay", name: "Oyster Bay", location: { lat: 40.74, lng: -74.01 }, cuisines: ["Seafood"], dietary_tags: ["pescatarian"], price_tier: 3, health_score: 0.7, source: "synthetic" },
];

const CLUSTER_PEERS = ["alex_12", "jordan_34", "sam_88", "taylor_09", "casey_22", "morgan_45"];

export const ALL_CUISINES: string[] = Array.from(new Set(MOCK_VENUES.flatMap((v) => v.cuisines))).sort();
export const ALL_VENUES = MOCK_VENUES;

export const DEFAULT_VENUES = [MOCK_VENUES[0], MOCK_VENUES[1], MOCK_VENUES[2], MOCK_VENUES[3], MOCK_VENUES[4]];

export const DEFAULT_PROFILE: TasteProfile = {
  user_id: "demo_user",
  contexts: {
    default: {
      context_id: "default",
      ranked_list: [
        { venue: MOCK_VENUES[0], visited_at: "2025-01-10T18:00:00+00:00", added_at: "2026-06-22T10:00:00+00:00", occasion_tag: "solo", is_classic: false },
        { venue: MOCK_VENUES[1], visited_at: "2025-02-14T19:00:00+00:00", added_at: "2026-06-22T10:00:00+00:00", occasion_tag: "date", is_classic: true },
        { venue: MOCK_VENUES[2], visited_at: "2025-03-01T12:00:00+00:00", added_at: "2026-06-22T10:00:00+00:00", occasion_tag: "group", is_classic: false },
        { venue: MOCK_VENUES[3], visited_at: "2025-04-20T19:30:00+00:00", added_at: "2026-06-22T10:00:00+00:00", occasion_tag: "date", is_classic: false },
        { venue: MOCK_VENUES[4], visited_at: "2025-05-15T13:00:00+00:00", added_at: "2026-06-22T10:00:00+00:00", occasion_tag: "comfort", is_classic: false },
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
  const userLoc = { lat: 40.728, lng: -73.994 };
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
    let score = 0.5;
    const sharedCuisine = venue.cuisines.filter((c) => userCuisines.has(c)).length;
    score += Math.min(sharedCuisine * 0.15, 0.3);
    if (venue.health_score) score += venue.health_score * 0.08;
    if (venue.price_tier && filters.price_tier && venue.price_tier === filters.price_tier) score += 0.07;
    score = Math.min(score, 0.98);
    const refVenue = context?.ranked_list[0]?.venue.name ?? "a similar spot";
    const explanation = `${CLUSTER_PEERS.length} people in your taste cluster ranked this in their top 3 after visiting ${refVenue}.`;
    return { venue, score: Math.round(score * 100) / 100, explanation, context_id: profile.default_context };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, 12);
}
