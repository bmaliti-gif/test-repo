import { useEffect, useState, type ReactNode } from 'react';
import { Coins } from 'lucide-react';
import { useMe } from '../lib/auth';
import { formatKwacha } from '../lib/money';
import { NotEnoughPoints, pointsFor, pts, startTopup, useRefreshWallet, useWallet } from '../lib/points';
import { useSettings } from '../lib/queries';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { PaymentDialog } from './PaymentDialog';
import { Notice } from './Status';

/** Choose a top-up amount, then pay with mobile money. Points arrive as soon as it's approved. */
export function TopUpDialog({ open, onClose, needed }: { open: boolean; onClose: () => void; needed?: number }) {
  const settings = useSettings();
  const wallet = useWallet();
  const refresh = useRefreshWallet();
  const { me } = useMe();
  const [amount, setAmount] = useState<number | null>(null);
  const [paying, setPaying] = useState(false);
  const rate = settings.data?.points_per_kwacha ?? 2;
  const amounts = settings.data?.topup_amounts_ngwee ?? [];
  const balance = wallet.data?.points ?? 0;

  useEffect(() => {
    if (!open) return;
    setPaying(false);
    // Suggest the smallest top-up that covers what's needed.
    const short = needed ? needed - balance : 0;
    setAmount(amounts.find((a) => pointsFor(a, rate) >= short) ?? amounts[1] ?? amounts[0] ?? null);
  }, [open]); // pick a suggestion once, when it opens

  if (paying && amount) {
    return (
      <PaymentDialog
        open
        onClose={() => {
          setPaying(false);
          onClose();
        }}
        title={`Top up ${pts(pointsFor(amount, rate))}`}
        amountNgwee={amount}
        defaultPhone={me?.contacts?.payout_number ?? me?.contacts?.whatsapp}
        start={(provider, phone) => startTopup(amount, provider, phone)}
        onFinished={() => void refresh()}
        success={(r) => ({
          title: 'Points added',
          body: (
            <>
              <strong>{pts(pointsFor(amount, rate))}</strong> added. Your balance is now{' '}
              <strong>{pts((r as { points_balance?: number }).points_balance ?? balance + pointsFor(amount, rate))}</strong>.
            </>
          ),
        })}
      />
    );
  }

  return (
    <Dialog open={open} onClose={onClose} title="Top up points" className="points-dialog">
      <p className="dialog-body">
        Pay with mobile money. Every <strong>K1 gives {pts(rate)}</strong>, so K50 gives {pts(pointsFor(5000, rate))}. You have{' '}
        <strong>{pts(balance)}</strong>
        {needed && needed > balance ? `; this needs ${pts(needed)}` : ''}.
      </p>
      <div className="topup-grid" role="radiogroup" aria-label="Top-up amount">
        {amounts.map((a) => (
          <label key={a} className={amount === a ? 'topup-option is-on' : 'topup-option'}>
            <input type="radio" name="topup" checked={amount === a} onChange={() => setAmount(a)} />
            <span className="topup-points">{pointsFor(a, rate).toLocaleString('en-US')}</span>
            <span className="topup-label">points</span>
            <span className="topup-price">{formatKwacha(a)}</span>
          </label>
        ))}
      </div>
      <div className="dialog-actions">
        <Button variant="ghost" onClick={onClose}>
          Not now
        </Button>
        <Button variant="primary" onClick={() => setPaying(true)} disabled={!amount}>
          Continue{amount ? ` · ${formatKwacha(amount)}` : ''}
        </Button>
      </div>
    </Dialog>
  );
}

type SpendProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** What the member gets, in plain words. */
  description: ReactNode;
  cost: number;
  confirmLabel: string;
  /** Spends the points (an SQL function). Resolve to close; throw to show the error. */
  onConfirm: () => Promise<unknown>;
};

/** Confirm spending points: shows the cost and balance, and offers a top-up when short. */
export function SpendPointsDialog({ open, onClose, title, description, cost, confirmLabel, onConfirm }: SpendProps) {
  const wallet = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topUp, setTopUp] = useState(false);
  const balance = wallet.data?.points ?? 0;
  const short = balance < cost;

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      if (err instanceof NotEnoughPoints) setTopUp(true);
      else setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (topUp) return <TopUpDialog open needed={cost} onClose={() => setTopUp(false)} />;

  return (
    <Dialog open={open} onClose={onClose} title={title} dismissible={!busy} className="points-dialog">
      <div className="dialog-body">{description}</div>
      <dl className="pay-lines">
        <div>
          <dt>Costs</dt>
          <dd>{pts(cost)}</dd>
        </div>
        <div>
          <dt>Your balance</dt>
          <dd>{wallet.isPending ? '…' : pts(balance)}</dd>
        </div>
        <div className="pay-total">
          <dt>Left after</dt>
          <dd>{short ? '—' : pts(balance - cost)}</dd>
        </div>
      </dl>
      {short && !wallet.isPending && (
        <Notice tone="info">
          You need {pts(cost - balance)} more. Top up with mobile money: K1 gives 2 points.
        </Notice>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="dialog-actions">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        {short ? (
          <Button variant="primary" onClick={() => setTopUp(true)} disabled={wallet.isPending}>
            <Coins size={16} strokeWidth={1.75} aria-hidden="true" />
            Top up points
          </Button>
        ) : (
          <Button variant="primary" onClick={go} disabled={busy || wallet.isPending}>
            {busy ? 'Working…' : confirmLabel}
          </Button>
        )}
      </div>
    </Dialog>
  );
}
