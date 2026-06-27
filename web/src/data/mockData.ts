import type { TasteProfile, Recommendation, Filters, RankStatus, Post, RankedItem, Venue } from "./types";
import {
  getAllVenues,
  computeDefaultVenues,
  computeUserLocation,
  haversine,
} from "./venues";

/* ─── Sample users (120 accounts) ─── */

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
  // Expanded set
  { id: "haruto_91", name: "Haruto T." },
  { id: "sakura_27", name: "Sakura W." },
  { id: "wei_63", name: "Wei C." },
  { id: "minji_48", name: "Minji K." },
  { id: "diego_19", name: "Diego R." },
  { id: "kaia_76", name: "Kaia N." },
  { id: "amir_54", name: "Amir H." },
  { id: "chloe_08", name: "Chloe B." },
  { id: "kaz_33", name: "Kaz O." },
  { id: "layla_90", name: "Layla A." },
  { id: "ethan_11", name: "Ethan J." },
  { id: "nuwa_67", name: "Nuwa L." },
  { id: "igor_42", name: "Igor S." },
  { id: "freya_83", name: "Freya O." },
  { id: "ren_05", name: "Ren T." },
  { id: "anika_29", name: "Anika P." },
  { id: "soren_71", name: "Soren K." },
  { id: "mira_14", name: "Mira D." },
  { id: "tomas_58", name: "Tomas L." },
  { id: "aya_96", name: "Aya F." },
  { id: "vik_38", name: "Vik B." },
  { id: "esme_69", name: "Esme C." },
  { id: "jin_02", name: "Jin H." },
  { id: "cleo_45", name: "Cleo R." },
  { id: "bogdan_87", name: "Bogdan M." },
  { id: "lina_21", name: "Lina Z." },
  { id: "naoki_73", name: "Naoki I." },
  { id: "leo_10", name: "Leo S." },
  { id: "indra_55", name: "Indra K." },
  { id: "faye_92", name: "Faye N." },
  { id: "raul_36", name: "Raul G." },
  { id: "momo_80", name: "Momo Y." },
  { id: "cyrus_07", name: "Cyrus E." },
  { id: "asha_62", name: "Asha B." },
  { id: "yuuto_28", name: "Yuuto S." },
  { id: "nadia_50", name: "Nadia H." },
  { id: "cormac_15", name: "Cormac W." },
  { id: "mika_93", name: "Mika L." },
  { id: "teo_39", name: "Teo R." },
  { id: "vera_84", name: "Vera K." },
  { id: "xiang_06", name: "Xiang W." },
  { id: "ilse_61", name: "Ilse D." },
  { id: "noa_74", name: "Noa C." },
  { id: "tariq_32", name: "Tariq A." },
  { id: "suki_97", name: "Suki T." },
  { id: "aldo_18", name: "Aldo M." },
  { id: "rona_53", name: "Rona S." },
  { id: "kito_85", name: "Kito N." },
  { id: "isla_09", name: "Isla P." },
  { id: "farhan_46", name: "Farhan J." },
  { id: "umi_79", name: "Umi H." },
  { id: "bran_03", name: "Bran W." },
  { id: "solana_68", name: "Solana C." },
  { id: "taro_25", name: "Taro F." },
  { id: "anya_94", name: "Anya T." },
  { id: "joao_56", name: "Joao R." },
  { id: "sai_81", name: "Sai P." },
  { id: "keira_40", name: "Keira M." },
  { id: "oskar_12", name: "Oskar L." },
  { id: "reina_75", name: "Reina S." },
  { id: "zian_30", name: "Zian X." },
  { id: "calla_98", name: "Calla N." },
  { id: "dante_64", name: "Dante G." },
  { id: "kira_01", name: "Kira H." },
  { id: "ludo_44", name: "Ludo B." },
  { id: "mana_89", name: "Mana K." },
  { id: "elio_13", name: "Elio P." },
  { id: "yuna_77", name: "Yuna L." },
  { id: "fizan_35", name: "Fizan A." },
  { id: "tove_99", name: "Tove E." },
  { id: "ryo_57", name: "Ryo I." },
  { id: "azesha_22", name: "Azesha N." },
  { id: "piotr_86", name: "Piotr M." },
  { id: "sena_70", name: "Sena O." },
  { id: "henri_04", name: "Henri V." },
  { id: "marin_47", name: "Marin W." },
  { id: "khaled_82", name: "Khaled F." },
  { id: "romy_20", name: "Romy S." },
  { id: "tae_60", name: "Tae H." },
  { id: "ebele_95", name: "Ebele J." },
  { id: "arkady_37", name: "Arkady S." },
  { id: "nori_78", name: "Nori K." },
  { id: "omori_52", name: "Omori T." },
  { id: "leila_16", name: "Leila B." },
  { id: "henning_88", name: "Henning P." },
  { id: "suri_23", name: "Suri R." },
  { id: "jari_41", name: "Jari K." },
  { id: "stella_31", name: "Stella M." },
  { id: "jasper_65", name: "Jasper N." },
  { id: "xiu_72", name: "Xiu W." },
  { id: "filo_59", name: "Filo G." },
  { id: "zelda_100", name: "Zelda C." },
  { id: "benja_49", name: "Benja L." },
  { id: "ami_66", name: "Ami F." },
  { id: "dario_26", name: "Dario R." },
];

export const CLUSTER_PEERS = SAMPLE_USERS.slice(0, 6).map((u) => u.id);
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
        reaction: status === "favourite" || status === "regular" ? getReaction(venue, rnd) : undefined,
        meal_type: MEALS[rnd() % MEALS.length],
        dishes: status !== "want_to_try" ? getDishes(venue, rnd) : undefined,
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
  "regular", "regular",
  "visited", "visited", "visited", "visited", "visited", "visited",
  "want_to_try", "want_to_try",
];

function offsetDate(rndVal: number, daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(12 + (rndVal % 12), rndVal % 60, 0, 0);
  return d.toISOString();
}

/* ─── Post generation ─── */

const _postsCache: Post[] | null = null;
const _postsGenerated = false;

function buildPost(
  userId: string,
  userName: string,
  venue: Venue,
  rnd: () => number,
  minAgo: number,
  postIdx: number,
  baseNow: number
): Post {
  const templates = [
    () => {
      const dish = pick(venue.cuisines, rnd);
      const adj = pick(["incredible", "unexpected", "proper", "memorable", "next-level"], rnd);
      return `Just had the ${dish} at ${venue.name}. ${adj} meal from start to finish.`;
    },
    () => {
      const companion = pick(["a friend", "my date", "the team", "a regular here"], rnd);
      return `Took ${companion} to ${venue.name} for ${pick(["lunch", "dinner"], rnd)}. They understood the hype immediately.`;
    },
    () => `Discovered ${venue.name} through a post here and it lived up to every word. ${getReaction(venue, rnd)}`,
    () => {
      const count = 2 + (rnd() % 3);
      return `${count}nd visit to ${venue.name} in as many months. Still finding new things to love on the menu.`;
    },
    () => `When people ask for a ${pick(venue.cuisines, rnd)} rec, this is the place I send them to. ${venue.name}.`,
    () => `Late night at ${venue.name}. ${getReaction(venue, rnd)}. Already planning round two.`,
    () => `The ${pick(venue.cuisines, rnd)} here doesn't get talked about enough. ${venue.name} deserves more credit.`,
    () => `Came back to ${venue.name} for the ${pick(["tasting menu", "chef's whim", "weekend special"], rnd)}. Did not disappoint.`,
    () => `${getReaction(venue, rnd)}. ${venue.name} keeps getting better every time.`,
    () => `New favourite in the city. ${venue.name}. ${getReaction(venue, rnd)}`,
    () => `Solo meal at ${venue.name}. ${getReaction(venue, rnd)}. Sometimes the best company is a great plate of food.`,
    () => `Group dinner at ${venue.name} — ${3 + (rnd() % 5)} of us and every single person left happy. Rare magic.`,
    () => `${venue.name} doesn't look like much from the outside. Inside, it's one of the best ${pick(venue.cuisines, rnd)} spots I've found.`,
  ];

  // Some posts get a follow-up sentence
  let text = templates[postIdx % templates.length]();
  if ((rnd() % 100) < 35 && !text.endsWith(".")) text += ".";

  const hasImage = (rnd() % 100) < 45;
  const createdAt = new Date(baseNow - minAgo * 60_000).toISOString();

  return {
    id: `seed_${userId}_${String(postIdx).padStart(3, "0")}`,
    author_id: userId,
    author_name: userName,
    text,
    venue_id: venue.id,
    venue_name: venue.name,
    image_url: hasImage ? (venue.image_url ?? undefined) : undefined,
    created_at: createdAt,
  };
}

export function buildSeedPosts(): Post[] {
  if (_postsGenerated && _postsCache) return _postsCache;

  const venues = getAllVenues();
  if (venues.length === 0) return [];

  const posts: Post[] = [];
  const now = Date.now();
  let globalIdx = 0;

  // Generate 3-5 posts per user
  for (const user of SAMPLE_USERS) {
    const seed = hashString(user.id);
    const rnd = seededRandom(seed + 999);
    const postCount = 3 + (rnd() % 3);

    for (let i = 0; i < postCount; i++) {
      const venueIdx = (seed + i * 7 + globalIdx * 13) % venues.length;
      const venue = venues[venueIdx];
      if (!venue) continue;
      // Spread across 0-21 days ago with bias toward recent
      const rawDays = Math.sqrt(rnd() % 441); // bias recent
      const minutesAgo = Math.max(5, Math.round(rawDays * 24 * 60));
      posts.push(buildPost(user.id, user.name, venue, rnd, minutesAgo, i, now));
      globalIdx++;
    }
  }

  // Sort newest first
  posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  Object.freeze(posts);
  return posts;
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
