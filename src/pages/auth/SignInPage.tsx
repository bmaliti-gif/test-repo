import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { Button } from '../../components/Button';
import { TextField } from '../../components/Field';
import { NotConnected } from '../../components/RequireAuth';
import { Notice } from '../../components/Status';
import { friendlyAuthError, afterSignIn, safeNext, useAuth } from '../../lib/auth';
import { useToast } from '../../components/Toast';
import { supabase } from '../../lib/supabase';
import { AuthCard, GoogleButton, OrDivider } from './AuthCard';

const schema = z.object({
  email: z.email('Enter your email address, e.g. name@gmail.com.'),
  password: z.string().min(1, 'Enter your password.'),
});

export default function SignInPage() {
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!supabase) return <NotConnected />;
  if (!loading && user && !busy) return <Navigate to={next} replace />;

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
    const done = await afterSignIn(data.user.id, next);
    toast(done.welcome);
    navigate(done.path, { replace: true });
  }

  const nextQuery = next === '/' ? '' : `?next=${encodeURIComponent(next)}`;

  return (
    <AuthCard kicker="Sign in" title="Good to see you" welcome="signin">
      <form className="form" onSubmit={submit} noValidate>
        {formError && <Notice tone="error">{formError}</Notice>}
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
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
        <Link to="/reset-password" className="form-link">
          Forgot your password?
        </Link>
      </form>
      <OrDivider />
      <GoogleButton next={next} onError={setFormError} />
      <p className="form-foot">
        New to CabinHub? <Link to={`/signup${nextQuery}`}>Create an account</Link>
      </p>
    </AuthCard>
  );
}
