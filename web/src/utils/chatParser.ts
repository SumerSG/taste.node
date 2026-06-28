import type { Filters } from "../data/types";
import { SAMPLE_USERS } from "../data/mockData";

export interface ParsedChat {
  text: string;
  filters: Partial<Filters>;
}

/* ─── Comprehensive cuisine mapping ─── */
const CUISINE_KEYWORDS: [string, string][] = [
  ["japanese", "日本料理"],
  ["washoku", "日本料理"],
  ["traditional japanese", "日本料理"],
  ["izakaya", "居酒屋"],
  ["japanese pub", "居酒屋"],
  ["pub, iza", "居酒屋"],
  ["yakitori", "焼き鳥"],
  ["chicken skewer", "焼き鳥"],
  ["grilled chicken", "焼き鳥"],
  ["skewers", "焼き鳥"],
  ["yakiniku", "焼肉"],
  ["grilled meat", "焼肉"],
  ["bbq", "焼肉"],
  ["korean bbq", "焼肉"],
  ["steak", "ステーキ"],
  ["teppanyaki", "鉄板焼き"],
  ["ramen", "ラーメン"],
  ["ramen noodles", "ラーメン"],
  ["sushi", "寿司"],
  ["sashimi", "寿司"],
  ["nigiri", "寿司"],
  ["seafood", "海鮮"],
  ["fish", "海鮮"],
  ["nabe", "鍋"],
  ["hotpot", "鍋"],
  ["shabu shabu", "しゃぶしゃぶ"],
  ["shabushabu", "しゃぶしゃぶ"],
  ["tonkatsu", "とんかつ"],
  ["pork cutlet", "とんかつ"],
  ["italian", "イタリアン"],
  ["pasta", "パスタ"],
  ["spaghetti", "パスタ"],
  ["lasagna", "イタリアン"],
  ["risotto", "イタリアン"],
  ["pizza", "イタリアン"],
  ["pizzeria", "イタリアン"],
  ["napoli", "イタリアン"],
  ["chinese", "中華料理"],
  ["dim sum", "中華料理"],
  ["gyoza", "中華料理"],
  ["korean", "韓国料理"],
  ["korean bbq", "韓国料理"],
  ["bibimbap", "韓国料理"],
  ["french", "創作料理"],
  ["creative", "創作料理"],
  ["fusion", "創作料理"],
  ["modern", "創作料理"],
  ["contemporary", "創作料理"],
  ["cafe", "カフェ"],
  ["coffee", "カフェ"],
  ["brunch", "カフェ"],
  ["curry", "カレー"],
  ["indian", "インド料理"],
  ["thai", "タイ料理"],
  ["vietnamese", "ベトナム料理"],
  ["mexican", "メキシコ料理"],
  ["burrito", "メキシコ料理"],
  ["taco", "メキシコ料理"],
  ["spanish", "スペイン料理"],
  ["american", "アメリカ料理"],
  ["burger", "アメリカ料理"],
  ["lobster", "アメリカ料理"],
  ["salad", "サラダ"],
  ["vegetarian", "ベジタリアン"],
  ["vegan", "ベジタリアン"],
];

/* ─── Parse user intent from free text ─── */
export function parseChatQuery(input: string): ParsedChat {
  const text = input.toLowerCase().trim();
  const updates: Partial<Filters> = {};
  const matchedRanges: [number, number][] = [];

  function mark(start: number, length: number) {
    matchedRanges.push([start, start + length]);
  }

  /* ── Multi-cuisine extraction ── */
  const foundCuisines: string[] = [];
  for (const [kw, cuisine] of CUISINE_KEYWORDS) {
    if (text.includes(kw)) {
      if (!foundCuisines.includes(cuisine)) {
        foundCuisines.push(cuisine);
      }
      const idx = text.indexOf(kw);
      if (idx !== -1) mark(idx, kw.length);
    }
  }
  // Pick the most specific match (longer keyword wins)
  if (foundCuisines.length > 0) {
    updates.cuisine = foundCuisines[0];
  }

  /* ── Diet ── */
  const DIET_PATTERNS: [RegExp, string][] = [
    [/vegan|plant[- ]*based|no[- ]*animal/, "vegan"],
    [/vegetarian|veggie|meat[- ]*free|no[- ]*meat/, "veg"],
    [/pescatarian|pesca|seafood[- ]*only/, "fish"],
    [/meat[- ]*lover|carnivore|protein[- ]*heavy/, "meat"],
    [/gluten[- ]*free|celiac/, "gluten-free"],
  ];
  for (const [pattern, dietValue] of DIET_PATTERNS) {
    if (pattern.test(text)) {
      updates.diet = dietValue;
      break;
    }
  }

  /* ── Price tier ── */
  const PRICE_PATTERNS: [RegExp, number][] = [
    [/\$\$\$\$/, 4],
    [/\$\$\$[^$]/, 3],
    [/under\s+\$\$\$/, 3],
    [/\$\$[^$]/, 2],
    [/under\s+\$\$/, 2],
    [/cheap|budget|inexpensive|under\s+\$|affordable|low[- ]?cost/, 1],
    [/expensive|fancy|fine[- ]?dining|luxury|high[- ]?end|splurge/, 4],
    [/moderate|mid[- ]?range|midrange|reasonable/, 2],
    [/very\s+cheap|super\s+cheap|bargain/, 1],
    [/2[,.]?000[- ]?yen|2k[- ]?yen|under[- ]?2[,.]000/, 1],
    [/3[,.]?000[- ]?5[,.]?000|3[- ]?5k/, 2],
    [/5[,.]?000[- ]?10[,.]?000|5[- ]?10k/, 3],
    [/10[,.]?000\+|10k\+|over[- ]?10k/, 4],
  ];
  for (const [pattern, tier] of PRICE_PATTERNS) {
    if (pattern.test(text)) {
      updates.price_tier = tier;
      break;
    }
  }

  /* ── Healthiness ── */
  if (/very healthy|super healthy|extremely healthy|michelin|wellness|clean eating/.test(text)) {
    updates.healthiness_min = 0.9;
  } else if (/healthy|light|low[- ]?cal|nutritious|balanced|clean/.test(text)) {
    updates.healthiness_min = 0.7;
  } else if (/organic|farm[- ]?to[- ]?table|natural/.test(text)) {
    updates.healthiness_min = 0.6;
  }

  /* ── Radius ── */
  const radiusPatterns = [
    { pattern: /(\d+)\s*(km|kilometers?)/, scale: 1 },
    { pattern: /(\d+)\s*(miles?)/, scale: 1.609 },
    { pattern: /(\d+)\s*(min(utes?)?)\s*(walk|walking)/, scale: 0.02 }, // estimate
    { pattern: /(\d+)\s*(min(utes?)?)\s*(train|subway|metro|drive|car)/, scale: 0.1 },
  ];
  for (const { pattern, scale } of radiusPatterns) {
    const m = text.match(pattern);
    if (m) {
      let r = parseInt(m[1], 10) * scale;
      r = Math.max(0.5, Math.min(50, r));
      updates.radius_km = +r.toFixed(1);
      break;
    }
  }
  if (!updates.radius_km) {
    if (/nearby|around here|close|walking distance|local/.test(text)) {
      updates.radius_km = 3;
    } else if (/anywhere|doesn't matter|location flexible/.test(text)) {
      updates.radius_km = 50;
    }
  }

  /* ── Occasion / vibe (maps to friend context or query signal) ── */
  if (/romantic|date|anniversary|date night|intimate|candlelight/.test(text) && !updates.query) {
    updates.query = "romantic";
  } else if (/solo|alone|by myself|quiet|peaceful|chill|relaxed/.test(text) && !updates.query) {
    updates.query = "solo";
  } else if (/business|meeting|client|work|professional/.test(text) && !updates.query) {
    updates.query = "business";
  } else if (/group|party|celebration|friends|crew|gang/.test(text) && !updates.query) {
    updates.query = "group";
  } else if (/comfort|homesick|warm|cozy|nostalgic|family/.test(text) && !updates.query) {
    updates.query = "comfort";
  }

  /* ── Social context (friend mentions) ── */
  const socialContext = /with|and|mutual|together|my friend|for us|with my/;
  if (socialContext.test(text)) {
    const matchedUsers: string[] = [];
    for (const user of SAMPLE_USERS) {
      const needles = [
        user.id.toLowerCase(),
        user.name.toLowerCase(),
        user.name.toLowerCase().split(" ")[0],
      ];
      if (needles.some((n) => text.includes(n))) {
        matchedUsers.push(user.id);
      }
    }
    if (matchedUsers.length > 0) {
      updates.with_users = matchedUsers;
    }
  }

  /* ── Rating / quality ── */
  if (/highly rated|best|top rated|amazing|michelin|5[- ]?star/.test(text)) {
    updates.rating_min = 4.0;
  } else if (/well reviewed|good reviews|trusted/.test(text)) {
    updates.rating_min = 3.5;
  }

  /* ── Visit status ── */
  if (/new place|never been|try something new|something different|not in my list/.test(text)) {
    updates.visit_status = "wishlist";
  }

  /* ── Build leftover unmatched text as explicit query ── */
  // Only preserve meaningful unmatched tokens (nouns, places, names)
  const unmatched = extractUnmatchedTokens(text, matchedRanges);
  if (unmatched.length > 0 && !updates.query) {
    updates.query = unmatched.join(" ");
  }

  return { text: input, filters: updates };
}

/**
 * Extract words/phrases that were not matched by any pattern.
 * Returns a list of potentially meaningful words (nouns, verbs, proper nouns).
 */
function extractUnmatchedTokens(text: string, ranges: [number, number][]): string[] {
  // Simple greedy mark & sweep
  const mask = new Array(text.length).fill(true);
  for (const [start, end] of ranges) {
    for (let i = start; i < end; i++) mask[i] = false;
  }

  const tokens: string[] = [];
  let current = "";
  for (let i = 0; i < text.length; i++) {
    if (mask[i]) {
      current += text[i];
    } else {
      if (current.trim().length > 1) tokens.push(current.trim());
      current = "";
    }
  }
  if (current.trim().length > 1) tokens.push(current.trim());

  // Filter out junk
  const stopwords = new Set(["i", "me", "my", "myself", "we", "our", "you", "your", "he", "she", "it", "they", "what", "which", "who", "this", "that", "these", "those", "am", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "a", "an", "the", "and", "but", "if", "or", "because", "as", "until", "while", "of", "at", "by", "for", "with", "about", "into", "through", "during", "before", "after", "above", "below", "to", "from", "up", "down", "in", "out", "on", "off", "over", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now", "looking", "want", "like", "feel", "get", "go", "find", "something", "somewhere", "place", "restaurant", "spot"]);

  const cleaned = tokens
    .flatMap((t) => t.split(/[^\p{L}\p{N}]+/gu))
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !stopwords.has(t));

  return cleaned;
}
