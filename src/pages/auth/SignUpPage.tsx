import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { Button } from '../../components/Button';
import { TextField } from '../../components/Field';
import { NotConnected } from '../../components/RequireAuth';
import { Notice } from '../../components/Status';
import { callbackUrl, friendlyAuthError, afterSignIn, safeNext, useAuth } from '../../lib/auth';
import { useToast } from '../../components/Toast';
import { supabase } from '../../lib/supabase';
import { AuthCard, GoogleButton, OrDivider } from './AuthCard';

const schema = z.object({
  fullName: z.string().trim().min(2, 'Enter your name as landlords and roommates will see it.').max(80, 'Keep your name under 80 characters.'),
  email: z.email('Enter your email address, e.g. name@gmail.com.'),
  password: z.string().min(8, 'Use at least 8 characters.').max(72, 'Use 72 characters or fewer.'),
});

type Errors = Partial<Record<keyof z.infer<typeof schema>, string>>;

export default function SignUpPage() {
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  // Shareable links: /signup?as=landlord or /signup?as=student (also ?as=tenant).
  const as = params.get('as');
  const intendedRole = as === 'landlord' ? 'landlord' : as === 'student' || as === 'tenant' ? 'tenant' : null;
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const toast = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!supabase) return <NotConnected />;
  if (!loading && user && !busy) return <Navigate to={next} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = schema.safeParse({ fullName, email: email.trim(), password });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ fullName: f.fullName?.[0], email: f.email?.[0], password: f.password?.[0] });
      return;
    }
    setErrors({});
    setBusy(true);
    const { data, error } = await supabase!.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.fullName, ...(intendedRole ? { intended_role: intendedRole } : {}) },
        emailRedirectTo: callbackUrl(next),
      },
    });
    if (error) {
      setBusy(false);
      setFormError(friendlyAuthError(error));
      return;
    }
    if (data.session && data.user) {
      // "Confirm email" is off: signed in straight away.
      const done = await afterSignIn(data.user.id, next);
      toast(done.welcome);
      navigate(done.path, { replace: true });
      return;
    }
    setBusy(false);
    // With "Confirm email" on, an email that's already registered comes back with no identities.
    if (data.user && data.user.identities?.length === 0) {
      setFormError('There is already an account with that email. Sign in instead.');
      return;
    }
    setSentTo(parsed.data.email);
  }

  const nextQuery = next === '/' ? '' : `?next=${encodeURIComponent(next)}`;

  if (sentTo) {
    return (
      <AuthCard kicker="Almost there" title="Check your email">
        <Notice tone="success">
          We sent a link to <strong>{sentTo}</strong>. Open it on this phone or computer to finish creating your account.
        </Notice>
        <p className="card-body">No email after a few minutes? Check the spam folder, or try signing up again.</p>
        <p className="form-foot">
          <Link to={`/signin${nextQuery}`}>Back to sign in</Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      kicker={intendedRole === 'landlord' ? 'Join as a landlord' : intendedRole === 'tenant' ? 'Join to find a room' : 'Join CabinHub'}
      title={intendedRole === 'landlord' ? 'List your rooms' : intendedRole === 'tenant' ? 'Find your room' : 'Create an account'}
      welcome={intendedRole === 'landlord' ? 'landlord' : 'signup'}
    >
      <form className="form" onSubmit={submit} noValidate>
        {formError && <Notice tone="error">{formError}</Notice>}
        <TextField
          label="Full name"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
        />
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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint="At least 8 characters."
        />
        <p className="form-foot agree">
          By creating an account you agree to the <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy policy</Link>.
        </p>
        <Button variant="primary" type="submit" block disabled={busy}>
          {busy ? 'Creating your account…' : 'Create account'}
        </Button>
      </form>
      <OrDivider />
      <GoogleButton next={next} onError={setFormError} />
      <p className="form-foot">
        Already on CabinHub? <Link to={`/signin${nextQuery}`}>Sign in</Link>
      </p>
    </AuthCard>
  );
}
