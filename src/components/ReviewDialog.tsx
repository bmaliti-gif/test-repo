import { useEffect, useId, useState, type FormEvent } from 'react';
import { Star } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { Notice } from './Status';
import { useToast } from './Toast';

const LABELS = ['', 'Poor', 'Below average', 'OK', 'Good', 'Excellent'];

type Props = {
  open: boolean;
  onClose: () => void;
  reservationId: string;
  listingId: string;
  roomTitle: string;
};

/** 1–5 stars and 20–1000 characters, through submit_review (one per stay). */
export function ReviewDialog({ open, onClose, reservationId, listingId, roomTitle }: Props) {
  const ids = useId();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRating(0);
      setBody('');
      setError(null);
    }
  }, [open]);

  const submit = useMutation({
    mutationFn: async () => {
      const { data, error: err } = await supabase!.rpc('submit_review', {
        p_reservation_id: reservationId,
        p_rating: rating,
        p_body: body.trim(),
      });
      if (err) throw new Error(err.message || "We couldn't send your review. Try again.");
      return data;
    },
    onSuccess: async (status) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['reservations'] }),
        queryClient.invalidateQueries({ queryKey: ['listing', listingId] }),
        queryClient.invalidateQueries({ queryKey: ['listings'] }),
      ]);
      onClose();
      toast(status === 'pending' ? 'Thanks. Your review is under review and will appear once approved.' : 'Thanks. Your review is live.');
    },
    onError: (err) => setError(err.message),
  });

  const length = body.trim().length;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!rating) return setError('Choose 1 to 5 stars.');
    if (length < 20) return setError(`Write a little more: at least 20 characters (${20 - length} to go).`);
    setError(null);
    submit.mutate();
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Review ${roomTitle}`} dismissible={!submit.isPending}>
      <form className="form" onSubmit={onSubmit} noValidate>
        <p className="dialog-body">
          Help the next student decide. Only tenants who moved in can review, so your words carry weight.
        </p>
        {error && <Notice tone="error">{error}</Notice>}
        <fieldset className="form-group">
          <legend>Your rating</legend>
          <div className="star-input">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className={n <= rating ? 'star is-on' : 'star'}>
                <input
                  type="radio"
                  name={`${ids}-stars`}
                  value={n}
                  checked={rating === n}
                  onChange={() => setRating(n)}
                  data-autofocus={n === 1 ? true : undefined}
                />
                <Star size={28} strokeWidth={1.5} aria-hidden="true" fill={n <= rating ? 'currentColor' : 'none'} />
                <span className="sr-only">
                  {n} star{n === 1 ? '' : 's'}: {LABELS[n]}
                </span>
              </label>
            ))}
            <span className="star-label" aria-hidden="true">
              {LABELS[rating]}
            </span>
          </div>
        </fieldset>
        <div className="field">
          <label htmlFor={`${ids}-body`}>Your review</label>
          <textarea
            id={`${ids}-body`}
            className="input"
            rows={5}
            maxLength={1000}
            placeholder="Was it as listed? Water, power, security, the landlord, the walk to campus…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            aria-describedby={`${ids}-count`}
          />
          <p id={`${ids}-count`} className="field-hint">
            {length}/1000 characters{length < 20 ? ` · at least 20` : ''}
          </p>
        </div>
        <div className="dialog-actions">
          <Button variant="ghost" onClick={onClose} disabled={submit.isPending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submit.isPending}>
            {submit.isPending ? 'Sending…' : 'Post review'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
