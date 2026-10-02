import { useMemo, useState } from 'react';
import { Heart, Search } from 'lucide-react';
import { Link } from 'react-router';
import { Blueprint } from '../../components/Blueprint';
import { Button } from '../../components/Button';
import { ListingCard, ListingCardSkeleton } from '../../components/ListingCard';
import { Notice } from '../../components/Status';
import { CAMPUSES } from '../../data/campuses';
import { useMe } from '../../lib/auth';
import { distanceKm } from '../../lib/geo';
import { useSavedCards, useSavedIds, useToggleSaved } from '../../lib/queries';

export default function SavedPage() {
  const { me } = useMe();
  const ids = useSavedIds();
  const cards = useSavedCards(ids.data);
  const toggle = useToggleSaved();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const campus = CAMPUSES.find((c) => c.id === me?.profile.campus) ?? CAMPUSES[0];

  const results = useMemo(
    () => (cards.data ?? []).map((c) => ({ ...c, km: distanceKm(c, campus) })),
    [cards.data, campus],
  );
  const count = ids.data?.length ?? 0;
  const loading = ids.isPending || (count > 0 && cards.isPending);

  return (
    <div className="page saved-page">
      <div>
        <div className="kicker">Your shortlist</div>
        <h1>Saved rooms</h1>
        {!loading && count > 0 && (
          <p className="muted lede">
            {count} saved room{count === 1 ? '' : 's'}. Rooms that have been let drop off this list.
          </p>
        )}
      </div>

      {loading && (
        <div className="saved-list">
          {[0, 1].map((i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      )}

      {(ids.isError || cards.isError) && (
        <Notice tone="error">
          We couldn't load your saved rooms.{' '}
          <button type="button" className="link-button" onClick={() => (ids.isError ? ids.refetch() : cards.refetch())}>
            Retry
          </button>
        </Notice>
      )}

      {!loading && !ids.isError && count === 0 && (
        <Blueprint className="card empty-card">
          <h2 className="card-title">No saved rooms yet</h2>
          <p className="card-body">
            Tap <Heart size={13} strokeWidth={1.5} aria-label="the heart" style={{ verticalAlign: '-2px' }} /> Save on any
            room to keep it here while you compare.
          </p>
          <div>
            <Link to="/" className="btn btn-secondary">
              <Search size={15} strokeWidth={1.5} aria-hidden="true" />
              Find a room
            </Link>
          </div>
        </Blueprint>
      )}

      {!loading && results.length > 0 && (
        <ul className="saved-list">
          {results.map((r) => (
            <li key={r.id} className="saved-item">
              <ListingCard listing={r} campusLabel={campus.short} highlighted={hoverId === r.id} onHover={setHoverId} />
              <Button
                variant="ghost"
                className="saved-remove"
                onClick={() => toggle.mutate({ listingId: r.id, save: false })}
                aria-label={`Remove ${r.title} from saved rooms`}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
