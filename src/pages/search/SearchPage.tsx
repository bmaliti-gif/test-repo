import { lazy, Suspense, useCallback, useMemo, useState, type ReactNode } from 'react';
import { BadgeCheck, List, Lock, Map as MapIcon, MessageSquareQuote, SlidersHorizontal } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { Blueprint } from '../../components/Blueprint';
import { Button } from '../../components/Button';
import { ListingCard, ListingCardSkeleton } from '../../components/ListingCard';
import { NotConnected } from '../../components/RequireAuth';
import { Sheet } from '../../components/Sheet';
import { SponsoredCard } from '../../components/SponsoredCard';
import { Notice } from '../../components/Status';
import { CAMPUSES } from '../../data/campuses';
import { useMe } from '../../lib/auth';
import { useAds, useSearchCards } from '../../lib/queries';
import { supabase } from '../../lib/supabase';
import { PHONE_QUERY, useMediaQuery } from '../../lib/useMediaQuery';
import { FilterBar } from './FilterBar';
import { activeFilterCount, applyFilters, filtersToParams, parseFilters, pickAd, type Filters } from './filters';

// Leaflet is only downloaded when the map is shown (on phones: after tapping "Map").
const SearchMap = lazy(() => import('../../components/SearchMap'));

export default function SearchPage() {
  if (!supabase) return <NotConnected />;
  return <Search />;
}

function Search() {
  const { me } = useMe();
  const defaultNear = me?.profile.campus ?? 'unza';
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(params, defaultNear), [params, defaultNear]);

  const update = useCallback(
    (patch: Partial<Filters>) => setParams(filtersToParams({ ...filters, ...patch }, defaultNear), { replace: true }),
    [filters, defaultNear, setParams],
  );
  const reset = () => setParams(new URLSearchParams(), { replace: true });

  const cards = useSearchCards();
  const ads = useAds();
  const campus = CAMPUSES.find((c) => c.id === filters.near) ?? CAMPUSES[0];
  const results = useMemo(() => applyFilters(cards.data ?? [], filters, campus), [cards.data, filters, campus]);
  const ad = useMemo(() => pickAd(ads.data ?? [], filters.area), [ads.data, filters.area]);

  const [hoverId, setHoverId] = useState<string | null>(null);
  const isPhone = useMediaQuery(PHONE_QUERY);
  // Below 1024 px the list and the map take turns, with a floating Map / List button.
  const isCompact = useMediaQuery('(max-width: 1023px)');
  const [phoneView, setPhoneView] = useState<'list' | 'map'>('list');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const showMap = !isCompact || phoneView === 'map';
  const showList = !isCompact || phoneView === 'list';

  const count = results.length;
  const resultLabel = cards.isPending
    ? 'Loading rooms…'
    : `${count} room${count === 1 ? '' : 's'} ${filters.area ? `in ${filters.area}` : 'in Lusaka'}`;
  const activeCount = activeFilterCount(filters);

  let list: ReactNode;
  if (cards.isPending) {
    list = [0, 1, 2, 3].map((i) => <ListingCardSkeleton key={i} />);
  } else if (cards.isError) {
    list = (
      <Notice tone="error">
        We couldn't load rooms. Check your internet connection.{' '}
        <button type="button" className="link-button" onClick={() => cards.refetch()}>
          Retry
        </button>
      </Notice>
    );
  } else if (count === 0) {
    list = (
      <Blueprint className="card empty-card">
        <h2 className="card-title">No rooms match</h2>
        <p className="card-body">Try a higher rent limit or a different area.</p>
        <div>
          <Button variant="secondary" onClick={reset}>
            Reset filters
          </Button>
        </div>
      </Blueprint>
    );
  } else {
    list = results.map((r, i) => (
      <ListItem key={r.id} after={ad && (i === 3 || (count < 4 && i === count - 1)) ? <SponsoredCard ad={ad} /> : null}>
        <ListingCard listing={r} campusLabel={campus.short} highlighted={hoverId === r.id} onHover={setHoverId} />
      </ListItem>
    ));
  }

  return (
    <div className="search-page">
      <section className="search-hero" aria-labelledby="search-title">
        <div className="hero-inner">
          <div className="kicker">Off-campus rooms in Lusaka</div>
          <h1 id="search-title">Find a room near campus, straight from verified landlords</h1>
          <p className="hero-sub">No agent fees. Your deposit is held safely until you move in.</p>
          <div className="campus-pills" role="group" aria-label="Show rooms nearest to">
            <span className="campus-pills-label">Nearest to</span>
            {CAMPUSES.map((c) => {
              const on = filters.near === c.id && filters.sort === 'near';
              return (
                <button
                  key={c.id}
                  type="button"
                  className={on ? 'campus-pill is-on' : 'campus-pill'}
                  aria-pressed={on}
                  onClick={() => update(on ? { sort: 'recommended' } : { near: c.id, sort: 'near' })}
                >
                  {c.short}
                </button>
              );
            })}
          </div>
          <ul className="trust-strip">
            <li>
              <BadgeCheck size={16} strokeWidth={2} aria-hidden="true" /> ID-checked landlords
            </li>
            <li>
              <Lock size={16} strokeWidth={2} aria-hidden="true" /> Deposit held by BoardZM
            </li>
            <li>
              <MessageSquareQuote size={16} strokeWidth={2} aria-hidden="true" /> Reviews from real tenants
            </li>
          </ul>
        </div>
        <ol className="how-card" aria-label="How BoardZM works">
          <li>
            <span className="how-num">1</span>
            <span>
              <strong>Find and compare</strong> rooms near your campus, with real reviews.
            </span>
          </li>
          <li>
            <span className="how-num">2</span>
            <span>
              <strong>Reserve with mobile money.</strong> BoardZM holds your deposit, not the landlord.
            </span>
          </li>
          <li>
            <span className="how-num">3</span>
            <span>
              <strong>Move in,</strong> then confirm. Only then is the deposit released.
            </span>
          </li>
        </ol>
      </section>

      <section className="filter-row" aria-label="Filters">
        {isPhone ? (
          <Button variant="secondary" className="filters-button" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal size={15} strokeWidth={1.5} aria-hidden="true" />
            Filters{activeCount > 0 && ` · ${activeCount}`}
          </Button>
        ) : (
          <FilterBar filters={filters} onChange={update} />
        )}
      </section>

      <section className="search-grid">
        {showList && (
          <div className="search-results">
            <div className="results-head">
              <h2 className="search-count" role="status" aria-live="polite">
                {resultLabel}
              </h2>
              {activeCount > 0 && (
                <button type="button" className="link-button" onClick={reset}>
                  Clear filters
                </button>
              )}
            </div>
            <div className="search-list" aria-label="Rooms">
              {list}
            </div>
          </div>
        )}
        {showMap && (
          <div className="search-map-col">
            <Suspense fallback={<Blueprint className="search-map map-loading">Loading map…</Blueprint>}>
              <SearchMap results={results} highlightedId={hoverId} onHover={setHoverId} nearId={campus.id} />
            </Suspense>
          </div>
        )}
      </section>

      {isCompact && (
        <Button
          variant="primary"
          className="view-toggle"
          onClick={() => setPhoneView((v) => (v === 'list' ? 'map' : 'list'))}
        >
          {phoneView === 'list' ? (
            <>
              <MapIcon size={16} strokeWidth={1.5} aria-hidden="true" /> Map
            </>
          ) : (
            <>
              <List size={16} strokeWidth={1.5} aria-hidden="true" /> List
            </>
          )}
        </Button>
      )}

      <Sheet
        open={filtersOpen}
        title="Filters"
        onClose={() => setFiltersOpen(false)}
        footer={
          <div className="sheet-actions">
            <Button variant="secondary" onClick={reset}>
              Reset
            </Button>
            <Button variant="primary" onClick={() => setFiltersOpen(false)}>
              Show {count} room{count === 1 ? '' : 's'}
            </Button>
          </div>
        }
      >
        <FilterBar filters={filters} onChange={update} />
      </Sheet>
    </div>
  );
}

function ListItem({ children, after }: { children: ReactNode; after: ReactNode }) {
  return (
    <>
      {children}
      {after}
    </>
  );
}
