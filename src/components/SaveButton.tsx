import type { MouseEvent } from 'react';
import { Heart } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../lib/auth';
import { useSavedIds, useToggleSaved } from '../lib/queries';
import { Button } from './Button';
import { useToast } from './Toast';

type Props = {
  listingId: string;
  className?: string;
  /** "heart": round icon button laid over a photo. */
  variant?: 'button' | 'heart';
  title?: string;
};

/** "Save" / "Saved" toggle. Signed-out visitors are sent to sign in, then back here. */
export function SaveButton({ listingId, className, variant = 'button', title }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const saved = useSavedIds();
  const toggle = useToggleSaved();
  const isSaved = Boolean(saved.data?.includes(listingId));

  function onClick(e: MouseEvent) {
    // On a card the heart sits over a link; don't open the listing.
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate(`/signin?next=${encodeURIComponent(location.pathname + location.search)}`);
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

  if (variant === 'heart') {
    return (
      <button
        type="button"
        className={isSaved ? 'heart-button is-saved' : 'heart-button'}
        onClick={onClick}
        aria-pressed={isSaved}
        aria-label={isSaved ? `Remove ${title ?? 'room'} from saved` : `Save ${title ?? 'room'}`}
      >
        <Heart size={18} strokeWidth={2} aria-hidden="true" fill={isSaved ? 'currentColor' : 'none'} />
      </button>
    );
  }

  return (
    <Button variant="secondary" className={className} onClick={onClick} aria-pressed={isSaved}>
      <Heart size={15} strokeWidth={1.5} aria-hidden="true" fill={isSaved ? 'currentColor' : 'none'} />
      {isSaved ? 'Saved' : 'Save'}
    </Button>
  );
}
