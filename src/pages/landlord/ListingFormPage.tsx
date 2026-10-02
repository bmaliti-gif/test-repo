import { lazy, Suspense, useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, Smartphone } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Blueprint } from '../../components/Blueprint';
import { Button } from '../../components/Button';
import { Field, TextField } from '../../components/Field';
import { PaymentDialog } from '../../components/PaymentDialog';
import { Loading, MessagePage, Notice } from '../../components/Status';
import { useToast } from '../../components/Toast';
import { AMENITIES, ROOM_TYPES } from '../../data/amenities';
import { AREAS, areaByName } from '../../data/areas';
import { useAuth, useMe } from '../../lib/auth';
import type { Tables, TypeLabel } from '../../lib/database.types';
import type { LatLng } from '../../lib/geo';
import { useInvalidateLandlord, useListingStatusAction, useMyListing } from '../../lib/landlord';
import { LISTING_STATUS } from '../../lib/listingStatus';
import { formatKwacha } from '../../lib/money';
import { startFeePayment } from '../../lib/payments';
import { useSettings } from '../../lib/queries';
import { supabase } from '../../lib/supabase';
import { MIN_PHOTOS, PhotoManager } from './PhotoManager';

const PinMap = lazy(() => import('../../components/PinMap'));

const schema = z.object({
  title: z.string().trim().min(6, 'Give the room a descriptive title (6+ characters).').max(90, 'Keep the title under 90 characters.'),
  description: z.string().trim().max(3000, 'Keep the description under 3,000 characters.'),
  type_label: z.enum(ROOM_TYPES.map((t) => t.label) as [TypeLabel, ...TypeLabel[]], 'Choose a room type.'),
  area: z.string().min(1, 'Choose an area.'),
  rent: z.coerce
    .number('Enter the monthly rent in Kwacha.')
    .int('Use whole Kwacha.')
    .min(300, 'Enter a monthly rent between K 300 and K 20,000.')
    .max(20000, 'Enter a monthly rent between K 300 and K 20,000.'),
  available_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose the date it is free from.'),
});

type Values = {
  title: string;
  description: string;
  type_label: TypeLabel | '';
  area: string;
  rent: string;
  available_from: string;
  amenities: string[];
  pin: LatLng;
};
type Errors = Partial<Record<keyof Values, string>>;

const today = () => new Date().toISOString().slice(0, 10);

function fromListing(l: Tables<'listings'> | null): Values {
  const first = AREAS[0];
  return l
    ? {
        title: l.title,
        description: l.description,
        type_label: l.type_label,
        area: l.area,
        rent: String(l.rent_ngwee / 100),
        available_from: l.available_from,
        amenities: l.amenities,
        pin: { lat: l.lat, lng: l.lng },
      }
    : { title: '', description: '', type_label: '', area: first.name, rent: '', available_from: today(), amenities: [], pin: { lat: first.lat, lng: first.lng } };
}

export default function ListingFormPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const existing = useMyListing(isNew ? undefined : id);

  if (!isNew && existing.isPending) return <Loading label="Loading your listing…" />;
  if (!isNew && (existing.isError || !existing.data)) {
    return (
      <MessagePage kicker="For landlords" title="Listing not found">
        <p className="card-body">It may have been removed, or it belongs to another account.</p>
        <div>
          <Link to="/landlord" className="btn btn-secondary">
            Back to your properties
          </Link>
        </div>
      </MessagePage>
    );
  }
  // key: start a fresh form when moving from "new" to the saved draft.
  return <ListingForm key={id ?? 'new'} listing={existing.data?.listing ?? null} photos={existing.data?.photos ?? []} />;
}

function ListingForm({ listing, photos }: { listing: Tables<'listings'> | null; photos: { id: string; path: string; position: number }[] }) {
  const { user } = useAuth();
  const { me } = useMe();
  const navigate = useNavigate();
  const toast = useToast();
  const settings = useSettings();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateLandlord();
  const statusAction = useListingStatusAction();

  const [values, setValues] = useState<Values>(() => fromListing(listing));
  const [pinMoved, setPinMoved] = useState(Boolean(listing));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<string[] | null>(null);
  const [paying, setPaying] = useState(false);
  const [published, setPublished] = useState(false);

  const status = listing?.status ?? 'draft';
  const set = <K extends keyof Values>(k: K, v: Values[K]) => setValues((s) => ({ ...s, [k]: v }));
  const setPin = useCallback((p: LatLng) => {
    setPinMoved(true);
    setValues((s) => ({ ...s, pin: p }));
  }, []);

  // A new area moves the pin there, until the landlord places it themselves.
  useEffect(() => {
    if (pinMoved) return;
    const a = areaByName(values.area);
    if (a) setValues((s) => ({ ...s, pin: { lat: a.lat, lng: a.lng } }));
  }, [values.area, pinMoved]);

  // Re-check what would stop a draft going live whenever its photos change.
  const listingId = listing?.id;
  useEffect(() => {
    if (!listingId || status !== 'draft') return;
    supabase!.rpc('check_listing', { p_listing_id: listingId }).then(({ data }) => setProblems(data ?? null));
  }, [listingId, status, photos.length]);

  /** Validate and save. Returns the listing id, or null if something needs fixing. */
  async function save(): Promise<string | null> {
    setFormError(null);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>;
      setErrors(Object.fromEntries(Object.entries(f).map(([k, v]) => [k === 'rent' ? 'rent' : k, v?.[0]])) as Errors);
      setFormError('Some details need fixing (marked below).');
      return null;
    }
    setErrors({});
    const v = parsed.data;
    const row = {
      title: v.title,
      description: v.description,
      type_label: v.type_label,
      area: v.area,
      rent_ngwee: v.rent * 100,
      available_from: v.available_from,
      amenities: values.amenities,
      lat: values.pin.lat,
      lng: values.pin.lng,
    };
    setSaving(true);
    try {
      if (!listing) {
        const { data, error } = await supabase!.from('listings').insert(row).select('id').single();
        if (error) throw error;
        await invalidate();
        return data.id;
      }
      const { data, error } = await supabase!.from('listings').update(row).eq('id', listing.id).select('status, review_note').single();
      if (error) throw error;
      await Promise.all([invalidate(), queryClient.invalidateQueries({ queryKey: ['landlord', 'listing', listing.id] })]);
      if (listing.status === 'live' && data.status === 'in_review') {
        toast('Saved. Your changes go to the BoardZM team for a quick check first.');
      }
      return listing.id;
    } catch {
      setFormError("We couldn't save the listing. Check your connection and try again.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function onSaveDraft(e?: FormEvent) {
    e?.preventDefault();
    const savedId = await save();
    if (!savedId) return;
    if (!listing) {
      toast('Draft saved. Now add your photos.');
      navigate(`/landlord/listings/${savedId}`, { replace: true });
    } else {
      toast(status === 'draft' ? 'Draft saved.' : 'Changes saved.');
    }
  }

  async function onPublish() {
    const savedId = await save();
    if (!savedId || !listing) return;
    const { data } = await supabase!.rpc('check_listing', { p_listing_id: savedId });
    setProblems(data ?? []);
    setPaying(true);
  }

  async function onResubmit() {
    const savedId = await save();
    if (!savedId) return;
    try {
      const result = await statusAction.mutateAsync({ id: savedId, action: 'relist' });
      toast(result === 'in_review' ? 'Sent to the BoardZM team for review.' : result === 'live' ? 'Relisted. It is live again.' : 'Saved.');
      navigate('/landlord');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  const s = LISTING_STATUS[status];
  const fee = settings.data?.listing_fee_ngwee;
  const tooFewPhotos = photos.length < MIN_PHOTOS;

  return (
    <div className="page listing-form-page">
      <div>
        <Link to="/landlord" className="btn btn-ghost back-link">
          <ArrowLeft size={15} strokeWidth={1.5} aria-hidden="true" />
          Your properties
        </Link>
        <div className="kicker">For landlords</div>
        <h1>{listing ? listing.title : 'List a room'}</h1>
        {listing && (
          <p className="lede muted">
            <span className={`tag ${s.tag}`}>{s.label}</span> {s.hint}
          </p>
        )}
      </div>

      {listing?.review_note && (status === 'in_review' || status === 'rejected') && (
        <Notice tone={status === 'rejected' ? 'error' : 'info'}>
          <strong>{status === 'rejected' ? 'What needs fixing:' : 'Why it is in review:'}</strong>
          <ul className="problem-list">
            {listing.review_note.split('\n').map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Notice>
      )}

      <form className="form listing-form" onSubmit={onSaveDraft} noValidate>
        {formError && <Notice tone="error">{formError}</Notice>}

        <Blueprint as="section" className="card form-section" aria-labelledby="basics-heading">
          <h2 id="basics-heading" className="card-title">
            Basics
          </h2>
          <TextField
            label="Title"
            placeholder="e.g. Self-contained room near UNZA gate"
            value={values.title}
            onChange={(e) => set('title', e.target.value)}
            error={errors.title}
            maxLength={90}
          />
          <Field label="Description" error={errors.description} hint="What's included, water and power, security, rules. Don't add phone numbers: tenants get your WhatsApp after they reserve.">
            {({ id, describedBy, invalid }) => (
              <textarea
                id={id}
                className="input"
                rows={5}
                maxLength={3000}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                value={values.description}
                onChange={(e) => set('description', e.target.value)}
              />
            )}
          </Field>
          <div className="form-row">
            <Field label="Room type" error={errors.type_label}>
              {({ id, describedBy, invalid }) => (
                <select
                  id={id}
                  className="input"
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                  value={values.type_label}
                  onChange={(e) => set('type_label', e.target.value as TypeLabel)}
                >
                  <option value="">Choose…</option>
                  {ROOM_TYPES.map((t) => (
                    <option key={t.label} value={t.label}>
                      {t.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Area" error={errors.area}>
              {({ id, describedBy }) => (
                <select id={id} className="input" aria-describedby={describedBy} value={values.area} onChange={(e) => set('area', e.target.value)}>
                  {AREAS.map((a) => (
                    <option key={a.name} value={a.name}>
                      {a.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <div className="form-row">
            <TextField
              label="Monthly rent (Kwacha)"
              inputMode="numeric"
              placeholder="e.g. 1800"
              value={values.rent}
              onChange={(e) => set('rent', e.target.value.replace(/[^\d]/g, ''))}
              error={errors.rent}
              hint={values.rent ? `${formatKwacha(Number(values.rent) * 100)} a month` : 'Between K 300 and K 20,000.'}
            />
            <TextField
              label="Available from"
              type="date"
              value={values.available_from}
              onChange={(e) => set('available_from', e.target.value)}
              error={errors.available_from}
            />
          </div>
        </Blueprint>

        <Blueprint as="section" className="card form-section" aria-labelledby="amenities-heading">
          <h2 id="amenities-heading" className="card-title">
            What's included
          </h2>
          <div className="chip-list" role="group" aria-labelledby="amenities-heading">
            {AMENITIES.map((a) => {
              const on = values.amenities.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  className={on ? 'chip is-on' : 'chip'}
                  aria-pressed={on}
                  onClick={() => set('amenities', on ? values.amenities.filter((x) => x !== a) : [...values.amenities, a])}
                >
                  {on && <Check size={13} strokeWidth={1.5} aria-hidden="true" />}
                  {a}
                </button>
              );
            })}
          </div>
        </Blueprint>

        <Blueprint as="section" className="card form-section" aria-labelledby="location-heading">
          <h2 id="location-heading" className="card-title">
            Location
          </h2>
          <p className="field-hint">
            Tap the map where the room is, or drag the pin. Tenants see it to within about 100 m, never your exact gate.
          </p>
          <Suspense fallback={<div className="pin-map map-loading">Loading map…</div>}>
            <PinMap value={values.pin} onChange={setPin} />
          </Suspense>
        </Blueprint>

        <Blueprint as="section" className="card form-section" aria-labelledby="photos-heading">
          <h2 id="photos-heading" className="card-title">
            Photos
          </h2>
          {listing && user ? (
            <PhotoManager userId={user.id} listingId={listing.id} photos={photos} />
          ) : (
            <p className="card-body">Save the draft first, then add 3 to 8 photos.</p>
          )}
        </Blueprint>

        {status === 'draft' && listing && problems && problems.length > 0 && (
          <Notice tone="info">
            <strong>Before it can go live straight away:</strong>
            <ul className="problem-list">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            If you publish now, the BoardZM team checks it first (usually within a day).
          </Notice>
        )}

        <div className="form-footer">
          {status === 'draft' ? (
            <>
              <Button variant="secondary" type="submit" disabled={saving}>
                {saving ? 'Saving…' : listing ? 'Save draft' : 'Save draft and add photos'}
              </Button>
              {listing && (
                <Button variant="primary" onClick={onPublish} disabled={saving || tooFewPhotos || !fee}>
                  <Smartphone size={16} strokeWidth={1.5} aria-hidden="true" />
                  Publish{fee ? ` · ${formatKwacha(fee)}` : ''}
                </Button>
              )}
            </>
          ) : status === 'rejected' || status === 'archived' || status === 'let' ? (
            <>
              <Button variant="secondary" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
              <Button variant="primary" onClick={onResubmit} disabled={saving || statusAction.isPending}>
                {status === 'rejected' ? 'Save and send for review' : 'Save and relist'}
              </Button>
            </>
          ) : (
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          )}
          {status === 'draft' && listing && tooFewPhotos && (
            <span className="field-hint">Add at least {MIN_PHOTOS} photos to publish.</span>
          )}
        </div>
      </form>

      {listing && fee !== undefined && (
        <PaymentDialog
          open={paying}
          onClose={() => {
            setPaying(false);
            if (published) navigate('/landlord');
          }}
          title="Publish listing"
          amountNgwee={fee}
          defaultPhone={me?.contacts?.payout_number ?? me?.contacts?.whatsapp}
          start={(provider, phone) => startFeePayment('listing_fee', listing.id, provider, phone)}
          onFinished={(r) => {
            if (r.status === 'succeeded') setPublished(true);
            void invalidate();
            void queryClient.invalidateQueries({ queryKey: ['landlord', 'listing', listing.id] });
          }}
          success={(r) =>
            r.listing_status === 'live'
              ? {
                  title: 'Listing published',
                  body: (
                    <>
                      <strong>{listing.title}</strong> is live. Tenants can find it on the map and reserve it with a deposit.{' '}
                      <Link to={`/listing/${listing.id}`}>See it as tenants do</Link>
                    </>
                  ),
                }
              : {
                  title: 'Paid · in review',
                  body: (
                    <>
                      Thanks. The BoardZM team will check <strong>{listing.title}</strong> first, usually within a day:
                      <ul className="problem-list">
                        {(r.problems ?? problems ?? []).map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    </>
                  ),
                }
          }
        />
      )}
    </div>
  );
}
