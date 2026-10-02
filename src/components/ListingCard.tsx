import { BadgeCheck, Home, MapPin, Star, Zap } from 'lucide-react';
import { Link } from 'react-router';
import { listingPhotoUrl } from '../lib/images';
import { formatKm } from '../lib/geo';
import { formatKwacha } from '../lib/money';
import type { Result } from '../pages/search/filters';
import { SaveButton } from './SaveButton';

type Props = {
  listing: Result;
  campusLabel: string;
  highlighted: boolean;
  onHover: (id: string | null) => void;
};

/** A room in search results: photo first, then price, place and trust signals. The whole card opens the listing. */
export function ListingCard({ listing: l, campusLabel, highlighted, onHover }: Props) {
  const photo = listingPhotoUrl(l.cover_path);
  const classes = ['listing-card'];
  if (highlighted) classes.push('is-highlighted');

  return (
    <article
      className={classes.join(' ')}
      onMouseEnter={() => onHover(l.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(l.id)}
      onBlur={() => onHover(null)}
    >
      <div className="listing-cover">
        {photo ? (
          <img src={photo} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="cover-empty" aria-hidden="true">
            <Home size={28} strokeWidth={1.5} />
            Photos coming soon
          </span>
        )}
        <div className="cover-tags">
          {l.is_featured && (
            <span className="tag tag-outline">
              <Zap size={12} strokeWidth={2} aria-hidden="true" />
              Featured
            </span>
          )}
          {l.status === 'reserved' && <span className="tag tag-dark">Reserved</span>}
        </div>
        <SaveButton listingId={l.id} variant="heart" title={l.title} />
      </div>

      <div className="listing-body">
        <div className="listing-top">
          <span className="listing-place">
            <MapPin size={14} strokeWidth={1.75} aria-hidden="true" />
            {l.area} · {formatKm(l.km)} km to {campusLabel}
          </span>
          <span className="listing-rating" aria-label={l.review_count ? `Rated ${l.avg_rating} out of 5 from ${l.review_count} reviews` : 'New listing'}>
            {l.review_count ? (
              <>
                <Star size={13} strokeWidth={2} aria-hidden="true" fill="currentColor" />
                {l.avg_rating?.toFixed(1).replace(/\.0$/, '')} <span className="muted">({l.review_count})</span>
              </>
            ) : (
              <span className="new-badge">New</span>
            )}
          </span>
        </div>
        <h2 className="listing-title">
          <Link to={`/listing/${l.id}`} className="stretched-link">
            {l.title}
          </Link>
        </h2>
        <span className="listing-type">{l.type_label}</span>
        <div className="listing-foot">
          <div>
            <span className="listing-price">{formatKwacha(l.rent_ngwee)}</span>
            <span className="listing-per"> / month</span>
          </div>
          {l.landlord_verified ? (
            <span className="verified-badge">
              <BadgeCheck size={15} strokeWidth={2} aria-hidden="true" />
              Verified
            </span>
          ) : (
            <span className="unverified-note">Not yet verified</span>
          )}
        </div>
      </div>
    </article>
  );
}

/** Loading placeholder in the card's shape. */
export function ListingCardSkeleton() {
  return (
    <div className="listing-card skeleton" aria-hidden="true">
      <div className="listing-cover" />
      <div className="listing-body">
        <span className="skeleton-bar" style={{ width: '55%' }} />
        <span className="skeleton-bar skeleton-bar-lg" style={{ width: '85%' }} />
        <span className="skeleton-bar skeleton-bar-lg" style={{ width: '35%' }} />
      </div>
    </div>
  );
}
