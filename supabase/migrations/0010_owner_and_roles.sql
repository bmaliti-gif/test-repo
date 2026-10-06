-- 0010_owner_and_roles.sql — the owner is the only admin; each account has one fixed role.
-- Run after 0009.
--   • Admin belongs to the owner's email only (victoriamaliti4@gmail.com). Nobody else can be
--     made admin through the app; is_admin() checks the signed-in email itself.
--   • Every other member is either a tenant (looking for a room / roommate) or a landlord,
--     chosen once at first sign-in (or from the sign-up link) and fixed after that.
--   • Tenant-only: reserving, unlocking a landlord's WhatsApp, roommate profiles and requests.
--     Landlord-only (already): listing rooms, photos, verification.

-- ─── the owner ───────────────────────────────────────────────────────────────
create or replace function public.owner_email()
returns text
language sql
immutable
set search_path = ''
as $$ select 'victoriamaliti4@gmail.com'::text $$;

revoke all on function public.owner_email() from public, anon, authenticated;

-- Admin = signed in with the owner's email. (The profiles.is_admin column mirrors this for the UI.)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u where u.id = auth.uid() and lower(u.email) = public.owner_email()
  );
$$;

update public.profiles p
   set is_admin = (lower(u.email) = public.owner_email())
  from auth.users u
 where u.id = p.id;

-- ─── new sign-ups: profile with the chosen role; admin only for the owner ────
-- The sign-up link can carry the role (?as=landlord → metadata intended_role).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := case when new.raw_user_meta_data ->> 'intended_role' = 'landlord' then 'landlord' else 'tenant' end;
begin
  insert into public.profiles (id, full_name, role, is_admin)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 80),
    v_role,
    lower(new.email) = public.owner_email()
  )
  on conflict (id) do nothing;
  insert into public.contacts (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

-- If the owner's account is created before this migration or the email changes, keep is_admin in step.
create or replace function public.sync_owner_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set is_admin = (lower(new.email) = public.owner_email()) where id = new.id;
  return new;
end;
$$;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.sync_owner_admin();

-- ─── one fixed role per account ──────────────────────────────────────────────
-- Members choose tenant or landlord during first-time setup; after that it can't change
-- from the app. (The owner can still fix a mistake in the Supabase SQL editor.)
create or replace function public.profiles_lock_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and old.onboarded and new.role is distinct from old.role then
    raise exception 'Your account type is fixed. To % as well, sign up with a different email address.',
      case when old.role = 'tenant' then 'list rooms' else 'look for a room' end;
  end if;
  return new;
end;
$$;
create trigger profiles_lock_role before update on public.profiles
  for each row execute function public.profiles_lock_role();

-- ─── tenant-only actions ─────────────────────────────────────────────────────
create or replace function public.is_tenant()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.role = 'tenant' from public.profiles p where p.id = auth.uid()), false);
$$;
revoke all on function public.is_tenant() from public;
grant execute on function public.is_tenant() to anon, authenticated;

create or replace function public.reservations_tenant_only()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles where id = new.tenant_id and role = 'tenant') then
    raise exception 'Landlord accounts can''t reserve rooms. Sign in with an account that is looking for a room.';
  end if;
  return new;
end;
$$;
create trigger reservations_tenant_only before insert on public.reservations
  for each row execute function public.reservations_tenant_only();

create or replace function public.contact_unlocks_tenant_only()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles where id = new.tenant_id and role = 'tenant') then
    raise exception 'Landlord accounts can''t unlock other landlords'' numbers.';
  end if;
  return new;
end;
$$;
create trigger contact_unlocks_tenant_only before insert on public.contact_unlocks
  for each row execute function public.contact_unlocks_tenant_only();

-- Roommates: tenants only.
drop policy "roommates: create your own" on public.roommate_profiles;
create policy "roommates: tenants create their own"
  on public.roommate_profiles for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_tenant()));

drop policy "roommates: members see visible profiles and their own" on public.roommate_profiles;
create policy "roommates: tenants see visible profiles and their own"
  on public.roommate_profiles for select to authenticated
  using (((select public.is_tenant()) and visible) or user_id = (select auth.uid()));

drop policy "requests: send as yourself" on public.roommate_requests;
create policy "requests: tenants send as themselves"
  on public.roommate_requests for insert to authenticated
  with check (
    from_user = (select auth.uid()) and status = 'pending' and (select public.is_tenant())
    and exists (select 1 from public.roommate_profiles rp where rp.user_id = to_user and rp.visible)
  );

-- Landlords who made roommate profiles before this rule: remove them.
delete from public.roommate_requests q
 where exists (select 1 from public.profiles p where p.role = 'landlord' and p.id in (q.from_user, q.to_user));
delete from public.roommate_profiles rp
 using public.profiles p where p.id = rp.user_id and p.role = 'landlord';

revoke all on function public.owner_email() from public, anon, authenticated;
revoke all on function public.sync_owner_admin() from public, anon, authenticated;
revoke all on function public.profiles_lock_role() from public, anon, authenticated;
revoke all on function public.reservations_tenant_only() from public, anon, authenticated;
revoke all on function public.contact_unlocks_tenant_only() from public, anon, authenticated;

-- Say "landlords can't" before talking about points.
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
  if not public.is_tenant() then
    raise exception 'Landlord accounts can''t unlock landlords'' numbers. Sign in with an account that is looking for a room.';
  end if;
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
