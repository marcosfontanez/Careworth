-- Co-create clips: dedicated bucket (path = invitee_user_id / project_id / slot_id / filename)
-- + invitees can read their collab project row when assigned to any slot.

-- ---------------------------------------------------------------------------
-- Storage: collab-clips (public read — same pattern as post-media for playback)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('collab-clips', 'collab-clips', true)
on conflict (id) do nothing;

-- Invitee uploads only under their own user-id folder (first segment).
drop policy if exists "collab_clips_insert_own_folder" on storage.objects;
create policy "collab_clips_insert_own_folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'collab-clips'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Host reads any object under a project they own (second segment = collab_projects.id).
drop policy if exists "collab_clips_select_host" on storage.objects;
create policy "collab_clips_select_host"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'collab-clips'
    and exists (
      select 1 from public.collab_projects cp
      where cp.id::text = (storage.foldername(name))[2]
        and cp.host_creator_id = auth.uid()
    )
  );

-- Invitee reads objects they uploaded (first segment).
drop policy if exists "collab_clips_select_uploader" on storage.objects;
create policy "collab_clips_select_uploader"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'collab-clips'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Invitee may replace their own object (re-upload).
drop policy if exists "collab_clips_update_own" on storage.objects;
create policy "collab_clips_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'collab-clips'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "collab_clips_delete_own" on storage.objects;
create policy "collab_clips_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'collab-clips'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Projects: invitees assigned to a slot can see the project (for deep links)
-- ---------------------------------------------------------------------------
drop policy if exists collab_projects_invitee_select on public.collab_projects;
create policy collab_projects_invitee_select
  on public.collab_projects for select
  using (
    exists (
      select 1 from public.collab_slots s
      where s.project_id = collab_projects.id
        and s.invitee_user_id = auth.uid()
    )
  );
