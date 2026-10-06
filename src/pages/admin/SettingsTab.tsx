import { useEffect, useState, type FormEvent } from 'react';
import { Blueprint } from '../../components/Blueprint';
import { Button } from '../../components/Button';
import { TextField } from '../../components/Field';
import { Loading, Notice } from '../../components/Status';
import { useToast } from '../../components/Toast';
import { useSaveSettings } from '../../lib/admin';
import { useSettings } from '../../lib/queries';

const MONEY = [
  { key: 'deposit_ngwee', label: 'Reservation deposit' },
  { key: 'booking_fee_ngwee', label: 'Booking service fee' },
] as const;
type MoneyKey = (typeof MONEY)[number]['key'];

const POINTS = [
  { key: 'points_per_kwacha', label: 'Points per K1' },
  { key: 'contact_unlock_points', label: 'Landlord WhatsApp (points)' },
  { key: 'free_area_limit', label: 'Areas at once, free' },
  { key: 'area_pass_points', label: 'Area pass (points)' },
  { key: 'area_pass_days', label: 'Area pass lasts (days)' },
  { key: 'free_listing_limit', label: 'Free listings per landlord' },
  { key: 'extra_listing_points', label: 'Each extra listing (points)' },
  { key: 'verification_points', label: 'Verification (points)' },
  { key: 'feature_points', label: 'Featuring (points)' },
] as const;
type PointsKey = (typeof POINTS)[number]['key'];

export function SettingsTab() {
  const settings = useSettings();
  const save = useSaveSettings();
  const toast = useToast();
  const [money, setMoney] = useState<Record<MoneyKey, string>>({} as Record<MoneyKey, string>);
  const [days, setDays] = useState('');
  const [words, setWords] = useState('');
  const [points, setPoints] = useState<Record<PointsKey, string>>({} as Record<PointsKey, string>);
  const [topups, setTopups] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = settings.data;
    if (!s) return;
    setMoney(Object.fromEntries(MONEY.map((m) => [m.key, String(s[m.key] / 100)])) as Record<MoneyKey, string>);
    setDays(String(s.feature_days));
    setWords(s.banned_words.join(', '));
    setPoints(Object.fromEntries(POINTS.map((p) => [p.key, String(s[p.key])])) as Record<PointsKey, string>);
    setTopups(s.topup_amounts_ngwee.map((a) => a / 100).join(', '));
  }, [settings.data]);

  if (settings.isPending) return <Loading />;
  if (!settings.data) return <Notice tone="error">Couldn't load the settings.</Notice>;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const values = MONEY.map((m) => [m.key, Number(money[m.key])] as const);
    if (values.some(([, n]) => !Number.isFinite(n) || n < 0)) {
      return setError('Enter the deposit and booking fee in Kwacha.');
    }
    const d = Number(days);
    if (!Number.isInteger(d) || d < 1 || d > 90) return setError('Featuring lasts between 1 and 90 days.');
    const pointValues = POINTS.map((p) => [p.key, Number(points[p.key])] as const);
    if (pointValues.some(([, n]) => !Number.isInteger(n) || n < 0)) return setError('Points settings must be whole numbers, 0 or more.');
    const topupList = topups.split(',').map((t) => Math.round(Number(t.trim()) * 100)).filter((n) => n > 0);
    if (topupList.length === 0) return setError('Enter at least one top-up amount in Kwacha, e.g. 20, 50, 100.');
    setError(null);
    try {
      await save.mutateAsync({
        ...(Object.fromEntries(pointValues) as Record<PointsKey, number>),
        topup_amounts_ngwee: [...new Set(topupList)].sort((a, b) => a - b),
        ...(Object.fromEntries(values.map(([k, n]) => [k, Math.round(n * 100)])) as Record<MoneyKey, number>),
        feature_days: d,
        banned_words: words
          .split(',')
          .map((w) => w.trim().toLowerCase())
          .filter(Boolean),
      });
      toast('Settings saved. New amounts apply to new payments.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  return (
    <form className="form settings-form" onSubmit={submit} noValidate>
      {error && <Notice tone="error">{error}</Notice>}
      <Blueprint as="section" className="card form-section" aria-labelledby="fees-heading">
        <h2 id="fees-heading" className="card-title">
          Deposit and booking fee (Kwacha)
        </h2>
        <div className="form-row">
          {MONEY.map((m) => (
            <TextField key={m.key} label={m.label} inputMode="decimal" value={money[m.key] ?? ''} onChange={(e) => setMoney((s) => ({ ...s, [m.key]: e.target.value.replace(/[^\d.]/g, '') }))} />
          ))}
          <TextField label="Featuring lasts (days)" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} />
        </div>
      </Blueprint>
      <Blueprint as="section" className="card form-section" aria-labelledby="points-heading">
        <h2 id="points-heading" className="card-title">
          Points
        </h2>
        <div className="form-row">
          {POINTS.map((p) => (
            <TextField key={p.key} label={p.label} inputMode="numeric" value={points[p.key] ?? ''} onChange={(e) => setPoints((s) => ({ ...s, [p.key]: e.target.value.replace(/D/g, '') }))} />
          ))}
        </div>
        <TextField label="Top-up amounts (Kwacha, separated by commas)" value={topups} onChange={(e) => setTopups(e.target.value)} hint="Members choose one of these. Example: 20, 50, 100, 200." />
      </Blueprint>
      <Blueprint as="section" className="card form-section" aria-labelledby="words-heading">
        <h2 id="words-heading" className="card-title">
          Banned words
        </h2>
        <div className="field">
          <label htmlFor="banned-words">Listings with these go to review; reviews with these wait for approval. Separate with commas.</label>
          <textarea id="banned-words" className="input" rows={4} value={words} onChange={(e) => setWords(e.target.value)} />
        </div>
      </Blueprint>
      <Blueprint as="section" className="card form-section" aria-labelledby="payments-heading">
        <h2 id="payments-heading" className="card-title">
          Payments
        </h2>
        <p className="card-body">
          Mode: <strong>{settings.data.payments_mode === 'live' ? 'Live' : 'Simulated (test mode)'}</strong>. This can only be changed by
          the developer when a licensed payment partner is connected.
        </p>
      </Blueprint>
      <div className="form-footer">
        <Button variant="primary" type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </form>
  );
}
