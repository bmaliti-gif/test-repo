import type { ReactNode } from 'react';
import { Blueprint } from './Blueprint';

/** Quiet loading line, announced to screen readers. */
export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="page">
      <p className="muted" role="status" aria-live="polite">
        {label}
      </p>
    </div>
  );
}

/** Inline message: tone "error" is announced immediately, "info" politely. */
export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error' | 'success'; children: ReactNode }) {
  return (
    <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

/** Full-page message card with an optional action. */
export function MessagePage({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <div className="page placeholder">
      <div>
        <div className="kicker">{kicker}</div>
        <h1>{title}</h1>
      </div>
      <Blueprint className="card">{children}</Blueprint>
    </div>
  );
}
