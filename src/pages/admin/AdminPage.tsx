import { Link, useParams } from 'react-router';
import { PlaceholderPage } from '../../components/PlaceholderPage';

export const ADMIN_TABS = [
  { id: 'verifications', label: 'Verifications' },
  { id: 'listings', label: 'Listings' },
  { id: 'reports', label: 'Reports' },
  { id: 'reservations', label: 'Reservations' },
  { id: 'ads', label: 'Ads' },
  { id: 'settings', label: 'Settings' },
] as const;

export default function AdminPage() {
  const { tab = 'verifications' } = useParams();

  return (
    <PlaceholderPage kicker="Admin" title="Run BoardZM" block={11}>
      <nav className="seg" aria-label="Admin sections" style={{ flexWrap: 'wrap', alignSelf: 'flex-start' }}>
        {ADMIN_TABS.map((t) => (
          <Link
            key={t.id}
            to={`/admin/${t.id}`}
            className="seg-opt"
            aria-current={t.id === tab ? 'page' : undefined}
            style={
              t.id === tab
                ? { background: 'var(--color-accent)', color: 'var(--color-bg)', textDecoration: 'none' }
                : { color: 'var(--color-text)', textDecoration: 'none' }
            }
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </PlaceholderPage>
  );
}
