import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { formatKwacha } from '../../lib/money';
import { useSettings } from '../../lib/queries';

// Fill in before public launch (a real inbox the team reads).
export const SUPPORT_EMAIL: string | null = null;
const UPDATED = '2 October 2026';

function Contact() {
  return SUPPORT_EMAIL ? (
    <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
  ) : (
    <>the “Report a problem” and “Report” buttons in the app</>
  );
}

function Money({ ngwee, fallback }: { ngwee: number | undefined; fallback: string }) {
  return <>{ngwee !== undefined ? formatKwacha(ngwee) : fallback}</>;
}

const PAGES: Record<string, { kicker: string; title: string; body: () => ReactNode }> = {
  '/privacy': { kicker: 'Your data', title: 'Privacy policy', body: Privacy },
  '/terms': { kicker: 'Using CabinHub', title: 'Terms of use', body: Terms },
  '/refunds': { kicker: 'Your money', title: 'Deposits and refunds', body: Refunds },
};

export default function LegalPage() {
  const { pathname } = useLocation();
  const page = PAGES[pathname] ?? PAGES['/terms'];
  const Body = page.body;
  return (
    <div className="page legal-page">
      <div>
        <div className="kicker">{page.kicker}</div>
        <h1>{page.title}</h1>
        <p className="muted lede">Last updated {UPDATED}. Written in plain words; if anything is unclear, ask us.</p>
      </div>
      <nav className="legal-nav" aria-label="Policies">
        <Link to="/privacy" aria-current={pathname === '/privacy' ? 'page' : undefined}>Privacy</Link>
        <Link to="/terms" aria-current={pathname === '/terms' ? 'page' : undefined}>Terms</Link>
        <Link to="/refunds" aria-current={pathname === '/refunds' ? 'page' : undefined}>Deposits &amp; refunds</Link>
      </nav>
      <article className="legal-body">
        <Body />
      </article>
    </div>
  );
}

function Privacy() {
  return (
    <>
      <p>
        CabinHub helps students and young professionals in Lusaka find rooms from landlords. This page explains what we
        collect, why, who can see it and how long we keep it. We follow Zambia's Data Protection Act, 2021.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Your account:</strong> email address, password (stored scrambled, we can't read it), name, whether you are a tenant or landlord, and an optional headline and campus.</li>
        <li><strong>Your WhatsApp number</strong>, and for landlords a mobile-money number for payouts.</li>
        <li><strong>Listings:</strong> room details, photos and an approximate map pin (rounded to about 100 m, never your exact gate).</li>
        <li><strong>Landlord verification:</strong> photos of your NRC (front and back), a selfie holding it, and proof you can let the room.</li>
        <li><strong>Activity:</strong> rooms you save, reservations and payments, reviews, roommate profiles and requests, and reports.</li>
      </ul>
      <h2>Who can see what</h2>
      <ul>
        <li>Your <strong>name and headline</strong> are visible to other members. Listings, room photos and published reviews are public.</li>
        <li>A landlord's <strong>WhatsApp number</strong> is shown only to a tenant who has paid a deposit for that landlord's room.</li>
        <li>A tenant's WhatsApp number is shown to a roommate only after <strong>both of you agree</strong> to match.</li>
        <li><strong>Roommate profiles</strong> are visible only to signed-in members, and you can hide yours at any time.</li>
        <li><strong>ID documents are private</strong>: only you and the CabinHub team can open them, through links that expire after 5 minutes.</li>
        <li>Mobile-money numbers are seen only by you and the CabinHub team.</li>
      </ul>
      <h2>How long we keep it</h2>
      <ul>
        <li>ID documents are <strong>deleted 30 days after we review them</strong>. We keep only the decision (approved or rejected) and the date.</li>
        <li>Payment and reservation records are kept as long as the law requires for financial records.</li>
        <li>Everything else is kept while your account is open. Ask us to close your account and we delete or anonymise your data, except records we must keep by law.</li>
      </ul>
      <h2>Where it is stored</h2>
      <p>
        Your data is stored with our database provider, Supabase, on servers in the United Kingdom, and the app is served by
        Vercel. Map tiles come from OpenStreetMap. We don't sell your data and we don't use advertising trackers.
      </p>
      <h2>Your rights</h2>
      <p>
        You can see and change your details on the Account page. You can ask us for a copy of your data, to correct it, or
        to delete it. Contact us through <Contact />.
      </p>
    </>
  );
}

function Terms() {
  const settings = useSettings().data;
  return (
    <>
      <p>
        These terms apply when you use CabinHub. By creating an account you agree to them. <strong>CabinHub is in test mode:</strong>{' '}
        payments are simulated and no real money moves until we announce that payments are live.
      </p>
      <h2>Accounts</h2>
      <ul>
        <li>Give your real name and a WhatsApp number you use. One person, one account.</li>
        <li>Keep your password private. You are responsible for what happens on your account.</li>
      </ul>
      <h2>For landlords</h2>
      <ul>
        <li>List only rooms you own or are allowed to let, with true photos, price and details.</li>
        <li>Publishing a listing costs <Money ngwee={settings?.listing_fee_ngwee} fallback="the listing fee" />. Featuring it costs <Money ngwee={settings?.feature_fee_ngwee} fallback="the featuring fee" /> for {settings?.feature_days ?? 7} days. Verification costs <Money ngwee={settings?.verification_fee_ngwee} fallback="the verification fee" />. Current amounts are always shown before you pay.</li>
        <li>Don't put phone numbers in listings or ask tenants to pay outside CabinHub. Listings that break these rules are checked by the CabinHub team and may be removed.</li>
        <li>If a reserved room becomes unavailable, cancel the reservation from your dashboard. The tenant gets everything back.</li>
      </ul>
      <h2>For tenants</h2>
      <ul>
        <li>Reserving costs a deposit of <Money ngwee={settings?.deposit_ngwee} fallback="the deposit" /> plus a booking fee of <Money ngwee={settings?.booking_fee_ngwee} fallback="the booking fee" />. See <Link to="/refunds">Deposits and refunds</Link>.</li>
        <li>Only confirm move-in once you have the keys and the room is as listed.</li>
        <li>Reviews must be honest and about your own stay. Reviews with abuse or personal information are removed.</li>
      </ul>
      <h2>What CabinHub does and doesn't do</h2>
      <ul>
        <li>We check landlords' documents and hold deposits, but the rental agreement is between you and the landlord.</li>
        <li>We may hide or remove listings, reviews or accounts that break these terms or are reported, while we look into it.</li>
        <li>We are not responsible for losses caused by things outside our control, such as network or mobile-money outages.</li>
      </ul>
      <p>Questions or complaints: <Contact />. These terms follow the laws of Zambia.</p>
    </>
  );
}

function Refunds() {
  const settings = useSettings().data;
  return (
    <>
      <p>
        When you reserve a room you pay a deposit of <Money ngwee={settings?.deposit_ngwee} fallback="the deposit" /> and a booking
        fee of <Money ngwee={settings?.booking_fee_ngwee} fallback="the booking fee" />. <strong>CabinHub holds the deposit, not the
        landlord,</strong> until you move in.
      </p>
      <h2>When the landlord gets the deposit</h2>
      <p>
        Only when <strong>you confirm move-in</strong> on My reservations. It is then paid to the landlord's mobile money and
        counts towards your first month's rent. Nothing is released automatically.
      </p>
      <h2>When you get money back</h2>
      <ul>
        <li><strong>The landlord cancels</strong> (for example, the room is no longer available): you get the deposit and the booking fee back in full.</li>
        <li><strong>The room isn't as listed</strong>, or the landlord asks for more money or payment outside CabinHub: don't confirm move-in. Use “Report a problem” on My reservations. While we look into it the deposit stays held, and if we agree, you get the deposit and booking fee back in full.</li>
        <li><strong>A payment didn't go through</strong> or a reservation ran out before payment: no money is taken. If money was taken by mistake, it is returned.</li>
      </ul>
      <h2>When there is no refund</h2>
      <ul>
        <li>After you confirm move-in, the deposit belongs to the landlord. Any later problem is between you and the landlord, though you can still report it to us.</li>
        <li>If you simply change your mind after reserving, contact us: we'll ask the landlord, but a refund isn't guaranteed.</li>
      </ul>
      <h2>How refunds are paid</h2>
      <p>To the mobile-money number you paid from. Contact us through <Contact />.</p>
    </>
  );
}
