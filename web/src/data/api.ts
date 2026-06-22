import type { TasteProfile, RankedItem, Filters, RankStatus } from "./types";
import { DEFAULT_PROFILE, getClusterLabel, computeRecommendations, sortRecommendations, searchVenues, ALL_VENUES } from "./mockData";

const STORAGE_KEY = "taste.node.profile.v2";

export function loadProfile(): TasteProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // migrate: ensure statuses exist
      Object.values(parsed.contexts).forEach((ctx: any) => {
        ctx.ranked_list.forEach((item: any) => {
          if (!item.status) item.status = "visited";
        });
      });
      return parsed;
    }
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

export function updateItemStatus(profile: TasteProfile, venueId: string, status: RankStatus): TasteProfile {
  const list = profile.contexts[profile.default_context].ranked_list.map((item) =>
    item.venue.id === venueId ? { ...item, status } : item
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

export { searchVenues, ALL_VENUES };
