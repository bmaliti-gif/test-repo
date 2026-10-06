import { lazy } from 'react';
import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { RequireAuth } from './components/RequireAuth';
import SearchPage from './pages/search/SearchPage';

// Find a room loads with the app; every other screen downloads only when opened,
// which keeps the first visit small on mobile data.
const ListingPage = lazy(() => import('./pages/listing/ListingPage'));
const SavedPage = lazy(() => import('./pages/account/SavedPage'));
const ReservationsPage = lazy(() => import('./pages/account/ReservationsPage'));
const AccountPage = lazy(() => import('./pages/account/AccountPage'));
const WelcomePage = lazy(() => import('./pages/account/WelcomePage'));
const RoommatesPage = lazy(() => import('./pages/roommates/RoommatesPage'));
const LandlordDashboard = lazy(() => import('./pages/landlord/LandlordDashboard'));
const ListingFormPage = lazy(() => import('./pages/landlord/ListingFormPage'));
const VerificationPage = lazy(() => import('./pages/landlord/VerificationPage'));
const SignInPage = lazy(() => import('./pages/auth/SignInPage'));
const SignUpPage = lazy(() => import('./pages/auth/SignUpPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const AuthCallbackPage = lazy(() => import('./pages/auth/AuthCallbackPage'));
const AdminPage = lazy(() => import('./pages/admin/AdminPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const LegalPage = lazy(() => import('./pages/legal/LegalPage'));
const AboutPage = lazy(() => import('./pages/about/AboutPage'));

// Routes from docs/PLAN.md §6.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Everyone */}
        <Route index element={<SearchPage />} />
        <Route path="listing/:id" element={<ListingPage />} />
        <Route path="signin" element={<SignInPage />} />
        <Route path="signup" element={<SignUpPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="auth/callback" element={<AuthCallbackPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="privacy" element={<LegalPage />} />
        <Route path="terms" element={<LegalPage />} />
        <Route path="refunds" element={<LegalPage />} />

        {/* Signed in */}
        <Route element={<RequireAuth />}>
          <Route path="welcome" element={<WelcomePage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="saved" element={<SavedPage />} />
          <Route path="reservations" element={<ReservationsPage />} />
          <Route path="roommates" element={<RoommatesPage />} />
        </Route>

        {/* Landlords */}
        <Route element={<RequireAuth role="landlord" />}>
          <Route path="landlord" element={<LandlordDashboard />} />
          <Route path="landlord/listings/new" element={<ListingFormPage />} />
          <Route path="landlord/listings/:id" element={<ListingFormPage />} />
          <Route path="landlord/verification" element={<VerificationPage />} />
        </Route>

        {/* Admins */}
        <Route element={<RequireAuth role="admin" />}>
          <Route path="admin" element={<AdminPage />} />
          <Route path="admin/:tab" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
