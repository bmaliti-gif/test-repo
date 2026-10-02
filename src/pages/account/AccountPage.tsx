import { Blueprint } from '../../components/Blueprint';
import { PlaceholderPage } from '../../components/PlaceholderPage';
import { ThemeSelect } from '../../components/ThemeSelect';

export default function AccountPage() {
  return (
    <PlaceholderPage kicker="Your details" title="Account" block={3}>
      {/* On phones the theme select lives here instead of in the header. */}
      <Blueprint className="card">
        <div className="field">
          <label htmlFor="account-theme">Theme</label>
          <ThemeSelect id="account-theme" className="input" />
        </div>
      </Blueprint>
    </PlaceholderPage>
  );
}
