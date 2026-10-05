import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Blueprint } from '../../components/Blueprint';
import { Button } from '../../components/Button';
import { InstallApp } from '../../components/InstallApp';
import { ProfileForm } from '../../components/ProfileForm';
import { Loading, Notice } from '../../components/Status';
import { ThemePicker } from '../../components/ThemeSelect';
import { signOut, useAuth, useMe } from '../../lib/auth';

export default function AccountPage() {
  const { user } = useAuth();
  const { me } = useMe();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  if (!me) return <Loading />;

  return (
    <div className="page account-page">
      <div>
        <div className="kicker">Your details</div>
        <h1>Account</h1>
        <p className="muted lede">
          Signed in as <strong>{user?.email}</strong>
          {me.profile.verified_at && ' · Verified landlord'}
        </p>
      </div>

      <div className="account-grid">
        <Blueprint as="section" className="card" aria-labelledby="profile-heading">
          <h2 id="profile-heading" className="card-title">
            Profile
          </h2>
          {saved && <Notice tone="success">Your details are saved.</Notice>}
          <ProfileForm me={me} submitLabel="Save changes" onSaved={() => setSaved(true)} />
        </Blueprint>

        <div className="account-side">
          <Blueprint as="section" className="card" aria-labelledby="look-heading">
            <h2 id="look-heading" className="card-title">
              Look
            </h2>
            <div className="field">
              <span id="account-theme" className="field-label">
                Theme
              </span>
              <ThemePicker labelledBy="account-theme" />
            </div>
            <InstallApp />
          </Blueprint>

          <Blueprint as="section" className="card" aria-labelledby="security-heading">
            <h2 id="security-heading" className="card-title">
              Sign-in
            </h2>
            <Link to="/reset-password" className="btn btn-secondary">
              Change password
            </Link>
            <Button
              variant="secondary"
              onClick={async () => {
                await signOut();
                navigate('/', { replace: true });
              }}
            >
              <LogOut size={15} strokeWidth={1.5} aria-hidden="true" />
              Sign out
            </Button>
          </Blueprint>

          {me.profile.is_admin && (
            <Blueprint as="section" className="card" aria-labelledby="admin-heading">
              <h2 id="admin-heading" className="card-title">
                Admin
              </h2>
              <Link to="/admin" className="btn btn-secondary">
                Open the admin area
              </Link>
            </Blueprint>
          )}
        </div>
      </div>
    </div>
  );
}
