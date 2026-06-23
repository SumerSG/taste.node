import type { TasteProfile, RankedItem, Filters, RankStatus, Post, FeedData } from "./types";
import { getClusterLabel, computeRecommendations, sortRecommendations, buildSeedPosts, getDefaultProfile } from "./mockData";
import { FOLLOWED_USERS, CLUSTER_PEERS } from "./mockData";
import {
  loadProfileSupabase,
  saveProfileSupabase,
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

export function updateRankedList(profile: TasteProfile, newList: RankedItem[]): TasteProfile {
  const ctx = profile.contexts[profile.default_context];
  const next = {
    ...profile,
    contexts: {
      ...profile.contexts,
      [profile.default_context]: { ...ctx, ranked_list: newList, updated_at: new Date().toISOString() },
    },
  };
  saveProfile(next);
  return next;
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

export function filterFeedPosts(feed: FeedData, mode: import("./types").FeedMode): Post[] {
  switch (mode) {
    case "following":
      return feed.posts.filter((p) => p.author_id === _currentUserId || FOLLOWED_USERS.includes(p.author_id));
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
