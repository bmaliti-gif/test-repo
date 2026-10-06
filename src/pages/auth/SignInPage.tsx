import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { Button } from '../../components/Button';
import { TextField } from '../../components/Field';
import { NotConnected } from '../../components/RequireAuth';
import { Notice } from '../../components/Status';
import { useToast } from '../../components/Toast';
import { friendlyAuthError, safeNext, useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { AuthCard, GoogleButton, OrDivider, RoleChoice, type SignInAs } from './AuthCard';
import { finishSignIn, SIGN_IN_LABEL as LABEL } from './finishSignIn';

const schema = z.object({
  email: z.email('Enter your email address, e.g. name@gmail.com.'),
  password: z.string().min(1, 'Enter your password.'),
});

/** ?as=student|landlord|owner preselects the choice. */
function initialChoice(as: string | null): SignInAs {
  if (as === 'landlord') return 'landlord';
  if (as === 'owner') return 'owner';
  return 'tenant';
}

export default function SignInPage() {
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const toast = useToast();

  const [as, setAs] = useState<SignInAs>(initialChoice(params.get('as')));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!supabase) return <NotConnected />;
  if (!loading && user && !busy) return <Navigate to={next} replace />;

  /** Refuse the sign-in (and sign out again) with a plain reason. */
  async function refuse(message: string) {
    await supabase!.auth.signOut();
    setBusy(false);
    setFormError(message);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = schema.safeParse({ email: email.trim(), password });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ email: f.email?.[0], password: f.password?.[0] });
      return;
    }
    setErrors({});
    setBusy(true);
    const { data, error } = await supabase!.auth.signInWithPassword(parsed.data);
    if (error || !data.user) {
      setBusy(false);
      setFormError(friendlyAuthError(error));
      return;
    }

    const done = await finishSignIn(data.user.id, as, next);
    if (!done.ok) return refuse(done.message);
    toast(done.welcome);
    navigate(done.path, { replace: true });
  }

  return (
    <AuthCard title="Sign in" welcome>
      <form className="form" onSubmit={submit} noValidate>
        <RoleChoice label="Sign in as" value={as} onChange={setAs} withOwner />
        {formError && <Notice tone="error">{formError}</Notice>}
        <GoogleButton as={as} next={next} onError={setFormError} />
        <OrDivider />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <Button variant="primary" type="submit" block disabled={busy}>
          {busy ? 'Signing in…' : `Sign in as ${LABEL[as].toLowerCase()}`}
        </Button>
        <Link to="/reset-password" className="form-link">
          Forgot your password?
        </Link>
      </form>
      {as !== 'owner' && (
        <p className="form-foot">
          New to CabinHub? <Link to={`/signup?as=${as === 'landlord' ? 'landlord' : 'student'}`}>Create an account</Link>
        </p>
      )}
    </AuthCard>
  );
}
