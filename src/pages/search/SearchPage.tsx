import { Link } from 'react-router';
import { Blueprint } from '../../components/Blueprint';
import { Button } from '../../components/Button';
import { PlaceholderPage } from '../../components/PlaceholderPage';

// Temporary list so every route can be checked in Block 1. Replaced by search in Block 4.
const ROUTES = [
  ['/listing/example', 'Listing'],
  ['/saved', 'Saved'],
  ['/reservations', 'Reservations'],
  ['/roommates', 'Roommates'],
  ['/landlord', 'Landlord dashboard'],
  ['/landlord/listings/new', 'New listing'],
  ['/landlord/listings/example', 'Edit listing'],
  ['/landlord/verification', 'Verification'],
  ['/account', 'Account'],
  ['/welcome', 'Welcome'],
  ['/signin', 'Sign in'],
  ['/signup', 'Sign up'],
  ['/reset-password', 'Reset password'],
  ['/auth/callback', 'Auth callback'],
  ['/admin', 'Admin'],
  ['/this-page-does-not-exist', 'A broken link'],
] as const;

export default function SearchPage() {
  return (
    <PlaceholderPage kicker="Off-campus rooms · verified landlords" title="Find a room near campus" block={4}>
      <Blueprint className="card">
        <div className="card-kicker">Check every page</div>
        <div className="placeholder-links">
          {ROUTES.map(([to, label]) => (
            <Link key={to} to={to} className="btn btn-secondary">
              {label}
            </Link>
          ))}
        </div>
      </Blueprint>
      <Blueprint className="card">
        <div className="card-kicker">Design check</div>
        <div className="placeholder-links" style={{ alignItems: 'center' }}>
          <Button variant="primary">Primary button</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <span className="tag tag-accent">Featured</span>
          <span className="tag tag-neutral">Wi-Fi</span>
          <span className="tag tag-outline">Verified landlord</span>
        </div>
      </Blueprint>
    </PlaceholderPage>
  );
}
