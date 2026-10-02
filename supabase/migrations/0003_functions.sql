-- 0003_functions.sql — triggers, business-rule functions and the listing_cards view.
-- Run after 0002. Every function is security definer with an empty search_path,
-- checks auth.uid() itself, and raises errors in plain words the app can show.

-- ═══ small helpers (internal) ═══════════════════════════════════════════════

-- "0971 234 567", "260971234567" or "+260971234567" → "+260971234567"; null if not a Zambian mobile.
create or replace function public.normalize_zm_phone(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when d ~ '^0[79][0-9]{8}$'   then '+260' || substr(d, 2)
    when d ~ '^260[79][0-9]{8}$' then '+' || d
    when d ~ '^[79][0-9]{8}$'    then '+260' || d
  end
  from (select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') as d) s;
$$;

-- Problems that stop a listing going live automatically. Used by check_listing,
-- by complete_payment (listing fee) and when a live listing's text is edited.
create or replace function public.listing_problems(
  p_title text, p_description text, p_rent_ngwee integer, p_photo_count integer
)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_problems text[] := '{}';
  v_text     text := lower(coalesce(p_title, '') || ' ' || coalesce(p_description, ''));
  v_banned   text[];
  v_word     text;
begin
  select s.banned_words into v_banned from public.app_settings s where s.id = 1;

  if coalesce(p_photo_count, 0) < 3 then
    v_problems := v_problems || format('Add at least 3 photos (this listing has %s).', coalesce(p_photo_count, 0));
  end if;
  if char_length(trim(coalesce(p_title, ''))) < 6 then
    v_problems := v_problems || 'Give the room a descriptive title (at least 6 characters).'::text;
  end if;
  if char_length(trim(coalesce(p_description, ''))) < 40 then
    v_problems := v_problems || 'Describe the room in at least 40 characters: what''s included, water, power and security.'::text;
  end if;
  if p_rent_ngwee is null or p_rent_ngwee not between 30000 and 2000000 then
    v_problems := v_problems || 'Monthly rent must be between K 300 and K 20,000.'::text;
  end if;
  foreach v_word in array coalesce(v_banned, '{}') loop
    if v_word <> '' and position(lower(v_word) in v_text) > 0 then
      v_problems := v_problems || format('Remove the words "%s".', v_word);
    end if;
  end loop;
  -- 9 or more digits in a row (spaces, dots and dashes allowed) looks like a phone number.
  if v_text ~ '[0-9]([ .-]?[0-9]){8,}' or v_text ~ 'wa\.me' then
    v_problems := v_problems || 'Remove phone numbers from the text. Tenants get your WhatsApp number after they reserve.'::text;
  end if;
  return v_problems;
end;
$$;

-- Cancels reservations whose 15 minutes to pay ran out, and fails their payments.
create or replace function public.expire_pending_reservations()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  with expired as (
    update public.reservations r
       set status = 'cancelled', note = 'Payment not completed within 15 minutes.'
     where r.status = 'pending_payment' and r.expires_at < now()
    returning r.id
  )
  update public.payments p
     set status = 'failed', completed_at = now()
   where p.status = 'pending' and p.reservation_id in (select id from expired);
end;
$$;

-- ═══ triggers ═══════════════════════════════════════════════════════════════

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger listings_updated_at before update on public.listings
  for each row execute function public.set_updated_at();
create trigger roommate_profiles_updated_at before update on public.roommate_profiles
  for each row execute function public.set_updated_at();
create trigger app_settings_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();

-- A new sign-up gets a profile (name from Google if available) and an empty contacts row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 80)
  )
  on conflict (id) do nothing;
  insert into public.contacts (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Before a listing is saved: round the pin to ~100 m (so exact homes aren't public),
-- set the category from the room type, and re-check a live listing whose text changed.
create or replace function public.listings_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_problems text[];
  v_photos   integer;
begin
  new.lat := round(new.lat::numeric, 3)::double precision;
  new.lng := round(new.lng::numeric, 3)::double precision;
  new.category := case
    when new.type_label in ('Self-contained room', 'Studio', 'Cottage') then 'self_contained'
    when new.type_label in ('Bedspace', 'Shared flat', 'Shared house') then 'shared'
    else 'single'
  end;

  if tg_op = 'UPDATE' and new.status = 'live'
     and (new.title is distinct from old.title or new.description is distinct from old.description) then
    select count(*) into v_photos from public.listing_photos ph where ph.listing_id = new.id;
    v_problems := public.listing_problems(new.title, new.description, new.rent_ngwee, v_photos);
    if cardinality(v_problems) > 0 then
      new.status := 'in_review';
      new.review_note := array_to_string(v_problems, E'\n');
    end if;
  end if;
  return new;
end;
$$;

create trigger listings_before_write before insert or update on public.listings
  for each row execute function public.listings_before_write();

-- Three open reports hide a listing (back to review) or a review until an admin decides.
create or replace function public.reports_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_open integer;
begin
  select count(*) into v_open from public.reports r
   where r.target_type = new.target_type and r.target_id = new.target_id and r.status = 'open';

  if v_open >= 3 then
    if new.target_type = 'listing' then
      update public.listings
         set status = 'in_review', review_note = 'Hidden after 3 reports. Waiting for the BoardZM team.'
       where id = new.target_id and status = 'live';
    elsif new.target_type = 'review' then
      update public.reviews set status = 'hidden' where id = new.target_id and status = 'published';
    end if;
  end if;
  return new;
end;
$$;

create trigger reports_after_insert after insert on public.reports
  for each row execute function public.reports_after_insert();

-- ═══ payments ═══════════════════════════════════════════════════════════════

-- Tenant starts a reservation: deposit + booking fee, paid by mobile money.
-- Returns { reservation_id, payment_id, reference, amount_ngwee, expires_at }.
create or replace function public.create_reservation(p_listing_id uuid, p_provider text, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_phone    text := public.normalize_zm_phone(p_phone);
  v_settings public.app_settings;
  v_listing  public.listings;
  v_active   public.reservations;
  v_res      public.reservations;
  v_pay_id   uuid;
begin
  if v_uid is null then raise exception 'Please sign in to reserve a room.'; end if;
  if p_provider is null or p_provider not in ('mtn', 'airtel', 'zamtel') then
    raise exception 'Choose MTN MoMo, Airtel Money or Zamtel Kwacha.';
  end if;
  if v_phone is null then raise exception 'Enter a Zambian mobile number, e.g. 0971 234 567.'; end if;

  perform public.expire_pending_reservations();

  select * into v_listing from public.listings where id = p_listing_id for update;
  if not found or v_listing.status <> 'live' then
    raise exception 'This room isn''t available to reserve right now.';
  end if;
  if v_listing.landlord_id = v_uid then raise exception 'You can''t reserve your own room.'; end if;

  select * into v_active from public.reservations
   where listing_id = p_listing_id and status in ('pending_payment', 'held');
  if found then
    if v_active.tenant_id = v_uid and v_active.status = 'pending_payment' then
      -- The same tenant is trying again: replace the unfinished attempt.
      update public.reservations set status = 'cancelled', note = 'Replaced by a new attempt.' where id = v_active.id;
      update public.payments set status = 'failed', completed_at = now()
       where reservation_id = v_active.id and status = 'pending';
    else
      raise exception 'Someone else is reserving this room right now. Please try again in 15 minutes.';
    end if;
  end if;

  select * into v_settings from public.app_settings where id = 1;

  insert into public.reservations (listing_id, tenant_id, deposit_ngwee, booking_fee_ngwee)
  values (p_listing_id, v_uid, v_settings.deposit_ngwee, v_settings.booking_fee_ngwee)
  returning * into v_res;

  insert into public.payments (user_id, kind, amount_ngwee, provider, phone, mode, reservation_id)
  values (v_uid, 'reservation', v_res.deposit_ngwee + v_res.booking_fee_ngwee, p_provider, v_phone,
          v_settings.payments_mode, v_res.id)
  returning id into v_pay_id;

  return jsonb_build_object(
    'reservation_id', v_res.id, 'payment_id', v_pay_id, 'reference', v_res.reference,
    'amount_ngwee', v_res.deposit_ngwee + v_res.booking_fee_ngwee, 'expires_at', v_res.expires_at
  );
end;
$$;

-- Owner starts a fee payment: listing_fee (publish a draft), feature_fee (live listing)
-- or verification_fee (documents uploaded). Returns { payment_id, amount_ngwee }.
create or replace function public.start_payment(p_kind text, p_target_id uuid, p_provider text, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_phone    text := public.normalize_zm_phone(p_phone);
  v_settings public.app_settings;
  v_listing  public.listings;
  v_ver      public.verifications;
  v_amount   integer;
  v_pay_id   uuid;
begin
  if v_uid is null then raise exception 'Please sign in first.'; end if;
  if p_provider is null or p_provider not in ('mtn', 'airtel', 'zamtel') then
    raise exception 'Choose MTN MoMo, Airtel Money or Zamtel Kwacha.';
  end if;
  if v_phone is null then raise exception 'Enter a Zambian mobile number, e.g. 0971 234 567.'; end if;

  select * into v_settings from public.app_settings where id = 1;

  if p_kind in ('listing_fee', 'feature_fee') then
    select * into v_listing from public.listings where id = p_target_id;
    if not found or v_listing.landlord_id <> v_uid then raise exception 'That listing isn''t yours.'; end if;
    if p_kind = 'listing_fee' then
      if v_listing.status <> 'draft' then raise exception 'Only a draft listing can be published.'; end if;
      v_amount := v_settings.listing_fee_ngwee;
    else
      if v_listing.status <> 'live' then raise exception 'Only a live listing can be featured.'; end if;
      v_amount := v_settings.feature_fee_ngwee;
    end if;
  elsif p_kind = 'verification_fee' then
    select * into v_ver from public.verifications where id = p_target_id;
    if not found or v_ver.landlord_id <> v_uid then raise exception 'That verification isn''t yours.'; end if;
    if v_ver.status <> 'awaiting_payment' then raise exception 'This verification has already been paid for.'; end if;
    if v_ver.nrc_front_path is null or v_ver.nrc_back_path is null
       or v_ver.selfie_path is null or v_ver.ownership_path is null then
      raise exception 'Upload all four documents before paying.';
    end if;
    v_amount := v_settings.verification_fee_ngwee;
  else
    raise exception 'Unknown payment type.';
  end if;

  -- An earlier unfinished attempt for the same thing is replaced.
  update public.payments set status = 'failed', completed_at = now()
   where user_id = v_uid and kind = p_kind and status = 'pending'
     and coalesce(listing_id, verification_id) = p_target_id;

  insert into public.payments (user_id, kind, amount_ngwee, provider, phone, mode, listing_id, verification_id)
  values (v_uid, p_kind, v_amount, p_provider, v_phone, v_settings.payments_mode,
          case when p_kind in ('listing_fee', 'feature_fee') then p_target_id end,
          case when p_kind = 'verification_fee' then p_target_id end)
  returning id into v_pay_id;

  return jsonb_build_object('payment_id', v_pay_id, 'amount_ngwee', v_amount);
end;
$$;

-- Internal only: the payment provider's answer (simulated now, a webhook later).
-- Safe to call twice: a finished payment is left alone.
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
  end if;

  return v_result;
end;
$$;

-- Test mode only: the "Simulated phone prompt" Approve / Decline buttons call this.
create or replace function public.simulate_payment(p_payment_id uuid, p_approve boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mode text;
  v_pay  public.payments;
begin
  select payments_mode into v_mode from public.app_settings where id = 1;
  if v_mode <> 'simulated' then raise exception 'Payments are live; the simulator is switched off.'; end if;

  select * into v_pay from public.payments where id = p_payment_id;
  if not found or v_pay.user_id <> auth.uid() then raise exception 'Payment not found.'; end if;

  return public.complete_payment(
    p_payment_id, p_approve,
    case when p_approve then 'SIM-' || upper(substr(md5(random()::text), 1, 8)) end
  );
end;
$$;

-- ═══ reservations after payment ═════════════════════════════════════════════

-- Tenant (or an admin settling a dispute) confirms move-in: the deposit goes to the landlord.
create or replace function public.confirm_move_in(p_reservation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res      public.reservations;
  v_landlord uuid;
  v_contact  public.contacts;
  v_mode     text;
begin
  select * into v_res from public.reservations where id = p_reservation_id for update;
  if not found or (v_res.tenant_id <> auth.uid() and not public.is_admin()) then
    raise exception 'Reservation not found.';
  end if;
  if v_res.status <> 'held' then raise exception 'Only a reservation with a held deposit can be confirmed.'; end if;

  select landlord_id into v_landlord from public.listings where id = v_res.listing_id;
  select * into v_contact from public.contacts where user_id = v_landlord;
  select payments_mode into v_mode from public.app_settings where id = 1;

  update public.reservations set status = 'released', released_at = now() where id = v_res.id;
  update public.listings set status = 'let' where id = v_res.listing_id;

  insert into public.payouts (recipient_id, reservation_id, reason, amount_ngwee, provider, number, status, mode, paid_at)
  values (v_landlord, v_res.id, 'release', v_res.deposit_ngwee, v_contact.payout_provider, v_contact.payout_number,
          case when v_mode = 'simulated' then 'paid' else 'queued' end, v_mode,
          case when v_mode = 'simulated' then now() end);

  return jsonb_build_object('status', 'released', 'reference', v_res.reference);
end;
$$;

-- Landlord (room no longer available) or admin (dispute) cancels a held reservation:
-- the tenant gets everything back and the room goes live again.
create or replace function public.cancel_reservation(p_reservation_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res      public.reservations;
  v_landlord uuid;
  v_pay      public.payments;
  v_mode     text;
begin
  select * into v_res from public.reservations where id = p_reservation_id for update;
  if not found then raise exception 'Reservation not found.'; end if;
  select landlord_id into v_landlord from public.listings where id = v_res.listing_id;
  if v_landlord <> auth.uid() and not public.is_admin() then raise exception 'Reservation not found.'; end if;
  if v_res.status <> 'held' then raise exception 'Only a reservation with a held deposit can be refunded.'; end if;
  if char_length(trim(coalesce(p_reason, ''))) = 0 then raise exception 'Give a reason for the tenant.'; end if;

  select * into v_pay from public.payments
   where reservation_id = v_res.id and status = 'succeeded' order by completed_at desc limit 1;
  select payments_mode into v_mode from public.app_settings where id = 1;

  update public.reservations set status = 'refunded', refunded_at = now(), note = left(trim(p_reason), 300)
   where id = v_res.id;
  update public.listings set status = 'live' where id = v_res.listing_id and status = 'reserved';

  insert into public.payouts (recipient_id, reservation_id, reason, amount_ngwee, provider, number, status, mode, paid_at)
  values (v_res.tenant_id, v_res.id, 'refund', v_res.deposit_ngwee + v_res.booking_fee_ngwee,
          v_pay.provider, v_pay.phone,
          case when v_mode = 'simulated' then 'paid' else 'queued' end, v_mode,
          case when v_mode = 'simulated' then now() end);

  return jsonb_build_object('status', 'refunded', 'reference', v_res.reference);
end;
$$;

-- ═══ contact details (revealed only when earned) ════════════════════════════

-- The landlord's WhatsApp, only for a tenant with a held or released reservation.
create or replace function public.get_landlord_contact(p_listing_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_whatsapp text;
begin
  select c.whatsapp into v_whatsapp
    from public.listings l
    join public.contacts c on c.user_id = l.landlord_id
   where l.id = p_listing_id
     and exists (select 1 from public.reservations r
                  where r.listing_id = l.id and r.tenant_id = auth.uid()
                    and r.status in ('held', 'released'));
  return v_whatsapp;
end;
$$;

-- A roommate's WhatsApp, only after a request between the two was accepted.
create or replace function public.get_roommate_contact(p_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_whatsapp text;
begin
  if not exists (
    select 1 from public.roommate_requests q
     where q.status = 'accepted'
       and ((q.from_user = auth.uid() and q.to_user = p_user_id)
         or (q.to_user = auth.uid() and q.from_user = p_user_id))
  ) then
    return null;
  end if;
  select c.whatsapp into v_whatsapp from public.contacts c where c.user_id = p_user_id;
  return v_whatsapp;
end;
$$;

-- ═══ roommates, reviews ═════════════════════════════════════════════════════

create or replace function public.respond_roommate_request(p_request_id uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text := case when p_accept then 'accepted' else 'declined' end;
begin
  update public.roommate_requests
     set status = v_status, responded_at = now()
   where id = p_request_id and to_user = auth.uid() and status = 'pending';
  if not found then raise exception 'Request not found, or already answered.'; end if;
  return v_status;
end;
$$;

-- One review per released reservation. Returns 'published', or 'pending' if it
-- contains a banned word (the author sees "Under review").
create or replace function public.submit_review(p_reservation_id uuid, p_rating integer, p_body text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res    public.reservations;
  v_body   text := trim(coalesce(p_body, ''));
  v_banned text[];
  v_word   text;
  v_status text := 'published';
begin
  select * into v_res from public.reservations where id = p_reservation_id;
  if not found or v_res.tenant_id <> auth.uid() then raise exception 'Reservation not found.'; end if;
  if v_res.status <> 'released' then raise exception 'You can review a room after you confirm move-in.'; end if;
  if exists (select 1 from public.reviews where reservation_id = p_reservation_id) then
    raise exception 'You''ve already reviewed this stay.';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then raise exception 'Choose 1 to 5 stars.'; end if;
  if char_length(v_body) not between 20 and 1000 then
    raise exception 'Write between 20 and 1,000 characters.';
  end if;

  select banned_words into v_banned from public.app_settings where id = 1;
  foreach v_word in array coalesce(v_banned, '{}') loop
    if v_word <> '' and position(lower(v_word) in lower(v_body)) > 0 then v_status := 'pending'; end if;
  end loop;

  insert into public.reviews (listing_id, reservation_id, tenant_id, rating, body, status)
  values (v_res.listing_id, v_res.id, v_res.tenant_id, p_rating, v_body, v_status);
  return v_status;
end;
$$;

-- ═══ listing checks and admin decisions ═════════════════════════════════════

-- The landlord (or an admin) sees what would stop a listing going live.
create or replace function public.check_listing(p_listing_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_listing public.listings;
  v_photos  integer;
begin
  select * into v_listing from public.listings where id = p_listing_id;
  if not found or (v_listing.landlord_id <> auth.uid() and not public.is_admin()) then
    raise exception 'Listing not found.';
  end if;
  select count(*) into v_photos from public.listing_photos where listing_id = p_listing_id;
  return public.listing_problems(v_listing.title, v_listing.description, v_listing.rent_ngwee, v_photos);
end;
$$;

create or replace function public.review_verification(p_id uuid, p_approve boolean, p_reason text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ver public.verifications;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  select * into v_ver from public.verifications where id = p_id for update;
  if not found or v_ver.status <> 'pending' then raise exception 'This verification isn''t waiting for review.'; end if;
  if not p_approve and char_length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'Give the landlord a reason, so they can fix it.';
  end if;

  update public.verifications
     set status = case when p_approve then 'approved' else 'rejected' end,
         rejection_reason = case when p_approve then null else left(trim(p_reason), 500) end,
         reviewed_at = now(), reviewed_by = auth.uid()
   where id = p_id;
  if p_approve then
    update public.profiles set verified_at = now() where id = v_ver.landlord_id;
  end if;
  return case when p_approve then 'approved' else 'rejected' end;
end;
$$;

create or replace function public.review_listing(p_id uuid, p_approve boolean, p_reason text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if not p_approve and char_length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'Give the landlord a reason, so they can fix it.';
  end if;
  update public.listings
     set status = case when p_approve then 'live' else 'rejected' end,
         review_note = case when p_approve then null else left(trim(p_reason), 1000) end
   where id = p_id and status = 'in_review';
  if not found then raise exception 'This listing isn''t waiting for review.'; end if;
  return case when p_approve then 'live' else 'rejected' end;
end;
$$;

-- p_action: 'hide' (take the item down), 'restore' (put it back) or 'dismiss' (no action).
-- Resolves every open report about the same item.
create or replace function public.resolve_report(p_id uuid, p_action text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rep public.reports;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if p_action not in ('hide', 'restore', 'dismiss') then raise exception 'Choose hide, restore or dismiss.'; end if;
  select * into v_rep from public.reports where id = p_id;
  if not found then raise exception 'Report not found.'; end if;

  if v_rep.target_type = 'listing' then
    if p_action = 'hide' then
      update public.listings set status = 'rejected', review_note = 'Taken down by BoardZM after a report: ' || v_rep.reason
       where id = v_rep.target_id and status in ('live', 'in_review');
    elsif p_action = 'restore' then
      update public.listings set status = 'live', review_note = null
       where id = v_rep.target_id and status in ('in_review', 'rejected');
    end if;
  elsif v_rep.target_type = 'review' then
    if p_action = 'hide' then
      update public.reviews set status = 'hidden' where id = v_rep.target_id;
    elsif p_action = 'restore' then
      update public.reviews set status = 'published' where id = v_rep.target_id;
    end if;
  end if;

  update public.reports set status = 'resolved', resolved_at = now()
   where target_type = v_rep.target_type and target_id = v_rep.target_id and status = 'open';
  return p_action;
end;
$$;

-- Anyone: count a click on a running ad.
create or replace function public.track_ad_click(p_ad_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ads set clicks = clicks + 1
   where id = p_ad_id and active and starts_on <= current_date and (ends_on is null or ends_on >= current_date);
$$;

-- ═══ listing_cards: what search and the map read ════════════════════════════
-- security_invoker = on: the reader's own RLS applies (public sees live + reserved).
create or replace view public.listing_cards
with (security_invoker = on) as
select
  l.id, l.landlord_id, l.title, l.description, l.type_label, l.category, l.area,
  l.lat, l.lng, l.rent_ngwee, l.available_from, l.amenities, l.status,
  l.featured_until, l.created_at, l.updated_at,
  p.full_name                         as landlord_name,
  (p.verified_at is not null)         as landlord_verified,
  p.created_at                        as landlord_since,
  cover.path                          as cover_path,
  coalesce(ph.photo_count, 0)::int    as photo_count,
  rv.avg_rating,
  coalesce(rv.review_count, 0)::int   as review_count,
  coalesce(l.featured_until > now(), false) as is_featured
from public.listings l
join public.profiles p on p.id = l.landlord_id
left join lateral (
  select x.path from public.listing_photos x where x.listing_id = l.id order by x.position, x.created_at limit 1
) cover on true
left join lateral (
  select count(*) as photo_count from public.listing_photos x where x.listing_id = l.id
) ph on true
left join lateral (
  select round(avg(r.rating)::numeric, 1)::double precision as avg_rating, count(*) as review_count
    from public.reviews r where r.listing_id = l.id and r.status = 'published'
) rv on true;

grant select on public.listing_cards to anon, authenticated;

-- ═══ who may call what ══════════════════════════════════════════════════════
-- Postgres lets everyone run new functions by default; take that away, then grant.
revoke all on function public.normalize_zm_phone(text) from public, anon, authenticated;
revoke all on function public.listing_problems(text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.expire_pending_reservations() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.listings_before_write() from public, anon, authenticated;
revoke all on function public.reports_after_insert() from public, anon, authenticated;
revoke all on function public.create_reservation(uuid, text, text) from public, anon;
revoke all on function public.start_payment(text, uuid, text, text) from public, anon;
revoke all on function public.complete_payment(uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.simulate_payment(uuid, boolean) from public, anon;
revoke all on function public.confirm_move_in(uuid) from public, anon;
revoke all on function public.cancel_reservation(uuid, text) from public, anon;
revoke all on function public.get_landlord_contact(uuid) from public, anon;
revoke all on function public.get_roommate_contact(uuid) from public, anon;
revoke all on function public.respond_roommate_request(uuid, boolean) from public, anon;
revoke all on function public.submit_review(uuid, integer, text) from public, anon;
revoke all on function public.check_listing(uuid) from public, anon;
revoke all on function public.review_verification(uuid, boolean, text) from public, anon;
revoke all on function public.review_listing(uuid, boolean, text) from public, anon;
revoke all on function public.resolve_report(uuid, text) from public, anon;
revoke all on function public.track_ad_click(uuid) from public;

grant execute on function public.create_reservation(uuid, text, text) to authenticated;
grant execute on function public.start_payment(text, uuid, text, text) to authenticated;
grant execute on function public.simulate_payment(uuid, boolean) to authenticated;
grant execute on function public.confirm_move_in(uuid) to authenticated;
grant execute on function public.cancel_reservation(uuid, text) to authenticated;
grant execute on function public.get_landlord_contact(uuid) to authenticated;
grant execute on function public.get_roommate_contact(uuid) to authenticated;
grant execute on function public.respond_roommate_request(uuid, boolean) to authenticated;
grant execute on function public.submit_review(uuid, integer, text) to authenticated;
grant execute on function public.check_listing(uuid) to authenticated;
grant execute on function public.review_verification(uuid, boolean, text) to authenticated;
grant execute on function public.review_listing(uuid, boolean, text) to authenticated;
grant execute on function public.resolve_report(uuid, text) to authenticated;
grant execute on function public.track_ad_click(uuid) to anon, authenticated;
-- Live payments (later) confirm through a server-side webhook using the service role.
grant execute on function public.complete_payment(uuid, boolean, text) to service_role;
