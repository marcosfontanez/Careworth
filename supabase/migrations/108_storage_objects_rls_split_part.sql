-- Replace storage.foldername(name)[n] with split_part(name, '/', n) in storage.objects RLS.
-- Some hosted projects return Storage error DatabaseInvalidObjectDefinition (503) on upload
-- when policies reference foldername(); split_part is equivalent for first/second path segments.

-- 001 / 008 — avatars + post-media
drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = split_part(name, '/', 1));

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = split_part(name, '/', 1));

drop policy if exists "Users can upload post media" on storage.objects;
create policy "Users can upload post media"
  on storage.objects for insert
  with check (bucket_id = 'post-media' and auth.uid()::text = split_part(name, '/', 1));

drop policy if exists "Users can delete own post media" on storage.objects;
create policy "Users can delete own post media"
  on storage.objects for delete
  using (bucket_id = 'post-media' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);

-- 096 — collab-clips (path: invitee_id / project_id / slot_id / file)
drop policy if exists "collab_clips_insert_own_folder" on storage.objects;
create policy "collab_clips_insert_own_folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'collab-clips'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "collab_clips_select_host" on storage.objects;
create policy "collab_clips_select_host"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'collab-clips'
    and exists (
      select 1 from public.collab_projects cp
      where cp.id::text = split_part(name, '/', 2)
        and cp.host_creator_id = auth.uid()
    )
  );

drop policy if exists "collab_clips_select_uploader" on storage.objects;
create policy "collab_clips_select_uploader"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'collab-clips'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "collab_clips_update_own" on storage.objects;
create policy "collab_clips_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'collab-clips'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "collab_clips_delete_own" on storage.objects;
create policy "collab_clips_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'collab-clips'
    and split_part(name, '/', 1) = auth.uid()::text
  );
