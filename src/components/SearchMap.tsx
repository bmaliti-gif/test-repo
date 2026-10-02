import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router';
import { CAMPUSES } from '../data/campuses';
import { LUSAKA_CENTRE } from '../data/areas';
import { formatKwacha, formatKwachaShort } from '../lib/money';
import type { Result } from '../pages/search/filters';
import { Blueprint } from './Blueprint';

type Props = {
  results: Result[];
  highlightedId: string | null;
  onHover: (id: string | null) => void;
  /** Campus id that distances are measured to (drawn a little stronger). */
  nearId: string;
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

// Leaflet places a divIcon's top-left corner on the point; the inner element shifts itself
// up and left with CSS so the pin is anchored at its bottom centre.
function priceIcon(label: string, hot: boolean) {
  return L.divIcon({
    className: 'map-icon',
    html: `<span class="price-pin${hot ? ' is-hot' : ''}">${escapeHtml(label)}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function campusIcon(label: string, selected: boolean) {
  return L.divIcon({
    className: 'map-icon',
    html: `<span class="campus-marker${selected ? ' is-selected' : ''}"><i></i><b>${escapeHtml(label)}</b></span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/** Zoom to fit the rooms whenever the set of results changes. */
function FitToResults({ results }: { results: Result[] }) {
  const map = useMap();
  const key = results.map((r) => r.id).join(',');
  useEffect(() => {
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
  }, [map]);
  useEffect(() => {
    if (results.length === 0) return;
    const bounds = L.latLngBounds(results.map((r) => [r.lat, r.lng] as [number, number]));
    const fit = () => {
      // The map's box can change size after it first draws (sticky layout, fonts); measure again first.
      map.invalidateSize();
      map.fitBounds(bounds.pad(0.15), { maxZoom: 15, animate: false });
    };
    fit();
    const t = setTimeout(fit, 250);
    return () => clearTimeout(t);
  }, [key, map]); // `key` stands in for `results`: refit only when the set of rooms changes

  // Keep the map filling its box when the window or layout changes.
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

export default function SearchMap({ results, highlightedId, onHover, nearId }: Props) {
  const navigate = useNavigate();
  const campusIcons = useMemo(
    () => CAMPUSES.map((c) => ({ campus: c, icon: campusIcon(c.short, c.id === nearId) })),
    [nearId],
  );

  return (
    <Blueprint className="search-map">
      <MapContainer
        center={[LUSAKA_CENTRE.lat, LUSAKA_CENTRE.lng]}
        zoom={13}
        scrollWheelZoom={false}
        className="search-map-canvas"
        aria-label="Map of rooms in Lusaka"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        <FitToResults results={results} />
        {campusIcons.map(({ campus, icon }) => (
          <Marker
            key={campus.id}
            position={[campus.lat, campus.lng]}
            icon={icon}
            interactive={false}
            keyboard={false}
            zIndexOffset={-100}
          />
        ))}
        {results.map((r) => {
          const hot = r.id === highlightedId;
          return (
            <Marker
              key={r.id}
              position={[r.lat, r.lng]}
              icon={priceIcon(formatKwachaShort(r.rent_ngwee), hot)}
              zIndexOffset={hot ? 1000 : 0}
              title={`${r.title}, ${formatKwacha(r.rent_ngwee)} a month`}
              eventHandlers={{
                click: () => navigate(`/listing/${r.id}`),
                mouseover: () => onHover(r.id),
                mouseout: () => onHover(null),
                keypress: (e) => {
                  const key = (e.originalEvent as KeyboardEvent).key;
                  if (key === 'Enter' || key === ' ') navigate(`/listing/${r.id}`);
                },
              }}
            />
          );
        })}
      </MapContainer>
      <div className="map-legend" aria-hidden="true">
        <span>
          <i className="legend-campus" />
          Campus
        </span>
        <span>
          <i className="legend-room" />
          Room (rent in K)
        </span>
      </div>
    </Blueprint>
  );
}
