// Zambian mobile numbers. Stored as E.164 (+260971234567); people type 0971 234 567.
// Must match public.normalize_zm_phone in supabase/migrations/0003_functions.sql.
import type { Provider } from './database.types';

export const PROVIDERS: { value: Provider; label: string }[] = [
  { value: 'mtn', label: 'MTN MoMo' },
  { value: 'airtel', label: 'Airtel Money' },
  { value: 'zamtel', label: 'Zamtel Kwacha' },
];

export function providerLabel(p: Provider): string {
  return PROVIDERS.find((x) => x.value === p)?.label ?? p;
}

/** "0971 234 567", "260971234567" or "+260 97 123 4567" → "+260971234567"; null if not a Zambian mobile. */
export function toE164(input: string): string | null {
  const d = input.replace(/\D/g, '');
  if (/^0[79]\d{8}$/.test(d)) return '+260' + d.slice(1);
  if (/^260[79]\d{8}$/.test(d)) return '+' + d;
  if (/^[79]\d{8}$/.test(d)) return '+260' + d;
  return null;
}

/** Guess the network from the prefix: 096/076 MTN, 097/077 Airtel, 095 Zamtel. */
export function detectProvider(input: string): Provider | null {
  const e164 = toE164(input);
  if (!e164) return null;
  const prefix = e164.slice(4, 6); // "+260" then two digits
  if (prefix === '96' || prefix === '76') return 'mtn';
  if (prefix === '97' || prefix === '77') return 'airtel';
  if (prefix === '95') return 'zamtel';
  return null;
}

/** "+260971234567" → "097 123 4567" for display. */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  const local = toE164(e164);
  if (!local) return e164;
  const d = '0' + local.slice(4);
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

/** A gentle warning when the number looks like a different network. Never blocks. */
export function providerMismatch(input: string, chosen: Provider | null | undefined): string | null {
  const guess = detectProvider(input);
  if (!guess || !chosen || guess === chosen) return null;
  return `That looks like an ${providerLabel(guess)} number. Check the network, or carry on if it's right.`;
}
