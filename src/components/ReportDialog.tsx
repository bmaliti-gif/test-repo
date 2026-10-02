import { useEffect, useId, useState, type FormEvent } from 'react';
import type { ReportTarget } from '../lib/database.types';
import { useReport } from '../lib/queries';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { Notice } from './Status';
import { useToast } from './Toast';

const REASONS: Record<'listing' | 'review', string[]> = {
  listing: [
    'Not as described',
    'Looks like a scam',
    'Already let',
    'Wrong price or location',
    'Asked to pay outside BoardZM',
    'Offensive content',
    'Something else',
  ],
  review: ['Not a real tenant', 'Offensive or abusive', 'Personal information', 'Something else'],
};

type Props = {
  open: boolean;
  onClose: () => void;
  targetType: Extract<ReportTarget, 'listing' | 'review'>;
  targetId: string;
};

export function ReportDialog({ open, onClose, targetType, targetId }: Props) {
  const ids = useId();
  const toast = useToast();
  const report = useReport();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason('');
      setNote('');
      setError(null);
      report.reset();
    }
  }, [open]); // start fresh each time it opens

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!reason) return setError('Choose a reason.');
    setError(null);
    try {
      await report.mutateAsync({ targetType, targetId, reason, note: note.trim().slice(0, 1000) });
      onClose();
      toast('Report sent. Thank you, the BoardZM team will look at it.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={targetType === 'listing' ? 'Report this listing' : 'Report this review'}>
      <form className="form" onSubmit={submit} noValidate>
        <p className="dialog-body">
          Reports are private. The BoardZM team checks every one, and an item with several reports is hidden until we
          decide.
        </p>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="field">
          <label htmlFor={`${ids}-reason`}>Reason</label>
          <select
            id={`${ids}-reason`}
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            data-autofocus
          >
            <option value="">Choose a reason…</option>
            {REASONS[targetType].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${ids}-note`}>What happened? (optional)</label>
          <textarea
            id={`${ids}-note`}
            className="input"
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="dialog-actions">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={report.isPending}>
            {report.isPending ? 'Sending…' : 'Send report'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
