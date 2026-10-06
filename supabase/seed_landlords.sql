-- seed_landlords.sql — three more sample landlords and rooms in Silverest and Hybrid.
-- Run after seed.sql, once these landlord accounts exist (sign them up in the app, or ask
-- Claude to create them; passwords are never stored in the repo):
--   landlord2@boardzm-test.example.com  Joseph Phiri       (not verified)
--   landlord3@boardzm-test.example.com  Grace Hostels Ltd  (verified)
--   landlord4@boardzm-test.example.com  Kopa Properties    (verified)
-- Safe to run more than once. Photos are uploaded separately (see docs/sample-photos.md).

do $$
declare
  v_phiri uuid := (select id from auth.users where email = 'landlord2@boardzm-test.example.com');
  v_grace uuid := (select id from auth.users where email = 'landlord3@boardzm-test.example.com');
  v_kopa  uuid := (select id from auth.users where email = 'landlord4@boardzm-test.example.com');
begin
  if v_phiri is null or v_grace is null or v_kopa is null then
    raise exception 'Create the three landlord accounts first (see the top of this file).';
  end if;

  update public.profiles set role = 'landlord', onboarded = true, full_name = 'Joseph Phiri',
         headline = 'Family landlord in Chudleigh and Hybrid' where id = v_phiri;
  update public.profiles set role = 'landlord', onboarded = true, full_name = 'Grace Hostels Ltd',
         headline = 'Student hostels near Evelyn Hone and LMMU', verified_at = coalesce(verified_at, now()) where id = v_grace;
  update public.profiles set role = 'landlord', onboarded = true, full_name = 'Kopa Properties',
         headline = 'Furnished studios and flats, Longacres and Silverest', verified_at = coalesce(verified_at, now()) where id = v_kopa;
  update public.contacts set whatsapp = '+260977412233', payout_provider = 'airtel', payout_number = '+260977412233' where user_id = v_phiri;
  update public.contacts set whatsapp = '+260966208810', payout_provider = 'mtn',    payout_number = '+260966208810' where user_id = v_grace;
  update public.contacts set whatsapp = '+260955301147', payout_provider = 'zamtel', payout_number = '+260955301147' where user_id = v_kopa;

  -- Spread the original rooms across landlords.
  update public.listings set landlord_id = v_phiri where id in ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000006');
  update public.listings set landlord_id = v_grace where id = '00000000-0000-4000-8000-000000000003';
  update public.listings set landlord_id = v_kopa  where id = '00000000-0000-4000-8000-000000000007';

  insert into public.listings (id, landlord_id, title, description, type_label, area, lat, lng, rent_ngwee, available_from, amenities, status, featured_until)
  values
  ('00000000-0000-4000-8000-000000000009', v_kopa, 'Furnished room by UNILUS Silverest campus',
   'A furnished self-contained room a two-minute walk from the UNILUS Silverest campus gate on Great East Road. Own shower, fibre Wi-Fi, borehole water and a guard at night.',
   'Self-contained room', 'Silverest', -15.357, 28.466, 220000, current_date,
   array['Own bathroom','Furnished','Fibre internet','Borehole','Security guard','Walk to campus'], 'live', now() + interval '7 days'),
  ('00000000-0000-4000-8000-000000000010', v_kopa, 'Room in a shared two-bed flat, Silverest',
   'One bedroom in a modern two-bed flat shared with one other UNILUS student. Shared kitchen and lounge, solar backup and parking. Minibuses to town stop outside.',
   'Shared flat', 'Silverest', -15.355, 28.462, 170000, date '2026-11-01',
   array['Shared kitchen','Wi-Fi','Solar backup','Parking'], 'live', null),
  ('00000000-0000-4000-8000-000000000011', v_grace, 'Student bedspace near LMMU',
   'A bedspace in a secure student hostel at Hybrid roundabout, about 20 minutes on foot (or one bus stop) from Levy Mwanawasa Medical University. Two students per room. Quiet study room, laundry and an optional meal plan. Curfew 22:00.',
   'Bedspace', 'Hybrid (near LMMU)', -15.381, 28.364, 120000, current_date,
   array['Study room','Meals option','Laundry','Security guard','Curfew 22:00'], 'live', null),
  ('00000000-0000-4000-8000-000000000012', v_phiri, 'Bedsitter by Hybrid roundabout',
   'A clean bedsitter with a kitchenette, behind the shops at Hybrid roundabout on Great East Road. About 20 minutes on foot to LMMU, or one stop by minibus. Water tank for load-shedding days.',
   'Bedsitter', 'Hybrid (near LMMU)', -15.379, 28.367, 160000, date '2026-10-20',
   array['Kitchenette','Shared bathroom','Water tank','Wi-Fi'], 'live', null)
  on conflict (id) do nothing;
end;
$$;
