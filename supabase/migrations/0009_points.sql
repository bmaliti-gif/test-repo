-- 0009_points.sql — CabinHub points ("float").
-- Run after 0008. Students and landlords top up a points wallet with mobile money
-- (K1 = 2 points by default, so K50 = 100 points) and spend points on:
--   students:  a landlord's WhatsApp number (points only), choosing more than 5 areas at once
--   landlords: each listing after the first 4, verification, featuring
-- Every rule and price lives here; amounts are in app_settings (Admin → Settings).

-- ─── settings ────────────────────────────────────────────────────────────────
alter table public.app_settings
  add column points_per_kwacha     integer   not null default 2   check (points_per_kwacha between 1 and 100),
  add column topup_amounts_ngwee   integer[] not null default '{2000,5000,10000,20000}',
  add column contact_unlock_points integer   not null default 20  check (contact_unlock_points >= 0),
  add column free_area_limit       integer   not null default 5   check (free_area_limit between 1 and 50),
  add column area_pass_points      integer   not null default 10  check (area_pass_points >= 0),
  add column area_pass_days        integer   not null default 7   check (area_pass_days between 1 and 90),
  add column free_listing_limit    integer   not null default 4   check (free_listing_limit >= 0),
  add column extra_listing_points  integer   not null default 80  check (extra_listing_points >= 0),
  add column verification_points   integer   not null default 100 check (verification_points >= 0),
  add column feature_points        integer   not null default 60  check (feature_points >= 0);

grant update (points_per_kwacha, topup_amounts_ngwee, contact_unlock_points, free_area_limit, area_pass_points,
              area_pass_days, free_listing_limit, extra_listing_points, verification_points, feature_points)
  on public.app_settings to authenticated;

-- Top-ups are a new kind of payment.
alter table public.payments drop constraint payments_kind_check;
alter table public.payments add constraint payments_kind_check
  check (kind in ('reservation', 'listing_fee', 'feature_fee', 'verification_fee', 'points_topup'));

-- ─── wallet, history, unlocks, area passes ───────────────────────────────────
create table public.wallets (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  points     integer not null default 0 check (points >= 0),
  updated_at timestamptz not null default now()
);

create table public.point_transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  delta         integer not null,
  balance_after integer not null check (balance_after >= 0),
  reason        text not null check (reason in
                  ('topup', 'contact_unlock', 'area_pass', 'extra_listing', 'verification', 'feature', 'refund', 'admin')),
  listing_id    uuid references public.listings (id) on delete set null,
  payment_id    uuid references public.payments (id) on delete set null,
  note          text,
  created_at    timestamptz not null default now()
);
create index point_transactions_user_idx on public.point_transactions (user_id, created_at desc);

-- A student who has paid to see a landlord's WhatsApp (covers all that landlord's rooms).
create table public.contact_unlocks (
  tenant_id   uuid not null references public.profiles (id) on delete cascade,
  landlord_id uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (tenant_id, landlord_id)
);

-- Choosing more than free_area_limit areas at once, until expires_at.
create table public.area_passes (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  expires_at timestamptz not null
);

alter table public.wallets enable row level security;
alter table public.point_transactions enable row level security;
alter table public.contact_unlocks enable row level security;
alter table public.area_passes enable row level security;

grant select on public.wallets, public.point_transactions, public.contact_unlocks, public.area_passes to authenticated;

create policy "wallets: your own, or admin" on public.wallets for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "points history: your own, or admin" on public.point_transactions for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "unlocks: your own" on public.contact_unlocks for select to authenticated
  using (tenant_id = (select auth.uid()) or (select public.is_admin()));
create policy "area pass: your own" on public.area_passes for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Everyone gets a wallet: existing members now, new members on sign-up.
insert into public.wallets (user_id) select id from public.profiles on conflict do nothing;

create or replace function public.profiles_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.wallets (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
create trigger profiles_create_wallet after insert on public.profiles
  for each row execute function public.profiles_after_insert();

-- ─── internal: add or spend points (one place, always logged) ────────────────
create or replace function public.change_points(
  p_user uuid, p_delta integer, p_reason text,
  p_listing uuid default null, p_payment uuid default null, p_note text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance integer;
begin
  insert into public.wallets (user_id) values (p_user) on conflict do nothing;
  select points into v_balance from public.wallets where user_id = p_user for update;
  if v_balance + p_delta < 0 then
    raise exception 'Not enough points: this needs % and you have %. Top up your points first.', -p_delta, v_balance
      using errcode = 'P0001', hint = 'top_up';
  end if;
  update public.wallets set points = v_balance + p_delta, updated_at = now() where user_id = p_user;
  insert into public.point_transactions (user_id, delta, balance_after, reason, listing_id, payment_id, note)
  values (p_user, p_delta, v_balance + p_delta, p_reason, p_listing, p_payment, p_note);
  return v_balance + p_delta;
end;
$$;

-- ─── top-up: start a mobile-money payment for one of the fixed amounts ───────
create or replace function public.start_topup(p_amount_ngwee integer, p_provider text, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_phone    text := public.normalize_zm_phone(p_phone);
  v_settings public.app_settings;
  v_pay_id   uuid;
begin
  if v_uid is null then raise exception 'Please sign in first.'; end if;
  if p_provider is null or p_provider not in ('mtn', 'airtel', 'zamtel') then
    raise exception 'Choose MTN MoMo, Airtel Money or Zamtel Kwacha.';
  end if;
  if v_phone is null then raise exception 'Enter a Zambian mobile number, e.g. 0971 234 567.'; end if;
  select * into v_settings from public.app_settings where id = 1;
  if not (p_amount_ngwee = any (v_settings.topup_amounts_ngwee)) then
    raise exception 'Choose one of the top-up amounts.';
  end if;
  insert into public.payments (user_id, kind, amount_ngwee, provider, phone, mode)
  values (v_uid, 'points_topup', p_amount_ngwee, p_provider, v_phone, v_settings.payments_mode)
  returning id into v_pay_id;
  return jsonb_build_object('payment_id', v_pay_id, 'amount_ngwee', p_amount_ngwee,
                            'points', p_amount_ngwee / 100 * v_settings.points_per_kwacha);
end;
$$;

-- complete_payment, as in 0003, plus crediting points for a successful top-up.
create or replace function public.complete_payment(p_payment_id uuid, p_success boolean, p_provider_ref text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pay      public.payments;
  v_res      public.reservations;
  v_listing  public.listings;
  v_settings public.app_settings;
  v_photos   integer;
  v_problems text[];
  v_result   jsonb;
begin
  select * into v_pay from public.payments where id = p_payment_id for update;
  if not found then raise exception 'Payment not found.'; end if;
  if v_pay.status <> 'pending' then
    return jsonb_build_object('status', v_pay.status, 'kind', v_pay.kind, 'already_completed', true);
  end if;

  update public.payments
     set status = case when p_success then 'succeeded' else 'failed' end,
         completed_at = now(), provider_ref = p_provider_ref
   where id = v_pay.id;

  v_result := jsonb_build_object('status', case when p_success then 'succeeded' else 'failed' end, 'kind', v_pay.kind);

  if v_pay.kind = 'reservation' then
    select * into v_res from public.reservations where id = v_pay.reservation_id for update;
    v_result := v_result || jsonb_build_object('reference', v_res.reference, 'reservation_id', v_res.id);
    if p_success then
      if v_res.status = 'pending_payment' then
        update public.reservations set status = 'held', held_at = now() where id = v_res.id;
        update public.listings set status = 'reserved' where id = v_res.listing_id and status = 'live';
        v_result := v_result || jsonb_build_object('reservation_status', 'held');
      else
        -- Money arrived after the reservation had lapsed: give it back.
        insert into public.payouts (recipient_id, reservation_id, reason, amount_ngwee, provider, number, status, mode, paid_at)
        values (v_pay.user_id, v_res.id, 'refund', v_pay.amount_ngwee, v_pay.provider, v_pay.phone,
                case when v_pay.mode = 'simulated' then 'paid' else 'queued' end, v_pay.mode,
                case when v_pay.mode = 'simulated' then now() end);
        v_result := v_result || jsonb_build_object('reservation_status', v_res.status, 'refunded', true);
      end if;
    else
      update public.reservations set status = 'cancelled', note = 'Payment declined or failed.'
       where id = v_res.id and status = 'pending_payment';
      v_result := v_result || jsonb_build_object('reservation_status', 'cancelled');
    end if;

  elsif v_pay.kind = 'listing_fee' and p_success then
    select * into v_listing from public.listings where id = v_pay.listing_id for update;
    if v_listing.status = 'draft' then
      select count(*) into v_photos from public.listing_photos where listing_id = v_listing.id;
      v_problems := public.listing_problems(v_listing.title, v_listing.description, v_listing.rent_ngwee, v_photos);
      if cardinality(v_problems) = 0 then
        update public.listings set status = 'live', review_note = null where id = v_listing.id;
        v_result := v_result || jsonb_build_object('listing_status', 'live');
      else
        update public.listings set status = 'in_review', review_note = array_to_string(v_problems, E'\n')
         where id = v_listing.id;
        v_result := v_result || jsonb_build_object('listing_status', 'in_review', 'problems', to_jsonb(v_problems));
      end if;
    end if;

  elsif v_pay.kind = 'feature_fee' and p_success then
    select * into v_settings from public.app_settings where id = 1;
    update public.listings
       set featured_until = greatest(coalesce(featured_until, now()), now()) + make_interval(days => v_settings.feature_days)
     where id = v_pay.listing_id
    returning featured_until into v_listing.featured_until;
    v_result := v_result || jsonb_build_object('featured_until', v_listing.featured_until);

  elsif v_pay.kind = 'verification_fee' and p_success then
    update public.verifications set status = 'pending', submitted_at = now()
     where id = v_pay.verification_id and status = 'awaiting_payment';
    v_result := v_result || jsonb_build_object('verification_status', 'pending');

  elsif v_pay.kind = 'points_topup' and p_success then
    select * into v_settings from public.app_settings where id = 1;
    v_result := v_result || jsonb_build_object(
      'points_added', v_pay.amount_ngwee / 100 * v_settings.points_per_kwacha,
      'points_balance', public.change_points(v_pay.user_id, v_pay.amount_ngwee / 100 * v_settings.points_per_kwacha,
                                             'topup', null, v_pay.id,
                                             'Top-up ' || to_char(v_pay.amount_ngwee / 100.0, 'FM999G990') || ' Kwacha'));
  end if;

  return v_result;
end;
$$;

-- ─── students: a landlord's WhatsApp costs points (once per landlord) ────────
create or replace function public.unlock_landlord_contact(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_landlord uuid;
  v_cost     integer;
  v_balance  integer;
  v_whatsapp text;
begin
  if v_uid is null then raise exception 'Please sign in first.'; end if;
  select l.landlord_id into v_landlord from public.listings l
   where l.id = p_listing_id and (l.status in ('live', 'reserved') or exists (
     select 1 from public.reservations r where r.listing_id = l.id and r.tenant_id = v_uid));
  if v_landlord is null then raise exception 'Listing not found.'; end if;
  if v_landlord = v_uid then raise exception 'This is your own listing.'; end if;

  if not exists (select 1 from public.contact_unlocks where tenant_id = v_uid and landlord_id = v_landlord) then
    select contact_unlock_points into v_cost from public.app_settings where id = 1;
    v_balance := public.change_points(v_uid, -v_cost, 'contact_unlock', p_listing_id, null, 'Landlord WhatsApp');
    insert into public.contact_unlocks (tenant_id, landlord_id) values (v_uid, v_landlord);
  end if;
  select whatsapp into v_whatsapp from public.contacts where user_id = v_landlord;
  return jsonb_build_object('whatsapp', v_whatsapp, 'points_spent', coalesce(v_cost, 0), 'points_balance', v_balance);
end;
$$;

-- Points only: the number shows once this student has unlocked this landlord.
create or replace function public.get_landlord_contact(p_listing_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select c.whatsapp
    from public.listings l
    join public.contacts c on c.user_id = l.landlord_id
   where l.id = p_listing_id
     and exists (select 1 from public.contact_unlocks u where u.tenant_id = auth.uid() and u.landlord_id = l.landlord_id);
$$;

-- ─── students: choose more than free_area_limit areas at once ────────────────
create or replace function public.buy_area_pass()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_s   public.app_settings;
  v_bal integer;
  v_exp timestamptz;
begin
  if v_uid is null then raise exception 'Please sign in first.'; end if;
  select * into v_s from public.app_settings where id = 1;
  v_bal := public.change_points(v_uid, -v_s.area_pass_points, 'area_pass', null, null,
                                'Choose any number of areas for ' || v_s.area_pass_days || ' days');
  insert into public.area_passes (user_id, expires_at) values (v_uid, now() + make_interval(days => v_s.area_pass_days))
  on conflict (user_id) do update
    set expires_at = greatest(public.area_passes.expires_at, now()) + make_interval(days => v_s.area_pass_days)
  returning expires_at into v_exp;
  return jsonb_build_object('expires_at', v_exp, 'points_balance', v_bal);
end;
$$;

-- ─── landlords: publish (first free_listing_limit free), feature, verify ─────
-- Listings that count towards the free limit: anything published and not archived/rejected.
create or replace function public.active_listing_count(p_landlord uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.listings
   where landlord_id = p_landlord and status in ('in_review', 'live', 'reserved', 'let');
$$;

create or replace function public.publish_listing(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_listing  public.listings;
  v_s        public.app_settings;
  v_cost     integer := 0;
  v_balance  integer;
  v_photos   integer;
  v_problems text[];
  v_status   text;
begin
  select * into v_listing from public.listings where id = p_listing_id for update;
  if not found or v_listing.landlord_id <> v_uid then raise exception 'That listing isn''t yours.'; end if;
  if v_listing.status <> 'draft' then raise exception 'Only a draft listing can be published.'; end if;
  select * into v_s from public.app_settings where id = 1;
  if public.active_listing_count(v_uid) >= v_s.free_listing_limit then
    v_cost := v_s.extra_listing_points;
    v_balance := public.change_points(v_uid, -v_cost, 'extra_listing', p_listing_id, null, v_listing.title);
  end if;
  select count(*) into v_photos from public.listing_photos where listing_id = p_listing_id;
  v_problems := public.listing_problems(v_listing.title, v_listing.description, v_listing.rent_ngwee, v_photos);
  v_status := case when cardinality(v_problems) = 0 then 'live' else 'in_review' end;
  update public.listings
     set status = v_status, review_note = case when v_status = 'live' then null else array_to_string(v_problems, E'\n') end
   where id = p_listing_id;
  return jsonb_build_object('listing_status', v_status, 'problems', to_jsonb(v_problems),
                            'points_spent', v_cost, 'points_balance', v_balance);
end;
$$;

create or replace function public.feature_listing(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_listing public.listings;
  v_s       public.app_settings;
  v_balance integer;
  v_until   timestamptz;
begin
  select * into v_listing from public.listings where id = p_listing_id for update;
  if not found or v_listing.landlord_id <> v_uid then raise exception 'That listing isn''t yours.'; end if;
  if v_listing.status <> 'live' then raise exception 'Only a live listing can be featured.'; end if;
  select * into v_s from public.app_settings where id = 1;
  v_balance := public.change_points(v_uid, -v_s.feature_points, 'feature', p_listing_id, null,
                                    'Featured for ' || v_s.feature_days || ' days');
  update public.listings
     set featured_until = greatest(coalesce(featured_until, now()), now()) + make_interval(days => v_s.feature_days)
   where id = p_listing_id
  returning featured_until into v_until;
  return jsonb_build_object('featured_until', v_until, 'points_spent', v_s.feature_points, 'points_balance', v_balance);
end;
$$;

create or replace function public.submit_verification(p_verification_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_ver     public.verifications;
  v_cost    integer;
  v_balance integer;
begin
  select * into v_ver from public.verifications where id = p_verification_id for update;
  if not found or v_ver.landlord_id <> v_uid then raise exception 'That verification isn''t yours.'; end if;
  if v_ver.status <> 'awaiting_payment' then raise exception 'This verification has already been submitted.'; end if;
  if v_ver.nrc_front_path is null or v_ver.nrc_back_path is null or v_ver.selfie_path is null or v_ver.ownership_path is null then
    raise exception 'Upload all four documents first.';
  end if;
  select verification_points into v_cost from public.app_settings where id = 1;
  v_balance := public.change_points(v_uid, -v_cost, 'verification', null, null, 'Landlord verification');
  update public.verifications set status = 'pending', submitted_at = now() where id = p_verification_id;
  return jsonb_build_object('verification_status', 'pending', 'points_spent', v_cost, 'points_balance', v_balance);
end;
$$;

-- Admin: give or take points (refunds, goodwill, corrections). Always logged.
create or replace function public.admin_adjust_points(p_user uuid, p_delta integer, p_note text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if char_length(trim(coalesce(p_note, ''))) = 0 then raise exception 'Say why, for the history.'; end if;
  return public.change_points(p_user, p_delta, case when p_delta > 0 then 'refund' else 'admin' end, null, null, trim(p_note));
end;
$$;

-- ─── who may call what ───────────────────────────────────────────────────────
revoke all on function public.change_points(uuid, integer, text, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.profiles_after_insert() from public, anon, authenticated;
revoke all on function public.active_listing_count(uuid) from public, anon;
revoke all on function public.start_topup(integer, text, text) from public, anon;
revoke all on function public.unlock_landlord_contact(uuid) from public, anon;
revoke all on function public.buy_area_pass() from public, anon;
revoke all on function public.publish_listing(uuid) from public, anon;
revoke all on function public.feature_listing(uuid) from public, anon;
revoke all on function public.submit_verification(uuid) from public, anon;
revoke all on function public.admin_adjust_points(uuid, integer, text) from public, anon;
grant execute on function public.active_listing_count(uuid) to authenticated;
grant execute on function public.start_topup(integer, text, text) to authenticated;
grant execute on function public.unlock_landlord_contact(uuid) to authenticated;
grant execute on function public.buy_area_pass() to authenticated;
grant execute on function public.publish_listing(uuid) to authenticated;
grant execute on function public.feature_listing(uuid) to authenticated;
grant execute on function public.submit_verification(uuid) to authenticated;
grant execute on function public.admin_adjust_points(uuid, integer, text) to authenticated;
