import { Heart, User } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router';
import { useAuth } from '../lib/auth';
import { HEADER_NAV, isActive } from './nav';

/** The CabinHub mark: a roof over a door, in the brand colour. */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <path d="M8 15.5 16 9l8 6.5" fill="none" stroke="var(--color-on-accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 14.5V23h10v-8.5" fill="none" stroke="var(--color-on-accent)" strokeWidth="2.4" strokeLinejoin="round" />
      <rect x="14.2" y="17.5" width="3.6" height="5.5" rx="1" fill="var(--color-on-accent)" />
    </svg>
  );
}

export function Header({ savedCount }: { savedCount: number }) {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();

  return (
    <header className="app-header">
      <div className="header-inner">
        <Link to="/" className="brand" aria-label="CabinHub home: find a room in Lusaka">
          <LogoMark />
          <span className="brand-text">
            <span className="brand-name">CabinHub</span>
            <span className="brand-place">Lusaka</span>
          </span>
        </Link>

        <nav className="header-nav" aria-label="Main">
          {HEADER_NAV.map((item) => {
            const active = isActive(item, pathname);
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} className={active ? 'nav-link active' : 'nav-link'} aria-current={active ? 'page' : undefined}>
                <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="header-actions">
          <NavLink to="/saved" className="icon-link" aria-label={`Saved rooms: ${savedCount}`}>
            <Heart size={20} strokeWidth={1.75} aria-hidden="true" />
            {savedCount > 0 && <span className="count-badge">{savedCount}</span>}
          </NavLink>
          {!loading &&
            (user ? (
              <NavLink to="/account" className="account-link" aria-label="Account">
                <User size={18} strokeWidth={1.75} aria-hidden="true" />
                <span className="account-label">Account</span>
              </NavLink>
            ) : (
              <Link to={`/signin?next=${encodeURIComponent(pathname)}`} className="btn btn-primary header-signin">
                Sign in
              </Link>
            ))}
        </div>
      </div>
    </header>
  );
}
