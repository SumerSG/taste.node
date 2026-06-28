import type { Filters } from "../data/types";
import { SAMPLE_USERS } from "../data/mockData";

export type FilterOp =
  | { type: "set"; key: keyof Filters; value: any; label: string; icon: string }
  | { type: "clear"; key: keyof Filters; label: string; icon: string };

export interface FilterDiff {
  ops: FilterOp[];
  nextFilters: Partial<Filters>;
  confidence: number; // 0–1
}

/* ─── icon + label helpers ─── */
function cuisineIcon(c: string): string {
  const map: Record<string, string> = {
    日本料理: "🍱", 居酒屋: "🏮", 焼き鳥: "🍢", 焼肉: "🥓",
    ステーキ: "🥩", 鉄板焼き: "🍳", ラーメン: "🍜", 寿司: "🍣",
    海鮮: "🦐", 鍋: "🍲", しゃぶしゃぶ: "🍲", とんかつ: "🍖",
    イタリアン: "🍝", パスタ: "🍝", ピザ: "🍕",
    中華料理: "🥡", 韓国料理: "🍲", 創作料理: "🎨",
    カフェ: "☕", カレー: "🍛", インド料理: "🍛",
    タイ料理: "🍜", ベトナム料理: "🍜", 墨西哥料理: "🌮",
    スペイン料理: "🍤", アメリカ料理: "🍔", サラダ: "🥗",
    ベジタリアン: "🌿",
  };
  return map[c] || "🍽️";
}

function priceLabel(t: number | null): string {
  if (t === 1) return "$";
  if (t === 2) return "$$";
  if (t === 3) return "$$$";
  if (t === 4) return "$$$$";
  return "Any price";
}

function dietLabel(d: string): string {
  const map: Record<string, string> = {
    vegan: "Vegan",
    veg: "Vegetarian",
    fish: "Pescatarian",
    meat: "Meat-forward",
    "gluten-free": "Gluten-free",
  };
  return map[d] || d;
}

/* ─── Intent tokens ─── */

interface RawIntent {
  cuisines: string[];
  diet?: string;
  priceTier?: number;
  priceDirection?: "up" | "down" | "any";
  healthDirection?: "up" | "down" | "clear";
  healthLevel?: number;
  radiusKm?: number;
  ratingMin?: number;
  queryTokens: string[];
  withUsers: string[];
  clearAll: boolean;
  friendMentions: boolean;
}

function extractIntent(text: string): RawIntent {
  const intent: RawIntent = {
    cuisines: [],
    queryTokens: [],
    withUsers: [],
    clearAll: false,
    friendMentions: false,
  };

  const CUISINE_MAP: [string, string][] = [
    ["japanese", "日本料理"], ["washoku", "日本料理"], ["traditional japanese", "日本料理"],
    ["izakaya", "居酒屋"], ["japanese pub", "居酒屋"], ["pub, iza", "居酒屋"],
    ["yakitori", "焼き鳥"], ["chicken skewer", "焼き鳥"], ["grilled chicken", "焼き鳥"],
    ["yakiniku", "焼肉"], ["korean bbq", "焼肉"], ["grilled meat", "焼肉"],
    ["steakhouse", "ステーキ"], ["steak", "ステーキ"],
    ["teppanyaki", "鉄板焼き"],
    ["ramen", "ラーメン"], ["noodle shop", "ラーメン"],
    ["sushi", "寿司"], ["sashimi", "寿司"], ["nigiri", "寿司"],
    ["seafood", "海鮮"], ["fish restaurant", "海鮮"],
    ["nabe", "鍋"], ["hotpot", "鍋"],
    ["shabu shabu", "しゃぶしゃぶ"], ["shabushabu", "しゃぶしゃぶ"],
    ["tonkatsu", "とんかつ"], ["pork cutlet", "とんかつ"],
    ["italian", "イタリアン"], ["pasta", "パスタ"], ["pizza", "イタリアン"],
    ["chinese", "中華料理"], ["dim sum", "中華料理"],
    ["korean", "韓国料理"], ["bibimbap", "韓国料理"],
    ["french", "創作料理"], ["creative", "創作料理"], ["fusion", "創作料理"], ["modern", "創作料理"],
    ["cafe", "カフェ"], ["coffee shop", "カフェ"], ["brunch", "カフェ"],
    ["curry", "カレー"], ["indian", "インド料理"],
    ["thai", "タイ料理"], ["vietnamese", "ベトナム料理"],
    ["mexican", "メキシコ料理"], ["taco", "メキシコ料理"],
    ["spanish", "スペイン料理"],
    ["american", "アメリカ料理"], ["burger", "アメリカ料理"],
    ["salad", "サラダ"], ["vegetarian", "ベジタリアン"], ["vegan", "ベジタリアン"],
  ];

  for (const [kw, cuisine] of CUISINE_MAP) {
    if (text.includes(kw)) {
      if (!intent.cuisines.includes(cuisine)) intent.cuisines.push(cuisine);
    }
  }

  // Diet
  const DIET_PATTERNS: [RegExp, string][] = [
    [/\bvegan\b/, "vegan"],
    [/\bvegetarian\b/, "veg"],
    [/\bpescatarian\b/, "fish"],
    [/\bmeat[- ]?lover|carnivore|protein[- ]?heavy/, "meat"],
    [/\bgluten[- ]?free\b/, "gluten-free"],
  ];
  for (const [pattern, value] of DIET_PATTERNS) {
    if (pattern.test(text)) {
      intent.diet = value;
      break;
    }
  }

  // Price - absolute
  const PRICE_ABS: [RegExp, number][] = [
    [/\$\$\$\$/, 4], [/\$\$\$[^$]/, 3], [/\$\$[^$]/, 2],
    [/\bcheap|budget|inexpensive|affordable|low[- ]?cost/, 1],
    [/\bexpensive|fancy|fine[- ]?dining|luxury|high[- ]?end|splurge/, 4],
    [/\bmoderate|mid[- ]?range|reasonable/, 2],
  ];
  for (const [pattern, tier] of PRICE_ABS) {
    if (pattern.test(text)) {
      intent.priceTier = tier;
      break;
    }
  }
  // Price - relative
  if (/more expensive|price up|higher price|fancier|nicer/.test(text)) {
    intent.priceDirection = "up";
  } else if (/cheaper|less expensive|lower price|budget[- ]?friendly/.test(text)) {
    intent.priceDirection = "down";
  }
  // Price - yen-specific
  const yenMatch = text.match(/(\d{1,2})[,.]?000\s*yen/);
  if (yenMatch) {
    const k = parseInt(yenMatch[1], 10);
    if (k <= 2) intent.priceTier = 1;
    else if (k <= 5) intent.priceTier = 2;
    else if (k <= 10) intent.priceTier = 3;
    else intent.priceTier = 4;
  }

  // Health
  if (/very healthy|super healthy|clean eating|michelin wellness|extremely healthy/.test(text)) {
    intent.healthLevel = 0.9;
  } else if (/healthy|light|nutritious|balanced|organic|farm[- ]?to[- ]?table/.test(text)) {
    intent.healthLevel = 0.7;
  } else if (/low[- ]?cal|diet[- ]?friendly|clean/.test(text)) {
    intent.healthLevel = 0.6;
  } else if (/less healthy|junk|greasy|fried|unhealthy|indulgent/.test(text)) {
    intent.healthDirection = "down";
  }

  // Radius
  const kmMatch = text.match(/(\d+)\s*(km|kilometers?)/);
  if (kmMatch) {
    intent.radiusKm = Math.max(0.5, Math.min(50, parseInt(kmMatch[1], 10)));
  } else if (text.match(/(\d+)\s*(miles?)/)) {
    const m = text.match(/(\d+)\s*(miles?)/);
    if (m) intent.radiusKm = Math.max(0.5, Math.min(50, parseInt(m[1], 10) * 1.6));
  } else if (/nearby|close|walking distance|local/.test(text)) {
    intent.radiusKm = 3;
  } else if (/anywhere|doesn't matter|location flexible/.test(text)) {
    intent.radiusKm = 50;
  }

  // Rating
  if (/highly rated|best|top rated|amazing|michelin|5[- ]?star|exceptional/.test(text)) {
    intent.ratingMin = 4.0;
  } else if (/well reviewed|good reviews|trusted|solid/.test(text)) {
    intent.ratingMin = 3.5;
  }

  // Reset
  if (/reset|clear all|start over|new search|forget everything/.test(text)) {
    intent.clearAll = true;
  }

  // Social / friend mentions
  for (const user of SAMPLE_USERS) {
    const needles = [user.id.toLowerCase(), user.name.toLowerCase(), user.name.toLowerCase().split(" ")[0]];
    if (needles.some((n) => text.includes(n))) {
      intent.withUsers.push(user.id);
      intent.friendMentions = true;
    }
  }

  return intent;
}

/* ─── Compute diff against current filters ─── */
export function computeFilterDiff(
  text: string,
  current: Filters
): FilterDiff {
  const intent = extractIntent(text);
  const ops: FilterOp[] = [];
  const next: Partial<Filters> = {};

  // Start with current values so we don't accidentally clear things
  Object.assign(next, current);

  // --- Clear All overrides everything ---
  if (intent.clearAll) {
    return {
      ops: [{ type: "clear", key: "query", label: "Reset All Filters", icon: "🔄" }],
      nextFilters: { query: "", cuisine: "", diet: "", price_tier: null, healthiness_min: 0, radius_km: 50, rating_min: 0, with_users: [] },
      confidence: 1.0,
    };
  }

  // --- Cuisine ---
  if (intent.cuisines.length > 0) {
    const target = intent.cuisines[0];
    if (current.cuisine !== target) {
      ops.push({
        type: "set",
        key: "cuisine",
        value: target,
        label: target,
        icon: cuisineIcon(target),
      });
      next.cuisine = target;
    }
  }

  // --- Diet ---
  if (intent.diet) {
    if (current.diet !== intent.diet) {
      ops.push({
        type: "set",
        key: "diet",
        value: intent.diet,
        label: dietLabel(intent.diet),
        icon: intent.diet === "vegan" ? "🌱" : intent.diet === "veg" ? "🥗" : intent.diet === "fish" ? "🐟" : intent.diet === "meat" ? "🥩" : "🚫",
      });
      next.diet = intent.diet;
    }
  }

  // --- Price ---
  let priceTarget = intent.priceTier ?? current.price_tier;
  if (intent.priceDirection) {
    const currentTier = current.price_tier ?? 2;
    if (intent.priceDirection === "up") priceTarget = Math.min(4, currentTier + 1);
    if (intent.priceDirection === "down") priceTarget = Math.max(1, currentTier - 1);
  }
  if (priceTarget !== null && priceTarget !== current.price_tier) {
    ops.push({ type: "set", key: "price_tier", value: priceTarget, label: priceLabel(priceTarget), icon: "💰" });
    next.price_tier = priceTarget;
  }

  // --- Healthiness ---
  let healthTarget = current.healthiness_min;
  if (intent.healthLevel !== undefined) {
    healthTarget = intent.healthLevel;
  } else if (intent.healthDirection === "down") {
    healthTarget = Math.max(0, current.healthiness_min - 0.2);
  } else if (intent.healthDirection === "clear") {
    healthTarget = 0;
  }
  if (Math.abs(healthTarget - current.healthiness_min) > 0.05) {
    const label = healthTarget >= 0.9 ? "Very Healthy" : healthTarget >= 0.7 ? "Healthy" : healthTarget >= 0.5 ? "Light" : healthTarget > 0 ? "Any" : "No restriction";
    ops.push({ type: "set", key: "healthiness_min", value: healthTarget, label, icon: "🥗" });
    next.healthiness_min = healthTarget;
  }

  // --- Radius ---
  if (intent.radiusKm !== undefined && Math.abs(intent.radiusKm - current.radius_km) > 0.1) {
    const label = intent.radiusKm >= 50 ? "Anywhere" : intent.radiusKm <= 1 ? "Walking" : intent.radiusKm <= 3 ? "Nearby" : `Within ${Math.round(intent.radiusKm)} km`;
    ops.push({ type: "set", key: "radius_km", value: intent.radiusKm, label, icon: "📍" });
    next.radius_km = intent.radiusKm;
  }

  // --- Rating ---
  if (intent.ratingMin !== undefined && intent.ratingMin !== current.rating_min) {
    ops.push({ type: "set", key: "rating_min", value: intent.ratingMin, label: `★ ${intent.ratingMin}+`, icon: "⭐" });
    next.rating_min = intent.ratingMin;
  }

  // --- Friends ---
  if (intent.withUsers.length > 0) {
    const existing = new Set(current.with_users ?? []);
    const added = intent.withUsers.filter((u) => !existing.has(u));
    if (added.length > 0) {
      const names = added.map((id) => SAMPLE_USERS.find((u) => u.id === id)?.name || id);
      ops.push({ type: "set", key: "with_users", value: Array.from(new Set([...existing, ...added])), label: `With ${names.join(", ")}`, icon: "👥" });
      next.with_users = Array.from(new Set([...existing, ...added]));
    }
  } else if (intent.friendMentions && intent.withUsers.length === 0) {
    // Explicit "with" context but no matched friend — keep current
  }

  // Confidence score
  const hasOps = ops.length > 0;
  const confidence = hasOps ? Math.min(0.95, 0.5 + ops.length * 0.12) : 0.0;

  // Strip fields that are effectively default
  const defaults = { query: "", cuisine: "", diet: "", price_tier: null, healthiness_min: 0, radius_km: 50, rating_min: 0, review_count_min: 0, visit_status: "any" as const, sort_by: "relevance", with_users: [] as string[] };
  for (const [k, v] of Object.entries(next)) {
    if (JSON.stringify(v) === JSON.stringify((defaults as any)[k])) {
      delete (next as any)[k];
    }
  }

  return { ops, nextFilters: next, confidence };
}
