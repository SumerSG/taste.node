export interface Venue {
  id: string;
  name: string;
  image_url?: string;
  location: { lat: number; lng: number } | null;
  cuisines: string[];
  dietary_tags: string[];
  price_tier: number | null;
  health_score: number | null;
  source: "synthetic" | "api" | "user_added";
}

export type RankStatus = "want_to_try" | "visited" | "favourite" | "regular";

export interface RankedItem {
  venue: Venue;
  visited_at: string;
  added_at: string;
  occasion_tag: "solo" | "date" | "business" | "group" | "comfort";
  is_classic: boolean;
  rank?: number;
  status?: RankStatus;
}

export interface TasteContext {
  context_id: string;
  ranked_list: RankedItem[];
  created_at: string;
  updated_at: string;
}

export interface TasteProfile {
  user_id: string;
  contexts: Record<string, TasteContext>;
  default_context: string;
}

export interface Recommendation {
  venue: Venue;
  score: number;
  explanation: string;
  context_id: string;
}

export interface Filters {
  cuisine: string;
  diet: string;
  price_tier: number | null;
  healthiness_min: number;
  radius_km: number;
}

export type SortBy = "match" | "price_asc" | "price_desc" | "health_desc" | "distance";
