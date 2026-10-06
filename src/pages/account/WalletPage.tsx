import { useState } from 'react';
import { Coins, Plus } from 'lucide-react';
import { Blueprint } from '../../components/Blueprint';
import { Button } from '../../components/Button';
import { TopUpDialog } from '../../components/PointsDialogs';
import { Loading, Notice } from '../../components/Status';
import { useMe } from '../../lib/auth';
import { formatKwacha } from '../../lib/money';
import { pointsFor, pts, REASON_LABEL, useWallet } from '../../lib/points';
import { useSettings } from '../../lib/queries';

const when = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function WalletPage() {
  const { me } = useMe();
  const wallet = useWallet();
  const settings = useSettings();
  const [topUp, setTopUp] = useState(false);
  if (wallet.isPending || settings.isPending) return <Loading label="Loading your points…" />;

  const s = settings.data;
  const landlord = me?.profile.role === 'landlord';
  const rate = s?.points_per_kwacha ?? 2;
  const prices = !s
    ? []
    : landlord
      ? [
          { what: `Your first ${s.free_listing_limit} listings`, cost: 'Free' },
          { what: 'Each listing after that', cost: pts(s.extra_listing_points) },
          { what: 'Get the Verified landlord badge', cost: pts(s.verification_points) },
          { what: `Featured, shown first for ${s.feature_days} days`, cost: pts(s.feature_points) },
        ]
      : [
          { what: "See a landlord's WhatsApp number (covers all their rooms)", cost: pts(s.contact_unlock_points) },
          { what: `Search up to ${s.free_area_limit} areas at once`, cost: 'Free' },
          { what: `Search more than ${s.free_area_limit} areas at once, for ${s.area_pass_days} days`, cost: pts(s.area_pass_points) },
        ];

  return (
    <div className="page wallet-page">
      <div>
        <div className="kicker">Your float</div>
        <h1>Points</h1>
        <p className="lede muted">
          Top up with mobile money and use points to unlock extras. K1 gives {pts(rate)}, so K50 gives{' '}
          {pts(pointsFor(5000, rate))}.
        </p>
      </div>

      {wallet.isError && <Notice tone="error">We couldn't load your points. Check your connection and try again.</Notice>}

      <div className="wallet-grid">
        <Blueprint as="section" className="card balance-card" aria-labelledby="balance-heading">
          <span id="balance-heading" className="card-kicker">
            Balance
          </span>
          <span className="balance-value">
            <Coins size={30} strokeWidth={1.75} aria-hidden="true" />
            {(wallet.data?.points ?? 0).toLocaleString('en-US')}
            <span className="balance-unit">points</span>
          </span>
          <Button variant="primary" onClick={() => setTopUp(true)}>
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Top up
          </Button>
          <div className="topup-hints">
            {(s?.topup_amounts_ngwee ?? []).map((a) => (
              <span key={a} className="tag tag-neutral">
                {formatKwacha(a)} → {pts(pointsFor(a, rate))}
              </span>
            ))}
          </div>
          {wallet.data?.areaPassUntil && (
            <p className="muted small">
              Area pass active until {new Date(wallet.data.areaPassUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}.
            </p>
          )}
        </Blueprint>

        <Blueprint as="section" className="card" aria-labelledby="prices-heading">
          <h2 id="prices-heading" className="card-title">
            What points unlock
          </h2>
          <ul className="price-list">
            {prices.map((p) => (
              <li key={p.what}>
                <span>{p.what}</span>
                <strong>{p.cost}</strong>
              </li>
            ))}
          </ul>
        </Blueprint>
      </div>

      <section aria-labelledby="history-heading" className="history">
        <h2 id="history-heading">History</h2>
        {!wallet.data?.history.length ? (
          <p className="muted">No points yet. Top up to get started.</p>
        ) : (
          <div className="table-wrap">
            <table className="table table-stack">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">What</th>
                  <th scope="col">Points</th>
                  <th scope="col">Balance</th>
                </tr>
              </thead>
              <tbody>
                {wallet.data.history.map((t) => (
                  <tr key={t.id}>
                    <td data-label="When">{when(t.created_at)}</td>
                    <td data-label="What">
                      {REASON_LABEL[t.reason]}
                      {t.note && <span className="cell-sub">{t.note}</span>}
                    </td>
                    <td data-label="Points" className={t.delta > 0 ? 'delta-plus' : 'delta-minus'}>
                      {t.delta > 0 ? '+' : '−'}
                      {Math.abs(t.delta).toLocaleString('en-US')}
                    </td>
                    <td data-label="Balance">{t.balance_after.toLocaleString('en-US')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <TopUpDialog open={topUp} onClose={() => setTopUp(false)} />
    </div>
  );
}
