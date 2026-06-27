export interface Venue {
  id: string;
  name: string;
  image_url?: string;
  location: { lat: number; lng: number } | null;
  cuisines: string[];
  dietary_tags: string[];
  price_tier: number | null;
  health_score: number | null;
  source: "synthetic" | "api" | "user_added" | "tabelog";
  source_url?: string;
  address?: string;
  rating?: number;
  review_count?: number;
}

export type RankStatus = "wishlist" | "visited" | "favourite" | "not_for_me";

export interface RankedItem {
  venue: Venue;
  visited_at: string;
  added_at: string;
  occasion_tag: "solo" | "date" | "business" | "group" | "comfort";
  is_classic: boolean;
  rank?: number;
  status?: RankStatus;
  personal_rating?: number;
  reaction?: string;
  meal_type?: "lunch" | "dinner";
  dishes?: string[];
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
  following: string[];
  include_in_clustering?: boolean;
}

export interface Recommendation {
  venue: Venue;
  score: number;
  explanation: string;
  context_id: string;
}

export interface Filters {
  query: string;
  cuisine: string;
  diet: string;
  price_tier: number | null;
  healthiness_min: number;
  radius_km: number;
  rating_min: number;
  review_count_min: number;
  visit_status: RankStatus | "any";
  sort_by: string;
  with_users?: string[];
}

export interface Post {
  id: string;
  author_id: string;
  author_name: string;
  text: string;
  venue_id?: string;
  venue_name?: string;
  image_url?: string;
  created_at: string;
}

export interface FeedData {
  posts: Post[];
}

export type FeedMode = "following" | "recommended" | "global";
