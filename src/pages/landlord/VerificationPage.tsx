import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CircleCheck, FileText, ShieldCheck, Upload } from 'lucide-react';
import { Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Blueprint } from '../../components/Blueprint';
import { Button } from '../../components/Button';
import { PaymentDialog } from '../../components/PaymentDialog';
import { Loading, MessagePage, Notice } from '../../components/Status';
import { useAuth, useMe } from '../../lib/auth';
import {
  signedDocUrl,
  startVerification,
  uploadVerificationDoc,
  useVerification,
  type DocSlot,
  type Verification,
} from '../../lib/landlord';
import { formatKwacha } from '../../lib/money';
import { startFeePayment } from '../../lib/payments';
import { useSettings } from '../../lib/queries';

const SLOTS: { slot: DocSlot; label: string; hint: string; pdf: boolean }[] = [
  { slot: 'nrc_front_path', label: 'NRC — front', hint: 'A clear photo of the front of your National Registration Card.', pdf: false },
  { slot: 'nrc_back_path', label: 'NRC — back', hint: 'The back of the same card.', pdf: false },
  { slot: 'selfie_path', label: 'Selfie holding your NRC', hint: 'Your face and the card in one photo, in good light.', pdf: false },
  {
    slot: 'ownership_path',
    label: 'Proof you can let the room',
    hint: 'Title deed, lease or a recent utility bill in your name. Photo or PDF, up to 5 MB.',
    pdf: true,
  },
];

const STATUS = {
  awaiting_payment: { label: 'Awaiting payment', note: 'Upload all four documents, then pay to send them for review.' },
  pending: { label: 'Pending review', note: 'The BoardZM team is checking your documents, usually within a day. No office visit.' },
  approved: { label: 'Approved', note: 'You are a verified landlord. Tenants see the Verified landlord tag on all your rooms.' },
  rejected: { label: 'Rejected', note: 'Something needs fixing. Upload new documents and resubmit.' },
} as const;

export default function VerificationPage() {
  const { user } = useAuth();
  const { me } = useMe();
  const verification = useVerification();
  const settings = useSettings();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<Verification | null>(null);
  const [busySlot, setBusySlot] = useState<DocSlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [paying, setPaying] = useState(false);

  if (verification.isPending) return <Loading label="Loading your verification…" />;
  if (verification.isError) {
    return (
      <MessagePage kicker="For landlords" title="We couldn't load your verification">
        <p className="card-body">Check your internet connection, then try again.</p>
        <div>
          <Button variant="primary" onClick={() => verification.refetch()}>
            Retry
          </Button>
        </div>
      </MessagePage>
    );
  }

  const latest = verification.data;
  const verified = Boolean(me?.profile.verified_at);
  // After a rejection, new uploads go into a fresh verification.
  const current = draft ?? (latest && latest.status !== 'rejected' ? latest : null);
  const status = verified ? 'approved' : current?.status ?? (latest?.status === 'rejected' ? 'rejected' : 'awaiting_payment');
  const editable = !verified && (!current || current.status === 'awaiting_payment');
  const complete = Boolean(current && SLOTS.every((s) => current[s.slot]));
  const fee = settings.data?.verification_fee_ngwee;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['landlord'] });

  async function upload(slot: DocSlot, file: File) {
    if (!user) return;
    setError(null);
    setBusySlot(slot);
    try {
      const v = current ?? (await startVerification());
      const path = await uploadVerificationDoc(user.id, v.id, slot, file);
      setDraft({ ...v, [slot]: path });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That upload failed.');
    } finally {
      setBusySlot(null);
    }
  }

  return (
    <div className="page verification-page">
      <div>
        <Link to="/landlord" className="btn btn-ghost back-link">
          <ArrowLeft size={15} strokeWidth={1.5} aria-hidden="true" />
          Your properties
        </Link>
        <div className="kicker">Identity verification</div>
        <h1>Get the Verified badge</h1>
        <p className="lede muted">
          Verified landlords get more reservations: tenants filter for them. Reviewed by the BoardZM team, usually within a day.
        </p>
      </div>

      <div className={`status-strip status-${status}`} role="status">
        <span className="status-strip-label">
          {status === 'approved' ? <ShieldCheck size={16} strokeWidth={1.5} aria-hidden="true" /> : null}
          {STATUS[status].label}
        </span>
        <span>{STATUS[status].note}</span>
        {status === 'rejected' && latest?.rejection_reason && (
          <span className="status-reason">
            <strong>Reason:</strong> {latest.rejection_reason}
          </span>
        )}
      </div>

      {!verified && (
        <>
          <div className="doc-grid">
            {SLOTS.map((s) => (
              <DocSlotCard
                key={s.slot}
                {...s}
                path={current?.[s.slot] ?? null}
                editable={editable}
                busy={busySlot === s.slot}
                onFile={(f) => upload(s.slot, f)}
              />
            ))}
          </div>

          {error && <Notice tone="error">{error}</Notice>}

          {editable && (
            <Blueprint className="card verify-submit">
              <label className="check consent">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>
                  I agree that BoardZM may check these documents to verify me. They stay private (only the BoardZM team can
                  see them) and are deleted 30 days after review.
                </span>
              </label>
              <Button variant="primary" onClick={() => setPaying(true)} disabled={!complete || !consent || !fee}>
                Verify{fee ? ` · ${formatKwacha(fee)}` : ''}
              </Button>
              {!complete && <span className="field-hint">Upload all four documents first.</span>}
            </Blueprint>
          )}
        </>
      )}

      {current && fee !== undefined && (
        <PaymentDialog
          open={paying}
          onClose={() => setPaying(false)}
          title="Verify your account"
          amountNgwee={fee}
          defaultPhone={me?.contacts?.payout_number ?? me?.contacts?.whatsapp}
          start={(provider, phone) => startFeePayment('verification_fee', current.id, provider, phone)}
          onFinished={() => {
            setDraft(null);
            void refresh();
          }}
          success={() => ({
            title: 'Sent for review',
            body: <>Thanks. The BoardZM team will check your documents, usually within a day. We'll show the result here.</>,
          })}
        />
      )}
    </div>
  );
}

type SlotProps = {
  label: string;
  hint: string;
  pdf: boolean;
  path: string | null;
  editable: boolean;
  busy: boolean;
  onFile: (f: File) => void;
};

function DocSlotCard({ label, hint, pdf, path, editable, busy, onFile }: SlotProps) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const isPdf = path?.endsWith('.pdf');

  // Private files: fetch a 5-minute link to show the thumbnail.
  useEffect(() => {
    let live = true;
    setPreview(null);
    if (path && !path.endsWith('.pdf')) signedDocUrl(path).then((u) => live && setPreview(u));
    return () => {
      live = false;
    };
  }, [path]);

  return (
    <Blueprint className="card doc-slot">
      <div className="doc-thumb">
        {preview ? (
          <img src={preview} alt={`${label} (uploaded)`} />
        ) : isPdf ? (
          <span className="doc-file">
            <FileText size={28} strokeWidth={1.5} aria-hidden="true" />
            PDF uploaded
          </span>
        ) : (
          <Upload size={24} strokeWidth={1.5} aria-hidden="true" className="accent-icon" />
        )}
      </div>
      <div className="doc-info">
        <span className="card-title">
          {path && <CircleCheck size={15} strokeWidth={1.5} aria-label="Uploaded" className="accent-icon" />} {label}
        </span>
        <span className="field-hint">{hint}</span>
      </div>
      {editable && (
        <>
          <Button variant="secondary" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? 'Uploading…' : path ? 'Replace' : 'Upload'}
          </Button>
          <input
            ref={input}
            type="file"
            hidden
            accept={pdf ? 'image/*,application/pdf' : 'image/*'}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = '';
            }}
          />
        </>
      )}
    </Blueprint>
  );
}
