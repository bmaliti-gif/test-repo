import { useNavigate, useSearchParams } from 'react-router';
import { Blueprint } from '../../components/Blueprint';
import { ProfileForm } from '../../components/ProfileForm';
import { Loading } from '../../components/Status';
import { safeNext, useMe } from '../../lib/auth';

/** First-time setup, shown once after the first sign-in. */
export default function WelcomePage() {
  const { me } = useMe();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  if (!me) return <Loading />;

  const next = params.get('next');

  return (
    <div className="page auth-page">
      <div>
        <div className="kicker">First-time setup</div>
        <h1>Welcome to CabinHub</h1>
        <p className="muted lede">A few details so landlords and roommates know who they're talking to.</p>
      </div>
      <Blueprint className="card auth-card">
        <ProfileForm
          me={me}
          completeOnboarding
          submitLabel="Save and continue"
          onSaved={(role) => navigate(safeNext(next, role === 'landlord' ? '/landlord' : '/'), { replace: true })}
        />
      </Blueprint>
    </div>
  );
}
