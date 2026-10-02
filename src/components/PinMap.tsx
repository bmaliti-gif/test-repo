import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { LatLng } from '../lib/geo';
import { Blueprint } from './Blueprint';

type Props = {
  value: LatLng;
  onChange: (next: LatLng) => void;
};

const pinIcon = L.divIcon({
  className: 'map-icon',
  html: '<span class="drop-pin" aria-hidden="true"></span>',
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

function TapToMove({ onChange }: { onChange: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onChange({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

/** Re-centre when the pin is moved from outside (e.g. a new area was chosen). */
function FollowPin({ value }: { value: LatLng }) {
  const map = useMap();
  useEffect(() => {
    if (!map.getBounds().pad(-0.2).contains([value.lat, value.lng])) map.panTo([value.lat, value.lng]);
  }, [map, value.lat, value.lng]);
  return null;
}

/** Tap the map (or drag the pin) to mark where the room is. Saved to about 100 m. */
export default function PinMap({ value, onChange }: Props) {
  const handlers = useMemo(
    () => ({
      dragend: (e: L.LeafletEvent) => {
        const p = (e.target as L.Marker).getLatLng();
        onChange({ lat: p.lat, lng: p.lng });
      },
    }),
    [onChange],
  );

  return (
    <Blueprint className="pin-map">
      <MapContainer center={[value.lat, value.lng]} zoom={15} scrollWheelZoom={false} className="search-map-canvas" aria-label="Map: tap to place your room">
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        <TapToMove onChange={onChange} />
        <FollowPin value={value} />
        <Marker position={[value.lat, value.lng]} icon={pinIcon} draggable eventHandlers={handlers} title="Your room (drag to move)" />
      </MapContainer>
    </Blueprint>
  );
}
