import { Link, useParams } from 'react-router';
import { useAdminCounts } from '../../lib/admin';
import { AdsTab } from './AdsTab';
import { ListingsTab, VerificationsTab } from './ReviewTabs';
import { ReportsTab, ReservationsTab } from './CaseTabs';
import { SettingsTab } from './SettingsTab';

export const ADMIN_TABS = [
  { id: 'verifications', label: 'Verifications' },
  { id: 'listings', label: 'Listings' },
  { id: 'reports', label: 'Reports' },
  { id: 'reservations', label: 'Reservations' },
  { id: 'ads', label: 'Ads' },
  { id: 'settings', label: 'Settings' },
] as const;

type TabId = (typeof ADMIN_TABS)[number]['id'];

export default function AdminPage() {
  const params = useParams();
  const tab: TabId = ADMIN_TABS.some((t) => t.id === params.tab) ? (params.tab as TabId) : 'verifications';
  const counts = useAdminCounts();

  return (
    <div className="admin-page">
      <div>
        <div className="kicker">Admin</div>
        <h1>Run CabinHub</h1>
      </div>

      <nav className="seg seg-scroll admin-tabs" aria-label="Admin sections">
        {ADMIN_TABS.map((t) => {
          const n = counts.data?.[t.id];
          const active = t.id === tab;
          return (
            <Link key={t.id} to={`/admin/${t.id}`} className={active ? 'seg-opt is-active' : 'seg-opt'} aria-current={active ? 'page' : undefined}>
              {t.label}
              {n ? <span className="tab-count">{n}</span> : null}
            </Link>
          );
        })}
      </nav>

      <section aria-label={ADMIN_TABS.find((t) => t.id === tab)!.label}>
        {tab === 'verifications' && <VerificationsTab />}
        {tab === 'listings' && <ListingsTab />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'reservations' && <ReservationsTab />}
        {tab === 'ads' && <AdsTab />}
        {tab === 'settings' && <SettingsTab />}
      </section>
    </div>
  );
}
