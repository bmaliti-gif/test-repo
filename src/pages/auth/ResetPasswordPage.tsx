import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { z } from 'zod';
import { Button } from '../../components/Button';
import { TextField } from '../../components/Field';
import { NotConnected } from '../../components/RequireAuth';
import { Loading, Notice } from '../../components/Status';
import { callbackUrl, friendlyAuthError, useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { AuthCard } from './AuthCard';

/**
 * Signed out: ask for the email and send a reset link.
 * Signed in (from the reset link, or changing it from Account): set a new password.
 */
export default function ResetPasswordPage() {
  const { user, loading } = useAuth();
  if (!supabase) return <NotConnected />;
  if (loading) return <Loading />;
  return user ? <NewPasswordForm /> : <RequestLinkForm />;
}

function RequestLinkForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = z.email().safeParse(email.trim());
    if (!parsed.success) {
      setError('Enter your email address, e.g. name@gmail.com.');
      return;
    }
    setError(null);
    setBusy(true);
    const { error: err } = await supabase!.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: callbackUrl('/reset-password'),
    });
    setBusy(false);
    if (err) setFormError(friendlyAuthError(err));
    else setSent(true);
  }

  if (sent) {
    return (
      <AuthCard kicker="Account" title="Check your email">
        <Notice tone="success">
          If there's a BoardZM account for <strong>{email.trim()}</strong>, we've sent a link to set a new password. Open it
          on this phone or computer.
        </Notice>
        <p className="form-foot">
          <Link to="/signin">Back to sign in</Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard kicker="Account" title="Reset your password">
      <form className="form" onSubmit={submit} noValidate>
        {formError && <Notice tone="error">{formError}</Notice>}
        <p className="card-body">Enter the email you signed up with and we'll send you a link.</p>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
        />
        <Button variant="primary" type="submit" block disabled={busy}>
          {busy ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      <p className="form-foot">
        <Link to="/signin">Back to sign in</Link>
      </p>
    </AuthCard>
  );
}

function NewPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (password.length < 8) return setErrors({ password: 'Use at least 8 characters.' });
    if (password !== confirm) return setErrors({ confirm: "The two passwords don't match." });
    setErrors({});
    setBusy(true);
    const { error } = await supabase!.auth.updateUser({ password });
    setBusy(false);
    if (error) setFormError(friendlyAuthError(error));
    else setDone(true);
  }

  if (done) {
    return (
      <AuthCard kicker="Account" title="Password changed">
        <Notice tone="success">Your new password is saved. Use it next time you sign in.</Notice>
        <p className="form-foot">
          <Link to="/">Find a room</Link> · <Link to="/account">Account</Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard kicker="Account" title="Choose a new password">
      <form className="form" onSubmit={submit} noValidate>
        {formError && <Notice tone="error">{formError}</Notice>}
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint="At least 8 characters."
        />
        <TextField
          label="Type it again"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
        />
        <Button variant="primary" type="submit" block disabled={busy}>
          {busy ? 'Saving…' : 'Save new password'}
        </Button>
      </form>
    </AuthCard>
  );
}
