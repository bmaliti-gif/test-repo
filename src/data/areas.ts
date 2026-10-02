// From docs/places.md (suburb centres, checked against OpenStreetMap).
// Used for the area filter, and as the starting pin for a new listing.
export type Area = {
  name: string;
  lat: number;
  lng: number;
};

export const AREAS: Area[] = [
  { name: 'Bauleni', lat: -15.4424, lng: 28.3828 },
  { name: 'Chelston', lat: -15.3696, lng: 28.391 },
  { name: 'Chudleigh', lat: -15.3724, lng: 28.3357 },
  { name: 'Kalingalinga', lat: -15.4046, lng: 28.3358 },
  { name: 'Longacres', lat: -15.417, lng: 28.3141 },
  { name: 'Mass Media', lat: -15.4067, lng: 28.3189 },
  { name: 'Rhodes Park', lat: -15.4068, lng: 28.3051 },
];

/** The middle of Lusaka's student areas, for the map's starting view. */
export const LUSAKA_CENTRE = { lat: -15.405, lng: 28.33 };

export function areaByName(name: string): Area | undefined {
  return AREAS.find((a) => a.name === name);
}
