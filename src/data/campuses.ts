// From docs/places.md (checked against OpenStreetMap).
// Distances on listing cards are measured to these points.
export type Campus = {
  id: string;
  name: string;
  /** Short label used on cards: "0.8 km to UNZA". */
  short: string;
  lat: number;
  lng: number;
};

export const CAMPUSES: Campus[] = [
  { id: 'unza', name: 'UNZA (Great East Road)', short: 'UNZA', lat: -15.3949, lng: 28.3315 },
  { id: 'unilus', name: 'UNILUS (Leopards Hill)', short: 'UNILUS', lat: -15.4536, lng: 28.3795 },
  { id: 'evelyn-hone', name: 'Evelyn Hone College', short: 'Evelyn Hone', lat: -15.4171, lng: 28.2892 },
  { id: 'city-centre', name: 'City centre (for workers)', short: 'City centre', lat: -15.4167, lng: 28.282 },
];

export function campusById(id: string): Campus | undefined {
  return CAMPUSES.find((c) => c.id === id);
}
