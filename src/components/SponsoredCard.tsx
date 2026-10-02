import { Store } from 'lucide-react';
import type { Ad } from '../lib/queries';
import { supabase } from '../lib/supabase';

/** "Sponsored · Local business" card, shown after the 4th result. Clicks are counted. */
export function SponsoredCard({ ad }: { ad: Ad }) {
  function track() {
    // Fire and forget: a failed count must never block the visitor.
    void supabase?.rpc('track_ad_click', { p_ad_id: ad.id });
  }

  return (
    <aside className="card sponsored-card" aria-label={`Sponsored: ${ad.business_name}`}>
      <div className="sponsored-body">
        <span className="card-kicker sponsored-kicker">
          <Store size={12} strokeWidth={1.5} aria-hidden="true" />
          Sponsored · Local business
        </span>
        <span className="card-title">{ad.headline}</span>
        {ad.body && <span className="card-body">{ad.body}</span>}
      </div>
      {ad.cta_url && (
        <a
          className="btn btn-secondary"
          href={ad.cta_url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={track}
        >
          {ad.cta_label}
        </a>
      )}
    </aside>
  );
}
