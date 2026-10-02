import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../lib/useFocusTrap';
import { Corners } from './Blueprint';

type Props = {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  /** False while something must finish (e.g. waiting for a payment). */
  dismissible?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Centred blueprint dialog on desktop; a full-width sheet anchored to the bottom on phones.
 * Escape or a click outside closes it unless `dismissible` is false.
 */
export function Dialog({ open, title, onClose, dismissible = true, children, className }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(panel, open, () => {
    if (dismissible) onClose();
  });

  if (!open) return null;

  return createPortal(
    <div
      className="dialog-backdrop app-dialog-backdrop"
      onMouseDown={(e) => dismissible && e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panel}
        className={className ? `dialog blueprint app-dialog ${className}` : 'dialog blueprint app-dialog'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <Corners />
        <h2 id={titleId} className="dialog-title app-dialog-title">
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
