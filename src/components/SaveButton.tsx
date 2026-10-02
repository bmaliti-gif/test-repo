import { Heart } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../lib/auth';
import { useSavedIds, useToggleSaved } from '../lib/queries';
import { Button } from './Button';
import { useToast } from './Toast';

/** "Save" / "Saved" toggle. Signed-out visitors are sent to sign in, then back here. */
export function SaveButton({ listingId, className }: { listingId: string; className?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const saved = useSavedIds();
  const toggle = useToggleSaved();
  const isSaved = Boolean(saved.data?.includes(listingId));

  function onClick() {
    if (!user) {
      navigate(`/signin?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    toggle.mutate(
      { listingId, save: !isSaved },
      {
        onSuccess: () => toast(isSaved ? 'Removed from saved rooms' : 'Saved. Find it under Saved.'),
        onError: () => toast("Couldn't update your saved rooms. Check your connection."),
      },
    );
  }

  return (
    <Button variant="secondary" className={className} onClick={onClick} aria-pressed={isSaved}>
      <Heart size={15} strokeWidth={1.5} aria-hidden="true" fill={isSaved ? 'currentColor' : 'none'} />
      {isSaved ? 'Saved' : 'Save'}
    </Button>
  );
}
