import { useId, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Blueprint } from '../../components/Blueprint';
import { LogoMark } from '../../components/Header';
import { callbackUrl, friendlyAuthError } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { rememberChoice } from './finishSignIn';

/** Who is signing in. Owner is only for the app owner's email (checked after signing in). */
export type SignInAs = 'tenant' | 'landlord' | 'owner';

/** The logo and an italic "Welcome!", above the sign-in and sign-up forms. */
export function WelcomeHeading() {
  return (
    <div className="welcome-heading">
      <LogoMark size={56} />
      <p className="welcome-word">
        <em>Welcome!</em>
      </p>
    </div>
  );
}

/** Student / Landlord (and, for sign-in, Owner) as one segmented choice. */
export function RoleChoice<T extends SignInAs>({
  label,
  value,
  onChange,
  withOwner = false,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  withOwner?: boolean;
}) {
  const id = useId();
  const options: { v: SignInAs; text: string }[] = [
    { v: 'tenant', text: 'Student' },
    { v: 'landlord', text: 'Landlord' },
    ...(withOwner ? [{ v: 'owner' as const, text: 'Owner' }] : []),
  ];
  return (
    <fieldset className="form-group role-choice">
      <legend id={`${id}-l`}>{label}</legend>
      <div className="seg seg-wide" role="radiogroup" aria-labelledby={`${id}-l`}>
        {options.map((o) => (
          <label key={o.v} className="seg-opt">
            <input type="radio" name={`${id}-role`} checked={value === o.v} onChange={() => onChange(o.v as T)} />
            {o.text}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Is "Sign in with Google" switched on in Supabase? (Public settings, no secrets.) */
function useGoogleEnabled() {
  return useQuery({
    queryKey: ['auth-settings'],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const url = import.meta.env.VITE_SUPABASE_URL as string;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
      if (!res.ok) return true; // let Supabase answer when clicked
      const body = (await res.json()) as { external?: { google?: boolean } };
      return Boolean(body.external?.google);
    },
  });
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** "Continue with Google". Remembers the Student/Landlord/Owner choice for when Google sends people back. */
export function GoogleButton({ as, next, onError }: { as: SignInAs; next: string; onError: (m: string) => void }) {
  const enabled = useGoogleEnabled();
  const [busy, setBusy] = useState(false);

  async function go() {
    if (enabled.data === false) {
      onError("Google sign-in isn't switched on yet. Use your email and password for now.");
      return;
    }
    setBusy(true);
    rememberChoice(as);
    const { error } = await supabase!.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl(next) },
    });
    if (error) {
      setBusy(false);
      onError(friendlyAuthError(error));
    }
  }

  return (
    <button type="button" className="btn btn-secondary btn-block google-btn" onClick={go} disabled={busy}>
      <GoogleLogo />
      {busy ? 'Opening Google…' : 'Continue with Google'}
    </button>
  );
}

export function OrDivider() {
  return (
    <div className="or-divider" role="separator">
      <span>or use your email</span>
    </div>
  );
}

/** The frame shared by the sign-in pages. With `welcome`, the logo and "Welcome!" sit above it. */
export function AuthCard({
  kicker,
  title,
  children,
  welcome,
}: {
  kicker?: string;
  title: string;
  children: ReactNode;
  welcome?: boolean;
}) {
  return (
    <div className="page auth-page">
      <div className="auth-main">
        {welcome && <WelcomeHeading />}
        <div>
          {kicker && <div className="kicker">{kicker}</div>}
          <h1>{title}</h1>
        </div>
        <Blueprint className="card auth-card">{children}</Blueprint>
      </div>
    </div>
  );
}
