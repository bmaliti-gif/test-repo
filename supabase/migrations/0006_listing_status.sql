-- 0006_listing_status.sql — landlords archive and relist their own rooms.
-- Run after 0005. Status still only changes through functions.

-- Take a room off BoardZM (not while a tenant's deposit is held).
create or replace function public.archive_listing(p_listing_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.listings
     set status = 'archived'
   where id = p_listing_id and landlord_id = auth.uid()
     and status in ('draft', 'in_review', 'live', 'rejected', 'let');
  if not found then
    raise exception 'This room can''t be archived right now. A room with a held deposit must be cancelled first.';
  end if;
  return 'archived';
end;
$$;

-- Put an archived or let room back up, or send a rejected one back for review after fixing it.
-- No new listing fee: it was paid when the room was first published.
-- A room that was never paid for (archived straight from draft) goes back to draft.
create or replace function public.relist_listing(p_listing_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing  public.listings;
  v_paid     boolean;
  v_photos   integer;
  v_problems text[];
  v_status   text;
begin
  select * into v_listing from public.listings where id = p_listing_id and landlord_id = auth.uid() for update;
  if not found then raise exception 'Listing not found.'; end if;
  if v_listing.status not in ('archived', 'let', 'rejected') then
    raise exception 'Only an archived, let or rejected room can be relisted.';
  end if;

  select exists (
    select 1 from public.payments
     where listing_id = p_listing_id and kind = 'listing_fee' and status = 'succeeded'
  ) into v_paid;

  if not v_paid then
    v_status := 'draft';
    update public.listings set status = 'draft' where id = p_listing_id;
    return v_status;
  end if;

  if v_listing.status = 'rejected' then
    -- The BoardZM team looks again after the landlord's fixes.
    update public.listings set status = 'in_review', review_note = 'Resubmitted after changes.' where id = p_listing_id;
    return 'in_review';
  end if;

  select count(*) into v_photos from public.listing_photos where listing_id = p_listing_id;
  v_problems := public.listing_problems(v_listing.title, v_listing.description, v_listing.rent_ngwee, v_photos);
  if cardinality(v_problems) = 0 then
    update public.listings set status = 'live', review_note = null where id = p_listing_id;
    v_status := 'live';
  else
    update public.listings set status = 'in_review', review_note = array_to_string(v_problems, E'\n') where id = p_listing_id;
    v_status := 'in_review';
  end if;
  return v_status;
end;
$$;

revoke all on function public.archive_listing(uuid) from public, anon;
revoke all on function public.relist_listing(uuid) from public, anon;
grant execute on function public.archive_listing(uuid) to authenticated;
grant execute on function public.relist_listing(uuid) to authenticated;
