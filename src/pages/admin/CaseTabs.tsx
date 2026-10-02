import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { Notice } from '../../components/Status';
import { useToast } from '../../components/Toast';
import { useAdminReports, useAdminReservations, useResolveReport, useSettleReservation, type AdminReport, type AdminReservation } from '../../lib/admin';
import { formatKwacha } from '../../lib/money';
import { TableState, when } from './shared';

// ─── Reports ───────────────────────────────────────────────────────────────

export function ReportsTab() {
  const list = useAdminReports();
  const [open, setOpen] = useState<AdminReport | null>(null);
  return (
    <>
      <TableState query={list} empty="No open reports.">
        <table className="table table-stack">
          <thead>
            <tr>
              <th scope="col">Reported</th>
              <th scope="col">Reason</th>
              <th scope="col">By</th>
              <th scope="col" className="cell-actions">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.data?.map((r) => (
              <tr key={r.id}>
                <td data-label="Reported">
                  <strong>{r.target_label}</strong>
                  {r.target_detail && <span className="cell-sub clamp">{r.target_detail}</span>}
                </td>
                <td data-label="Reason">
                  {r.reason}
                  {r.note && <span className="cell-sub clamp">{r.note}</span>}
                </td>
                <td data-label="By">
                  {r.reporter_name}
                  <span className="cell-sub">{when(r.created_at)}</span>
                </td>
                <td className="cell-actions" data-label="">
                  <button type="button" className="btn btn-secondary" onClick={() => setOpen(r)}>
                    Decide
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableState>
      {open && <ReportDialog r={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function ReportDialog({ r, onClose }: { r: AdminReport; onClose: () => void }) {
  const resolve = useResolveReport();
  const toast = useToast();
  const canModerate = r.target_type === 'listing' || r.target_type === 'review';

  async function go(action: 'hide' | 'restore' | 'dismiss') {
    try {
      await resolve.mutateAsync({ id: r.id, action });
      onClose();
      toast({ hide: 'Taken down. Every report about it is resolved.', restore: 'Restored. Every report about it is resolved.', dismiss: 'Dismissed.' }[action]);
    } catch {
      // shown below
    }
  }

  return (
    <Dialog open onClose={onClose} title="Report" className="admin-dialog" dismissible={!resolve.isPending}>
      <dl className="admin-facts">
        <div>
          <dt>Reported</dt>
          <dd>
            {r.target_label}
            {r.target_link && (
              <>
                {' '}
                · <Link to={r.target_link}>open</Link>
              </>
            )}
          </dd>
        </div>
        {r.target_detail && (
          <div>
            <dt>Content</dt>
            <dd>{r.target_detail}</dd>
          </div>
        )}
        <div>
          <dt>Reason</dt>
          <dd>{r.reason}</dd>
        </div>
        {r.note && (
          <div>
            <dt>Note</dt>
            <dd>{r.note}</dd>
          </div>
        )}
        <div>
          <dt>By</dt>
          <dd>
            {r.reporter_name} · {when(r.created_at)}
          </dd>
        </div>
      </dl>
      {r.target_type === 'reservation' && (
        <p className="muted small">For a deposit dispute, settle it in the Reservations tab (Release or Refund), then dismiss this report.</p>
      )}
      {resolve.isError && <Notice tone="error">{resolve.error.message}</Notice>}
      <div className="dialog-actions">
        <Button variant="ghost" onClick={() => go('dismiss')} disabled={resolve.isPending}>
          Dismiss
        </Button>
        {canModerate && (
          <>
            <Button variant="secondary" onClick={() => go('restore')} disabled={resolve.isPending}>
              Restore
            </Button>
            <Button variant="primary" onClick={() => go('hide')} disabled={resolve.isPending}>
              Take down
            </Button>
          </>
        )}
      </div>
    </Dialog>
  );
}

// ─── Reservations ──────────────────────────────────────────────────────────

const RES_FILTERS = [
  { id: 'held', label: 'Held' },
  { id: 'released', label: 'Released' },
  { id: 'refunded', label: 'Refunded' },
  { id: 'pending_payment', label: 'Paying' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'all', label: 'All' },
];
const RES_TAG: Record<string, string> = { held: 'tag-outline', released: 'tag-accent', refunded: 'tag-neutral', pending_payment: 'tag-neutral', cancelled: 'tag-neutral' };

export function ReservationsTab() {
  const [status, setStatus] = useState('held');
  const list = useAdminReservations(status);
  const [open, setOpen] = useState<AdminReservation | null>(null);
  return (
    <>
      <div className="seg seg-scroll admin-filter" role="radiogroup" aria-label="Reservation status">
        {RES_FILTERS.map((f) => (
          <label key={f.id} className="seg-opt">
            <input type="radio" name="res-status" checked={status === f.id} onChange={() => setStatus(f.id)} />
            {f.label}
          </label>
        ))}
      </div>
      <TableState query={list} empty="No reservations with this status.">
        <table className="table table-stack">
          <thead>
            <tr>
              <th scope="col">Reference</th>
              <th scope="col">Tenant</th>
              <th scope="col">Room</th>
              <th scope="col">Paid</th>
              <th scope="col">Status</th>
              <th scope="col" className="cell-actions">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.data?.map((r) => (
              <tr key={r.id}>
                <td data-label="Reference">
                  <strong>{r.reference}</strong>
                  <span className="cell-sub">{when(r.created_at)}</span>
                </td>
                <td data-label="Tenant">{r.tenant_name}</td>
                <td data-label="Room">{r.room}</td>
                <td data-label="Paid">{formatKwacha(r.deposit_ngwee + r.booking_fee_ngwee)}</td>
                <td data-label="Status">
                  <span className={`tag ${RES_TAG[r.status]}`}>{r.status.replace('_', ' ')}</span>
                  {r.note && <span className="cell-sub">{r.note}</span>}
                </td>
                <td className="cell-actions" data-label="">
                  {r.status === 'held' && (
                    <button type="button" className="btn btn-secondary" onClick={() => setOpen(r)}>
                      Settle
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableState>
      {open && <SettleDialog r={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function SettleDialog({ r, onClose }: { r: AdminReservation; onClose: () => void }) {
  const settle = useSettleReservation();
  const toast = useToast();
  const [reason, setReason] = useState('Room not as listed');

  async function go(action: 'release' | 'refund') {
    try {
      await settle.mutateAsync({ id: r.id, action, reason });
      onClose();
      toast(action === 'release' ? 'Released to the landlord.' : `Refunded ${formatKwacha(r.deposit_ngwee + r.booking_fee_ngwee)} to the tenant.`);
    } catch {
      // shown below
    }
  }

  return (
    <Dialog open onClose={onClose} title={`Settle ${r.reference}`} className="admin-dialog" dismissible={!settle.isPending}>
      <p className="dialog-body">
        {r.tenant_name} paid {formatKwacha(r.deposit_ngwee + r.booking_fee_ngwee)} for <strong>{r.room}</strong>. Release pays the{' '}
        {formatKwacha(r.deposit_ngwee)} deposit to the landlord; Refund returns everything to the tenant and puts the room back up.
      </p>
      <div className="field">
        <label htmlFor="settle-reason">Refund reason (both sides see it)</label>
        <input id="settle-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
      </div>
      {settle.isError && <Notice tone="error">{settle.error.message}</Notice>}
      <div className="dialog-actions">
        <Button variant="secondary" onClick={() => go('refund')} disabled={settle.isPending || !reason.trim()}>
          Refund tenant
        </Button>
        <Button variant="primary" onClick={() => go('release')} disabled={settle.isPending}>
          Release to landlord
        </Button>
      </div>
    </Dialog>
  );
}
