import { Heart } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';
import { HEADER_NAV, isActive } from './nav';
import { ThemeSelect } from './ThemeSelect';

export function Header({ savedCount }: { savedCount: number }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <header className="nav app-header">
      <button type="button" className="brand" onClick={() => navigate('/')} aria-label="BoardZM, Lusaka: find a room">
        <span className="nav-brand">BoardZM</span>
        <span className="brand-place">Lusaka</span>
      </button>

      <nav className="header-nav" aria-label="Main">
        {HEADER_NAV.map((item) => {
          const active = isActive(item, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={active ? 'btn btn-ghost active' : 'btn btn-ghost'}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={15} strokeWidth={1.5} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <ThemeSelect />

      <Link to="/saved" className="tag tag-accent saved-pill" aria-label={`Saved rooms: ${savedCount}`}>
        <Heart size={12} strokeWidth={1.5} aria-hidden="true" />
        Saved · {savedCount}
      </Link>
    </header>
  );
}
