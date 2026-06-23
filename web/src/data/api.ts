import type { TasteProfile, RankedItem, Filters, RankStatus, Post, FeedData } from "./types";
import { getClusterLabel, computeRecommendations, sortRecommendations, buildSeedPosts, getDefaultProfile } from "./mockData";
import { FOLLOWED_USERS, CLUSTER_PEERS } from "./mockData";

const STORAGE_KEY = "taste.node.profile.v2";

export function loadProfile(): TasteProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // migrate: ensure statuses and new fields exist
      Object.values(parsed.contexts).forEach((ctx: any) => {
        ctx.ranked_list.forEach((item: any) => {
          if (!item.status) item.status = "visited";
          if (item.personal_rating === undefined) item.personal_rating = undefined;
          if (item.reaction === undefined) item.reaction = undefined;
          if (item.meal_type === undefined) item.meal_type = undefined;
          if (item.dishes === undefined) item.dishes = undefined;
        });
      });
      return parsed;
    }
  } catch {}
  return { ...getDefaultProfile() };
}

export function saveProfile(profile: TasteProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function updateRankedList(profile: TasteProfile, newList: RankedItem[]): TasteProfile {
  const ctx = profile.contexts[profile.default_context];
  return {
    ...profile,
    contexts: {
      ...profile.contexts,
      [profile.default_context]: { ...ctx, ranked_list: newList, updated_at: new Date().toISOString() },
    },
  };
}

export function addRankedItem(profile: TasteProfile, item: RankedItem, atIndex?: number): TasteProfile {
  const list = [...profile.contexts[profile.default_context].ranked_list];
  if (typeof atIndex === "number") {
    list.splice(atIndex, 0, item);
  } else {
    list.push(item);
  }
  return updateRankedList(profile, list);
}

export function removeRankedItem(profile: TasteProfile, venueId: string): TasteProfile {
  const list = profile.contexts[profile.default_context].ranked_list.filter((r) => r.venue.id !== venueId);
  return updateRankedList(profile, list);
}

export function reorderRankedList(profile: TasteProfile, activeId: string, overId: string): TasteProfile {
  const list = [...profile.contexts[profile.default_context].ranked_list];
  const oldIndex = list.findIndex((r) => r.venue.id === activeId);
  const newIndex = list.findIndex((r) => r.venue.id === overId);
  if (oldIndex === -1 || newIndex === -1) return profile;
  const [moved] = list.splice(oldIndex, 1);
  list.splice(newIndex, 0, moved);
  return updateRankedList(profile, list);
}

export function updateItemStatus(profile: TasteProfile, venueId: string, status: RankStatus): TasteProfile {
  const list = profile.contexts[profile.default_context].ranked_list.map((item) =>
    item.venue.id === venueId ? { ...item, status } : item
  );
  return updateRankedList(profile, list);
}

export function updateItemRating(profile: TasteProfile, venueId: string, personal_rating: number | undefined): TasteProfile {
  const list = profile.contexts[profile.default_context].ranked_list.map((item) =>
    item.venue.id === venueId ? { ...item, personal_rating } : item
  );
  return updateRankedList(profile, list);
}

export function updateItemReaction(profile: TasteProfile, venueId: string, reaction: string): TasteProfile {
  const list = profile.contexts[profile.default_context].ranked_list.map((item) =>
    item.venue.id === venueId ? { ...item, reaction } : item
  );
  return updateRankedList(profile, list);
}

export function updateItemMealType(profile: TasteProfile, venueId: string, meal_type: "lunch" | "dinner" | undefined): TasteProfile {
  const list = profile.contexts[profile.default_context].ranked_list.map((item) =>
    item.venue.id === venueId ? { ...item, meal_type } : item
  );
  return updateRankedList(profile, list);
}

export function updateItemDishes(profile: TasteProfile, venueId: string, dishes: string[]): TasteProfile {
  const list = profile.contexts[profile.default_context].ranked_list.map((item) =>
    item.venue.id === venueId ? { ...item, dishes } : item
  );
  return updateRankedList(profile, list);
}

export function getCluster(profile: TasteProfile) {
  return getClusterLabel(profile);
}

export function getRecommendations(profile: TasteProfile, filters: Filters) {
  return computeRecommendations(profile, filters);
}

export function getSortedRecommendations(profile: TasteProfile, filters: Filters, sortBy: string) {
  return sortRecommendations(computeRecommendations(profile, filters), sortBy);
}

/* ─── Feed ─── */

const FEED_KEY = "taste.node.feed.v2";

export function loadFeed(): FeedData {
  try {
    const raw = localStorage.getItem(FEED_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { posts: buildSeedPosts() };
}

export function saveFeed(feed: FeedData) {
  localStorage.setItem(FEED_KEY, JSON.stringify(feed));
}

export function addPost(feed: FeedData, post: Post): FeedData {
  const next = { posts: [post, ...feed.posts] };
  saveFeed(next);
  return next;
}

export function deletePost(feed: FeedData, postId: string): FeedData {
  const next = { posts: feed.posts.filter((p) => p.id !== postId) };
  saveFeed(next);
  return next;
}

export function filterFeedPosts(feed: FeedData, mode: import("./types").FeedMode): Post[] {
  switch (mode) {
    case "following":
      return feed.posts.filter((p) => p.author_id === "demo_user" || FOLLOWED_USERS.includes(p.author_id));
    case "recommended": {
      const peerIds = new Set(CLUSTER_PEERS);
      return feed.posts.filter((p) => p.author_id === "demo_user" || peerIds.has(p.author_id));
    }
    case "global":
    default:
      return feed.posts;
  }
}

/* ─── Re-export venue helpers so callers don’t need two imports ─── */
export {
  buildSeedPosts,
  getDefaultProfile,
  getClusterLabel,
  computeRecommendations,
  sortRecommendations,
} from "./mockData";
