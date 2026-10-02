import type { ReactNode } from 'react';
import { Blueprint } from '../../components/Blueprint';
import { Button } from '../../components/Button';
import { callbackUrl, friendlyAuthError } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

/** The frame shared by the sign-in pages. */
export function AuthCard({ kicker, title, children }: { kicker: string; title: string; children: ReactNode }) {
  return (
    <div className="page auth-page">
      <div>
        <div className="kicker">{kicker}</div>
        <h1>{title}</h1>
      </div>
      <Blueprint className="card auth-card">{children}</Blueprint>
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
