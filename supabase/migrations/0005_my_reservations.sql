-- 0005_my_reservations.sql — the tenant's reservations with their room's name.
-- Run after 0004. Needed because a room that has been let is no longer public,
-- but its tenant must still see it on /reservations (and review it later).

create or replace function public.my_reservations()
returns table (
  id                uuid,
  reference         text,
  status            text,
  deposit_ngwee     integer,
  booking_fee_ngwee integer,
  note              text,
  created_at        timestamptz,
  held_at           timestamptz,
  released_at       timestamptz,
  refunded_at       timestamptz,
  listing_id        uuid,
  listing_title     text,
  listing_area      text,
  listing_status    text,
  landlord_name     text,
  has_review        boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id, r.reference, r.status, r.deposit_ngwee, r.booking_fee_ngwee, r.note, r.created_at,
    r.held_at, r.released_at, r.refunded_at,
    l.id, l.title, l.area, l.status, p.full_name,
    exists (select 1 from public.reviews v where v.reservation_id = r.id)
  from public.reservations r
  join public.listings l on l.id = r.listing_id
  join public.profiles p on p.id = l.landlord_id
  where r.tenant_id = auth.uid()
    and r.status in ('held', 'released', 'refunded')
  order by r.created_at desc;
$$;

revoke all on function public.my_reservations() from public, anon;
grant execute on function public.my_reservations() to authenticated;
