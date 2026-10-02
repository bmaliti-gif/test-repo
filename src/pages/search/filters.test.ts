import { describe, expect, it } from 'vitest';
import { CAMPUSES } from '../../data/campuses';
import {
  activeFilterCount,
  applyFilters,
  defaultFilters,
  filtersToParams,
  parseFilters,
  pickAd,
  ratingLabel,
  type SearchCard,
} from './filters';

const unza = CAMPUSES[0];

function card(over: Partial<SearchCard>): SearchCard {
  return {
    id: over.id ?? 'x',
    title: 'Room',
    type_label: 'Single room',
    category: 'single',
    area: 'Kalingalinga',
    lat: -15.4,
    lng: 28.33,
    rent_ngwee: 150000,
    status: 'live',
    created_at: '2026-01-01T00:00:00Z',
    landlord_verified: false,
    cover_path: null,
    avg_rating: null,
    review_count: 0,
    is_featured: false,
    ...over,
  };
}

describe('URL filters', () => {
  it('round-trips through the URL', () => {
    const f = { ...defaultFilters(), area: 'Chudleigh', maxRent: 2000, type: 'shared' as const, sort: 'rent' as const, verifiedOnly: true, near: 'unilus' };
    expect(parseFilters(filtersToParams(f))).toEqual(f);
  });

  it('keeps links short when nothing is set', () => {
    expect(filtersToParams(defaultFilters()).toString()).toBe('');
  });

  it('ignores nonsense in the URL', () => {
    const f = parseFilters(new URLSearchParams('max=999999&type=castle&sort=x&near=mars'));
    expect(f).toEqual(defaultFilters());
  });

  it('counts the filters that are set', () => {
    expect(activeFilterCount(defaultFilters())).toBe(0);
    expect(activeFilterCount({ ...defaultFilters(), area: 'Bauleni', verifiedOnly: true })).toBe(2);
  });
});

describe('applyFilters', () => {
  const cards = [
    card({ id: 'cheap', rent_ngwee: 110000, category: 'shared', area: 'Mass Media', lat: -15.404, lng: 28.313 }),
    card({ id: 'verified', rent_ngwee: 180000, landlord_verified: true, lat: -15.393, lng: 28.33 }),
    card({ id: 'featured', rent_ngwee: 380000, is_featured: true, area: 'Longacres', lat: -15.418, lng: 28.308 }),
    card({ id: 'pricey', rent_ngwee: 600000 }),
    card({ id: 'draft', status: 'draft' }),
    card({ id: 'reserved', status: 'reserved', created_at: '2026-06-01T00:00:00Z' }),
  ];

  it('recommends featured, then verified, then newest; hides drafts', () => {
    const ids = applyFilters(cards, defaultFilters(), unza).map((r) => r.id);
    expect(ids.slice(0, 3)).toEqual(['featured', 'verified', 'reserved']);
    expect(ids).not.toContain('draft');
  });

  it('treats the top of the rent slider as "no limit"', () => {
    expect(applyFilters(cards, defaultFilters(), unza).map((r) => r.id)).toContain('pricey');
    expect(applyFilters(cards, { ...defaultFilters(), maxRent: 2000 }, unza).map((r) => r.id)).not.toContain('featured');
  });

  it('filters by area, type and verified landlords', () => {
    expect(applyFilters(cards, { ...defaultFilters(), area: 'Mass Media' }, unza).map((r) => r.id)).toEqual(['cheap']);
    expect(applyFilters(cards, { ...defaultFilters(), type: 'shared' }, unza).map((r) => r.id)).toEqual(['cheap']);
    expect(applyFilters(cards, { ...defaultFilters(), verifiedOnly: true }, unza).map((r) => r.id)).toEqual(['verified']);
  });

  it('sorts by rent and by distance to the chosen campus', () => {
    expect(applyFilters(cards, { ...defaultFilters(), sort: 'rent' }, unza)[0].id).toBe('cheap');
    expect(applyFilters(cards, { ...defaultFilters(), sort: 'near' }, unza)[0].id).toBe('verified');
  });
});

describe('pickAd', () => {
  const everywhere = { id: 'all', areas: [] as string[] };
  const local = { id: 'local', areas: ['Kalingalinga', 'Chudleigh'] };

  it('prefers an ad aimed at the chosen area', () => {
    expect(pickAd([everywhere, local], 'Chudleigh')?.id).toBe('local');
    expect(pickAd([everywhere, local], 'Bauleni')?.id).toBe('all');
    expect(pickAd([local], 'Bauleni')).toBeNull();
  });

  it('shows something when no area is chosen', () => {
    expect(pickAd([local], null)?.id).toBe('local');
    expect(pickAd([], null)).toBeNull();
  });
});

describe('ratingLabel', () => {
  it('reads like the design', () => {
    expect(ratingLabel(4.5, 2)).toBe('4.5/5 · 2 reviews');
    expect(ratingLabel(5, 1)).toBe('5/5 · 1 review');
    expect(ratingLabel(null, 0)).toBe('New listing');
  });
});
