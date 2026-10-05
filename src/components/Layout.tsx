import { Suspense, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { useMe } from '../lib/auth';
import { useSavedIds, useSettings } from '../lib/queries';
import { Header } from './Header';
import { InstallApp } from './InstallApp';
import { Loading } from './Status';
import { TabBar } from './TabBar';

export function Layout() {
  const { pathname } = useLocation();

  // Start each new page at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const { me } = useMe();
  const saved = useSavedIds();
  const settings = useSettings();
  const savedCount = saved.data?.length ?? 0;
  const isLandlord = me?.profile.role === 'landlord';

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <Header savedCount={savedCount} />
      {settings.data?.payments_mode !== 'live' && (
        <div className="test-banner" role="note">
          Test mode — payments are simulated, no real money moves.
        </div>
      )}
      <main className="app-main" id="main" tabIndex={-1}>
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="app-footer">
        <span>CabinHub · Direct from landlords, no agents</span>
        <span>Deposits held via MTN MoMo · Airtel Money · Zamtel Kwacha</span>
        <nav className="footer-links" aria-label="Policies">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/refunds">Deposits &amp; refunds</Link>
          <InstallApp variant="link" />
        </nav>
      </footer>
      <TabBar isLandlord={isLandlord} />
    </div>
  );
}
