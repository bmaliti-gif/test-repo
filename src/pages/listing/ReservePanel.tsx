import { Lock, Smartphone } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { Blueprint } from '../../components/Blueprint';
import { Button } from '../../components/Button';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../lib/auth';
import type { AppSettings, ListingCard } from '../../lib/database.types';
import { formatKwacha } from '../../lib/money';

type Props = {
  listing: ListingCard;
  settings: AppSettings | undefined;
};

/**
 * Price, deposit + fee, and "Reserve with mobile money". Sticky beside the details on
 * desktop; a sticky bar at the bottom on phones.
 */
export function ReservePanel({ listing, settings }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const deposit = settings?.deposit_ngwee ?? 0;
  const fee = settings?.booking_fee_ngwee ?? 0;
  const ownRoom = user?.id === listing.landlord_id;
  const reserved = listing.status === 'reserved';

  function reserve() {
    if (!user) {
      navigate(`/signin?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    // The payment dialog arrives in Block 6.
    toast('Reserving with mobile money is coming in the next update.');
  }

  const price = (
    <div className="reserve-price">
      <span className="reserve-amount">{formatKwacha(listing.rent_ngwee)}</span>
      <span className="reserve-per"> / month</span>
    </div>
  );

  let action;
  if (reserved) {
    action = (
      <p className="reserve-note">
        <span className="tag tag-neutral">Reserved</span> This room is currently reserved.
      </p>
    );
  } else if (ownRoom) {
    action = <p className="reserve-note">This is your listing. Tenants reserve it here.</p>;
  } else {
    action = (
      <Button variant="primary" block className="reserve-button" onClick={reserve} disabled={!settings}>
        <Smartphone size={16} strokeWidth={1.5} aria-hidden="true" />
        Reserve with mobile money
      </Button>
    );
  }

  return (
    <>
      <Blueprint as="aside" className="card elev-sm reserve-panel" aria-label="Reserve this room">
        {price}
        {!reserved && !ownRoom && (
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
        {action}
        {!reserved && !ownRoom && (
          <div className="reserve-safety">
            <Lock size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>
              Your deposit is held by BoardZM, not the landlord, until you move in. Deducted from your first month's rent.
            </span>
          </div>
        )}
      </Blueprint>

      {/* Phones: price + button pinned above the tab bar. */}
      <div className="reserve-bar">
        {price}
        {action}
      </div>
    </>
  );
}
