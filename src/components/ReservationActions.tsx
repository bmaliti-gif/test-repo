import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../lib/auth';
import { pts, useUnlockContact } from '../lib/points';
import { MessageCircle } from 'lucide-react';
import { formatKwacha } from '../lib/money';
import { whatsappLink } from '../lib/payments';
import { useConfirmMoveIn, useLandlordContact, useSettings } from '../lib/queries';
import { SpendPointsDialog } from './PointsDialogs';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { Notice } from './Status';
import { useToast } from './Toast';

type WhatsAppProps = {
  listingId: string;
  title: string;
  /** With a reservation, the first message quotes its reference. */
  reference?: string;
  landlordName?: string;
  block?: boolean;
};

/**
 * "WhatsApp the landlord". The number costs points (once per landlord, covering all their
 * rooms); after unlocking, the button opens a WhatsApp chat with a friendly first message.
 */
export function WhatsAppButton({ listingId, title, reference, landlordName, block }: WhatsAppProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const settings = useSettings();
  const contact = useLandlordContact(listingId, Boolean(user));
  const unlock = useUnlockContact();
  const toast = useToast();
  const [asking, setAsking] = useState(false);
  const cls = block ? 'btn btn-secondary btn-block whatsapp-button' : 'btn btn-secondary whatsapp-button';
  const cost = settings.data?.contact_unlock_points ?? 20;

  if (user && contact.isPending) {
    return (
      <Button variant="secondary" block={block} disabled>
        <MessageCircle size={15} strokeWidth={1.5} aria-hidden="true" />
        Checking…
      </Button>
    );
  }

  if (contact.data) {
    const message = reference
      ? `Hi, I've reserved "${title}" on CabinHub (ref ${reference}). When can I view the room and collect the keys?`
      : `Hi, I saw "${title}" on CabinHub. Is it still available, and when could I come to view it?`;
    return (
      <a className={cls} href={whatsappLink(contact.data, message)} target="_blank" rel="noopener noreferrer">
        <MessageCircle size={15} strokeWidth={1.5} aria-hidden="true" />
        WhatsApp {landlordName ? landlordName.split(' ')[0] : 'the landlord'}
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        className={cls}
        onClick={() => (user ? setAsking(true) : navigate(`/signin?next=${encodeURIComponent(location.pathname)}`))}
      >
        <MessageCircle size={15} strokeWidth={1.5} aria-hidden="true" />
        WhatsApp the landlord · {pts(cost)}
      </button>
      <SpendPointsDialog
        open={asking}
        onClose={() => setAsking(false)}
        title="See the landlord's WhatsApp"
        description={
          <>
            Unlock {landlordName || 'this landlord'}'s WhatsApp number to ask questions or arrange a viewing. It stays
            unlocked for <strong>all their rooms</strong>.
          </>
        }
        cost={cost}
        confirmLabel={`Unlock for ${pts(cost)}`}
        onConfirm={async () => {
          const r = await unlock.mutateAsync(listingId);
          toast(r.whatsapp ? 'Unlocked. Tap the WhatsApp button to message the landlord.' : "Unlocked. The landlord hasn't added a WhatsApp number yet.");
        }}
      />
    </>
  );
}

type MoveInProps = {
  reservationId: string;
  listingId: string;
  landlordName: string;
  depositNgwee: number;
  block?: boolean;
};

/** "Confirm move-in", with a check first: it releases the deposit to the landlord. */
export function ConfirmMoveInButton({ reservationId, listingId, landlordName, depositNgwee, block }: MoveInProps) {
  const [open, setOpen] = useState(false);
  const confirm = useConfirmMoveIn();
  const toast = useToast();

  async function go() {
    try {
      await confirm.mutateAsync({ reservationId, listingId });
      setOpen(false);
      toast(`Move-in confirmed. Deposit released to ${landlordName || 'your landlord'}.`);
    } catch {
      // The error is shown in the dialog.
    }
  }

  return (
    <>
      <Button variant="secondary" block={block} onClick={() => setOpen(true)}>
        Confirm move-in
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Have you moved in?"
        dismissible={!confirm.isPending}
      >
        <p className="dialog-body">
          Confirming releases your <strong>{formatKwacha(depositNgwee)}</strong> deposit to{' '}
          {landlordName || 'the landlord'}. Only confirm once you have the keys and the room is as listed. If something is
          wrong, report a problem instead and we'll hold the deposit.
        </p>
        {confirm.isError && <Notice tone="error">{confirm.error.message}</Notice>}
        <div className="dialog-actions">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={confirm.isPending}>
            Not yet
          </Button>
          <Button variant="primary" onClick={go} disabled={confirm.isPending}>
            {confirm.isPending ? 'Confirming…' : "Yes, I've moved in"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
