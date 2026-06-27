import { describe, it, expect } from 'vitest';
import { parseChatQuery } from './chatParser';

describe('parseChatQuery', () => {
  it('returns input text unchanged', () => {
    const result = parseChatQuery('I want pizza');
    expect(result.text).toBe('I want pizza');
  });

  it('detects Japanese cuisine', () => {
    const result = parseChatQuery('Good ramen near me');
    expect(result.filters.cuisine).toBe('ラーメン');
  });

  it('detects Italian cuisine', () => {
    const result = parseChatQuery('Best pasta in town');
    expect(result.filters.cuisine).toBe('パスタ');
  });

  it('detects vegan diet', () => {
    const result = parseChatQuery('Vegan-friendly restaurant');
    expect(result.filters.diet).toBe('vegan');
  });

  it('detects vegetarian diet', () => {
    const result = parseChatQuery('Vegetarian options');
    expect(result.filters.diet).toBe('veg');
  });

  it('detects pescatarian diet', () => {
    const result = parseChatQuery('Pescatarian seafood place');
    expect(result.filters.diet).toBe('fish');
  });

  it('detects price tier $', () => {
    const result = parseChatQuery('Cheap eats under $');
    expect(result.filters.price_tier).toBe(1);
  });

  it('detects price tier $$$', () => {
    const result = parseChatQuery('Fine dining $$$$');
    expect(result.filters.price_tier).toBe(4);
  });

  it('detects moderate price', () => {
    const result = parseChatQuery('Mid-range restaurant');
    expect(result.filters.price_tier).toBe(2);
  });

  it('detects healthy preference', () => {
    const result = parseChatQuery('Healthy salad place');
    expect(result.filters.healthiness_min).toBe(0.7);
  });

  it('detects very healthy preference', () => {
    const result = parseChatQuery('Super healthy clean eating');
    expect(result.filters.healthiness_min).toBe(0.9);
  });

  it('detects radius in km', () => {
    const result = parseChatQuery('Within 5 km');
    expect(result.filters.radius_km).toBe(5);
  });

  it('detects radius in miles', () => {
    const result = parseChatQuery('Within 2 miles');
    expect(result.filters.radius_km).toBe(3);
  });

  it('detects nearby radius', () => {
    const result = parseChatQuery('Close by restaurant');
    expect(result.filters.radius_km).toBe(3);
  });

  it('returns empty filters for unmatched query', () => {
    const result = parseChatQuery('Hello world');
    expect(Object.keys(result.filters)).toHaveLength(0);
  });

  it('combines multiple filters', () => {
    const result = parseChatQuery('Healthy vegan Italian under $$ near 3km');
    expect(result.filters.cuisine).toBe('イタリアン');
    expect(result.filters.diet).toBe('vegan');
    expect(result.filters.price_tier).toBe(2);
    expect(result.filters.healthiness_min).toBe(0.7);
    expect(result.filters.radius_km).toBe(3);
  });

  it('detects mutual friend from name', () => {
    const result = parseChatQuery('Something good with Alex');
    expect(result.filters.with_users).toEqual(['alex_12']);
  });

  it('detects mutual friend from partial name', () => {
    const result = parseChatQuery('Group dinner and kenji tonight');
    expect(result.filters.with_users).toEqual(['kenji_08']);
  });

  it('does not detect friend without social context', () => {
    const result = parseChatQuery('Best sushi in town');
    expect(result.filters.with_users).toBeUndefined();
  });
});
