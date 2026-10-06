-- seed_roommates.sql — four sample roommates for the Roommates tab.
-- Run once these member accounts exist (sign them up in the app, or ask Claude to create
-- them; passwords are never stored in the repo):
--   mate1@boardzm-test.example.com  Mutinta Hamoonga  3rd-year Law · UNZA
--   mate2@boardzm-test.example.com  Thandiwe Nkhoma   2nd-year Pharmacy · LMMU
--   mate3@boardzm-test.example.com  Esther Phiri      MBA · UNILUS Silverest
--   mate4@boardzm-test.example.com  Chileshe Banda    Graduate trainee · Cairo Road
-- Safe to run more than once.

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('mate1@boardzm-test.example.com', 'Mutinta Hamoonga', '3rd-year Law · UNZA', 'unza', '+260977550121',
       90000, 120000, date '2026-11-01', array['Non-smoker','Early riser','Quiet study'], 'female', false,
       'Law student, up early and in the library most evenings. Looking for a calm, tidy flat near UNZA.'),
      ('mate2@boardzm-test.example.com', 'Thandiwe Nkhoma', '2nd-year Pharmacy · LMMU', 'lmmu', '+260966781034',
       70000, 100000, date '2027-01-01', array['Tidy','Cooks often','Church-goer'], 'female', true,
       'Pharmacy student at LMMU. I cook most evenings and keep things neat. Prefer a female roommate near Hybrid or Kalingalinga.'),
      ('mate3@boardzm-test.example.com', 'Esther Phiri', 'MBA · UNILUS Silverest', 'unilus-silverest', '+260955402218',
       150000, 220000, date '2026-11-01', array['Quiet','Remote work','Non-smoker'], 'female', false,
       'Doing my MBA part-time and working from home. Need good Wi-Fi and a quiet place in Silverest.'),
      ('mate4@boardzm-test.example.com', 'Chileshe Banda', 'Graduate trainee · Cairo Road', 'city-centre', '+260977903355',
       150000, 200000, date '2026-10-01', array['Works 8–5','Gym','Non-smoker'], 'male', false,
       'Graduate trainee at a bank on Cairo Road. Out 8–5, gym after work. Easy-going, splits chores fairly.')
    ) as t(email, name, headline, campus, whatsapp, bmin, bmax, month, habits, gender, same_only, bio)
  loop
    if not exists (select 1 from auth.users where email = r.email) then
      raise notice 'Skipping % (no account yet)', r.email;
      continue;
    end if;
    update public.profiles p set full_name = r.name, role = 'tenant', headline = r.headline, campus = r.campus, onboarded = true
     from auth.users u where u.email = r.email and p.id = u.id;
    update public.contacts c set whatsapp = r.whatsapp from auth.users u where u.email = r.email and c.user_id = u.id;
    insert into public.roommate_profiles (user_id, campus, budget_min_ngwee, budget_max_ngwee, move_in_month, habits, gender, same_gender_only, bio, visible)
    select u.id, r.campus, r.bmin, r.bmax, r.month, r.habits, r.gender, r.same_only, r.bio, true
      from auth.users u where u.email = r.email
    on conflict (user_id) do nothing;
  end loop;
end;
$$;
