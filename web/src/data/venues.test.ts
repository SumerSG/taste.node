import { describe, it, expect } from 'vitest';
import { pickImage, haversine } from './venues';

describe('venues helpers', () => {
  describe('pickImage', () => {
    it('returns picsum.photos placeholder for a known cuisine with venue id', () => {
      const url = pickImage(['Japanese', 'Italian'], 'v42');
      expect(url).toContain('picsum.photos');
      expect(url).toContain('seed/v42');
      expect(url).not.toBe('');
    });

    it('falls back to first cuisine seed if venue id is omitted', () => {
      const url = pickImage(['Italian']);
      expect(url).toContain('picsum.photos');
      expect(url).toContain('seed/Italian');
      expect(url).not.toBe('');
    });

    it('falls through to "default" seed for unknown empty cuisines', () => {
      const url = pickImage([]);
      expect(url).toContain('picsum.photos');
      expect(url).toContain('seed/default');
      expect(url).not.toBe('');
    });

    it('returns deterministic URL for same venue id', () => {
      const url1 = pickImage(['Japanese', 'Italian'], 'v42');
      const url2 = pickImage(['Japanese', 'Italian'], 'v42');
      expect(url1).toBe(url2);
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
