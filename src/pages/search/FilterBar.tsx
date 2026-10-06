import { useEffect, useId, useState } from 'react';
import { AREAS } from '../../data/areas';
import { ROOM_CATEGORIES } from '../../data/amenities';
import { CAMPUSES } from '../../data/campuses';
import { RENT_MAX, RENT_MIN, RENT_STEP, SORTS, type Filters, type SortKey } from './filters';

type Props = {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  /** How many areas can be chosen at once for free. */
  areaLimit: number;
  /** An active area pass lifts the limit. */
  hasAreaPass: boolean;
  /** Asked to choose one more area than the free limit allows. */
  onNeedAreaPass: (area: string) => void;
};

const rentLabel = (k: number) => (k >= RENT_MAX ? `K ${RENT_MAX.toLocaleString('en-US')}+` : `K ${k.toLocaleString('en-US')}`);

/** The search filters. Inline on desktop; inside the Filters sheet on phones. */
export function FilterBar({ filters, onChange, areaLimit, hasAreaPass, onNeedAreaPass }: Props) {
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
      <AreaPicker
        selected={filters.areas}
        freeLimit={areaLimit}
        unlimited={hasAreaPass}
        onChange={(areas) => onChange({ areas })}
        onNeedPass={onNeedAreaPass}
      />

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

type AreaPickerProps = {
  selected: string[];
  freeLimit: number;
  unlimited: boolean;
  onChange: (areas: string[]) => void;
  onNeedPass: (area: string) => void;
};

/** Tick several areas. Up to `freeLimit` at once is free; one more asks for an area pass. */
function AreaPicker({ selected, freeLimit, unlimited, onChange, onNeedPass }: AreaPickerProps) {
  const ids = useId();
  const [open, setOpen] = useState(false);
  const summary =
    selected.length === 0 ? 'All areas' : selected.length <= 2 ? selected.join(', ') : `${selected.length} areas`;

  function toggle(name: string, on: boolean) {
    if (!on) return onChange(selected.filter((a) => a !== name));
    if (!unlimited && selected.length >= freeLimit) return onNeedPass(name);
    onChange([...selected, name]);
  }

  return (
    <div className="field filter-area">
      <span className="field-label-sm" id={`${ids}-label`}>
        Area
      </span>
      <div className="area-picker" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(false)}>
        <button
          type="button"
          className="input area-toggle"
          aria-expanded={open}
          aria-controls={`${ids}-list`}
          aria-labelledby={`${ids}-label ${ids}-value`}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        >
          <span id={`${ids}-value`}>{summary}</span>
        </button>
        {open && (
          <div className="area-menu" id={`${ids}-list`} role="group" aria-labelledby={`${ids}-label`} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
            <p className="area-hint">
              {unlimited
                ? 'Area pass active: choose as many as you like.'
                : `Choose up to ${freeLimit} at once for free.`}
            </p>
            {AREAS.map((a) => {
              const on = selected.includes(a.name);
              return (
                <label key={a.name} className="check area-option">
                  <input type="checkbox" checked={on} onChange={(e) => toggle(a.name, e.target.checked)} />
                  {a.name}
                </label>
              );
            })}
            <div className="area-menu-foot">
              <button type="button" className="link-button" onClick={() => onChange([])} disabled={!selected.length}>
                All areas
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
