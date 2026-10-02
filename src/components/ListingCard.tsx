import { MapPin, ShieldCheck, Star, Zap } from 'lucide-react';
import { Link } from 'react-router';
import { listingPhotoUrl } from '../lib/images';
import { formatKm } from '../lib/geo';
import { formatKwacha } from '../lib/money';
import { ratingLabel, type Result } from '../pages/search/filters';
import { Blueprint } from './Blueprint';

type Props = {
  listing: Result;
  campusLabel: string;
  highlighted: boolean;
  onHover: (id: string | null) => void;
};

/** A room in the search list. The whole card opens the listing (the title link covers it). */
export function ListingCard({ listing: l, campusLabel, highlighted, onHover }: Props) {
  const photo = listingPhotoUrl(l.cover_path);
  const classes = ['card', 'listing-card'];
  if (l.is_featured) classes.push('is-featured');
  if (highlighted) classes.push('is-highlighted');

  return (
    <Blueprint
      as="article"
      className={classes.join(' ')}
      onMouseEnter={() => onHover(l.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(l.id)}
      onBlur={() => onHover(null)}
    >
      <div className="listing-cover duotone">
        {photo ? <img src={photo} alt="" loading="lazy" decoding="async" /> : <span aria-hidden="true">Photo</span>}
      </div>
      <div className="listing-body">
        <div className="listing-tags">
          {l.is_featured && (
            <span className="tag tag-outline">
              <Zap size={12} strokeWidth={1.5} aria-hidden="true" />
              Featured
            </span>
          )}
          {l.landlord_verified ? (
            <span className="tag tag-accent">
              <ShieldCheck size={12} strokeWidth={1.5} aria-hidden="true" />
              Verified landlord
            </span>
          ) : (
            <span className="tag tag-neutral">Not yet verified</span>
          )}
          {l.status === 'reserved' && <span className="tag tag-neutral">Reserved</span>}
        </div>
        <h2 className="card-title listing-title">
          <Link to={`/listing/${l.id}`} className="stretched-link">
            {l.title}
          </Link>
        </h2>
        <div className="listing-meta">
          <MapPin size={14} strokeWidth={1.5} aria-hidden="true" />
          <span>
            {l.area} · {formatKm(l.km)} km to {campusLabel} · {l.type_label}
          </span>
        </div>
        <div className="listing-foot">
          <div>
            <span className="listing-price">{formatKwacha(l.rent_ngwee)}</span>
            <span className="listing-per"> / month</span>
          </div>
          <span className="listing-rating">
            <Star size={13} strokeWidth={1.5} aria-hidden="true" />
            {ratingLabel(l.avg_rating, l.review_count)}
          </span>
        </div>
      </div>
    </Blueprint>
  );
}

/** Loading placeholder in the card's shape. */
export function ListingCardSkeleton() {
  return (
    <Blueprint className="card listing-card skeleton" aria-hidden="true">
      <div className="listing-cover" />
      <div className="listing-body">
        <span className="skeleton-bar" style={{ width: '40%' }} />
        <span className="skeleton-bar skeleton-bar-lg" style={{ width: '80%' }} />
        <span className="skeleton-bar" style={{ width: '65%' }} />
        <span className="skeleton-bar skeleton-bar-lg" style={{ width: '30%', marginTop: 'auto' }} />
      </div>
    </Blueprint>
  );
}
