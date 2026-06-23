import { describe, it, expect } from 'vitest';
import { pickImage, haversine } from './venues';

describe('venues helpers', () => {
  describe('pickImage', () => {
    it('returns cuisine-specific image for known cuisine', () => {
      const url = pickImage(['Japanese', 'Italian']);
      expect(url).toContain('unsplash.com');
      expect(url).not.toBe('');
    });

    it('falls through to second cuisine if first is unknown', () => {
      const url = pickImage(['Unknown', 'Italian']);
      expect(url).toContain('unsplash.com');
      expect(url).not.toBe('');
    });

    it('returns default image for unknown cuisines', () => {
      const url = pickImage(['UnknownCuisine']);
      expect(url).toContain('unsplash.com');
      expect(url).not.toBe('');
    });

    it('returns default image for empty cuisines', () => {
      const url = pickImage([]);
      expect(url).toContain('unsplash.com');
      expect(url).not.toBe('');
    });
  });

  describe('haversine', () => {
    it('returns 0 for identical coordinates', () => {
      const a = { lat: 35.659, lng: 139.701 };
      expect(haversine(a, a)).toBe(0);
    });

    it('computes approximate distance between Tokyo and Osaka', () => {
      const tokyo = { lat: 35.6762, lng: 139.6503 };
      const osaka = { lat: 34.6937, lng: 135.5023 };
      const d = haversine(tokyo, osaka);
      expect(d).toBeGreaterThan(390);
      expect(d).toBeLessThan(410);
    });

    it('computes small distances correctly', () => {
      const a = { lat: 35.659, lng: 139.701 };
      const b = { lat: 35.660, lng: 139.702 };
      const d = haversine(a, b);
      expect(d).toBeGreaterThan(0);
      expect(d).toBeLessThan(1);
    });
  });
});
