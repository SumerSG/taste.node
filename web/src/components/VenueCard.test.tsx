import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VenueCard } from './VenueCard';
import type { Venue } from '../data/types';

const mockVenue: Venue = {
  id: 'v1',
  name: 'The Test Bistro',
  image_url: 'https://example.com/image.jpg',
  location: { lat: 35.0, lng: 139.0 },
  cuisines: ['French', 'Bistro'],
  dietary_tags: ['vegetarian'],
  price_tier: 3,
  health_score: 0.85,
  source: 'synthetic',
};

describe('VenueCard', () => {
  it('renders venue name and cuisines', () => {
    render(<VenueCard venue={mockVenue} />);
    expect(screen.getByText('The Test Bistro')).toBeInTheDocument();
    expect(screen.getByText('French · Bistro')).toBeInTheDocument();
  });

  it('displays dietary tags', () => {
    render(<VenueCard venue={mockVenue} />);
    expect(screen.getByText('vegetarian')).toBeInTheDocument();
  });

  it('displays score badge when provided', () => {
    render(<VenueCard venue={mockVenue} score={0.87} />);
    expect(screen.getByText('87% match')).toBeInTheDocument();
  });

  it('displays explanation when provided', () => {
    render(<VenueCard venue={mockVenue} explanation="You will love this place" />);
    expect(screen.getByText(/You will love this place/)).toBeInTheDocument();
  });

  it('calls onClick when card image is clicked', () => {
    const handleClick = vi.fn();
    render(<VenueCard venue={mockVenue} onClick={handleClick} />);
    const img = screen.getByAltText('The Test Bistro');
    fireEvent.click(img);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('calls onAdd when add button is clicked', () => {
    const handleAdd = vi.fn();
    render(<VenueCard venue={mockVenue} onAdd={handleAdd} />);
    fireEvent.click(screen.getByText('Add to My Ranking'));
    expect(handleAdd).toHaveBeenCalledTimes(1);
  });

  it('renders compact variant without add button', () => {
    const handleClick = vi.fn();
    render(<VenueCard venue={mockVenue} onClick={handleClick} compact />);
    expect(screen.queryByText('Add to My Ranking')).not.toBeInTheDocument();
    expect(screen.getByText('The Test Bistro')).toBeInTheDocument();
  });

  it('displays health score when high', () => {
    render(<VenueCard venue={mockVenue} />);
    expect(screen.getByText('Health 85%')).toBeInTheDocument();
  });

  it('displays price tier badge', () => {
    render(<VenueCard venue={mockVenue} />);
    expect(screen.getByText('$$$')).toBeInTheDocument();
  });

  it('displays distance when provided', () => {
    render(<VenueCard venue={mockVenue} distance={2.5} />);
    expect(screen.getByText('2.5 km')).toBeInTheDocument();
  });
});
