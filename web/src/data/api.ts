import type { TasteProfile, RankedItem, Filters, RankStatus, Post, FeedData } from "./types";
import { getClusterLabel, computeRecommendations, sortRecommendations, buildSeedPosts, getDefaultProfile } from "./mockData";
import { CLUSTER_PEERS } from "./mockData";
import {
  loadProfileSupabase,
  saveProfileSupabase,
  deleteContextSupabase,
  loadFeedSupabase,
  addPostSupabase,
  deletePostSupabase,
} from "./supabaseApi";
import { hasSupabase } from "../lib/supabase";

const STORAGE_KEY_BASE = "taste.node.profile.v2";
const FEED_KEY_BASE = "taste.node.feed.v2";

let _currentUserId: string | null = null;
let _supabaseActive = false;

export function setCurrentUserId(id: string | null) {
  _currentUserId = id;
  _supabaseActive = !!id && hasSupabase();
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
      Object.values(parsed.contexts).forEach((ctx) => {
        ctx.ranked_list.forEach((item) => {
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
    if (raw) return JSON.parse(raw);
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
  if (_supabaseActive) {
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
  if (_supabaseActive) {
    saveProfileSupabase(profile).catch(() => {}); // fire-and-forget
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
    deleteContextSupabase(contextId).catch(() => {});
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

/* ─── Re-export helpers ─── */

export function getCluster(profile: TasteProfile) {
  return getClusterLabel(profile);
}

export function getRecommendations(profile: TasteProfile, filters: Filters) {
  return computeRecommendations(profile, filters);
}

export function getSortedRecommendations(profile: TasteProfile, filters: Filters, sortBy: string) {
  return sortRecommendations(computeRecommendations(profile, filters), sortBy);
}

export function getCurrentUserId(): string | null {
  return _currentUserId;
}

/* ─── Feed (sync helpers, with async cloud for add/delete) ─── */

export function addPost(feed: FeedData, post: Post): FeedData {
  const next = { posts: [post, ...feed.posts] };
  saveLocalFeed(next);
  if (_supabaseActive) {
    addPostSupabase(post).catch(() => {});
  }
  return next;
}

export function deletePost(feed: FeedData, postId: string): FeedData {
  const next = { posts: feed.posts.filter((p) => p.id !== postId) };
  saveLocalFeed(next);
  if (_supabaseActive) {
    deletePostSupabase(postId).catch(() => {});
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
      const peerIds = new Set(CLUSTER_PEERS);
      return feed.posts.filter((p) => p.author_id === _currentUserId || peerIds.has(p.author_id));
    }
    case "global":
    default:
      return feed.posts;
  }
}

/* ─── Re-export helpers ─── */
export {
  buildSeedPosts,
  getDefaultProfile,
  getClusterLabel,
  computeRecommendations,
  sortRecommendations,
} from "./mockData";
