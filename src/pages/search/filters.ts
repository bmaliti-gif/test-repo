import { CAMPUSES, type Campus } from '../../data/campuses';
import type { RoomCategory, Tables } from '../../lib/database.types';
import { distanceKm } from '../../lib/geo';

export type SortKey = 'recommended' | 'rent' | 'near';

export type Filters = {
  /** null = all areas */
  area: string | null;
  /** In Kwacha. RENT_MAX means "no limit". */
  maxRent: number;
  type: RoomCategory | 'any';
  sort: SortKey;
  verifiedOnly: boolean;
  /** Campus id that distances are measured to. */
  near: string;
};

export const RENT_MIN = 1000;
export const RENT_MAX = 5000;
export const RENT_STEP = 100;

export const SORTS: { value: SortKey; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'rent', label: 'Lowest rent' },
  { value: 'near', label: 'Nearest campus' },
];

/** The columns search needs from listing_cards (no description: saves data). */
export const CARD_COLUMNS =
  'id, title, type_label, category, area, lat, lng, rent_ngwee, status, created_at, landlord_verified, cover_path, avg_rating, review_count, is_featured';

export type SearchCard = Pick<
  Tables<'listings'>,
  'id' | 'title' | 'type_label' | 'category' | 'area' | 'lat' | 'lng' | 'rent_ngwee' | 'status' | 'created_at'
> & {
  landlord_verified: boolean;
  cover_path: string | null;
  avg_rating: number | null;
  review_count: number;
  is_featured: boolean;
};

export type Result = SearchCard & { km: number };

export function defaultFilters(near = 'unza'): Filters {
  return { area: null, maxRent: RENT_MAX, type: 'any', sort: 'recommended', verifiedOnly: false, near };
}

const TYPES = new Set(['single', 'shared', 'self_contained']);
const SORT_KEYS = new Set(['recommended', 'rent', 'near']);

/** Read filters from the URL (?area=Chudleigh&max=2000&type=shared&sort=rent&verified=1&near=unilus). */
export function parseFilters(params: URLSearchParams, defaultNear = 'unza'): Filters {
  const f = defaultFilters(CAMPUSES.some((c) => c.id === defaultNear) ? defaultNear : 'unza');
  const area = params.get('area');
  if (area) f.area = area;
  const max = Number(params.get('max'));
  if (Number.isFinite(max) && max >= RENT_MIN && max <= RENT_MAX) f.maxRent = Math.round(max / RENT_STEP) * RENT_STEP;
  const type = params.get('type');
  if (type && TYPES.has(type)) f.type = type as RoomCategory;
  const sort = params.get('sort');
  if (sort && SORT_KEYS.has(sort)) f.sort = sort as SortKey;
  if (params.get('verified') === '1') f.verifiedOnly = true;
  const near = params.get('near');
  if (near && CAMPUSES.some((c) => c.id === near)) f.near = near;
  return f;
}

/** Write filters to the URL, leaving out anything at its default so links stay short. */
export function filtersToParams(f: Filters, defaultNear = 'unza'): URLSearchParams {
  const p = new URLSearchParams();
  if (f.area) p.set('area', f.area);
  if (f.maxRent !== RENT_MAX) p.set('max', String(f.maxRent));
  if (f.type !== 'any') p.set('type', f.type);
  if (f.sort !== 'recommended') p.set('sort', f.sort);
  if (f.verifiedOnly) p.set('verified', '1');
  if (f.near !== defaultNear) p.set('near', f.near);
  return p;
}

/** How many filters differ from the defaults (shown on the phone "Filters" button). */
export function activeFilterCount(f: Filters): number {
  return [f.area !== null, f.maxRent !== RENT_MAX, f.type !== 'any', f.verifiedOnly].filter(Boolean).length;
}

/**
 * Filter and sort cards. Recommended = featured first, then verified landlords, then newest.
 * Only live and reserved rooms are shown.
 */
export function applyFilters(cards: SearchCard[], f: Filters, campus: Campus): Result[] {
  const maxNgwee = f.maxRent >= RENT_MAX ? Infinity : f.maxRent * 100;
  const results = cards
    .filter(
      (c) =>
        (c.status === 'live' || c.status === 'reserved') &&
        (!f.area || c.area === f.area) &&
        c.rent_ngwee <= maxNgwee &&
        (f.type === 'any' || c.category === f.type) &&
        (!f.verifiedOnly || c.landlord_verified),
    )
    .map((c) => ({ ...c, km: distanceKm(c, campus) }));

  const byRecommended = (a: Result, b: Result) =>
    Number(b.is_featured) - Number(a.is_featured) ||
    Number(b.landlord_verified) - Number(a.landlord_verified) ||
    b.created_at.localeCompare(a.created_at);

  if (f.sort === 'rent') results.sort((a, b) => a.rent_ngwee - b.rent_ngwee || byRecommended(a, b));
  else if (f.sort === 'near') results.sort((a, b) => a.km - b.km || byRecommended(a, b));
  else results.sort(byRecommended);
  return results;
}

/** One sponsored ad: one aimed at this area if there is one, otherwise one shown everywhere. */
export function pickAd<T extends Pick<Tables<'ads'>, 'areas'>>(ads: T[], area: string | null): T | null {
  if (area) {
    return ads.find((a) => a.areas.includes(area)) ?? ads.find((a) => a.areas.length === 0) ?? null;
  }
  return ads.find((a) => a.areas.length === 0) ?? ads[0] ?? null;
}

/** "4.5/5 · 2 reviews" or "New listing". */
export function ratingLabel(avg: number | null, count: number): string {
  if (!count || avg === null) return 'New listing';
  return `${avg.toFixed(1).replace(/\.0$/, '')}/5 · ${count} review${count === 1 ? '' : 's'}`;
}
