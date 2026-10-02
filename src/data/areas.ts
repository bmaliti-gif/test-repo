// From docs/places.md. Coordinates are placeholders until checked in Google Maps.
// Used for the area filter, and as the starting pin for a new listing.
export type Area = {
  name: string;
  lat: number;
  lng: number;
};

export const AREAS: Area[] = [
  { name: 'Bauleni', lat: -15.432, lng: 28.342 },
  { name: 'Chelston', lat: -15.37, lng: 28.38 },
  { name: 'Chudleigh', lat: -15.399, lng: 28.319 },
  { name: 'Kalingalinga', lat: -15.404, lng: 28.333 },
  { name: 'Longacres', lat: -15.418, lng: 28.308 },
  { name: 'Mass Media', lat: -15.404, lng: 28.313 },
  { name: 'Rhodes Park', lat: -15.412, lng: 28.301 },
];

/** The middle of Lusaka, for the map's starting view. */
export const LUSAKA_CENTRE = { lat: -15.405, lng: 28.315 };

export function areaByName(name: string): Area | undefined {
  return AREAS.find((a) => a.name === name);
}
