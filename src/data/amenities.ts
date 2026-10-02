// Amenity chips on the listing form and listing page (from the design's sample listings).
export const AMENITIES = [
  'Own bathroom',
  'Shared bathroom',
  'Own entrance',
  'Furnished',
  'Kitchenette',
  'Shared kitchen',
  'Meals included',
  'Meals option',
  'Wi-Fi',
  'Fibre internet',
  'Water tank',
  'Borehole',
  'Solar backup',
  'Backup power',
  'Generator',
  'Security guard',
  '24h security',
  'Parking',
  'Laundry',
  'Study room',
  'Gym',
  'DSTV',
  'Yard',
  'Quiet',
  'Walk to campus',
  'Bus to UNZA',
  'Curfew 22:00',
] as const;

// Room types and their search category (PLAN.md §5: listings.type_label → category).
export type RoomCategory = 'single' | 'shared' | 'self_contained';

export const ROOM_TYPES: { label: string; category: RoomCategory }[] = [
  { label: 'Self-contained room', category: 'self_contained' },
  { label: 'Studio', category: 'self_contained' },
  { label: 'Cottage', category: 'self_contained' },
  { label: 'Bedsitter', category: 'single' },
  { label: 'Single room', category: 'single' },
  { label: 'Bedspace', category: 'shared' },
  { label: 'Shared flat', category: 'shared' },
  { label: 'Shared house', category: 'shared' },
];

// The "Room type" filter on the search page.
export const ROOM_CATEGORIES: { value: RoomCategory | 'any'; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'single', label: 'Single' },
  { value: 'shared', label: 'Shared' },
  { value: 'self_contained', label: 'Self-contained' },
];
