import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { formatKwacha } from '../lib/money';
import { whatsappLink } from '../lib/payments';
import { useConfirmMoveIn, useLandlordContact } from '../lib/queries';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { Notice } from './Status';
import { useToast } from './Toast';

/** "Message landlord on WhatsApp", unlocked by a held or released reservation. */
export function WhatsAppButton({ listingId, title, reference, block }: { listingId: string; title: string; reference: string; block?: boolean }) {
  const contact = useLandlordContact(listingId, true);
  if (contact.isPending) {
    return (
      <Button variant="secondary" block={block} disabled>
        <MessageCircle size={15} strokeWidth={1.5} aria-hidden="true" />
        Getting the landlord's number…
      </Button>
    );
  }
  if (!contact.data) {
    return <p className="reserve-note">The landlord hasn't added a WhatsApp number yet. We've let them know.</p>;
  }
  const message = `Hi, I've reserved "${title}" on CabinHub (ref ${reference}). When can I view the room and collect the keys?`;
  return (
    <a
      className={block ? 'btn btn-secondary btn-block whatsapp-button' : 'btn btn-secondary whatsapp-button'}
      href={whatsappLink(contact.data, message)}
      target="_blank"
      rel="noopener noreferrer"
    >
      <MessageCircle size={15} strokeWidth={1.5} aria-hidden="true" />
      Message landlord on WhatsApp
    </a>
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
