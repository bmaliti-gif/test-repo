-- 0004_storage.sql — photo and document buckets, and who can use them.
-- Run after 0003. Files are stored in a folder named after the uploader's user id:
--   listing-photos/<user id>/<listing id>/<file>.webp
--   verification-docs/<user id>/<verification id>/<file>

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  -- Room photos: public. The app compresses to ≤ 1600 px WebP before upload.
  ('listing-photos', 'listing-photos', true, 5242880, array['image/webp', 'image/jpeg', 'image/png']),
  -- ID documents: private. Admins view them through short-lived signed links.
  ('verification-docs', 'verification-docs', false, 5242880,
   array['image/webp', 'image/jpeg', 'image/png', 'application/pdf']),
  -- Ad images: public, uploaded by admins.
  ('ad-images', 'ad-images', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- ─── listing-photos ──────────────────────────────────────────────────────────
create policy "listing photos: anyone can view"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'listing-photos');
create policy "listing photos: landlords upload to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_landlord())
  );
create policy "listing photos: landlords replace their own"
  on storage.objects for update to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "listing photos: landlords delete their own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ─── verification-docs (private) ─────────────────────────────────────────────
create policy "verification docs: owners and admins can view"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'verification-docs'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );
create policy "verification docs: landlords upload to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_landlord())
  );
create policy "verification docs: owners replace their own"
  on storage.objects for update to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "verification docs: owners delete their own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ─── ad-images ───────────────────────────────────────────────────────────────
create policy "ad images: anyone can view"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'ad-images');
create policy "ad images: admins upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'ad-images' and (select public.is_admin()));
create policy "ad images: admins replace"
  on storage.objects for update to authenticated
  using (bucket_id = 'ad-images' and (select public.is_admin()))
  with check (bucket_id = 'ad-images' and (select public.is_admin()));
create policy "ad images: admins delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'ad-images' and (select public.is_admin()));
