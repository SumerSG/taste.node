import type { Filters } from "../data/types";
import { SAMPLE_USERS } from "../data/mockData";

export interface ParsedChat {
  text: string;
  filters: Partial<Filters>;
}

export function parseChatQuery(input: string): ParsedChat {
  const text = input.toLowerCase();
  const updates: Partial<Filters> = {};

  // Cuisine extraction — map English keywords to the actual Japanese
  // cuisine labels used in the venue data so filters match exactly.
  const cuisineKeywords: Record<string, string> = {
    // Japanese / washoku
    japanese: "日本料理",
    washoku: "日本料理",
    traditional: "日本料理",
    izakaya: "居酒屋",
    pub: "居酒屋",
    yakitori: "焼き鳥",
    skewer: "焼き鳥",
    yakiniku: "焼肉",
    bbq: "焼肉",
    grilled: "焼肉",
    steak: "ステーキ",
    teppanyaki: "鉄板焼き",
    iron: "鉄板焼き",
    ramen: "ラーメン",
    noodle: "ラーメン",
    sushi: "寿司",
    sashimi: "寿司",
    seafood: "海鮮",
    fish: "海鮮",
    nabe: "鍋",
    hotpot: "鍋",
    shabu: "しゃぶしゃぶ",
    shabushabu: "しゃぶしゃぶ",
    tonkatsu: "とんかつ",
    pork: "とんかつ",

    // Italian
    italian: "イタリアン",
    pizza: "イタリアン",
    pasta: "パスタ",

    // Chinese
    chinese: "中華料理",
    gyoza: "中華料理",
    dumpling: "中華料理",

    // Korean
    korean: "韓国料理",

    // French / creative
    french: "創作料理",
    creative: "創作料理",
    fusion: "創作料理",

    // Cafe
    cafe: "カフェ",
    coffee: "カフェ",

    // Curry / Indian
    curry: "カレー",
    indian: "インド料理",

    // American
    american: "アメリカ料理",
    burger: "アメリカ料理",
    lobster: "アメリカ料理",

    // Diet-forward
    vegetarian: "ベジタリアン",
    vegan: "ベジタリアン",
    salad: "サラダ",
  };
  for (const [kw, cuisine] of Object.entries(cuisineKeywords)) {
    if (text.includes(kw)) {
      updates.cuisine = cuisine;
      break;
    }
  }

  // Diet
  const dietMap: [string[], string][] = [
    [["vegan", "plant-based", "no animal"], "vegan"],
    [["vegetarian", "veggie", "no meat"], "veg"],
    [["pescatarian", "pesca", "fish"], "fish"],
    [["meat", "carnivore", "steak"], "meat"],
  ];
  for (const [keywords, diet] of dietMap) {
    if (keywords.some((k) => text.includes(k))) {
      updates.diet = diet;
      break;
    }
  }

  // Price tier
  const pricePatterns: [RegExp, number][] = [
    [/\$\$\$\$/, 4],
    [/\$\$\$/, 3],
    [/under \$\$\$/, 3],
    [/\$\$/, 2],
    [/under \$\$/, 2],
    [/cheap|budget|\$|affordable/, 1],
    [/expensive|fancy|fine dining/, 4],
    [/moderate|mid-range/, 2],
  ];
  for (const [pattern, tier] of pricePatterns) {
    if (pattern.test(text)) {
      updates.price_tier = tier;
      break;
    }
  }

  // Healthiness
  if (text.includes("healthy") || text.includes("clean")) {
    updates.healthiness_min = 0.7;
  }
  if (text.includes("very healthy") || text.includes("super healthy")) {
    updates.healthiness_min = 0.9;
  }

  // Radius
  const radiusMatch = text.match(/(\d+)\s*(km|miles?)/);
  if (radiusMatch) {
    let r = parseInt(radiusMatch[1], 10);
    if (radiusMatch[2].startsWith("mile")) r = Math.round(r * 1.609);
    updates.radius_km = Math.max(1, Math.min(50, r));
  } else if (text.includes("nearby") || text.includes("close")) {
    updates.radius_km = 3;
  } else if (text.includes("anywhere")) {
    updates.radius_km = 50;
  }

  // Mutual friend context
  const socialContext = /with|and|mutual|together|friend|both of us|for us|with my/;
  if (socialContext.test(text)) {
    for (const user of SAMPLE_USERS) {
      const needles = [
        user.id.toLowerCase(),
        user.name.toLowerCase(),
        user.name.toLowerCase().split(" ")[0],
      ];
      if (needles.some((n) => text.includes(n))) {
        if (!updates.with_users) {
          updates.with_users = [];
        }
        updates.with_users.push(user.id);
      }
    }
  }

  return { text: input, filters: updates };
}
