import { safeNext } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import type { SignInAs } from './AuthCard';

const LABEL: Record<SignInAs, string> = { tenant: 'Student', landlord: 'Landlord', owner: 'Owner' };
const KEY = 'cabinhub-signin-as';

/** Google leaves the app and comes back; remember what was chosen on the form. */
export function rememberChoice(as: SignInAs) {
  try {
    window.localStorage.setItem(KEY, as);
  } catch {
    /* private browsing: the callback falls back to the account's own type */
  }
}

/** The remembered choice, read once. */
export function takeChoice(): SignInAs | null {
  try {
    const v = window.localStorage.getItem(KEY);
    window.localStorage.removeItem(KEY);
    return v === 'tenant' || v === 'landlord' || v === 'owner' ? v : null;
  } catch {
    return null;
  }
}

export type SignInResult = { ok: true; path: string; welcome: string } | { ok: false; message: string };

/**
 * Each account has one fixed type. Check it matches the choice (Student, Landlord or Owner),
 * set it on a brand-new account, and say where to go next. On a mismatch the caller signs out.
 */
export async function finishSignIn(userId: string, as: SignInAs, nextRaw: string): Promise<SignInResult> {
  const next = safeNext(nextRaw);
  const { data: p } = await supabase!
    .from('profiles')
    .select('role, onboarded, is_admin, full_name')
    .eq('id', userId)
    .maybeSingle();
  if (!p) return { ok: false, message: "We couldn't load your account. Please try again." };

  if (as === 'owner' && !p.is_admin) {
    return { ok: false, message: 'The Owner sign-in is only for the CabinHub owner. Choose Student or Landlord.' };
  }
  if (as !== 'owner' && p.onboarded && p.role !== as) {
    const actual = p.role === 'landlord' ? 'landlord' : 'student';
    return { ok: false, message: `This email is registered as a ${actual}. Choose ${LABEL[p.role]} to sign in.` };
  }
  if (as !== 'owner' && !p.onboarded && p.role !== as) {
    // Not set up yet: the choice made here becomes the account type.
    await supabase!.from('profiles').update({ role: as }).eq('id', userId);
  }

  const first = p.full_name?.trim().split(/\s+/)[0];
  const welcome = first ? `Welcome, ${first}!` : 'Welcome!';
  let path = next;
  if (!p.onboarded) path = `/welcome?next=${encodeURIComponent(next)}`;
  else if (as === 'owner' && next === '/') path = '/admin';
  else if (as === 'landlord' && next === '/') path = '/landlord';
  return { ok: true, path, welcome };
}

export { LABEL as SIGN_IN_LABEL };
