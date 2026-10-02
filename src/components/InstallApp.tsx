import { Download, Share } from 'lucide-react';
import { useInstall } from '../lib/install';

/** "Install app" on Android/desktop; a Share → Add to Home Screen hint on iPhone; nothing once installed. */
export function InstallApp({ variant = 'button' }: { variant?: 'button' | 'link' }) {
  const { mode, install } = useInstall();
  if (mode === 'prompt') {
    return (
      <button type="button" className={variant === 'link' ? 'link-button install-link' : 'btn btn-secondary install-button'} onClick={install}>
        <Download size={15} strokeWidth={1.5} aria-hidden="true" />
        Install app
      </button>
    );
  }
  if (mode === 'ios') {
    return (
      <p className="install-hint">
        Install on iPhone: tap <Share size={14} strokeWidth={1.5} aria-label="Share" style={{ verticalAlign: '-2px' }} /> Share,
        then <strong>Add to Home Screen</strong>.
      </p>
    );
  }
  return null;
}
