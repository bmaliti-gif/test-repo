import { useEffect, useId, useState } from 'react';
import { AREAS } from '../../data/areas';
import { ROOM_CATEGORIES } from '../../data/amenities';
import { CAMPUSES } from '../../data/campuses';
import { RENT_MAX, RENT_MIN, RENT_STEP, SORTS, type Filters, type SortKey } from './filters';

type Props = {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
};

const rentLabel = (k: number) => (k >= RENT_MAX ? `K ${RENT_MAX.toLocaleString('en-US')}+` : `K ${k.toLocaleString('en-US')}`);

/** The search filters. Inline on desktop; inside the Filters sheet on phones. */
export function FilterBar({ filters, onChange }: Props) {
  const ids = useId();
  // The slider moves instantly; the URL and results follow 200 ms after it stops.
  const [rent, setRent] = useState(filters.maxRent);
  useEffect(() => setRent(filters.maxRent), [filters.maxRent]);
  useEffect(() => {
    if (rent === filters.maxRent) return;
    const t = setTimeout(() => onChange({ maxRent: rent }), 200);
    return () => clearTimeout(t);
  }, [rent, filters.maxRent, onChange]);

  return (
    <div className="filter-bar">
      <div className="field filter-area">
        <label htmlFor={`${ids}-area`}>Area</label>
        <select
          id={`${ids}-area`}
          className="input"
          value={filters.area ?? ''}
          onChange={(e) => onChange({ area: e.target.value || null })}
        >
          <option value="">All areas</option>
          {AREAS.map((a) => (
            <option key={a.name} value={a.name}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field filter-rent">
        <label htmlFor={`${ids}-rent`}>
          Max rent · <strong>{rentLabel(rent)}</strong> / month
        </label>
        <input
          id={`${ids}-rent`}
          type="range"
          className="range"
          min={RENT_MIN}
          max={RENT_MAX}
          step={RENT_STEP}
          value={rent}
          aria-valuetext={rent >= RENT_MAX ? 'No limit' : `${rent} Kwacha a month`}
          onChange={(e) => setRent(Number(e.target.value))}
        />
      </div>

      <fieldset className="filter-type">
        <legend>Room type</legend>
        <div className="seg">
          {ROOM_CATEGORIES.map((o) => (
            <label key={o.value} className="seg-opt">
              <input
                type="radio"
                name={`${ids}-type`}
                checked={filters.type === o.value}
                onChange={() => onChange({ type: o.value })}
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field filter-sort">
        <label htmlFor={`${ids}-sort`}>Sort</label>
        <select
          id={`${ids}-sort`}
          className="input"
          value={filters.sort}
          onChange={(e) => onChange({ sort: e.target.value as SortKey })}
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field filter-near">
        <label htmlFor={`${ids}-near`}>Near</label>
        <select
          id={`${ids}-near`}
          className="input"
          value={filters.near}
          onChange={(e) => onChange({ near: e.target.value })}
        >
          {CAMPUSES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <label className="check filter-verified">
        <input
          type="checkbox"
          checked={filters.verifiedOnly}
          onChange={(e) => onChange({ verifiedOnly: e.target.checked })}
        />
        Verified landlords only
      </label>
    </div>
  );
}
