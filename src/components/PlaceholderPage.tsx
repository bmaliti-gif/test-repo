import type { ReactNode } from 'react';
import { Blueprint } from './Blueprint';

type Props = {
  kicker: string;
  title: string;
  /** Which build block replaces this placeholder. */
  block: number;
  children?: ReactNode;
};

/** Temporary page used until each screen is built. */
export function PlaceholderPage({ kicker, title, block, children }: Props) {
  return (
    <div className="page placeholder">
      <div>
        <div className="kicker">{kicker}</div>
        <h1>{title}</h1>
      </div>
      <Blueprint className="card">
        <div className="card-kicker">Coming in block {block}</div>
        <p className="card-body">This page is a placeholder. It gets built in block {block} of the plan.</p>
      </Blueprint>
      {children}
    </div>
  );
}
