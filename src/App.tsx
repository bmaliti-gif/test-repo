import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { RequireAuth } from './components/RequireAuth';
import SearchPage from './pages/search/SearchPage';
import ListingPage from './pages/listing/ListingPage';
import SavedPage from './pages/account/SavedPage';
import ReservationsPage from './pages/account/ReservationsPage';
import AccountPage from './pages/account/AccountPage';
import WelcomePage from './pages/account/WelcomePage';
import RoommatesPage from './pages/roommates/RoommatesPage';
import LandlordDashboard from './pages/landlord/LandlordDashboard';
import ListingFormPage from './pages/landlord/ListingFormPage';
import VerificationPage from './pages/landlord/VerificationPage';
import SignInPage from './pages/auth/SignInPage';
import SignUpPage from './pages/auth/SignUpPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import AuthCallbackPage from './pages/auth/AuthCallbackPage';
import AdminPage from './pages/admin/AdminPage';
import NotFoundPage from './pages/NotFoundPage';

// Routes from docs/PLAN.md §6. Lazy-loading of pages arrives in Block 12.
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
