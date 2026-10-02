import { useEffect, useState } from 'react';
import { FileText, Search } from 'lucide-react';
import { Link } from 'react-router';
import { Dialog } from '../../components/Dialog';
import { useToast } from '../../components/Toast';
import { purgeExpiredDocs, useAdminListings, useAdminVerifications, useListingPhotos, useReviewListing, useReviewVerification, type AdminVerification } from '../../lib/admin';
import type { ListingCard } from '../../lib/database.types';
import { listingPhotoUrl } from '../../lib/images';
import { signedDocUrl } from '../../lib/landlord';
import { LISTING_STATUS } from '../../lib/listingStatus';
import { formatKwacha } from '../../lib/money';
import { supabase } from '../../lib/supabase';
import { DecideActions, TableState, when } from './shared';

// ─── Verifications ─────────────────────────────────────────────────────────

const DOCS: { key: 'nrc_front_path' | 'nrc_back_path' | 'selfie_path' | 'ownership_path'; label: string }[] = [
  { key: 'nrc_front_path', label: 'NRC front' },
  { key: 'nrc_back_path', label: 'NRC back' },
  { key: 'selfie_path', label: 'Selfie with NRC' },
  { key: 'ownership_path', label: 'Proof of ownership' },
];

export function VerificationsTab() {
  const list = useAdminVerifications();
  const [open, setOpen] = useState<AdminVerification | null>(null);
  const [purged, setPurged] = useState(0);
  // Delete ID documents reviewed more than 30 days ago (privacy policy).
  useEffect(() => {
    purgeExpiredDocs().then(setPurged);
  }, []);
  return (
    <>
      {purged > 0 && (
        <p className="muted small admin-note">
          Deleted the ID documents of {purged} landlord{purged === 1 ? "" : "s"} reviewed more than 30 days ago.
        </p>
      )}
      <TableState query={list} empty="No verifications waiting. Nice.">
        <table className="table table-stack">
          <thead>
            <tr>
              <th scope="col">Landlord</th>
              <th scope="col">Submitted</th>
              <th scope="col" className="cell-actions">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.data?.map((v) => (
              <tr key={v.id}>
                <td data-label="Landlord">
                  <strong>{v.landlord_name}</strong>
                </td>
                <td data-label="Submitted">{when(v.submitted_at)}</td>
                <td className="cell-actions" data-label="">
                  <button type="button" className="btn btn-secondary" onClick={() => setOpen(v)}>
                    Review documents
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableState>
      {open && <VerificationDialog v={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function VerificationDialog({ v, onClose }: { v: AdminVerification; onClose: () => void }) {
  const decide = useReviewVerification();
  const toast = useToast();
  const [urls, setUrls] = useState<Record<string, string | null>>({});

  useEffect(() => {
    // Short-lived private links; they stop working after 5 minutes.
    Promise.all(DOCS.map(async (d) => [d.key, v[d.key] ? await signedDocUrl(v[d.key]!) : null] as const)).then((pairs) =>
      setUrls(Object.fromEntries(pairs)),
    );
  }, [v]);

  async function go(approve: boolean, reason?: string) {
    try {
      await decide.mutateAsync({ id: v.id, approve, reason });
      onClose();
      toast(approve ? `${v.landlord_name} is now a verified landlord.` : 'Rejected. The landlord sees your reason.');
    } catch {
      // shown in the dialog
    }
  }

  return (
    <Dialog open onClose={onClose} title={`Verify ${v.landlord_name}`} className="admin-dialog" dismissible={!decide.isPending}>
      <p className="dialog-body">Check the NRC photos match each other and the selfie, and that the ownership proof is in the same name.</p>
      <div className="doc-review">
        {DOCS.map((d) => {
          const url = urls[d.key];
          const isPdf = v[d.key]?.endsWith('.pdf');
          return (
            <figure key={d.key}>
              {url ? (
                isPdf ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="doc-pdf">
                    <FileText size={28} strokeWidth={1.5} aria-hidden="true" /> Open PDF
                  </a>
                ) : (
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={d.label} />
                  </a>
                )
              ) : (
                <div className="doc-missing">{v[d.key] ? 'Loading…' : 'Missing'}</div>
              )}
              <figcaption>{d.label}</figcaption>
            </figure>
          );
        })}
      </div>
      <DecideActions
        busy={decide.isPending}
        error={decide.isError ? decide.error.message : null}
        approveLabel="Approve: verified"
        onApprove={() => go(true)}
        onReject={(reason) => go(false, reason)}
      />
    </Dialog>
  );
}

// ─── Listings ──────────────────────────────────────────────────────────────

export function ListingsTab() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const list = useAdminListings(query);
  const [open, setOpen] = useState<ListingCard | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <>
      <div className="admin-tools">
        <label className="search-field">
          <Search size={15} strokeWidth={1.5} aria-hidden="true" />
          <span className="sr-only">Search all listings by title</span>
          <input className="input" type="search" placeholder="Search all listings by title…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <span className="muted small">{query ? 'All listings matching your search' : 'Waiting for review'}</span>
      </div>
      <TableState query={list} empty={query ? 'No listings match.' : 'Nothing waiting for review.'}>
        <table className="table table-stack">
          <thead>
            <tr>
              <th scope="col">Room</th>
              <th scope="col">Landlord</th>
              <th scope="col">Rent</th>
              <th scope="col">Status</th>
              <th scope="col" className="cell-actions">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.data?.map((l) => (
              <tr key={l.id}>
                <td data-label="Room">
                  <strong>{l.title}</strong>
                  <span className="cell-sub">
                    {l.area} · {l.photo_count} photos
                  </span>
                </td>
                <td data-label="Landlord">
                  {l.landlord_name}
                  {l.landlord_verified && <span className="cell-sub">Verified</span>}
                </td>
                <td data-label="Rent">{formatKwacha(l.rent_ngwee)}</td>
                <td data-label="Status">
                  <span className={`tag ${LISTING_STATUS[l.status].tag}`}>{LISTING_STATUS[l.status].label}</span>
                </td>
                <td className="cell-actions" data-label="">
                  <button type="button" className="btn btn-secondary" onClick={() => setOpen(l)}>
                    {l.status === 'in_review' ? 'Review' : 'Details'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableState>
      {open && <ListingDialog l={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function ListingDialog({ l, onClose }: { l: ListingCard; onClose: () => void }) {
  const photos = useListingPhotos(l.id);
  const decide = useReviewListing();
  const toast = useToast();
  // review_note is not in the view; fetch it with the photos.
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    supabase!
      .from('listings')
      .select('review_note')
      .eq('id', l.id)
      .maybeSingle()
      .then(({ data }) => setNote(data?.review_note ?? null));
  }, [l.id]);

  async function go(approve: boolean, reason?: string) {
    try {
      await decide.mutateAsync({ id: l.id, approve, reason });
      onClose();
      toast(approve ? 'Approved. The listing is live.' : 'Rejected. The landlord sees your reason.');
    } catch {
      // shown below
    }
  }

  return (
    <Dialog open onClose={onClose} title={l.title} className="admin-dialog" dismissible={!decide.isPending}>
      <p className="dialog-body">
        {l.type_label} in {l.area} · {formatKwacha(l.rent_ngwee)} / month · by {l.landlord_name}
        {l.landlord_verified ? ' (verified)' : ''}
      </p>
      {note && (
        <div className="notice notice-info">
          <strong>Auto-check notes:</strong>
          <ul className="problem-list">
            {note.split('\n').map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="admin-description">{l.description || <span className="muted">No description.</span>}</p>
      <div className="admin-photos">
        {photos.data?.map((p) => (
          <img key={p} src={listingPhotoUrl(p) ?? ''} alt="" loading="lazy" />
        ))}
        {photos.data?.length === 0 && <span className="muted small">No photos.</span>}
      </div>
      {(l.status === 'live' || l.status === 'reserved') && (
        <p className="small">
          <Link to={`/listing/${l.id}`}>Open the public page</Link>
        </p>
      )}
      {l.status === 'in_review' ? (
        <DecideActions
          busy={decide.isPending}
          error={decide.isError ? decide.error.message : null}
          approveLabel="Approve: go live"
          onApprove={() => go(true)}
          onReject={(reason) => go(false, reason)}
        />
      ) : (
        <p className="muted small">Status: {LISTING_STATUS[l.status].label}. Only listings in review can be approved or rejected here; use Reports to take a live listing down.</p>
      )}
    </Dialog>
  );
}
