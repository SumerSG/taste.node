import type { Filters } from "../data/types";
import { SAMPLE_USERS } from "../data/mockData";

export interface ParsedChat {
  text: string;
  filters: Partial<Filters>;
}

export function parseChatQuery(input: string): ParsedChat {
  const text = input.toLowerCase();
  const updates: Partial<Filters> = {};

  // Cuisine extraction
  const cuisineKeywords: Record<string, string> = {
    japanese: "Japanese", ramen: "Japanese", sushi: "Japanese",
    italian: "Italian", pizza: "Italian", pasta: "Italian",
    american: "American", burger: "American",
    mexican: "Mexican", taco: "Mexican", burrito: "Mexican",
    french: "French", bistro: "French",
    indian: "Indian", curry: "Indian",
    vietnamese: "Vietnamese", pho: "Vietnamese",
    korean: "Korean", bbq: "Korean",
    thai: "Thai",
    "middle eastern": "Middle Eastern", falafel: "Middle Eastern", shawarma: "Middle Eastern",
    seafood: "Seafood", fish: "Seafood",
    steakhouse: "Steakhouse", steak: "Steakhouse",
    salad: "Salad",
    vegetarian: "Vegetarian",
    vegan: "Vegan",
    bakery: "Bakery", pastry: "Bakery",
    taiwanese: "Taiwanese",
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
        updates.with_user = user.id;
        break;
      }
    }
  }

  return { text: input, filters: updates };
}
