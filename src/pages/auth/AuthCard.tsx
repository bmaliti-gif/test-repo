import type { ReactNode } from 'react';
import { BadgeCheck, Lock, MessageSquareQuote } from 'lucide-react';
import { Blueprint } from '../../components/Blueprint';
import { Button } from '../../components/Button';
import { LogoMark } from '../../components/Header';
import { callbackUrl, friendlyAuthError } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

/** "Good morning" / "Good afternoon" / "Good evening" by the visitor's clock. */
export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const WELCOME = {
  signin: {
    title: 'Welcome back to CabinHub',
    body: 'Sign in to see your saved rooms, reservations and roommate matches.',
  },
  signup: {
    title: 'Welcome to CabinHub',
    body: 'Rooms near campus in Lusaka, straight from landlords. Create a free account in a minute.',
  },
} as const;

/** The friendly panel beside the sign-in and sign-up forms. */
export function WelcomePanel({ kind }: { kind: keyof typeof WELCOME }) {
  const w = WELCOME[kind];
  return (
    <aside className="welcome-panel" aria-label="Welcome">
      <LogoMark size={44} />
      <p className="welcome-hello">
        {greeting()} · <span lang="bem">Mwaiseni!</span>
      </p>
      <h2 className="welcome-title">{w.title}</h2>
      <p className="welcome-body">{w.body}</p>
      <ul className="welcome-points">
        <li>
          <BadgeCheck size={18} strokeWidth={2} aria-hidden="true" /> Landlords' IDs are checked by our team
        </li>
        <li>
          <Lock size={18} strokeWidth={2} aria-hidden="true" /> Your deposit is held safely until you move in
        </li>
        <li>
          <MessageSquareQuote size={18} strokeWidth={2} aria-hidden="true" /> Reviews come only from real tenants
        </li>
      </ul>
    </aside>
  );
}

/** The frame shared by the sign-in pages. With `welcome`, a welcome panel sits beside the form. */
export function AuthCard({
  kicker,
  title,
  children,
  welcome,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
  welcome?: keyof typeof WELCOME;
}) {
  const form = (
    <div className="auth-main">
      <div>
        <div className="kicker">{kicker}</div>
        <h1>{title}</h1>
      </div>
      <Blueprint className="card auth-card">{children}</Blueprint>
    </div>
  );
  if (!welcome) return <div className="page auth-page">{form}</div>;
  return (
    <div className="page auth-split">
      <WelcomePanel kind={welcome} />
      {form}
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="or-divider" role="separator">
      <span>or</span>
    </div>
  );
}

/** "Continue with Google": leaves for Google, comes back to /auth/callback. */
export function GoogleButton({ next, onError }: { next: string; onError: (message: string) => void }) {
  async function go() {
    const { error } = await supabase!.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl(next) },
    });
    if (error) onError(friendlyAuthError(error));
  }
  return (
    <Button variant="secondary" block onClick={go}>
      Continue with Google
    </Button>
  );
}
