import { useState } from 'react';
import { Lock, ShieldCheck, Smartphone } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Blueprint } from '../../components/Blueprint';
import { Button } from '../../components/Button';
import { PaymentDialog } from '../../components/PaymentDialog';
import { ConfirmMoveInButton, WhatsAppButton } from '../../components/ReservationActions';
import { useAuth, useMe } from '../../lib/auth';
import type { AppSettings, ListingCard } from '../../lib/database.types';
import { formatKwacha } from '../../lib/money';
import { createReservation } from '../../lib/payments';
import { useInvalidateReservation, useMyReservations } from '../../lib/queries';

type Props = {
  listing: ListingCard;
  settings: AppSettings | undefined;
};

/**
 * Price, deposit + fee, and "Reserve with mobile money" — or, once reserved, the
 * deposit status with WhatsApp and Confirm move-in. Sticky beside the details on
 * desktop; a sticky bar at the bottom on phones.
 */
export function ReservePanel({ listing, settings }: Props) {
  const { user } = useAuth();
  const { me } = useMe();
  const navigate = useNavigate();
  const location = useLocation();
  const reservations = useMyReservations();
  const invalidate = useInvalidateReservation();
  const [paying, setPaying] = useState(false);

  const deposit = settings?.deposit_ngwee ?? 0;
  const fee = settings?.booking_fee_ngwee ?? 0;
  const ownRoom = user?.id === listing.landlord_id;
  const mine = reservations.data?.find((r) => r.listing_id === listing.id && r.status !== 'refunded');
  const reservedByOther = !mine && listing.status === 'reserved';
  const isLandlordAccount = me?.profile.role === 'landlord';
  const canReserve = !mine && !reservedByOther && !ownRoom && !isLandlordAccount && listing.status === 'live';

  function reserve() {
    if (!user) {
      navigate(`/signin?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setPaying(true);
  }

  const price = (
    <div className="reserve-price">
      <span className="reserve-amount">{formatKwacha(listing.rent_ngwee)}</span>
      <span className="reserve-per"> / month</span>
    </div>
  );

  let status = null;
  let actions = null;
  if (mine?.status === 'held') {
    status = (
      <div className="reserved-box">
        <strong>
          <ShieldCheck size={16} strokeWidth={1.5} aria-hidden="true" />
          Reserved — deposit held
        </strong>
        <span>
          Ref {mine.reference}. Released to the landlord when you confirm move-in, refunded if the room isn't as listed.
        </span>
      </div>
    );
    actions = (
      <>
        <WhatsAppButton listingId={listing.id} title={listing.title} reference={mine.reference} block />
        <ConfirmMoveInButton
          reservationId={mine.id}
          listingId={listing.id}
          landlordName={listing.landlord_name}
          depositNgwee={mine.deposit_ngwee}
          block
        />
      </>
    );
  } else if (mine?.status === 'released') {
    status = (
      <div className="moved-box">
        Move-in confirmed. Deposit released to {listing.landlord_name || 'your landlord'}.{' '}
        <Link to="/reservations">My reservations</Link>
      </div>
    );
    actions = <WhatsAppButton listingId={listing.id} title={listing.title} reference={mine.reference} block />;
  } else if (reservedByOther) {
    status = (
      <p className="reserve-note">
        <span className="tag tag-neutral">Reserved</span> This room is currently reserved.
      </p>
    );
  } else if (isLandlordAccount && !ownRoom) {
    status = (
      <p className="reserve-note">
        Landlord accounts can't reserve rooms. To rent a room, sign up as someone looking for a room with a different
        email.
      </p>
    );
  } else if (ownRoom) {
    status = <p className="reserve-note">This is your listing. Tenants reserve it here.</p>;
  } else if (canReserve) {
    actions = (
      <Button variant="primary" block className="reserve-button" onClick={reserve} disabled={!settings}>
        <Smartphone size={16} strokeWidth={1.5} aria-hidden="true" />
        Reserve with mobile money
      </Button>
    );
  } else {
    status = <p className="reserve-note">This room isn't taking reservations right now.</p>;
  }

  return (
    <>
      <Blueprint as="aside" className="card elev-sm reserve-panel" aria-label="Reserve this room">
        {price}
        {canReserve && (
          <dl className="reserve-rows">
            <div>
              <dt>Reservation deposit</dt>
              <dd>{settings ? formatKwacha(deposit) : '…'}</dd>
            </div>
            <div>
              <dt>Booking service fee</dt>
              <dd>{settings ? formatKwacha(fee) : '…'}</dd>
            </div>
            <div className="reserve-total">
              <dt>Pay now</dt>
              <dd>{settings ? formatKwacha(deposit + fee) : '…'}</dd>
            </div>
          </dl>
        )}
        {status}
        {actions}
        {canReserve && (
          <div className="reserve-safety">
            <Lock size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>
              Your deposit is held by CabinHub, not the landlord, until you move in. Deducted from your first month's rent.
            </span>
          </div>
        )}
      </Blueprint>

      {/* Phones: price + main action pinned above the tab bar. */}
      <div className="reserve-bar">
        {price}
        {canReserve ? (
          actions
        ) : mine ? (
          <Link to="/reservations" className="btn btn-secondary">
            {mine.status === 'held' ? 'Deposit held · manage' : 'My reservations'}
          </Link>
        ) : (
          status
        )}
      </div>

      {/* Phones see the full reserved status inline, above the details. */}
      {mine && (
        <div className="reserve-inline">
          {status}
          {actions}
        </div>
      )}

      <PaymentDialog
        open={paying}
        onClose={() => setPaying(false)}
        title={`Reserve ${listing.title}`}
        amountNgwee={deposit + fee}
        lines={[
          { label: 'Reservation deposit', ngwee: deposit },
          { label: 'Booking service fee', ngwee: fee },
        ]}
        defaultPhone={me?.contacts?.whatsapp}
        start={(provider, phone) => createReservation(listing.id, provider, phone)}
        onFinished={() => invalidate(listing.id)}
        success={() => ({
          title: 'Room reserved',
          body: (
            <>
              <strong>{formatKwacha(deposit)}</strong> is held safely by CabinHub. {listing.landlord_name || 'The landlord'}{' '}
              has been notified and will share viewing and key details. To message them directly, unlock their WhatsApp with points.
            </>
          ),
        })}
      />
    </>
  );
}
