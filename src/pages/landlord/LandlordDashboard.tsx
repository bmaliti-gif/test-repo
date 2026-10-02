import { useState } from 'react';
import { CircleCheck, Pencil, Plus, Zap } from 'lucide-react';
import { Link } from 'react-router';
import { Blueprint, Corners } from '../../components/Blueprint';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { PaymentDialog } from '../../components/PaymentDialog';
import { Loading, MessagePage, Notice } from '../../components/Status';
import { useToast } from '../../components/Toast';
import { useMe } from '../../lib/auth';
import type { ListingCard } from '../../lib/database.types';
import { useCancelReservation, useInvalidateLandlord, useLandlordDashboard, useListingStatusAction, type DepositRow } from '../../lib/landlord';
import { LISTING_STATUS } from '../../lib/listingStatus';
import { formatKwacha } from '../../lib/money';
import { startFeePayment } from '../../lib/payments';
import { formatPhone, providerLabel } from '../../lib/phone';
import { useSettings } from '../../lib/queries';

const DEPOSIT_STATUS = {
  held: { label: 'Held', tag: 'tag-outline' },
  released: { label: 'Paid out', tag: 'tag-accent' },
  refunded: { label: 'Refunded', tag: 'tag-neutral' },
} as const;

const dateShort = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** "+260961234471" → "096 ••• 4471" */
function maskPhone(e164: string | null | undefined) {
  const p = formatPhone(e164);
  return p ? `${p.slice(0, 3)} ••• ${p.slice(-4)}` : '';
}

export default function LandlordDashboard() {
  const { me } = useMe();
  const dash = useLandlordDashboard();
  const settings = useSettings();
  const toast = useToast();
  const invalidate = useInvalidateLandlord();
  const statusAction = useListingStatusAction();
  const [featuring, setFeaturing] = useState<ListingCard | null>(null);
  const [cancelling, setCancelling] = useState<DepositRow | null>(null);

  if (dash.isPending) return <Loading label="Loading your properties…" />;
  if (dash.isError || !dash.data) {
    return (
      <MessagePage kicker="For landlords" title="We couldn't load your dashboard">
        <p className="card-body">Check your internet connection, then try again.</p>
        <div>
          <Button variant="primary" onClick={() => dash.refetch()}>
            Retry
          </Button>
        </div>
      </MessagePage>
    );
  }

  const { listings, deposits, paidOutThisYear, verification } = dash.data;
  const liveCount = listings.filter((l) => l.status === 'live' || l.status === 'reserved').length;
  const heldTotal = deposits.filter((d) => d.status === 'held').reduce((s, d) => s + d.deposit_ngwee, 0);
  const verified = Boolean(me?.profile.verified_at);
  const contacts = me?.contacts;
  const listingFee = settings.data ? ` · ${formatKwacha(settings.data.listing_fee_ngwee)}` : '';

  async function changeStatus(l: ListingCard, action: 'archive' | 'relist') {
    try {
      const result = await statusAction.mutateAsync({ id: l.id, action });
      const messages: Record<string, string> = {
        archived: 'Archived. Tenants no longer see it.',
        live: 'Relisted. It is live again.',
        in_review: 'Sent to the BoardZM team for review.',
        draft: 'Moved back to drafts. Publish it to go live.',
      };
      toast(messages[result] ?? 'Updated.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  return (
    <div className="landlord-page">
      <div className="landlord-head">
        <div>
          <div className="kicker">Landlord{me?.profile.full_name ? ` · ${me.profile.full_name}` : ''}</div>
          <h1>Your properties</h1>
        </div>
        <Link to="/landlord/listings/new" className="btn btn-primary blueprint list-room-button">
          <Corners />
          <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
          List a room{listingFee}
        </Link>
      </div>

      <dl className="stat-grid">
        <div className="stat-cell">
          <dt>Live listings</dt>
          <dd>{liveCount}</dd>
        </div>
        <div className="stat-cell">
          <dt>Deposits held</dt>
          <dd>{formatKwacha(heldTotal)}</dd>
        </div>
        <div className="stat-cell">
          <dt>Paid out this year</dt>
          <dd>{formatKwacha(paidOutThisYear)}</dd>
        </div>
      </dl>

      <div className="landlord-grid">
        <section className="landlord-main" aria-labelledby="listings-heading">
          <h2 id="listings-heading">Listings</h2>
          {listings.length === 0 ? (
            <Blueprint className="card empty-card">
              <h3 className="card-title">No rooms yet</h3>
              <p className="card-body">
                List your first room: add a few photos, drop a pin and publish. Tenants reserve with a deposit that BoardZM
                holds until they move in.
              </p>
              <div>
                <Link to="/landlord/listings/new" className="btn btn-secondary">
                  <Plus size={15} strokeWidth={1.5} aria-hidden="true" />
                  List a room
                </Link>
              </div>
            </Blueprint>
          ) : (
            <div className="table-wrap">
              <table className="table table-stack">
                <thead>
                  <tr>
                    <th scope="col">Room</th>
                    <th scope="col">Rent</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="cell-actions">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((l) => {
                    const s = LISTING_STATUS[l.status];
                    const canArchive = ['draft', 'in_review', 'live', 'rejected', 'let'].includes(l.status);
                    const canRelist = ['archived', 'let', 'rejected'].includes(l.status);
                    return (
                      <tr key={l.id}>
                        <td data-label="Room">
                          <strong>{l.title}</strong>
                          <span className="cell-sub">
                            {l.area} · {l.photo_count} photo{l.photo_count === 1 ? '' : 's'}
                          </span>
                        </td>
                        <td data-label="Rent">{formatKwacha(l.rent_ngwee)}</td>
                        <td data-label="Status">
                          <div className="cell-tags">
                            <span className={`tag ${s.tag}`} title={s.hint}>
                              {s.label}
                            </span>
                            {l.is_featured && (
                              <span className="tag tag-outline">
                                <Zap size={12} strokeWidth={1.5} aria-hidden="true" />
                                Featured
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="cell-actions" data-label="Actions">
                          <div className="row-actions">
                            <Link to={`/landlord/listings/${l.id}`} className="btn btn-ghost">
                              <Pencil size={14} strokeWidth={1.5} aria-hidden="true" />
                              {l.status === 'draft' ? 'Finish & publish' : 'Edit'}
                            </Link>
                            {l.status === 'live' && (
                              <button type="button" className="btn btn-ghost" onClick={() => setFeaturing(l)}>
                                <Zap size={14} strokeWidth={1.5} aria-hidden="true" />
                                {l.is_featured ? 'Extend' : 'Feature'}
                              </button>
                            )}
                            {(l.status === 'live' || l.status === 'reserved') && (
                              <Link to={`/listing/${l.id}`} className="btn btn-ghost">
                                View
                              </Link>
                            )}
                            {canRelist && (
                              <button type="button" className="btn btn-ghost" onClick={() => changeStatus(l, 'relist')} disabled={statusAction.isPending}>
                                Relist
                              </button>
                            )}
                            {canArchive && (
                              <button type="button" className="btn btn-ghost" onClick={() => changeStatus(l, 'archive')} disabled={statusAction.isPending}>
                                Archive
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <h2 className="section-gap">Deposits &amp; payouts</h2>
          {deposits.length === 0 ? (
            <p className="muted small">No deposits yet. When a tenant reserves one of your rooms, it shows here.</p>
          ) : (
            <div className="table-wrap">
              <table className="table table-stack">
                <thead>
                  <tr>
                    <th scope="col">Tenant</th>
                    <th scope="col">Room</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="cell-actions">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((d) => {
                    const s = DEPOSIT_STATUS[d.status as keyof typeof DEPOSIT_STATUS];
                    return (
                      <tr key={d.id}>
                        <td data-label="Tenant">
                          {d.tenant_name}
                          <span className="cell-sub">Ref {d.reference}</span>
                        </td>
                        <td data-label="Room">{d.room}</td>
                        <td data-label="Amount">{formatKwacha(d.deposit_ngwee)}</td>
                        <td data-label="Status">
                          <span className={`tag ${s.tag}`}>{s.label}</span>
                          <span className="cell-sub">{dateShort(d.released_at ?? d.refunded_at ?? d.held_at ?? d.created_at)}</span>
                        </td>
                        <td className="cell-actions" data-label="">
                          {d.status === 'held' && (
                            <button type="button" className="btn btn-ghost" onClick={() => setCancelling(d)}>
                              Cancel &amp; refund
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="muted small">
            {contacts?.payout_number && contacts.payout_provider ? (
              <>
                Payouts go to {providerLabel(contacts.payout_provider)} {maskPhone(contacts.payout_number)} automatically
                when the tenant confirms move-in. <Link to="/account">Change</Link>
              </>
            ) : (
              <>
                Add a mobile-money payout number in <Link to="/account">Account</Link> so deposits can reach you.
              </>
            )}
          </p>
        </section>

        <VerificationCard verified={verified} verification={verification} payoutLinked={Boolean(contacts?.payout_number)} fee={settings.data?.verification_fee_ngwee} />
      </div>

      {featuring && settings.data && (
        <PaymentDialog
          open
          onClose={() => setFeaturing(null)}
          title={`Feature for ${settings.data.feature_days} days`}
          amountNgwee={settings.data.feature_fee_ngwee}
          defaultPhone={contacts?.payout_number ?? contacts?.whatsapp}
          start={(provider, phone) => startFeePayment('feature_fee', featuring.id, provider, phone)}
          onFinished={() => invalidate()}
          success={(r) => ({
            title: 'Listing featured',
            body: (
              <>
                <strong>{featuring.title}</strong> now shows first in Recommended with a Featured tag
                {r.featured_until ? ` until ${dateShort(r.featured_until)}` : ''}.
              </>
            ),
          })}
        />
      )}

      {cancelling && <CancelDialog row={cancelling} onClose={() => setCancelling(null)} />}
    </div>
  );
}

function VerificationCard({
  verified,
  verification,
  payoutLinked,
  fee,
}: {
  verified: boolean;
  verification: { status: string; nrc_front_path: string | null; selfie_path: string | null; ownership_path: string | null; rejection_reason: string | null } | null;
  payoutLinked: boolean;
  fee: number | undefined;
}) {
  const status = verified ? 'approved' : verification?.status;
  const doc = (path: string | null | undefined) =>
    status === 'approved' ? 'Approved' : status === 'rejected' ? 'Needs attention' : path ? 'Uploaded' : 'Not uploaded';
  const rows = [
    { k: 'National Registration Card', v: doc(verification?.nrc_front_path) },
    { k: 'Selfie match', v: doc(verification?.selfie_path) },
    { k: 'Title deed / lease', v: doc(verification?.ownership_path) },
    { k: 'Mobile money payout', v: payoutLinked ? 'Linked' : 'Needs attention' },
  ];
  const good = (v: string) => v === 'Approved' || v === 'Uploaded' || v === 'Linked';

  return (
    <Blueprint as="aside" className="card verification-card" aria-labelledby="verify-heading">
      <span className="card-kicker">Identity verification</span>
      <h2 id="verify-heading" className="card-title verify-title">
        {verified ? 'Verified landlord' : status === 'pending' ? 'Verification in review' : 'Get the Verified badge'}
      </h2>
      <p className="card-body verify-copy">
        {verified
          ? 'Tenants see the Verified landlord tag on all your rooms.'
          : 'Reviewed by the BoardZM team, usually within a day. No office visit.'}
      </p>
      {status === 'rejected' && verification?.rejection_reason && (
        <Notice tone="error">{verification.rejection_reason}</Notice>
      )}
      <ul className="verify-rows">
        {rows.map((r) => (
          <li key={r.k}>
            <span>{r.k}</span>
            <span className={good(r.v) ? 'verify-ok' : 'verify-todo'}>
              {good(r.v) && <CircleCheck size={14} strokeWidth={1.5} aria-hidden="true" />}
              {r.v}
            </span>
          </li>
        ))}
      </ul>
      {!verified && status !== 'pending' && (
        <Link to="/landlord/verification" className="btn btn-primary blueprint btn-block verify-button">
          <Corners />
          Verify{fee ? ` · ${formatKwacha(fee)}` : ''}
        </Link>
      )}
    </Blueprint>
  );
}

function CancelDialog({ row, onClose }: { row: DepositRow; onClose: () => void }) {
  const cancel = useCancelReservation();
  const toast = useToast();
  const [reason, setReason] = useState('Room no longer available');

  async function go() {
    try {
      await cancel.mutateAsync({ reservationId: row.id, reason: reason.trim() });
      onClose();
      toast(`Cancelled. ${row.tenant_name} gets ${formatKwacha(row.deposit_ngwee + row.booking_fee_ngwee)} back.`);
    } catch {
      // Shown below.
    }
  }

  return (
    <Dialog open onClose={onClose} title="Cancel this reservation?" dismissible={!cancel.isPending}>
      <p className="dialog-body">
        {row.tenant_name} gets their full <strong>{formatKwacha(row.deposit_ngwee + row.booking_fee_ngwee)}</strong> back,
        and <strong>{row.room}</strong> goes live again.
      </p>
      <div className="field">
        <label htmlFor="cancel-reason">Reason (the tenant sees this)</label>
        <input id="cancel-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} data-autofocus />
      </div>
      {cancel.isError && <Notice tone="error">{cancel.error.message}</Notice>}
      <div className="dialog-actions">
        <Button variant="ghost" onClick={onClose} disabled={cancel.isPending}>
          Keep it
        </Button>
        <Button variant="primary" onClick={go} disabled={cancel.isPending || !reason.trim()}>
          {cancel.isPending ? 'Cancelling…' : 'Cancel and refund'}
        </Button>
      </div>
    </Dialog>
  );
}
