import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { CircleCheck, Smartphone } from 'lucide-react';
import type { Provider } from '../lib/database.types';
import { formatKwacha } from '../lib/money';
import { simulatePayment, type PaymentResult, type StartedPayment } from '../lib/payments';
import { detectProvider, formatPhone, PROVIDERS, providerLabel, providerMismatch, toE164 } from '../lib/phone';
import { useSettings } from '../lib/queries';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { Notice } from './Status';

type Step = 'details' | 'waiting' | 'success' | 'failed';

type Props = {
  open: boolean;
  onClose: () => void;
  /** "Reserve Self-contained room near UNZA gate", "Publish listing"… */
  title: string;
  /** Amount shown before paying (the server confirms the real amount). */
  amountNgwee: number;
  /** Optional breakdown above the total, e.g. deposit + booking fee. */
  lines?: { label: string; ngwee: number }[];
  /** Number to start with (e.g. the user's WhatsApp). */
  defaultPhone?: string | null;
  /** Creates the payment on the server. */
  start: (provider: Provider, phone: string) => Promise<StartedPayment>;
  /** After the provider says yes or no. */
  onFinished?: (result: PaymentResult, started: StartedPayment) => void;
  success: (result: PaymentResult, started: StartedPayment) => { title: string; body: ReactNode };
};

const PLACEHOLDER: Record<Provider, string> = { mtn: '096 123 4567', airtel: '097 123 4567', zamtel: '095 123 4567' };

/**
 * The mobile-money payment flow: details → "Check your phone" → success or failure.
 * In test mode a clearly labelled "Simulated phone prompt" stands in for the real one.
 * It can't be closed while waiting for approval.
 */
export function PaymentDialog({ open, onClose, title, amountNgwee, lines, defaultPhone, start, onFinished, success }: Props) {
  const ids = useId();
  const settings = useSettings();
  const simulated = settings.data?.payments_mode !== 'live';

  const [step, setStep] = useState<Step>('details');
  const [provider, setProvider] = useState<Provider>('mtn');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState<StartedPayment | null>(null);
  const [result, setResult] = useState<PaymentResult | null>(null);

  // Fresh form each time it opens, starting from the person's own number.
  useEffect(() => {
    if (!open) return;
    const initial = formatPhone(defaultPhone);
    setStep('details');
    setPhone(initial);
    setProvider(detectProvider(initial) ?? 'mtn');
    setError(null);
    setBusy(false);
    setStarted(null);
    setResult(null);
  }, [open]); // defaultPhone is read once when opening

  // Each step replaces the buttons, so move keyboard focus to the new step's main action.
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => document.querySelector<HTMLElement>('.payment-dialog [data-autofocus]')?.focus());
  }, [step, open]);

  function onPhone(value: string) {
    setPhone(value);
    setError(null);
    const guess = detectProvider(value);
    if (guess) setProvider(guess);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const e164 = toE164(phone);
    if (!e164) {
      setError('Enter a 10-digit Zambian number, e.g. 0971 234 567.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const s = await start(provider, e164);
      setStarted(s);
      setStep('waiting');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function answer(approve: boolean) {
    if (!started) return;
    setBusy(true);
    try {
      const r = await simulatePayment(started.paymentId, approve);
      setResult(r);
      setStep(r.status === 'succeeded' ? 'success' : 'failed');
      onFinished?.(r, started);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setStep('failed');
    } finally {
      setBusy(false);
    }
  }

  const amount = started?.amountNgwee ?? amountNgwee;
  const warning = providerMismatch(phone, provider);
  const done = step === 'success' && result && started ? success(result, started) : null;

  let heading: ReactNode = title;
  if (step === 'waiting')
    heading = (
      <>
        <Smartphone size={24} strokeWidth={1.5} aria-hidden="true" className="accent-icon" /> Check your phone
      </>
    );
  if (step === 'success' && done)
    heading = (
      <>
        <CircleCheck size={26} strokeWidth={1.5} aria-hidden="true" className="accent-icon" /> {done.title}
      </>
    );
  if (step === 'failed') heading = 'Payment not completed';

  return (
    <Dialog open={open} onClose={onClose} title={heading} dismissible={step !== 'waiting'} className="payment-dialog">
      {step === 'details' && (
        <form className="form" onSubmit={submit} noValidate>
          <fieldset className="form-group">
            <legend>Pay with</legend>
            <div className="seg seg-wide pay-providers">
              {PROVIDERS.map((p) => (
                <label key={p.value} className="seg-opt">
                  <input
                    type="radio"
                    name={`${ids}-provider`}
                    checked={provider === p.value}
                    onChange={() => setProvider(p.value)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="field">
            <label htmlFor={`${ids}-phone`}>Mobile money number</label>
            <input
              id={`${ids}-phone`}
              className="input pay-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={PLACEHOLDER[provider]}
              value={phone}
              onChange={(e) => onPhone(e.target.value)}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={`${ids}-phone-msg`}
              data-autofocus
            />
            <p id={`${ids}-phone-msg`} className={error ? 'field-error' : 'field-hint'}>
              {error ?? warning ?? 'You will get a prompt on this phone to approve with your PIN.'}
            </p>
          </div>
          <dl className="pay-lines">
            {lines?.map((l) => (
              <div key={l.label}>
                <dt>{l.label}</dt>
                <dd>{formatKwacha(l.ngwee)}</dd>
              </div>
            ))}
            <div className="pay-total">
              <dt>Total</dt>
              <dd>{formatKwacha(amount)}</dd>
            </div>
          </dl>
          <div className="dialog-actions">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={busy}>
              <Smartphone size={16} strokeWidth={1.5} aria-hidden="true" />
              {busy ? 'Sending…' : 'Send payment prompt'}
            </Button>
          </div>
        </form>
      )}

      {step === 'waiting' && (
        <div className="pay-waiting">
          <p className="dialog-body">
            A {providerLabel(provider)} prompt for <strong>{formatKwacha(amount)}</strong> was sent to{' '}
            <strong>{formatPhone(toE164(phone))}</strong>. Enter your PIN to approve.
          </p>
          <p className="pay-pulse" role="status">
            <span aria-hidden="true" /> Waiting for approval…
          </p>
          {simulated && (
            <div className="sim-prompt" role="group" aria-label="Simulated phone prompt">
              <span className="sim-label">Simulated phone prompt · test mode, no real money</span>
              <span>
                Pay <strong>{formatKwacha(amount)}</strong> to BoardZM?
              </span>
              <div className="sim-actions">
                <Button variant="secondary" onClick={() => answer(false)} disabled={busy}>
                  Decline
                </Button>
                <Button variant="primary" onClick={() => answer(true)} disabled={busy} data-autofocus>
                  Approve
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'success' && done && (
        <div className="pay-done">
          <div className="dialog-body">{done.body}</div>
          {(started?.reference || result?.reference) && (
            <div className="pay-ref">
              Reference <strong>{started?.reference ?? result?.reference}</strong>
            </div>
          )}
          <div className="dialog-actions">
            <Button variant="primary" onClick={onClose} data-autofocus>
              Done
            </Button>
          </div>
        </div>
      )}

      {step === 'failed' && (
        <div className="pay-done">
          {error ? <Notice tone="error">{error}</Notice> : <p className="dialog-body">No money was taken. Try again or use another number.</p>}
          <div className="dialog-actions">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setError(null);
                setStep('details');
              }}
              data-autofocus
            >
              Try again
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
