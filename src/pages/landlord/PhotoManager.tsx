import { useRef, useState, type DragEvent } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Blueprint } from '../../components/Blueprint';
import { Notice } from '../../components/Status';
import { listingPhotoUrl } from '../../lib/images';
import { deleteListingPhoto, savePhotoOrder, uploadListingPhoto, type Photo } from '../../lib/landlord';

export const MIN_PHOTOS = 3;
export const MAX_PHOTOS = 8;

type Props = {
  userId: string;
  listingId: string;
  photos: Photo[];
};

/**
 * 3–8 photos. Each is shrunk on the phone before upload. The first is the cover.
 * Reorder with the arrow buttons (or drag on a computer); remove with the bin.
 */
export function PhotoManager({ userId, listingId, photos }: Props) {
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [order, setOrder] = useState<Photo[] | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState(false);

  const list = order ?? photos;
  const room = MAX_PHOTOS - list.length;
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['landlord'] }),
      queryClient.invalidateQueries({ queryKey: ['listing', listingId] }),
      queryClient.invalidateQueries({ queryKey: ['listings'] }),
    ]);

  async function addFiles(files: FileList | File[]) {
    setError(null);
    const images = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (images.length === 0) return setError('Choose photos (JPG, PNG or HEIC from your phone).');
    const batch = images.slice(0, room);
    if (images.length > room) setError(`You can add ${room} more photo${room === 1 ? '' : 's'} (8 at most).`);
    try {
      for (let i = 0; i < batch.length; i++) {
        setProgress(`Preparing and uploading photo ${i + 1} of ${batch.length}…`);
        await uploadListingPhoto(userId, listingId, batch[i], list.length + i);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'A photo did not upload.');
    } finally {
      setProgress(null);
      setOrder(null);
      await refresh();
    }
  }

  async function reorder(next: Photo[]) {
    setOrder(next);
    try {
      await savePhotoOrder(next);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reorder.');
    } finally {
      setOrder(null);
    }
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= list.length || from === to) return;
    const next = [...list];
    const [p] = next.splice(from, 1);
    next.splice(to, 0, p);
    void reorder(next);
  }

  async function remove(photo: Photo) {
    setError(null);
    try {
      await deleteListingPhoto(photo);
      const rest = list.filter((p) => p.id !== photo.id);
      if (rest.length) await savePhotoOrder(rest);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove.');
    } finally {
      await refresh();
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files);
  }

  return (
    <div className="photo-manager">
      {list.length > 0 && (
        <ol className="photo-thumbs" aria-label="Photos, first is the cover">
          {list.map((p, i) => {
            const src = listingPhotoUrl(p.path);
            return (
              <li
                key={p.id}
                className={dragging === i ? 'photo-thumb is-dragging' : 'photo-thumb'}
                draggable
                onDragStart={() => setDragging(i)}
                onDragEnd={() => setDragging(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dragging !== null) move(dragging, i);
                  setDragging(null);
                }}
              >
                <div className="photo-thumb-img">
                  {src && <img src={src} alt={`Photo ${i + 1}`} loading="lazy" />}
                  {i === 0 && <span className="photo-cover-tag">Cover</span>}
                </div>
                <div className="photo-thumb-actions">
                  <button type="button" className="btn btn-ghost btn-icon" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move photo ${i + 1} earlier`}>
                    <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                  <button type="button" className="btn btn-ghost btn-icon" onClick={() => move(i, i + 1)} disabled={i === list.length - 1} aria-label={`Move photo ${i + 1} later`}>
                    <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                  <button type="button" className="btn btn-ghost btn-icon" onClick={() => remove(p)} aria-label={`Remove photo ${i + 1}`}>
                    <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {room > 0 && (
        <Blueprint
          className={over ? 'card drop-zone is-over' : 'card drop-zone'}
          onDragOver={(e: DragEvent) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
        >
          <ImagePlus size={24} strokeWidth={1.5} aria-hidden="true" className="accent-icon" />
          <p className="card-body">
            {list.length < MIN_PHOTOS
              ? `Add at least ${MIN_PHOTOS - list.length} more photo${MIN_PHOTOS - list.length === 1 ? '' : 's'}: the room, the bathroom, the kitchen and outside.`
              : `You can add ${room} more. Bright daytime photos get the most interest.`}
          </p>
          <button type="button" className="btn btn-secondary" onClick={() => input.current?.click()} disabled={Boolean(progress)}>
            {progress ? 'Uploading…' : 'Choose photos'}
          </button>
          <input
            ref={input}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) void addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <span className="field-hint">Photos are made smaller on your phone first, to save data.</span>
        </Blueprint>
      )}

      {progress && (
        <p className="muted small" role="status">
          {progress}
        </p>
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
