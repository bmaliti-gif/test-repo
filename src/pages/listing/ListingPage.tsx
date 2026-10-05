import { useMemo, useState } from 'react';
import { ArrowLeft, Flag, MapPin, ShieldCheck, Star, Zap } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { Blueprint, Corners } from '../../components/Blueprint';
import { Button } from '../../components/Button';
import { Gallery } from '../../components/Gallery';
import { ReportDialog } from '../../components/ReportDialog';
import { NotConnected } from '../../components/RequireAuth';
import { SaveButton } from '../../components/SaveButton';
import { Loading, MessagePage, Notice } from '../../components/Status';
import { CAMPUSES } from '../../data/campuses';
import { useAuth, useMe } from '../../lib/auth';
import { distanceKm, formatKm } from '../../lib/geo';
import { listingPhotoUrl } from '../../lib/images';
import { formatKwacha } from '../../lib/money';
import { useListing, useSettings, type ReviewWithAuthor } from '../../lib/queries';
import { supabase } from '../../lib/supabase';
import { ratingLabel } from '../search/filters';
import { ReservePanel } from './ReservePanel';

const PLACEHOLDERS = ['Main photo', 'Bedroom', 'Kitchen', 'Bathroom', 'Outside'];

const monthYear = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

function availableLabel(date: string) {
  const d = new Date(date + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d <= today) return 'Now';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}) });
}

const initials = (name: string) =>
  name
    .replace(/^(mr|mrs|ms|dr)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || 'CH';

export default function ListingPage() {
  if (!supabase) return <NotConnected />;
  return <Listing />;
}

function Listing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { me } = useMe();
  const detail = useListing(id);
  const settings = useSettings();
  const [galleryAt, setGalleryAt] = useState<number | null>(null);
  const [reporting, setReporting] = useState<{ type: 'listing' | 'review'; id: string } | null>(null);

  const photos = useMemo(() => (detail.data?.photos ?? []).map((p) => listingPhotoUrl(p)!).filter(Boolean), [detail.data]);

  if (detail.isPending) return <Loading label="Loading room…" />;
  if (detail.isError) {
    return (
      <MessagePage kicker="Listing" title="We couldn't load this room">
        <p className="card-body">Check your internet connection, then try again.</p>
        <div>
          <Button variant="primary" onClick={() => detail.refetch()}>
            Retry
          </Button>
        </div>
      </MessagePage>
    );
  }
  if (!detail.data) {
    return (
      <MessagePage kicker="Listing" title="This room isn't available">
        <p className="card-body">It may have been let, or the landlord took it down.</p>
        <div>
          <Link to="/" className="btn btn-secondary">
            Find another room
          </Link>
        </div>
      </MessagePage>
    );
  }

  const { listing: l, reviews } = detail.data;
  const myCampus = CAMPUSES.find((c) => c.id === me?.profile.campus);
  const campus = myCampus ?? [...CAMPUSES].sort((a, b) => distanceKm(l, a) - distanceKm(l, b))[0];
  const km = formatKm(distanceKm(l, campus));
  const sinceYear = new Date(l.landlord_since).getFullYear();
  const published = reviews.filter((r) => r.status === 'published');

  function back() {
    // Go back to the results (keeping filters) if we came from them; otherwise to search.
    if ((window.history.state as { idx?: number } | null)?.idx) navigate(-1);
    else navigate('/');
  }

  function openReport(type: 'listing' | 'review', targetId: string) {
    if (!user) navigate(`/signin?next=${encodeURIComponent(location.pathname)}`);
    else setReporting({ type, id: targetId });
  }

  const specs = [
    { k: 'Rent', v: formatKwacha(l.rent_ngwee) },
    { k: 'Type', v: l.type_label },
    { k: `To ${campus.short}`, v: `${km} km` },
    { k: 'Available', v: availableLabel(l.available_from) },
    { k: 'Deposit', v: settings.data ? formatKwacha(settings.data.deposit_ngwee) : '…' },
  ];

  return (
    <div className="listing-page">
      <div>
        <Button variant="ghost" onClick={back}>
          <ArrowLeft size={15} strokeWidth={1.5} aria-hidden="true" />
          Back to results
        </Button>
      </div>

      <div className="photo-grid" aria-label="Photos">
        {PLACEHOLDERS.map((label, i) => {
          const src = photos[i];
          const main = i === 0;
          const content = src ? (
            <img src={src} alt="" loading={main ? 'eager' : 'lazy'} decoding="async" />
          ) : (
            <span aria-hidden="true">{label}</span>
          );
          const cls = `photo-cell duotone${main ? ' photo-main blueprint' : ''}${src ? ' has-photo' : ''}`;
          return src ? (
            <button
              key={label}
              type="button"
              className={cls}
              onClick={() => setGalleryAt(i)}
              aria-label={main ? `View all ${photos.length} photos` : `View photo ${i + 1}`}
            >
              {main && <Corners />}
              {content}
              {main && photos.length > 5 && <span className="photo-more">+{photos.length - 5} more</span>}
            </button>
          ) : (
            <div key={label} className={cls}>
              {main && <Corners />}
              {content}
            </div>
          );
        })}
      </div>

      <div className="listing-layout">
        <div className="listing-main">
          <div className="listing-head">
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
            <h1>{l.title}</h1>
            <div className="listing-location">
              <MapPin size={15} strokeWidth={1.5} aria-hidden="true" />
              {l.area}, Lusaka · {km} km to {campus.short}
            </div>
          </div>

          <dl className="spec-grid">
            {specs.map((s) => (
              <div key={s.k} className="spec-cell">
                <dt>{s.k}</dt>
                <dd>{s.v}</dd>
              </div>
            ))}
          </dl>

          {l.description && (
            <section className="listing-section" aria-labelledby="about-heading">
              <h2 id="about-heading">About this room</h2>
              <p className="listing-description">{l.description}</p>
            </section>
          )}

          {l.amenities.length > 0 && (
            <section className="listing-section" aria-labelledby="included-heading">
              <h2 id="included-heading">What's included</h2>
              <ul className="amenity-list">
                {l.amenities.map((a) => (
                  <li key={a} className="tag tag-neutral">
                    {a}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Blueprint as="section" className="card landlord-card" aria-label="Landlord">
            <div className="landlord-initials" aria-hidden="true">
              {initials(l.landlord_name)}
            </div>
            <div className="landlord-info">
              <span className="card-title">{l.landlord_name || 'CabinHub landlord'}</span>
              <span className="landlord-note">
                {l.landlord_verified ? 'ID and ownership verified' : 'Verification in progress'} · on CabinHub since {sinceYear}
              </span>
            </div>
            <SaveButton listingId={l.id} />
          </Blueprint>

          <section className="listing-section" aria-labelledby="reviews-heading">
            <div className="reviews-head">
              <h2 id="reviews-heading">Tenant reviews</h2>
              <span className="reviews-summary">
                <Star size={13} strokeWidth={1.5} aria-hidden="true" />
                {ratingLabel(l.avg_rating, l.review_count)} · only past tenants can review
              </span>
            </div>
            {reviews.length === 0 ? (
              <p className="muted">No reviews yet — this is a new listing.</p>
            ) : (
              <ul className="review-list">
                {reviews.map((r) => (
                  <ReviewItem key={r.id} review={r} onReport={() => openReport('review', r.id)} />
                ))}
              </ul>
            )}
            {published.length < reviews.length && (
              <Notice tone="info">Your review is under review and will appear once the CabinHub team approves it.</Notice>
            )}
          </section>

          <div>
            <button type="button" className="link-button report-link" onClick={() => openReport('listing', l.id)}>
              <Flag size={13} strokeWidth={1.5} aria-hidden="true" />
              Report this listing
            </button>
          </div>
        </div>

        <ReservePanel listing={l} settings={settings.data} />
      </div>

      <Gallery photos={photos} start={galleryAt} title={l.title} onClose={() => setGalleryAt(null)} />
      {reporting && (
        <ReportDialog
          open
          onClose={() => setReporting(null)}
          targetType={reporting.type}
          targetId={reporting.id}
        />
      )}
    </div>
  );
}

function ReviewItem({ review: r, onReport }: { review: ReviewWithAuthor; onReport: () => void }) {
  const name = r.author?.full_name?.trim() || 'CabinHub tenant';
  // "Mutale Kabwe" → "Mutale K." like the design.
  const parts = name.split(/\s+/);
  const short = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : name;
  return (
    <li className="review">
      <div className="review-head">
        <strong>
          {short}
          {r.author?.headline && <span className="review-who"> · {r.author.headline}</span>}
        </strong>
        <span className="review-meta">
          {r.status === 'pending' ? 'Under review · ' : ''}
          {r.rating}/5 · {monthYear(r.created_at)}
        </span>
      </div>
      <p className="review-body">{r.body}</p>
      <button type="button" className="link-button review-report" onClick={onReport}>
        Report
      </button>
    </li>
  );
}
