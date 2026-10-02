import { useState, type ReactNode } from 'react';
import { Button } from '../../components/Button';
import { Loading, Notice } from '../../components/Status';

export const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** Loading / error / empty wrapper for an admin table. */
export function TableState({
  query,
  empty,
  children,
}: {
  query: { isPending: boolean; isError: boolean; refetch: () => unknown; data?: unknown[] };
  empty: string;
  children: ReactNode;
}) {
  if (query.isPending) return <Loading />;
  if (query.isError)
    return (
      <Notice tone="error">
        Couldn't load this list.{' '}
        <button type="button" className="link-button" onClick={() => query.refetch()}>
          Retry
        </button>
      </Notice>
    );
  if (!query.data?.length) return <p className="muted admin-empty">{empty}</p>;
  return <div className="table-wrap">{children}</div>;
}

/** Approve, or reject with a required reason. */
export function DecideActions({
  busy,
  error,
  approveLabel = 'Approve',
  onApprove,
  onReject,
}: {
  busy: boolean;
  error: string | null;
  approveLabel?: string;
  onApprove: () => void;
  onReject: (reason: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  return (
    <div className="decide">
      {error && <Notice tone="error">{error}</Notice>}
      {rejecting && (
        <div className="field">
          <label htmlFor="reject-reason">Reason (the landlord sees this, so say what to fix)</label>
          <textarea id="reject-reason" className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} data-autofocus />
        </div>
      )}
      <div className="dialog-actions">
        {rejecting ? (
          <>
            <Button variant="ghost" onClick={() => setRejecting(false)} disabled={busy}>
              Back
            </Button>
            <Button variant="primary" onClick={() => onReject(reason.trim())} disabled={busy || !reason.trim()}>
              Reject
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setRejecting(true)} disabled={busy}>
              Reject…
            </Button>
            <Button variant="primary" onClick={onApprove} disabled={busy}>
              {approveLabel}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
