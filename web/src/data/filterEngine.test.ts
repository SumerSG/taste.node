import { describe, it, expect, beforeAll } from 'vitest';
import { filterVenues } from './filterEngine';
import { loadVenues } from './venues';

describe('meat diet filter', () => {
  beforeAll(async () => {
    await loadVenues();
  });

  it('returns only meat venues when diet=meat', () => {
    const profile = {
      user_id: 'test',
      contexts: {
        default: {
          context_id: 'default',
          ranked_list: [],
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      },
      default_context: 'default',
      following: [],
    };

    const results = filterVenues(
      {
        query: '',
        cuisine: '',
        diet: 'meat',
        price_tier: null,
        healthiness_min: 0,
        radius_km: 50,
        rating_min: 0,
        review_count_min: 0,
        visit_status: 'any',
        sort_by: 'relevance',
      },
      profile
    );

    // Fallback data has several meat venues (e.g. v2, v3, v8)
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((v) => v.dietary_tags.includes('meat'))).toBe(true);
  });

  it('returns all venues when diet is empty', () => {
    const profile = {
      user_id: 'test',
      contexts: {
        default: {
          context_id: 'default',
          ranked_list: [],
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      },
      default_context: 'default',
      following: [],
    };

    const results = filterVenues(
      {
        query: '',
        cuisine: '',
        diet: '',
        price_tier: null,
        healthiness_min: 0,
        radius_km: 50,
        rating_min: 0,
        review_count_min: 0,
        visit_status: 'any',
        sort_by: 'relevance',
      },
      profile
    );

    expect(results.length).toBeGreaterThan(0);
  });
});
