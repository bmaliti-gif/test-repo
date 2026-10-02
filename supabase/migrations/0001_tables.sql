-- 0001_tables.sql — BoardZM tables, constraints, indexes and the settings row.
-- Paste into Supabase → SQL Editor → New query → Run. Run 0001 → 0004 in order.
-- Money is whole ngwee (K1 = 100 ngwee). Phones are E.164 (+260971234567).

-- ─── profiles: public info about every user ──────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 80),
  role        text not null default 'tenant' check (role in ('tenant', 'landlord')),
  headline    text not null default '' check (char_length(headline) <= 80),
  campus      text,
  onboarded   boolean not null default false,
  is_admin    boolean not null default false,
  verified_at timestamptz,
  created_at  timestamptz not null default now()
);

-- ─── contacts: private, owner and admins only ────────────────────────────────
create table public.contacts (
  user_id         uuid primary key references public.profiles (id) on delete cascade,
  whatsapp        text check (whatsapp ~ '^\+260[0-9]{9}$'),
  payout_provider text check (payout_provider in ('mtn', 'airtel', 'zamtel')),
  payout_number   text check (payout_number ~ '^\+260[0-9]{9}$')
);

-- ─── listings ────────────────────────────────────────────────────────────────
create table public.listings (
  id             uuid primary key default gen_random_uuid(),
  landlord_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title          text not null check (char_length(title) between 1 and 90),
  description    text not null default '' check (char_length(description) <= 3000),
  type_label     text not null check (type_label in (
                   'Self-contained room', 'Bedsitter', 'Bedspace', 'Studio',
                   'Cottage', 'Single room', 'Shared flat', 'Shared house')),
  -- Set automatically from type_label by a trigger (0003).
  category       text not null default 'single' check (category in ('single', 'shared', 'self_contained')),
  area           text not null,
  lat            double precision not null check (lat between -90 and 90),
  lng            double precision not null check (lng between -180 and 180),
  rent_ngwee     integer not null check (rent_ngwee between 30000 and 2000000),
  available_from date not null default current_date,
  amenities      text[] not null default '{}',
  status         text not null default 'draft' check (status in (
                   'draft', 'in_review', 'live', 'reserved', 'let', 'rejected', 'archived')),
  review_note    text,
  featured_until timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index listings_status_idx on public.listings (status);
create index listings_landlord_idx on public.listings (landlord_id);
create index listings_area_idx on public.listings (area);

create table public.listing_photos (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  path       text not null,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);
create index listing_photos_listing_idx on public.listing_photos (listing_id, position);

-- ─── saved rooms ─────────────────────────────────────────────────────────────
create table public.saved_listings (
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- ─── reservations ────────────────────────────────────────────────────────────
create sequence public.reservation_ref_seq start 100001;

create table public.reservations (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique
                    default 'BZ-' || lpad(nextval('public.reservation_ref_seq')::text, 6, '0'),
  listing_id        uuid not null references public.listings (id) on delete cascade,
  tenant_id         uuid not null references public.profiles (id) on delete cascade,
  status            text not null default 'pending_payment' check (status in (
                      'pending_payment', 'held', 'released', 'refunded', 'cancelled')),
  deposit_ngwee     integer not null check (deposit_ngwee >= 0),
  booking_fee_ngwee integer not null check (booking_fee_ngwee >= 0),
  -- Why it was cancelled or refunded (e.g. "Room no longer available").
  note              text,
  expires_at        timestamptz not null default now() + interval '15 minutes',
  held_at           timestamptz,
  released_at       timestamptz,
  refunded_at       timestamptz,
  created_at        timestamptz not null default now()
);
-- Only one pending or held reservation per room at a time.
create unique index reservations_one_active_per_listing
  on public.reservations (listing_id) where status in ('pending_payment', 'held');
create index reservations_tenant_idx on public.reservations (tenant_id);

-- ─── verifications (landlord ID checks) ──────────────────────────────────────
create table public.verifications (
  id               uuid primary key default gen_random_uuid(),
  landlord_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  status           text not null default 'awaiting_payment' check (status in (
                     'awaiting_payment', 'pending', 'approved', 'rejected')),
  nrc_front_path   text,
  nrc_back_path    text,
  selfie_path      text,
  ownership_path   text,
  rejection_reason text,
  submitted_at     timestamptz,
  reviewed_at      timestamptz,
  reviewed_by      uuid references public.profiles (id),
  created_at       timestamptz not null default now()
);
create index verifications_landlord_idx on public.verifications (landlord_id, created_at desc);
create index verifications_status_idx on public.verifications (status);

-- ─── payments (simulated for now) ────────────────────────────────────────────
create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  kind            text not null check (kind in ('reservation', 'listing_fee', 'feature_fee', 'verification_fee')),
  amount_ngwee    integer not null check (amount_ngwee > 0),
  provider        text not null check (provider in ('mtn', 'airtel', 'zamtel')),
  phone           text not null check (phone ~ '^\+260[0-9]{9}$'),
  status          text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  mode            text not null check (mode in ('simulated', 'live')),
  provider_ref    text,
  reservation_id  uuid references public.reservations (id) on delete set null,
  listing_id      uuid references public.listings (id) on delete set null,
  verification_id uuid references public.verifications (id) on delete set null,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);
create index payments_user_idx on public.payments (user_id, created_at desc);
create index payments_reservation_idx on public.payments (reservation_id);

-- ─── payouts (deposit to the landlord, or refund to the tenant) ──────────────
create table public.payouts (
  id             uuid primary key default gen_random_uuid(),
  recipient_id   uuid not null references public.profiles (id) on delete cascade,
  reservation_id uuid references public.reservations (id) on delete set null,
  reason         text not null check (reason in ('release', 'refund')),
  amount_ngwee   integer not null check (amount_ngwee > 0),
  provider       text check (provider in ('mtn', 'airtel', 'zamtel')),
  number         text,
  status         text not null default 'queued' check (status in ('queued', 'paid', 'failed')),
  mode           text not null check (mode in ('simulated', 'live')),
  created_at     timestamptz not null default now(),
  paid_at        timestamptz
);
create index payouts_recipient_idx on public.payouts (recipient_id, created_at desc);
create index payouts_reservation_idx on public.payouts (reservation_id);

-- ─── reviews (only tenants who moved in) ─────────────────────────────────────
create table public.reviews (
  id             uuid primary key default gen_random_uuid(),
  listing_id     uuid not null references public.listings (id) on delete cascade,
  reservation_id uuid not null unique references public.reservations (id) on delete cascade,
  tenant_id      uuid not null references public.profiles (id) on delete cascade,
  rating         integer not null check (rating between 1 and 5),
  body           text not null check (char_length(body) between 20 and 1000),
  status         text not null default 'published' check (status in ('published', 'pending', 'hidden')),
  created_at     timestamptz not null default now()
);
create index reviews_listing_idx on public.reviews (listing_id, status);

-- ─── roommates ───────────────────────────────────────────────────────────────
create table public.roommate_profiles (
  user_id          uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  campus           text not null,
  budget_min_ngwee integer not null check (budget_min_ngwee >= 0),
  budget_max_ngwee integer not null,
  move_in_month    date not null check (extract(day from move_in_month) = 1),
  habits           text[] not null default '{}',
  gender           text check (gender in ('female', 'male')),
  same_gender_only boolean not null default false,
  bio              text not null default '' check (char_length(bio) <= 280),
  visible          boolean not null default true,
  updated_at       timestamptz not null default now(),
  check (budget_max_ngwee >= budget_min_ngwee),
  -- "Same gender only" needs a gender to compare with.
  check (not same_gender_only or gender is not null)
);
create index roommate_profiles_campus_idx on public.roommate_profiles (campus) where visible;

create table public.roommate_requests (
  id           uuid primary key default gen_random_uuid(),
  from_user    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  to_user      uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  unique (from_user, to_user),
  check (from_user <> to_user)
);
create index roommate_requests_to_idx on public.roommate_requests (to_user, status);

-- ─── local business ads ──────────────────────────────────────────────────────
create table public.ads (
  id            uuid primary key default gen_random_uuid(),
  business_name text not null check (char_length(business_name) between 1 and 80),
  headline      text not null check (char_length(headline) between 1 and 120),
  body          text not null default '' check (char_length(body) <= 200),
  cta_label     text not null default 'View offer' check (char_length(cta_label) between 1 and 30),
  cta_url       text check (cta_url ~ '^https?://'),
  image_path    text,
  areas         text[] not null default '{}',  -- empty = shown in every area
  starts_on     date not null default current_date,
  ends_on       date,
  active        boolean not null default true,
  clicks        integer not null default 0,
  created_at    timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

-- ─── reports ─────────────────────────────────────────────────────────────────
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('listing', 'review', 'user', 'reservation')),
  target_id   uuid not null,
  reason      text not null check (char_length(reason) between 1 and 80),
  note        text not null default '' check (char_length(note) <= 1000),
  status      text not null default 'open' check (status in ('open', 'resolved')),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
-- One open report per person per item, so one account can't hide things alone.
create unique index reports_one_open_per_reporter
  on public.reports (reporter_id, target_type, target_id) where status = 'open';
create index reports_target_idx on public.reports (target_type, target_id) where status = 'open';

-- ─── app settings: one row, edited in Admin → Settings ───────────────────────
create table public.app_settings (
  id                     integer primary key default 1 check (id = 1),
  deposit_ngwee          integer not null check (deposit_ngwee >= 0),
  booking_fee_ngwee      integer not null check (booking_fee_ngwee >= 0),
  listing_fee_ngwee      integer not null check (listing_fee_ngwee > 0),
  feature_fee_ngwee      integer not null check (feature_fee_ngwee > 0),
  feature_days           integer not null check (feature_days between 1 and 90),
  verification_fee_ngwee integer not null check (verification_fee_ngwee > 0),
  payments_mode          text not null default 'simulated' check (payments_mode in ('simulated', 'live')),
  banned_words           text[] not null default '{}',
  updated_at             timestamptz not null default now()
);

-- Placeholder amounts (PLAN.md §1): deposit K500, booking fee K25, listing K40,
-- featuring K30 for 7 days, verification K50.
insert into public.app_settings (
  id, deposit_ngwee, booking_fee_ngwee, listing_fee_ngwee, feature_fee_ngwee,
  feature_days, verification_fee_ngwee, payments_mode, banned_words
) values (
  1, 50000, 2500, 4000, 3000, 7, 5000, 'simulated',
  array['scam', 'fraud', 'idiot', 'stupid', 'pay outside', 'pay me directly', 'western union']
);
