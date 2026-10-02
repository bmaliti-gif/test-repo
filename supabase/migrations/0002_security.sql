-- 0002_security.sql — row level security (RLS), policies and column grants.
-- Run after 0001. Every table has RLS on. Anything not granted here is refused.
-- Business actions (reserving, paying, reviewing…) go through functions in 0003.

-- ─── helpers used inside policies ────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

create or replace function public.is_landlord()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.role = 'landlord' from public.profiles p where p.id = auth.uid()), false);
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_landlord() from public;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_landlord() to anon, authenticated;

-- ─── start from nothing, then grant exactly what's needed ────────────────────
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
-- Tables, views and functions added later also start with no access; each migration grants what it needs.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

alter table public.profiles          enable row level security;
alter table public.contacts          enable row level security;
alter table public.listings          enable row level security;
alter table public.listing_photos    enable row level security;
alter table public.saved_listings    enable row level security;
alter table public.reservations      enable row level security;
alter table public.verifications     enable row level security;
alter table public.payments          enable row level security;
alter table public.payouts           enable row level security;
alter table public.reviews           enable row level security;
alter table public.roommate_profiles enable row level security;
alter table public.roommate_requests enable row level security;
alter table public.ads               enable row level security;
alter table public.reports           enable row level security;
alter table public.app_settings      enable row level security;

-- ─── profiles: everyone can read; you edit only some of your own columns ─────
grant select on public.profiles to anon, authenticated;
grant update (full_name, role, headline, campus, onboarded) on public.profiles to authenticated;

create policy "profiles: anyone can read"
  on public.profiles for select to anon, authenticated using (true);
create policy "profiles: edit your own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ─── contacts: private (owner and admins). WhatsApp is revealed only by functions.
grant select on public.contacts to authenticated;
grant update (whatsapp, payout_provider, payout_number) on public.contacts to authenticated;

create policy "contacts: read your own, or admin"
  on public.contacts for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "contacts: edit your own"
  on public.contacts for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ─── listings: public when live/reserved; landlords manage their own content ─
-- status and featured_until are changed only by functions (no grant).
grant select on public.listings to anon, authenticated;
grant insert (title, description, type_label, area, lat, lng, rent_ngwee, available_from, amenities)
  on public.listings to authenticated;
grant update (title, description, type_label, area, lat, lng, rent_ngwee, available_from, amenities)
  on public.listings to authenticated;

create policy "listings: live and reserved are public"
  on public.listings for select to anon, authenticated
  using (status in ('live', 'reserved'));
create policy "listings: landlords see their own, admins see all"
  on public.listings for select to authenticated
  using (landlord_id = (select auth.uid()) or (select public.is_admin()));
create policy "listings: landlords create drafts"
  on public.listings for insert to authenticated
  with check (landlord_id = (select auth.uid()) and status = 'draft' and (select public.is_landlord()));
create policy "listings: landlords edit their own"
  on public.listings for update to authenticated
  using (landlord_id = (select auth.uid()) and status not in ('let'))
  with check (landlord_id = (select auth.uid()));

-- ─── listing photos: readable with the listing; the landlord adds/removes ────
grant select on public.listing_photos to anon, authenticated;
grant insert (listing_id, path, position) on public.listing_photos to authenticated;
grant update (position) on public.listing_photos to authenticated;
grant delete on public.listing_photos to authenticated;

create policy "photos: readable when the listing is"
  on public.listing_photos for select to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));
create policy "photos: landlord adds to own listing, in own folder"
  on public.listing_photos for insert to authenticated
  with check (
    split_part(path, '/', 1) = (select auth.uid())::text
    and exists (select 1 from public.listings l
                where l.id = listing_id and l.landlord_id = (select auth.uid()))
  );
create policy "photos: landlord reorders own"
  on public.listing_photos for update to authenticated
  using (exists (select 1 from public.listings l
                 where l.id = listing_id and l.landlord_id = (select auth.uid())));
create policy "photos: landlord removes own"
  on public.listing_photos for delete to authenticated
  using (exists (select 1 from public.listings l
                 where l.id = listing_id and l.landlord_id = (select auth.uid())));

-- ─── saved rooms: your own rows only ─────────────────────────────────────────
grant select, delete on public.saved_listings to authenticated;
grant insert (listing_id) on public.saved_listings to authenticated;

create policy "saved: read your own"
  on public.saved_listings for select to authenticated using (user_id = (select auth.uid()));
create policy "saved: add your own"
  on public.saved_listings for insert to authenticated with check (user_id = (select auth.uid()));
create policy "saved: remove your own"
  on public.saved_listings for delete to authenticated using (user_id = (select auth.uid()));

-- ─── reservations: tenant, the room's landlord and admins can read; functions write
grant select on public.reservations to authenticated;

create policy "reservations: tenant, landlord or admin"
  on public.reservations for select to authenticated
  using (
    tenant_id = (select auth.uid())
    or exists (select 1 from public.listings l
               where l.id = listing_id and l.landlord_id = (select auth.uid()))
    or (select public.is_admin())
  );

-- ─── payments and payouts: read-only for the person involved and admins ──────
grant select on public.payments to authenticated;
grant select on public.payouts to authenticated;

create policy "payments: the payer or admin"
  on public.payments for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "payouts: the recipient or admin"
  on public.payouts for select to authenticated
  using (recipient_id = (select auth.uid()) or (select public.is_admin()));

-- ─── verifications: the landlord's own (private documents), and admins ───────
grant select on public.verifications to authenticated;
grant insert (nrc_front_path, nrc_back_path, selfie_path, ownership_path) on public.verifications to authenticated;
grant update (nrc_front_path, nrc_back_path, selfie_path, ownership_path) on public.verifications to authenticated;

create policy "verifications: your own, or admin"
  on public.verifications for select to authenticated
  using (landlord_id = (select auth.uid()) or (select public.is_admin()));
create policy "verifications: landlords start one"
  on public.verifications for insert to authenticated
  with check (
    landlord_id = (select auth.uid()) and status = 'awaiting_payment' and (select public.is_landlord())
    and coalesce(split_part(nrc_front_path, '/', 1), (select auth.uid())::text) = (select auth.uid())::text
    and coalesce(split_part(nrc_back_path,  '/', 1), (select auth.uid())::text) = (select auth.uid())::text
    and coalesce(split_part(selfie_path,    '/', 1), (select auth.uid())::text) = (select auth.uid())::text
    and coalesce(split_part(ownership_path, '/', 1), (select auth.uid())::text) = (select auth.uid())::text
  );
create policy "verifications: change documents before paying"
  on public.verifications for update to authenticated
  using (landlord_id = (select auth.uid()) and status = 'awaiting_payment')
  with check (
    landlord_id = (select auth.uid()) and status = 'awaiting_payment'
    and coalesce(split_part(nrc_front_path, '/', 1), (select auth.uid())::text) = (select auth.uid())::text
    and coalesce(split_part(nrc_back_path,  '/', 1), (select auth.uid())::text) = (select auth.uid())::text
    and coalesce(split_part(selfie_path,    '/', 1), (select auth.uid())::text) = (select auth.uid())::text
    and coalesce(split_part(ownership_path, '/', 1), (select auth.uid())::text) = (select auth.uid())::text
  );

-- ─── reviews: published ones are public; authors see their own; written by submit_review
grant select on public.reviews to anon, authenticated;

create policy "reviews: published are public"
  on public.reviews for select to anon, authenticated using (status = 'published');
create policy "reviews: authors and admins see all of theirs"
  on public.reviews for select to authenticated
  using (tenant_id = (select auth.uid()) or (select public.is_admin()));

-- ─── roommate profiles: signed-in members see visible ones; you edit yours ───
grant select, delete on public.roommate_profiles to authenticated;
grant insert (campus, budget_min_ngwee, budget_max_ngwee, move_in_month, habits, gender, same_gender_only, bio, visible)
  on public.roommate_profiles to authenticated;
grant update (campus, budget_min_ngwee, budget_max_ngwee, move_in_month, habits, gender, same_gender_only, bio, visible)
  on public.roommate_profiles to authenticated;

create policy "roommates: members see visible profiles and their own"
  on public.roommate_profiles for select to authenticated
  using (visible or user_id = (select auth.uid()));
create policy "roommates: create your own"
  on public.roommate_profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy "roommates: edit your own"
  on public.roommate_profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "roommates: delete your own"
  on public.roommate_profiles for delete to authenticated using (user_id = (select auth.uid()));

-- ─── roommate requests: send as yourself; read the ones you're part of ───────
-- Accept / decline goes through respond_roommate_request (0003).
grant select, delete on public.roommate_requests to authenticated;
grant insert (to_user) on public.roommate_requests to authenticated;

create policy "requests: read your own"
  on public.roommate_requests for select to authenticated
  using (from_user = (select auth.uid()) or to_user = (select auth.uid()));
create policy "requests: send as yourself"
  on public.roommate_requests for insert to authenticated
  with check (
    from_user = (select auth.uid()) and status = 'pending'
    and exists (select 1 from public.roommate_profiles rp where rp.user_id = to_user and rp.visible)
  );
create policy "requests: withdraw your pending request"
  on public.roommate_requests for delete to authenticated
  using (from_user = (select auth.uid()) and status = 'pending');

-- ─── ads: running ads are public; only admins write ──────────────────────────
grant select on public.ads to anon, authenticated;
grant insert (business_name, headline, body, cta_label, cta_url, image_path, areas, starts_on, ends_on, active)
  on public.ads to authenticated;
grant update (business_name, headline, body, cta_label, cta_url, image_path, areas, starts_on, ends_on, active)
  on public.ads to authenticated;
grant delete on public.ads to authenticated;

create policy "ads: running ads are public"
  on public.ads for select to anon, authenticated
  using (active and starts_on <= current_date and (ends_on is null or ends_on >= current_date));
create policy "ads: admins see all"
  on public.ads for select to authenticated using ((select public.is_admin()));
create policy "ads: admins create"
  on public.ads for insert to authenticated with check ((select public.is_admin()));
create policy "ads: admins edit"
  on public.ads for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "ads: admins delete"
  on public.ads for delete to authenticated using ((select public.is_admin()));

-- ─── reports: file as yourself; admins read and resolve (via resolve_report) ─
grant select on public.reports to authenticated;
grant insert (target_type, target_id, reason, note) on public.reports to authenticated;

create policy "reports: file as yourself"
  on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'open');
create policy "reports: your own, or admin"
  on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_admin()));

-- ─── app settings: everyone reads; admins edit (never payments_mode) ─────────
grant select on public.app_settings to anon, authenticated;
grant update (deposit_ngwee, booking_fee_ngwee, listing_fee_ngwee, feature_fee_ngwee,
              feature_days, verification_fee_ngwee, banned_words)
  on public.app_settings to authenticated;

create policy "settings: anyone can read"
  on public.app_settings for select to anon, authenticated using (true);
create policy "settings: admins edit"
  on public.app_settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
