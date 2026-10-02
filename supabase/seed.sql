-- seed.sql — sample data from the design: 8 rooms and 1 sponsored ad.
-- Run at the end of Block 3, after your landlord test account exists.
--
-- ▶ BEFORE RUNNING: change the email on the line marked "CHANGE ME" to your
--   landlord test account (e.g. yourname+landlord@gmail.com).
--
-- Safe to run more than once: rows with these ids are skipped if they exist.
-- No photos: upload real ones from the landlord dashboard (Block 7).
-- Reviews and roommate profiles come from real testing.

do $$
declare
  v_email    text := 'CHANGE-ME+landlord@gmail.com';  -- CHANGE ME
  v_landlord uuid;
begin
  select id into v_landlord from auth.users where lower(email) = lower(v_email);
  if v_landlord is null then
    raise exception 'No account with the email %. Sign up with it in the app first, then edit the CHANGE ME line.', v_email;
  end if;

  update public.profiles
     set role = 'landlord',
         full_name = coalesce(nullif(full_name, ''), 'Chanda Banda')
   where id = v_landlord;

  insert into public.listings
    (id, landlord_id, title, description, type_label, area, lat, lng, rent_ngwee,
     available_from, amenities, status, featured_until)
  values
    ('00000000-0000-4000-8000-000000000001', v_landlord,
     'Self-contained room near UNZA gate',
     'A bright self-contained room with its own bathroom, a short walk from the UNZA main gate. Water tank for load-shedding days, Wi-Fi included, and a guard at the gate day and night.',
     'Self-contained room', 'Kalingalinga', -15.401, 28.331, 180000,
     current_date, array['Own bathroom', 'Wi-Fi', 'Water tank', 'Security guard', 'Walk to campus'],
     'live', now() + interval '7 days'),

    ('00000000-0000-4000-8000-000000000002', v_landlord,
     'Room in a shared two-bed flat',
     'One room in a quiet two-bedroom flat, sharing the kitchen and lounge with one professional. Solar backup keeps the lights and Wi-Fi on, and the minibus stop to town is close.',
     'Shared flat', 'Chudleigh', -15.399, 28.319, 160000,
     date '2026-11-01', array['Shared kitchen', 'Wi-Fi', 'Parking', 'Solar backup'],
     'live', null),

    ('00000000-0000-4000-8000-000000000003', v_landlord,
     'Student hostel bedspace',
     'A bedspace in a secure student hostel, two students per room. There is a quiet study room, laundry on site and an optional meal plan. Curfew at 22:00.',
     'Bedspace', 'Mass Media', -15.404, 28.313, 110000,
     date '2027-01-11', array['Study room', 'Meals option', 'Laundry', 'Curfew 22:00'],
     'live', null),

    ('00000000-0000-4000-8000-000000000004', v_landlord,
     'Garden cottage, fully furnished',
     'A private, fully furnished garden cottage with its own entrance. Borehole water, a generator for power cuts and DSTV. Ideal for a young professional.',
     'Cottage', 'Rhodes Park', -15.412, 28.301, 420000,
     current_date, array['Furnished', 'Own entrance', 'Borehole', 'Generator', 'DSTV'],
     'live', null),

    ('00000000-0000-4000-8000-000000000005', v_landlord,
     'Bedsitter with Wi-Fi',
     'A neat bedsitter with a kitchenette and Wi-Fi, sharing a bathroom with one other tenant. A twenty-minute walk to UNZA.',
     'Bedsitter', 'Kalingalinga', -15.406, 28.336, 200000,
     date '2026-10-15', array['Wi-Fi', 'Kitchenette', 'Shared bathroom'],
     'live', null),

    ('00000000-0000-4000-8000-000000000006', v_landlord,
     'Room in a family home',
     'A single room in a friendly family home with meals included. Quiet for studying, and the bus to UNZA stops at the corner.',
     'Single room', 'Chelston', -15.370, 28.380, 150000,
     current_date, array['Meals included', 'Quiet', 'Bus to UNZA'],
     'live', null),

    ('00000000-0000-4000-8000-000000000007', v_landlord,
     'Modern studio apartment',
     'A modern furnished studio with fibre internet, backup power and a gym in the building. Security is on duty 24 hours. Close to UNILUS and the Longacres offices.',
     'Studio', 'Longacres', -15.418, 28.308, 380000,
     current_date, array['Furnished', 'Fibre internet', 'Gym', 'Backup power', '24h security'],
     'live', now() + interval '7 days'),

    ('00000000-0000-4000-8000-000000000008', v_landlord,
     'Shared house with 3 students',
     'A room in a shared house with three other students. Shared kitchen, a big yard and a water tank. Good value for money.',
     'Shared house', 'Bauleni', -15.432, 28.342, 130000,
     date '2026-11-01', array['Shared kitchen', 'Yard', 'Water tank'],
     'live', null)
  on conflict (id) do nothing;

  insert into public.ads (id, business_name, headline, body, cta_label, cta_url, areas, starts_on, active)
  values (
    '00000000-0000-4000-8000-0000000000a1',
    'Mwamba Furniture',
    'Mwamba Furniture — student bed & desk bundles',
    'Delivered to Kalingalinga, Chudleigh and Mass Media.',
    'View offer', null,
    array['Kalingalinga', 'Chudleigh', 'Mass Media'],
    current_date, true
  )
  on conflict (id) do nothing;
end;
$$;
