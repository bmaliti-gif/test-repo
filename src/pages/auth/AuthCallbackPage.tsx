import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { NotConnected } from '../../components/RequireAuth';
import { Loading, Notice } from '../../components/Status';
import { afterSignIn, safeNext } from '../../lib/auth';
import { useToast } from '../../components/Toast';
import { supabase } from '../../lib/supabase';
import { AuthCard } from './AuthCard';
import { finishSignIn, takeChoice } from './finishSignIn';

/**
 * Email confirmation, password-reset and Google links land here.
 * supabase-js swaps the ?code= for a session; then we move on.
 */
export default function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState<string | null>(null);
  const started = useRef(false);
  const toast = useToast();

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
      // Back from Google: check the Student / Landlord / Owner choice made before leaving.
      const choice = takeChoice();
      if (choice) {
        const checked = await finishSignIn(data.session.user.id, choice, next);
        if (!checked.ok) {
          await supabase!.auth.signOut();
          setProblem(checked.message);
          return;
        }
        toast(checked.welcome);
        navigate(checked.path, { replace: true });
        return;
      }
      const done = await afterSignIn(data.session.user.id, next);
      toast(done.welcome);
      navigate(done.path, { replace: true });
    });
  }, [params, navigate, toast]);

  if (!supabase) return <NotConnected />;
  if (!problem) return <Loading label="Signing you in…" />;

  return (
    <AuthCard kicker="Account" title="We couldn't sign you in">
      <Notice tone="error">{problem}</Notice>
      <p className="form-foot">
        <Link to="/signin">Sign in</Link> · <Link to="/reset-password">Send a new reset link</Link>
      </p>
    </AuthCard>
  );
}
