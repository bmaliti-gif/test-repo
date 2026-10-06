import type { ReactNode } from 'react';
import { BadgeCheck, Home, Lock, MessageSquareQuote } from 'lucide-react';
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
  landlord: {
    title: 'Welcome, landlord',
    body: 'Reach students and young professionals across Lusaka for far less than an agent charges.',
  },
} as const;

const POINTS = {
  tenant: [
    { icon: BadgeCheck, text: "Landlords' IDs are checked by our team" },
    { icon: Lock, text: 'Your deposit is held safely until you move in' },
    { icon: MessageSquareQuote, text: 'Reviews come only from real tenants' },
  ],
  landlord: [
    { icon: Home, text: 'Your first 4 listings are free' },
    { icon: BadgeCheck, text: 'Get a Verified badge tenants trust' },
    { icon: Lock, text: 'Deposits are held for you until move-in' },
  ],
};

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
        {POINTS[kind === 'landlord' ? 'landlord' : 'tenant'].map(({ icon: Icon, text }) => (
          <li key={text}>
            <Icon size={18} strokeWidth={2} aria-hidden="true" /> {text}
          </li>
        ))}
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
