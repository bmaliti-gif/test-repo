import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../lib/useFocusTrap';

type Props = {
  photos: string[];
  /** Index to open at; null = closed. */
  start: number | null;
  title: string;
  onClose: () => void;
};

/**
 * Full-screen photo viewer in true colour. Arrow keys or buttons on desktop;
 * swipe on phones (the strip snaps one photo at a time).
 */
export function Gallery({ photos, start, title, onClose }: Props) {
  const open = start !== null;
  const panel = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(start ?? 0);
  useFocusTrap(panel, open, onClose);

  // Jump to the chosen photo when opening.
  useEffect(() => {
    if (start === null) return;
    setIndex(start);
    requestAnimationFrame(() => {
      const el = strip.current;
      if (el) el.scrollTo({ left: start * el.clientWidth, behavior: 'instant' as ScrollBehavior });
    });
  }, [start]);

  function go(to: number) {
    const next = (to + photos.length) % photos.length;
    setIndex(next);
    strip.current?.scrollTo({ left: next * strip.current.clientWidth, behavior: 'smooth' });
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  if (!open) return null;

  return createPortal(
    <div ref={panel} className="gallery" role="dialog" aria-modal="true" aria-label={`Photos of ${title}`} tabIndex={-1}>
      <div className="gallery-bar">
        <span className="gallery-count" aria-live="polite">
          Photo {index + 1} of {photos.length}
        </span>
        <button type="button" className="btn btn-ghost btn-icon gallery-close" onClick={onClose} aria-label="Close photos">
          <X size={22} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
      <div
        ref={strip}
        className="gallery-strip"
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          if (i !== index) setIndex(i);
        }}
      >
        {photos.map((src, i) => (
          <figure key={src} className="gallery-slide">
            <img src={src} alt={`${title}, photo ${i + 1}`} loading={Math.abs(i - index) <= 1 ? 'eager' : 'lazy'} decoding="async" />
          </figure>
        ))}
      </div>
      {photos.length > 1 && (
        <>
          <button type="button" className="btn btn-secondary btn-icon gallery-prev" onClick={() => go(index - 1)} aria-label="Previous photo">
            <ChevronLeft size={22} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <button type="button" className="btn btn-secondary btn-icon gallery-next" onClick={() => go(index + 1)} aria-label="Next photo">
            <ChevronRight size={22} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}
