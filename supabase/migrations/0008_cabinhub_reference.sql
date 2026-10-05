-- 0008_cabinhub_reference.sql — the app is now CabinHub: new reservation references
-- start with CH- (e.g. CH-100014). Existing BZ- references keep working unchanged.

alter table public.reservations
  alter column reference set default 'CH-' || lpad(nextval('public.reservation_ref_seq')::text, 6, '0');
