-- 0007_document_retention.sql — delete ID documents 30 days after review (privacy policy).
-- Run after 0006. Files live in the private verification-docs bucket; admins remove them
-- through the Storage API (the app does this automatically when an admin opens Verifications),
-- then this function clears the paths so nothing points at a deleted file.

-- Admins may delete verification documents.
create policy "verification docs: admins delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'verification-docs' and (select public.is_admin()));

-- Documents whose review finished more than 30 days ago.
create or replace function public.expired_verification_docs()
returns table (verification_id uuid, paths text[])
language sql
stable
security definer
set search_path = ''
as $$
  select v.id,
         array_remove(array[v.nrc_front_path, v.nrc_back_path, v.selfie_path, v.ownership_path], null)
    from public.verifications v
   where public.is_admin()
     and v.status in ('approved', 'rejected')
     and v.reviewed_at < now() - interval '30 days'
     and coalesce(v.nrc_front_path, v.nrc_back_path, v.selfie_path, v.ownership_path) is not null;
$$;

-- After the files are removed: forget their paths (the decision and dates are kept).
create or replace function public.clear_verification_docs(p_verification_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  update public.verifications
     set nrc_front_path = null, nrc_back_path = null, selfie_path = null, ownership_path = null
   where id = p_verification_id and status in ('approved', 'rejected');
end;
$$;

revoke all on function public.expired_verification_docs() from public, anon;
revoke all on function public.clear_verification_docs(uuid) from public, anon;
grant execute on function public.expired_verification_docs() to authenticated;
grant execute on function public.clear_verification_docs(uuid) to authenticated;
