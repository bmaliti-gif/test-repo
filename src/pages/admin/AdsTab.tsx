import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, Plus } from 'lucide-react';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { TextField } from '../../components/Field';
import { Notice } from '../../components/Status';
import { useToast } from '../../components/Toast';
import { AREAS } from '../../data/areas';
import { uploadAdImage, useAdminAds, useSaveAd, type AdRow } from '../../lib/admin';
import { adImageUrl } from '../../lib/images';
import { TableState, when } from './shared';

export function AdsTab() {
  const ads = useAdminAds();
  const [editing, setEditing] = useState<AdRow | 'new' | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const running = (a: AdRow) => a.active && a.starts_on <= today && (!a.ends_on || a.ends_on >= today);

  return (
    <>
      <div className="admin-tools">
        <Button variant="primary" onClick={() => setEditing('new')}>
          <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
          New ad
        </Button>
        <span className="muted small">One sponsored card shows after the 4th search result, matched to the chosen area.</span>
      </div>
      <TableState query={ads} empty="No ads yet.">
        <table className="table table-stack">
          <thead>
            <tr>
              <th scope="col">Business</th>
              <th scope="col">Areas</th>
              <th scope="col">Dates</th>
              <th scope="col">Clicks</th>
              <th scope="col">Status</th>
              <th scope="col" className="cell-actions">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ads.data?.map((a) => (
              <tr key={a.id}>
                <td data-label="Business">
                  <strong>{a.business_name}</strong>
                  <span className="cell-sub">{a.headline}</span>
                </td>
                <td data-label="Areas">{a.areas.length ? a.areas.join(', ') : 'Everywhere'}</td>
                <td data-label="Dates">
                  {when(a.starts_on)} – {a.ends_on ? when(a.ends_on) : 'open'}
                </td>
                <td data-label="Clicks">{a.clicks}</td>
                <td data-label="Status">
                  <span className={running(a) ? 'tag tag-accent' : 'tag tag-neutral'}>{running(a) ? 'Running' : a.active ? 'Scheduled / ended' : 'Off'}</span>
                </td>
                <td className="cell-actions" data-label="">
                  <button type="button" className="btn btn-secondary" onClick={() => setEditing(a)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableState>
      {editing && <AdDialog ad={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function AdDialog({ ad, onClose }: { ad: AdRow | null; onClose: () => void }) {
  const save = useSaveAd();
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);
  const [v, setV] = useState({
    business_name: ad?.business_name ?? '',
    headline: ad?.headline ?? '',
    body: ad?.body ?? '',
    cta_label: ad?.cta_label ?? 'View offer',
    cta_url: ad?.cta_url ?? '',
    image_path: ad?.image_path ?? null,
    areas: ad?.areas ?? [],
    starts_on: ad?.starts_on ?? new Date().toISOString().slice(0, 10),
    ends_on: ad?.ends_on ?? '',
    active: ad?.active ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  useEffect(() => setError(null), [v]);
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!v.business_name.trim() || !v.headline.trim()) return setError('Add the business name and a headline.');
    if (v.cta_url && !/^https?:\/\//.test(v.cta_url.trim())) return setError('The link must start with https://');
    if (v.ends_on && v.ends_on < v.starts_on) return setError('The end date must be after the start date.');
    try {
      await save.mutateAsync({
        id: ad?.id ?? null,
        input: {
          business_name: v.business_name.trim(),
          headline: v.headline.trim(),
          body: v.body.trim(),
          cta_label: v.cta_label.trim() || 'View offer',
          cta_url: v.cta_url.trim() || null,
          image_path: v.image_path,
          areas: v.areas,
          starts_on: v.starts_on,
          ends_on: v.ends_on || null,
          active: v.active,
        },
      });
      onClose();
      toast(ad ? 'Ad updated.' : 'Ad created.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  async function onImage(f: File) {
    setUploading(true);
    try {
      set('image_path', await uploadAdImage(f));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  const img = adImageUrl(v.image_path);

  return (
    <Dialog open onClose={onClose} title={ad ? 'Edit ad' : 'New ad'} className="admin-dialog" dismissible={!save.isPending}>
      <form className="form" onSubmit={submit} noValidate>
        {error && <Notice tone="error">{error}</Notice>}
        <TextField label="Business name" value={v.business_name} onChange={(e) => set('business_name', e.target.value)} maxLength={80} data-autofocus />
        <TextField label="Headline" value={v.headline} onChange={(e) => set('headline', e.target.value)} maxLength={120} placeholder="e.g. Student bed & desk bundles" />
        <TextField label="Short text (optional)" value={v.body} onChange={(e) => set('body', e.target.value)} maxLength={200} />
        <div className="form-row">
          <TextField label="Button label" value={v.cta_label} onChange={(e) => set('cta_label', e.target.value)} maxLength={30} />
          <TextField label="Button link" type="url" value={v.cta_url} onChange={(e) => set('cta_url', e.target.value)} placeholder="https://…" />
        </div>
        <fieldset className="form-group">
          <legend>Areas (none = everywhere)</legend>
          <div className="chip-list">
            {AREAS.map((a) => {
              const on = v.areas.includes(a.name);
              return (
                <button key={a.name} type="button" className={on ? 'chip is-on' : 'chip'} aria-pressed={on} onClick={() => set('areas', on ? v.areas.filter((x) => x !== a.name) : [...v.areas, a.name])}>
                  {on && <Check size={13} strokeWidth={1.5} aria-hidden="true" />}
                  {a.name}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="form-row">
          <TextField label="Starts" type="date" value={v.starts_on} onChange={(e) => set('starts_on', e.target.value)} />
          <TextField label="Ends (optional)" type="date" value={v.ends_on} onChange={(e) => set('ends_on', e.target.value)} />
        </div>
        <div className="ad-image">
          {img && <img src={img} alt="Ad image" />}
          <Button variant="secondary" onClick={() => file.current?.click()} disabled={uploading}>
            {uploading ? 'Uploading…' : img ? 'Replace image' : 'Add image (optional)'}
          </Button>
          <input
            ref={file}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImage(f);
              e.target.value = '';
            }}
          />
        </div>
        <label className="check">
          <input type="checkbox" checked={v.active} onChange={(e) => set('active', e.target.checked)} />
          Active
        </label>
        <div className="dialog-actions">
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={save.isPending || uploading}>
            {save.isPending ? 'Saving…' : 'Save ad'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
