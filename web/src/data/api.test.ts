import { describe, it, expect, beforeEach } from 'vitest';
import type { TasteProfile, RankedItem, Post, FeedData } from './types';
import {
  loadProfile,
  saveProfile,
  addRankedItem,
  removeRankedItem,
  reorderRankedList,
  updateItemStatus,
  updateItemRating,
  updateItemReaction,
  updateItemMealType,
  updateItemDishes,
  loadFeed,
  saveFeed,
  addPost,
  deletePost,
  filterFeedPosts,
  setCurrentUserId,
  createContext,
  deleteContext,
  switchContext,
  followUser,
  unfollowUser,
} from './api';

const mockVenue = {
  id: 'v1',
  name: 'Test Bistro',
  location: { lat: 35.0, lng: 139.0 },
  cuisines: ['French'],
  dietary_tags: [],
  price_tier: 2,
  health_score: 0.8,
  source: 'synthetic' as const,
};

function makeProfile(list: RankedItem[] = []): TasteProfile {
  return {
    user_id: 'test_user',
    contexts: {
      default: {
        context_id: 'default',
        ranked_list: list,
        created_at: '2026-01-01T00:00:00+00:00',
        updated_at: '2026-01-01T00:00:00+00:00',
      },
    },
    default_context: 'default',
    following: [],
  };
}

function makeItem(id: string, overrides: Partial<RankedItem> = {}): RankedItem {
  return {
    venue: { ...mockVenue, id, name: `Venue ${id}` },
    visited_at: '2026-01-01T12:00:00+00:00',
    added_at: '2026-01-01T12:00:00+00:00',
    occasion_tag: 'solo',
    is_classic: false,
    status: 'visited',
    ...overrides,
  };
}

describe('api', () => {
  beforeEach(() => {
    localStorage.clear();
    setCurrentUserId(null);
  });

  describe('profile', () => {
    it('loads default profile when localStorage is empty', async () => {
      const profile = await loadProfile();
      expect(profile.user_id).toBe('demo_user');
      expect(profile.contexts.default.ranked_list.length).toBe(5);
    });

    it('round-trips profile through localStorage', async () => {
      const profile = makeProfile([makeItem('a')]);
      saveProfile(profile);
      expect((await loadProfile()).user_id).toBe('test_user');
      expect((await loadProfile()).contexts.default.ranked_list).toHaveLength(1);
    });

    it('adds an item to the ranked list', () => {
      const profile = makeProfile([]);
      const item = makeItem('new');
      const updated = addRankedItem(profile, item);
      expect(updated.contexts.default.ranked_list).toHaveLength(1);
      expect(updated.contexts.default.ranked_list[0].venue.id).toBe('new');
    });

    it('removes an item by venue id', () => {
      const profile = makeProfile([makeItem('a'), makeItem('b')]);
      const updated = removeRankedItem(profile, 'a');
      expect(updated.contexts.default.ranked_list).toHaveLength(1);
      expect(updated.contexts.default.ranked_list[0].venue.id).toBe('b');
    });

    it('reorders items in the list', () => {
      const profile = makeProfile([makeItem('a'), makeItem('b'), makeItem('c')]);
      const updated = reorderRankedList(profile, 'a', 'c');
      const ids = updated.contexts.default.ranked_list.map((i) => i.venue.id);
      expect(ids).toEqual(['b', 'c', 'a']);
    });

    it('updates item status', () => {
      const profile = makeProfile([makeItem('a', { status: 'visited' })]);
      const updated = updateItemStatus(profile, 'a', 'favourite');
      expect(updated.contexts.default.ranked_list[0].status).toBe('favourite');
    });

    it('updates personal rating', () => {
      const profile = makeProfile([makeItem('a')]);
      const updated = updateItemRating(profile, 'a', 4);
      expect(updated.contexts.default.ranked_list[0].personal_rating).toBe(4);
    });

    it('sets personal rating to 0 when passed 0', () => {
      const profile = makeProfile([makeItem('a', { personal_rating: 4 })]);
      const updated = updateItemRating(profile, 'a', 0);
      expect(updated.contexts.default.ranked_list[0].personal_rating).toBe(0);
    });

    it('updates reaction text', () => {
      const profile = makeProfile([makeItem('a')]);
      const updated = updateItemReaction(profile, 'a', 'Amazing!');
      expect(updated.contexts.default.ranked_list[0].reaction).toBe('Amazing!');
    });

    it('updates meal type', () => {
      const profile = makeProfile([makeItem('a')]);
      const updated = updateItemMealType(profile, 'a', 'dinner');
      expect(updated.contexts.default.ranked_list[0].meal_type).toBe('dinner');
    });

    it('updates dishes list', () => {
      const profile = makeProfile([makeItem('a')]);
      const updated = updateItemDishes(profile, 'a', ['Ramen', 'Gyoza']);
      expect(updated.contexts.default.ranked_list[0].dishes).toEqual(['Ramen', 'Gyoza']);
    });

    it('migrates old data without status or following fields', async () => {
      const raw = JSON.stringify({
        user_id: 'legacy',
        contexts: {
          default: {
            context_id: 'default',
            ranked_list: [
              {
                venue: mockVenue,
                visited_at: '2026-01-01T12:00:00+00:00',
                added_at: '2026-01-01T12:00:00+00:00',
                occasion_tag: 'solo',
                is_classic: false,
              },
            ],
            created_at: '2026-01-01T00:00:00+00:00',
            updated_at: '2026-01-01T00:00:00+00:00',
          },
        },
        default_context: 'default',
      });
      localStorage.setItem('taste.node.profile.v2', raw);
      const profile = await loadProfile();
      expect(profile.contexts.default.ranked_list[0].status).toBe('visited');
      expect(profile.following).toEqual([]);
    });
  });

  describe('feed', () => {
    it('returns empty feed when localStorage is empty and venues not loaded', async () => {
      const feed = await loadFeed();
      expect(Array.isArray(feed.posts)).toBe(true);
    });

    it('round-trips feed through localStorage', async () => {
      const feed: FeedData = { posts: [{ id: 'p1', author_id: 'u1', author_name: 'Alice', text: 'Hi', created_at: new Date().toISOString() }] };
      saveFeed(feed);
      expect((await loadFeed()).posts).toHaveLength(1);
      expect((await loadFeed()).posts[0].text).toBe('Hi');
    });

    it('adds a post to the feed', () => {
      const feed: FeedData = { posts: [] };
      const post: Post = { id: 'p1', author_id: 'u1', author_name: 'Alice', text: 'Hello', created_at: new Date().toISOString() };
      const updated = addPost(feed, post);
      expect(updated.posts).toHaveLength(1);
      expect(updated.posts[0].text).toBe('Hello');
    });

    it('deletes a post by id', () => {
      const feed: FeedData = {
        posts: [
          { id: 'p1', author_id: 'u1', author_name: 'Alice', text: 'A', created_at: new Date().toISOString() },
          { id: 'p2', author_id: 'u2', author_name: 'Bob', text: 'B', created_at: new Date().toISOString() },
        ],
      };
      const updated = deletePost(feed, 'p1');
      expect(updated.posts).toHaveLength(1);
      expect(updated.posts[0].id).toBe('p2');
    });

    it('filters feed by following mode', () => {
      setCurrentUserId('demo_user');
      const feed: FeedData = {
        posts: [
          { id: 'p1', author_id: 'demo_user', author_name: 'You', text: 'A', created_at: new Date().toISOString() },
          { id: 'p2', author_id: 'alex_12', author_name: 'Alex', text: 'B', created_at: new Date().toISOString() },
          { id: 'p3', author_id: 'stranger', author_name: 'Stranger', text: 'C', created_at: new Date().toISOString() },
        ],
      };
      const profile = makeProfile([]);
      const filtered = filterFeedPosts(feed, 'following', profile);
      expect(filtered).toHaveLength(1); // only own post since no one is followed
    });

    it('filters feed by following mode with followed users', () => {
      setCurrentUserId('demo_user');
      const feed: FeedData = {
        posts: [
          { id: 'p1', author_id: 'demo_user', author_name: 'You', text: 'A', created_at: new Date().toISOString() },
          { id: 'p2', author_id: 'alex_12', author_name: 'Alex', text: 'B', created_at: new Date().toISOString() },
          { id: 'p3', author_id: 'stranger', author_name: 'Stranger', text: 'C', created_at: new Date().toISOString() },
        ],
      };
      const profile = { ...makeProfile([]), following: ['alex_12'] };
      const filtered = filterFeedPosts(feed, 'following', profile);
      expect(filtered).toHaveLength(2);
    });

    it('filters feed by recommended mode (sorted by likes desc)', () => {
      setCurrentUserId('demo_user');
      const feed: FeedData = {
        posts: [
          { id: 'p1', author_id: 'demo_user', author_name: 'You', text: 'A', created_at: new Date().toISOString(), likes: 10 },
          { id: 'p2', author_id: 'u001', author_name: 'ClusterPeer', text: 'B', created_at: new Date().toISOString(), likes: 50 },
          { id: 'p3', author_id: 'unknown', author_name: 'Unknown', text: 'C', created_at: new Date().toISOString(), likes: 30 },
        ],
      };
      const profile = makeProfile([]);
      const filtered = filterFeedPosts(feed, 'recommended', profile);
      expect(filtered).toHaveLength(3);
      expect(filtered[0].id).toBe('p2');
      expect(filtered[1].id).toBe('p3');
      expect(filtered[2].id).toBe('p1');
    });
  });

  describe('contexts', () => {
    it('creates a new context', () => {
      const profile = makeProfile([]);
      const updated = createContext(profile, 'noodle_spots');
      expect(updated.contexts.noodle_spots).toBeDefined();
      expect(updated.contexts.noodle_spots.ranked_list).toHaveLength(0);
      expect(updated.default_context).toBe('noodle_spots');
    });

    it('deletes a context', () => {
      const profile = makeProfile([]);
      const withCtx = createContext(profile, 'noodle_spots');
      const updated = deleteContext(withCtx, 'noodle_spots');
      expect(updated.contexts.noodle_spots).toBeUndefined();
      expect(updated.default_context).toBe('default');
    });

    it('protects default context from deletion', () => {
      const profile = makeProfile([]);
      const updated = deleteContext(profile, 'default');
      expect(updated.contexts.default).toBeDefined();
    });

    it('switches active context', () => {
      const profile = makeProfile([]);
      const withCtx = createContext(profile, 'noodle_spots');
      const switched = switchContext(withCtx, 'default');
      expect(switched.default_context).toBe('default');
    });

    it('adds items to a specific context', () => {
      const profile = makeProfile([]);
      const withCtx = createContext(profile, 'cafes');
      const item = makeItem('cafe1');
      const updated = addRankedItem(withCtx, item, undefined, 'cafes');
      expect(updated.contexts.cafes.ranked_list).toHaveLength(1);
      expect(updated.contexts.default.ranked_list).toHaveLength(0);
    });
  });

  describe('following', () => {
    it('follows a user', () => {
      const profile = makeProfile([]);
      const updated = followUser(profile, 'alex_12');
      expect(updated.following).toContain('alex_12');
    });

    it('unfollows a user', () => {
      const profile = { ...makeProfile([]), following: ['alex_12', 'jordan_34'] };
      const updated = unfollowUser(profile, 'alex_12');
      expect(updated.following).not.toContain('alex_12');
      expect(updated.following).toContain('jordan_34');
    });

    it('does not duplicate follows', () => {
      const profile = { ...makeProfile([]), following: ['alex_12'] };
      const updated = followUser(profile, 'alex_12');
      expect(updated.following).toHaveLength(1);
    });
  });
});
