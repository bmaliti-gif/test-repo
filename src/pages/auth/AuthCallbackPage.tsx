import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { NotConnected } from '../../components/RequireAuth';
import { Loading, Notice } from '../../components/Status';
import { pathAfterSignIn, safeNext } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { AuthCard } from './AuthCard';

/**
 * Email confirmation, password-reset and Google links land here.
 * supabase-js swaps the ?code= for a session; then we move on.
 */
export default function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!supabase || started.current) return;
    started.current = true;
    const next = safeNext(params.get('next'));
    const linkError = params.get('error_description');
    if (linkError) {
      setProblem(linkError);
      return;
    }
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        setProblem(
          'This link has expired or was already used. Links only work on the phone or browser where you asked for them.',
        );
        return;
      }
      navigate(await pathAfterSignIn(data.session.user.id, next), { replace: true });
    });
  }, [params, navigate]);

  if (!supabase) return <NotConnected />;
  if (!problem) return <Loading label="Signing you in…" />;

  return (
    <AuthCard kicker="Account" title="That link didn't work">
      <Notice tone="error">{problem}</Notice>
      <p className="form-foot">
        <Link to="/signin">Sign in</Link> · <Link to="/reset-password">Send a new reset link</Link>
      </p>
    </AuthCard>
  );
}
