import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { CAMPUSES } from '../data/campuses';
import type { Me } from '../lib/auth';
import type { Provider, Role } from '../lib/database.types';
import { formatPhone, PROVIDERS, providerMismatch, toE164 } from '../lib/phone';
import { supabase } from '../lib/supabase';
import { Button } from './Button';
import { Field, TextField } from './Field';
import { Notice } from './Status';

const phone = (message: string) =>
  z.string().refine((v) => toE164(v) !== null, message).transform((v) => toE164(v)!);

const schema = z
  .object({
    role: z.enum(['tenant', 'landlord']),
    fullName: z.string().trim().min(2, 'Enter your name as others will see it.').max(80, 'Keep it under 80 characters.'),
    whatsapp: phone('Enter a Zambian WhatsApp number, e.g. 0971 234 567.'),
    headline: z.string().trim().max(80, 'Keep it under 80 characters.'),
    campus: z.string(),
    payoutProvider: z.enum(['mtn', 'airtel', 'zamtel']).nullable(),
    payoutNumber: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.role !== 'landlord') return;
    if (!v.payoutProvider) ctx.addIssue({ code: 'custom', path: ['payoutProvider'], message: 'Choose where deposits are paid.' });
    if (!toE164(v.payoutNumber))
      ctx.addIssue({ code: 'custom', path: ['payoutNumber'], message: 'Enter a Zambian mobile-money number, e.g. 0961 234 567.' });
  });

type Values = {
  role: Role;
  fullName: string;
  whatsapp: string;
  headline: string;
  campus: string;
  payoutProvider: Provider | null;
  payoutNumber: string;
};
type Errors = Partial<Record<keyof Values, string>>;

type Props = {
  me: Me;
  submitLabel: string;
  /** Mark the profile as set up (the /welcome page). */
  completeOnboarding?: boolean;
  onSaved: (role: Role) => void;
};

export function ProfileForm({ me, submitLabel, completeOnboarding, onSaved }: Props) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Values>({
    role: me.profile.role,
    fullName: me.profile.full_name,
    whatsapp: formatPhone(me.contacts?.whatsapp),
    headline: me.profile.headline,
    campus: me.profile.campus ?? '',
    payoutProvider: me.contacts?.payout_provider ?? null,
    payoutNumber: formatPhone(me.contacts?.payout_number),
  });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((v) => ({ ...v, [key]: value }));
  const landlord = values.role === 'landlord';
  const payoutWarning = landlord ? providerMismatch(values.payoutNumber, values.payoutProvider) : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>;
      setErrors(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v?.[0]])) as Errors);
      return;
    }
    setErrors({});
    setBusy(true);
    const v = parsed.data;
    const profileUpdate = supabase!
      .from('profiles')
      .update({
        role: v.role,
        full_name: v.fullName,
        headline: v.headline,
        campus: v.role === 'tenant' && v.campus ? v.campus : null,
        ...(completeOnboarding ? { onboarded: true } : {}),
      })
      .eq('id', me.profile.id);
    const contactsUpdate = supabase!
      .from('contacts')
      .update({
        whatsapp: v.whatsapp,
        // Tenants keep any payout details they had; landlords must have them.
        ...(v.role === 'landlord' ? { payout_provider: v.payoutProvider, payout_number: toE164(v.payoutNumber) } : {}),
      })
      .eq('user_id', me.profile.id);
    const [p, c] = await Promise.all([profileUpdate, contactsUpdate]);
    setBusy(false);
    const error = p.error ?? c.error;
    if (error) {
      setFormError("We couldn't save your details. Check your connection and try again.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['me'] });
    onSaved(v.role);
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      {formError && <Notice tone="error">{formError}</Notice>}

      <fieldset className="form-group">
        <legend>What brings you to BoardZM?</legend>
        <div className="seg seg-wide" role="radiogroup" aria-label="What brings you to BoardZM?">
          <label className="seg-opt">
            <input type="radio" name="role" checked={!landlord} onChange={() => set('role', 'tenant')} />
            I'm looking for a room
          </label>
          <label className="seg-opt">
            <input type="radio" name="role" checked={landlord} onChange={() => set('role', 'landlord')} />
            I'm a landlord
          </label>
        </div>
      </fieldset>

      <TextField
        label="Full name"
        autoComplete="name"
        value={values.fullName}
        onChange={(e) => set('fullName', e.target.value)}
        error={errors.fullName}
      />

      <TextField
        label="WhatsApp number"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="097 123 4567"
        value={values.whatsapp}
        onChange={(e) => set('whatsapp', e.target.value)}
        error={errors.whatsapp}
        hint={
          landlord
            ? 'Tenants see it only after they pay a deposit for one of your rooms.'
            : 'Shared with a landlord only after you reserve, and with a roommate only after you both agree.'
        }
      />

      <TextField
        label={landlord ? 'About you (optional)' : 'Course and campus, or your job (optional)'}
        placeholder={landlord ? 'e.g. Family landlord in Kalingalinga' : 'e.g. 2nd-year Nursing · UNZA'}
        value={values.headline}
        onChange={(e) => set('headline', e.target.value)}
        error={errors.headline}
      />

      {!landlord && (
        <Field label="Your campus (optional)" hint="We use it to show distances and roommate matches.">
          {({ id, describedBy }) => (
            <select
              id={id}
              className="input"
              aria-describedby={describedBy}
              value={values.campus}
              onChange={(e) => set('campus', e.target.value)}
            >
              <option value="">Not a student / prefer not to say</option>
              {CAMPUSES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}

      {landlord && (
        <fieldset className="form-group">
          <legend>Where should deposits be paid?</legend>
          <div className="seg seg-wide" role="radiogroup" aria-label="Mobile-money network for payouts">
            {PROVIDERS.map((p) => (
              <label key={p.value} className="seg-opt">
                <input
                  type="radio"
                  name="payoutProvider"
                  checked={values.payoutProvider === p.value}
                  onChange={() => set('payoutProvider', p.value)}
                />
                {p.label}
              </label>
            ))}
          </div>
          {errors.payoutProvider && <p className="field-error">{errors.payoutProvider}</p>}
          <TextField
            label="Mobile-money number"
            type="tel"
            inputMode="tel"
            placeholder="096 123 4567"
            value={values.payoutNumber}
            onChange={(e) => set('payoutNumber', e.target.value)}
            onFocus={() => {
              if (!values.payoutNumber && toE164(values.whatsapp)) set('payoutNumber', values.whatsapp);
            }}
            error={errors.payoutNumber}
            hint={payoutWarning ?? 'A deposit is paid here when your tenant confirms they have moved in.'}
          />
        </fieldset>
      )}

      <Button variant="primary" type="submit" block disabled={busy}>
        {busy ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}
