import type { TasteProfile, RankedItem, Filters, RankStatus, Post, FeedData } from "./types";
import { getClusterLabel, computeRecommendations, sortRecommendations, buildSeedPosts, getDefaultProfile } from "./mockData";
import {
  loadProfileSupabase,
  saveProfileSupabase,
  deleteContextSupabase,
  loadFeedSupabase,
  addPostSupabase,
  deletePostSupabase,
  toggleLikeSupabase,
} from "./supabaseApi";
import { hasSupabase } from "../lib/supabase";
import {
  hasBackend,
  loadProfileBackend,
  createUserBackend,
  saveContextBackend,
  getRecommendationsBackend,
  toggleLikeBackend,
} from "./backendApi";

const STORAGE_KEY_BASE = "taste.node.profile.v2";
const FEED_KEY_BASE = "taste.node.feed.v3";

let _currentUserId: string | null = null;
let _supabaseActive = false;
let _backendActive = false;

export function setCurrentUserId(id: string | null) {
  _currentUserId = id;
  _supabaseActive = !!id && hasSupabase();
  _backendActive = hasBackend();
}

function storageKey(base: string) {
  return _currentUserId ? `${base}:${_currentUserId}` : base;
}

/* ─── LocalStorage helpers ─── */

function loadLocalProfile(): TasteProfile {
  try {
    const raw = localStorage.getItem(storageKey(STORAGE_KEY_BASE));
    if (raw) {
      const parsed = JSON.parse(raw) as TasteProfile;
      // Migrate old profiles without following
      if (!parsed.following) parsed.following = [];
      // Migrate old profiles without include_in_clustering (default true)
      if (parsed.include_in_clustering === undefined) parsed.include_in_clustering = true;
      Object.values(parsed.contexts).forEach((ctx) => {
          ctx.ranked_list.forEach((item) => {
          // Migrate old status names (cast to string to avoid TS errors after type change)
          const s = item.status as string;
          if (s === "want_to_try") item.status = "wishlist";
          if (s === "regular") item.status = "favourite";
          if (!item.status) item.status = "visited";
          if (item.personal_rating === undefined) item.personal_rating = undefined;
          if (item.reaction === undefined) item.reaction = undefined;
          if (item.meal_type === undefined) item.meal_type = undefined;
          if (item.dishes === undefined) item.dishes = undefined;
        });
      });
      return parsed;
    }
  } catch {
    // fall through to default
  }
  return { ...getDefaultProfile() };
}

function saveLocalProfile(profile: TasteProfile) {
  localStorage.setItem(storageKey(STORAGE_KEY_BASE), JSON.stringify(profile));
}

function loadLocalFeed(): FeedData {
  try {
    const raw = localStorage.getItem(storageKey(FEED_KEY_BASE));
    if (raw) {
      const parsed: FeedData = JSON.parse(raw);
      // Migration: detect old-format seed data.
      // Old seeds added `likes` but never `liked_by_me`.
      // If every post has likes but none have liked_by_me, it is stale old data.
      const isOldSeedFormat =
        parsed.posts.length > 0 &&
        parsed.posts.every((p) => p.likes !== undefined && p.liked_by_me === undefined);
      if (!isOldSeedFormat) return parsed;
      // Clear stale v2 key and fall through to re-seed with new distribution
      localStorage.removeItem("taste.node.feed.v2");
    }
  } catch {
    // fall through
  }
  return { posts: buildSeedPosts() };
}

function saveLocalFeed(feed: FeedData) {
  localStorage.setItem(storageKey(FEED_KEY_BASE), JSON.stringify(feed));
}

/* ─── Async load from Supabase ─── */

export async function loadProfile(): Promise<TasteProfile> {
  if (_backendActive && _currentUserId) {
    const remote = await loadProfileBackend(_currentUserId);
    if (remote) {
      saveLocalProfile(remote);
      return remote;
    }
  }
  if (_supabaseActive) {
    const remote = await loadProfileSupabase();
    if (remote) {
      // mirror to localStorage as cache
      saveLocalProfile(remote);
      return remote;
    }
  }
  return loadLocalProfile();
}

export async function loadFeed(): Promise<FeedData> {
  // Try Supabase for both authenticated and anonymous users (feed_posts is public-read)
  if (_supabaseActive || hasSupabase()) {
    const remote = await loadFeedSupabase();
    if (remote) {
      saveLocalFeed(remote);
      return remote;
    }
  }
  return loadLocalFeed();
}

/* ─── Save (local + optional cloud) ─── */

export function saveProfile(profile: TasteProfile) {
  saveLocalProfile(profile);
  if (_backendActive) {
    const userId = profile.user_id ?? _currentUserId ?? "demo_user";
    // Fire-and-forget: ensure user exists, then persist contexts
    loadProfileBackend(userId)
      .then((existing) => {
        if (!existing) {
          return createUserBackend(userId);
        }
        return existing;
      })
      .then(() => {
        return Promise.all(
          Object.entries(profile.contexts).map(([ctxId, ctx]) =>
            saveContextBackend(userId, ctxId, ctx.ranked_list)
          )
        );
      })
      .catch((err) => console.error("[backend] sync failed:", err));
  }
  if (_supabaseActive) {
    saveProfileSupabase(profile).catch((err) => console.error("Supabase save failed:", err));
  }
}

export function saveFeed(feed: FeedData) {
  saveLocalFeed(feed);
}

/* ─── Profile mutation helpers (sync, returns new profile) ─── */

export function updateRankedList(
  profile: TasteProfile,
  newList: RankedItem[],
  contextId?: string
): TasteProfile {
  const ctxId = contextId ?? profile.default_context;
  const ctx = profile.contexts[ctxId];
  if (!ctx) return profile;
  const next = {
    ...profile,
    contexts: {
      ...profile.contexts,
      [ctxId]: { ...ctx, ranked_list: newList, updated_at: new Date().toISOString() },
    },
  };
  saveProfile(next);
  return next;
}

export function addRankedItem(
  profile: TasteProfile,
  item: RankedItem,
  atIndex?: number,
  contextId?: string
): TasteProfile {
  const ctxId = contextId ?? profile.default_context;
  const list = [...profile.contexts[ctxId].ranked_list];
  if (typeof atIndex === "number") {
    list.splice(atIndex, 0, item);
  } else {
    list.push(item);
  }
  return updateRankedList(profile, list, ctxId);
}

export function removeRankedItem(profile: TasteProfile, venueId: string, contextId?: string): TasteProfile {
  const ctxId = contextId ?? profile.default_context;
  const list = profile.contexts[ctxId].ranked_list.filter((r) => r.venue.id !== venueId);
  return updateRankedList(profile, list, ctxId);
}

export function reorderRankedList(
  profile: TasteProfile,
  activeId: string,
  overId: string,
  contextId?: string
): TasteProfile {
  const ctxId = contextId ?? profile.default_context;
  const list = [...profile.contexts[ctxId].ranked_list];
  const oldIndex = list.findIndex((r) => r.venue.id === activeId);
  const newIndex = list.findIndex((r) => r.venue.id === overId);
  if (oldIndex === -1 || newIndex === -1) return profile;
  const [moved] = list.splice(oldIndex, 1);
  list.splice(newIndex, 0, moved);
  return updateRankedList(profile, list, ctxId);
}

export function updateItemStatus(
  profile: TasteProfile,
  venueId: string,
  status: RankStatus,
  contextId?: string
): TasteProfile {
  const ctxId = contextId ?? profile.default_context;
  const list = profile.contexts[ctxId].ranked_list.map((item) =>
    item.venue.id === venueId ? { ...item, status } : item
  );
  return updateRankedList(profile, list, ctxId);
}

export function updateItemRating(
  profile: TasteProfile,
  venueId: string,
  personal_rating: number | undefined,
  contextId?: string
): TasteProfile {
  const ctxId = contextId ?? profile.default_context;
  const list = profile.contexts[ctxId].ranked_list.map((item) =>
    item.venue.id === venueId ? { ...item, personal_rating } : item
  );
  return updateRankedList(profile, list, ctxId);
}

export function updateItemReaction(
  profile: TasteProfile,
  venueId: string,
  reaction: string,
  contextId?: string
): TasteProfile {
  const ctxId = contextId ?? profile.default_context;
  const list = profile.contexts[ctxId].ranked_list.map((item) =>
    item.venue.id === venueId ? { ...item, reaction } : item
  );
  return updateRankedList(profile, list, ctxId);
}

export function updateItemMealType(
  profile: TasteProfile,
  venueId: string,
  meal_type: "lunch" | "dinner" | undefined,
  contextId?: string
): TasteProfile {
  const ctxId = contextId ?? profile.default_context;
  const list = profile.contexts[ctxId].ranked_list.map((item) =>
    item.venue.id === venueId ? { ...item, meal_type } : item
  );
  return updateRankedList(profile, list, ctxId);
}

export function updateItemDishes(
  profile: TasteProfile,
  venueId: string,
  dishes: string[],
  contextId?: string
): TasteProfile {
  const ctxId = contextId ?? profile.default_context;
  const list = profile.contexts[ctxId].ranked_list.map((item) =>
    item.venue.id === venueId ? { ...item, dishes } : item
  );
  return updateRankedList(profile, list, ctxId);
}

/* ─── Context management ─── */

export function createContext(profile: TasteProfile, contextId: string): TasteProfile {
  if (profile.contexts[contextId]) return profile;
  const now = new Date().toISOString();
  const next: TasteProfile = {
    ...profile,
    contexts: {
      ...profile.contexts,
      [contextId]: {
        context_id: contextId,
        ranked_list: [],
        created_at: now,
        updated_at: now,
      },
    },
    default_context: contextId,
  };
  saveProfile(next);
  return next;
}

export function deleteContext(profile: TasteProfile, contextId: string): TasteProfile {
  if (contextId === "default") return profile; // protect default
  const { [contextId]: _, ...restContexts } = profile.contexts;
  const next: TasteProfile = {
    ...profile,
    contexts: restContexts,
    default_context: profile.default_context === contextId ? "default" : profile.default_context,
  };
  saveProfile(next);
  if (_supabaseActive) {
    deleteContextSupabase(contextId).catch((err) => console.error("Supabase deleteContext failed:", err));
  }
  return next;
}

export function switchContext(profile: TasteProfile, contextId: string): TasteProfile {
  if (!profile.contexts[contextId]) return profile;
  const next = { ...profile, default_context: contextId };
  saveProfile(next);
  return next;
}

/* ─── Following ─── */

export function followUser(profile: TasteProfile, userId: string): TasteProfile {
  if (profile.following.includes(userId)) return profile;
  const next = { ...profile, following: [...profile.following, userId] };
  saveProfile(next);
  return next;
}

export function unfollowUser(profile: TasteProfile, userId: string): TasteProfile {
  const next = { ...profile, following: profile.following.filter((id) => id !== userId) };
  saveProfile(next);
  return next;
}

export function isFollowing(profile: TasteProfile, userId: string): boolean {
  return profile.following.includes(userId);
}

export function displayContextName(id: string): string {
  if (id === "default") return "My Favs";
  return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ─── Re-export helpers ─── */

export function getCluster(profile: TasteProfile) {
  return getClusterLabel(profile);
}

export async function getRecommendations(profile: TasteProfile, filters: Filters) {
  if (_backendActive && _currentUserId) {
    try {
      const remote = await getRecommendationsBackend(_currentUserId, filters);
      if (remote && remote.length > 0) {
        return remote;
      }
    } catch (err) {
      console.warn("[backend] recommendations fetch failed:", err);
    }
  }
  return computeRecommendations(profile, filters);
}

export async function getSortedRecommendations(profile: TasteProfile, filters: Filters, sortBy: string) {
  const recs = await getRecommendations(profile, filters);
  return sortRecommendations(recs, sortBy);
}

export function getCurrentUserId(): string | null {
  return _currentUserId;
}

/* ─── Feed (sync helpers, with async cloud for add/delete) ─── */

export function addPost(feed: FeedData, post: Post): FeedData {
  const next = { posts: [post, ...feed.posts] };
  saveLocalFeed(next);
  if (_supabaseActive) {
    addPostSupabase(post).catch((err) => console.error("Supabase addPost failed:", err));
  }
  return next;
}

export function deletePost(feed: FeedData, postId: string): FeedData {
  const next = { posts: feed.posts.filter((p) => p.id !== postId) };
  saveLocalFeed(next);
  if (_supabaseActive) {
    deletePostSupabase(postId).catch((err) => console.error("Supabase deletePost failed:", err));
  }
  return next;
}

export function toggleLikePost(feed: FeedData, postId: string): FeedData {
  const next = {
    posts: feed.posts.map((p) => {
      if (p.id !== postId) return p;
      const liked = !p.liked_by_me;
      return {
        ...p,
        liked_by_me: liked,
        likes: Math.max(0, (p.likes ?? 0) + (liked ? 1 : -1)),
      };
    }),
  };
  saveLocalFeed(next);

  // Background sync to cloud (fire-and-forget; count reconciles on next load)
  if (_backendActive && _currentUserId) {
    toggleLikeBackend(postId, _currentUserId).catch(() => {});
  } else if (_supabaseActive && _currentUserId) {
    toggleLikeSupabase(postId).catch(() => {});
  }

  return next;
}

export function filterFeedPosts(
  feed: FeedData,
  mode: import("./types").FeedMode,
  profile: TasteProfile
): Post[] {
  switch (mode) {
    case "following":
      return feed.posts.filter(
        (p) => p.author_id === _currentUserId || profile.following.includes(p.author_id)
      );
    case "recommended": {
      // "For You" = popular posts sorted by likes (desc), then recency
      return [...feed.posts].sort(
        (a, b) => (b.likes ?? 0) - (a.likes ?? 0)
      );
    }
    case "global":
    default:
      return feed.posts;
  }
}

/* ─── Include in clustering toggle ─── */

export function toggleIncludeInClustering(profile: TasteProfile): TasteProfile {
  const next = { ...profile, include_in_clustering: !profile.include_in_clustering };
  saveProfile(next);
  return next;
}

/* ─── Re-export helpers ─── */
export {
  buildSeedPosts,
  getDefaultProfile,
  getClusterLabel,
  computeRecommendations,
  sortRecommendations,
} from "./mockData";
