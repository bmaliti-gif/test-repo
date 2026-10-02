import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useMe } from '../lib/auth';
import { useSavedIds } from '../lib/queries';
import { Header } from './Header';
import { TabBar } from './TabBar';

export function Layout() {
  const { pathname } = useLocation();

  // Start each new page at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const { me } = useMe();
  const saved = useSavedIds();
  const savedCount = saved.data?.length ?? 0;
  const isLandlord = me?.profile.role === 'landlord';

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <Header savedCount={savedCount} />
      {/* Shown while payments_mode is "simulated" (read from app_settings from Block 6). */}
      <div className="test-banner" role="note">
        Test mode — payments are simulated, no real money moves.
      </div>
      <main className="app-main" id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="app-footer">
        <span>BoardZM · Direct from landlords, no agents</span>
        <span>Deposits held via MTN MoMo · Airtel Money · Zamtel Kwacha</span>
      </footer>
      <TabBar isLandlord={isLandlord} />
    </div>
  );
}
