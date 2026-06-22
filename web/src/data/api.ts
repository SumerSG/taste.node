import type { TasteProfile, RankedItem, Filters } from "./types";
import { DEFAULT_PROFILE, getClusterLabel, computeRecommendations } from "./mockData";

const STORAGE_KEY = "taste.node.profile";

export function loadProfile(): TasteProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { ...DEFAULT_PROFILE };
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

export function getCluster(profile: TasteProfile) {
  return getClusterLabel(profile);
}

export function getRecommendations(profile: TasteProfile, filters: Filters) {
  return computeRecommendations(profile, filters);
}
