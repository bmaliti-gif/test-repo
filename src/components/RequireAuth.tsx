import { Link, Navigate, Outlet, useLocation } from 'react-router';
import { useAuth, useMe } from '../lib/auth';
import { supabaseConfigured } from '../lib/supabase';
import { Button } from './Button';
import { Loading, MessagePage } from './Status';

type Props = {
  /** Who may open these pages. Default: anyone signed in. */
  role?: 'landlord' | 'tenant' | 'admin';
};

/**
 * Route guard. Signed out → /signin (then back here). Not onboarded → /welcome.
 * Wrong role → a friendly message instead of the page.
 */
export function RequireAuth({ role }: Props) {
  const location = useLocation();
  const { user } = useAuth();
  const { me, pending, isError, refetch } = useMe();
  const here = location.pathname + location.search;

  if (!supabaseConfigured) return <NotConnected />;
  if (pending) return <Loading />;
  if (!user) return <Navigate to={`/signin?next=${encodeURIComponent(here)}`} replace />;
  if (isError || !me) {
    return (
      <MessagePage kicker="Account" title="We couldn't load your account">
        <p className="card-body">Check your internet connection, then try again.</p>
        <div>
          <Button variant="primary" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </MessagePage>
    );
  }
  if (!me.profile.onboarded && location.pathname !== '/welcome') {
    return <Navigate to={`/welcome?next=${encodeURIComponent(here)}`} replace />;
  }
  if (role === 'landlord' && me.profile.role !== 'landlord') {
    return (
      <MessagePage kicker="For landlords" title="This area is for landlords">
        <p className="card-body">
          Your account is for finding a room. Accounts can't switch type, so to list rooms, sign up again as a landlord
          with a different email address.
        </p>
        <div>
          <Link to="/" className="btn btn-secondary">
            Find a room
          </Link>
        </div>
      </MessagePage>
    );
  }
  if (role === 'tenant' && me.profile.role !== 'tenant') {
    return (
      <MessagePage kicker="For students and tenants" title="This area is for people looking for a room">
        <p className="card-body">
          Your account is a landlord account. Accounts can't switch type, so to look for a room or a roommate, sign up
          again with a different email address.
        </p>
        <div>
          <Link to="/landlord" className="btn btn-secondary">
            Your properties
          </Link>
        </div>
      </MessagePage>
    );
  }
  if (role === 'admin' && !me.profile.is_admin) {
    return (
      <MessagePage kicker="Admin" title="Admins only">
        <p className="card-body">This page is for the CabinHub team.</p>
        <div>
          <Link to="/" className="btn btn-secondary">
            Find a room
          </Link>
        </div>
      </MessagePage>
    );
  }
  return <Outlet />;
}

export function NotConnected() {
  return (
    <MessagePage kicker="Setup" title="CabinHub isn't connected yet">
      <p className="card-body">
        Add your Supabase Project URL and publishable key to <code>.env.local</code>, then restart{' '}
        <code>npm run dev</code>.
      </p>
    </MessagePage>
  );
}
