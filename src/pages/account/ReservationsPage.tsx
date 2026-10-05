import { useState } from 'react';
import { CalendarCheck, Flag, Search, Star } from 'lucide-react';
import { Link } from 'react-router';
import { Blueprint } from '../../components/Blueprint';
import { Button } from '../../components/Button';
import { ReportDialog } from '../../components/ReportDialog';
import { ReviewDialog } from '../../components/ReviewDialog';
import { ConfirmMoveInButton, WhatsAppButton } from '../../components/ReservationActions';
import { Loading, Notice } from '../../components/Status';
import { formatKwacha } from '../../lib/money';
import { useMyReservations, type MyReservation } from '../../lib/queries';

const STATUS: Record<MyReservation['status'], { label: string; tag: string; note: string }> = {
  held: {
    label: 'Deposit held',
    tag: 'tag-accent',
    note: 'CabinHub is holding your deposit. Confirm move-in once you have the keys and the room is as listed.',
  },
  released: { label: 'Moved in', tag: 'tag-neutral', note: 'Move-in confirmed. Your deposit was released to the landlord.' },
  refunded: { label: 'Refunded', tag: 'tag-outline', note: 'Your deposit and booking fee were paid back to your mobile money.' },
};

const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export default function ReservationsPage() {
  const reservations = useMyReservations();
  const [reporting, setReporting] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<MyReservation | null>(null);

  if (reservations.isPending) return <Loading label="Loading your reservations…" />;

  const list = reservations.data ?? [];

  return (
    <div className="page reservations-page">
      <div>
        <div className="kicker">Deposits and move-in</div>
        <h1>My reservations</h1>
      </div>

      {reservations.isError && (
        <Notice tone="error">
          We couldn't load your reservations.{' '}
          <button type="button" className="link-button" onClick={() => reservations.refetch()}>
            Retry
          </button>
        </Notice>
      )}

      {!reservations.isError && list.length === 0 && (
        <Blueprint className="card empty-card">
          <h2 className="card-title">No reservations yet</h2>
          <p className="card-body">
            When you reserve a room, your deposit is held here by CabinHub until you move in, and the landlord's WhatsApp
            unlocks.
          </p>
          <div>
            <Link to="/" className="btn btn-secondary">
              <Search size={15} strokeWidth={1.5} aria-hidden="true" />
              Find a room
            </Link>
          </div>
        </Blueprint>
      )}

      <ul className="reservation-list">
        {list.map((r) => {
          const s = STATUS[r.status];
          const visible = r.listing_status === 'live' || r.listing_status === 'reserved';
          return (
            <Blueprint as="li" key={r.id} className="card reservation-card">
              <div className="reservation-top">
                <span className={`tag ${s.tag}`}>
                  {r.status === 'held' && <CalendarCheck size={12} strokeWidth={1.5} aria-hidden="true" />}
                  {s.label}
                </span>
                <span className="reservation-ref">Ref {r.reference}</span>
              </div>
              <h2 className="card-title reservation-title">
                {visible ? <Link to={`/listing/${r.listing_id}`}>{r.listing_title}</Link> : r.listing_title}
              </h2>
              <p className="reservation-meta">
                {r.listing_area} · {r.landlord_name || 'Landlord'} · reserved {date(r.held_at ?? r.created_at)}
              </p>
              <dl className="reservation-money">
                <div>
                  <dt>Deposit</dt>
                  <dd>{formatKwacha(r.deposit_ngwee)}</dd>
                </div>
                <div>
                  <dt>Booking fee</dt>
                  <dd>{formatKwacha(r.booking_fee_ngwee)}</dd>
                </div>
                {r.released_at && (
                  <div>
                    <dt>Moved in</dt>
                    <dd>{date(r.released_at)}</dd>
                  </div>
                )}
                {r.refunded_at && (
                  <div>
                    <dt>Refunded</dt>
                    <dd>{date(r.refunded_at)}</dd>
                  </div>
                )}
              </dl>
              <p className="card-body">
                {s.note}
                {r.status === 'refunded' && r.note && ` Reason: ${r.note}`}
              </p>
              {r.status === 'released' &&
                (r.has_review ? (
                  <p className="reservation-reviewed">
                    <Star size={14} strokeWidth={1.5} aria-hidden="true" /> Thanks for reviewing this stay.
                  </p>
                ) : (
                  <Button variant="primary" className="review-button" onClick={() => setReviewing(r)}>
                    <Star size={16} strokeWidth={1.5} aria-hidden="true" />
                    Write a review
                  </Button>
                ))}
              {r.status !== 'refunded' && (
                <div className="reservation-actions">
                  <WhatsAppButton listingId={r.listing_id} title={r.listing_title} reference={r.reference} />
                  {r.status === 'held' && (
                    <ConfirmMoveInButton
                      reservationId={r.id}
                      listingId={r.listing_id}
                      landlordName={r.landlord_name}
                      depositNgwee={r.deposit_ngwee}
                    />
                  )}
                  {r.status === 'held' && (
                    <button type="button" className="link-button report-link" onClick={() => setReporting(r.id)}>
                      <Flag size={13} strokeWidth={1.5} aria-hidden="true" />
                      Report a problem
                    </button>
                  )}
                </div>
              )}
            </Blueprint>
          );
        })}
      </ul>

      {reviewing && (
        <ReviewDialog
          open
          onClose={() => setReviewing(null)}
          reservationId={reviewing.id}
          listingId={reviewing.listing_id}
          roomTitle={reviewing.listing_title}
        />
      )}
      {reporting && (
        <ReportDialog open onClose={() => setReporting(null)} targetType="reservation" targetId={reporting} />
      )}
    </div>
  );
}
