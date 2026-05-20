-- ============================================================================
-- 179: Storage advisor — public buckets: allow fetch/info/render, deny listing
--
-- Broad `FOR SELECT USING (bucket_id = '…')` policies grant the same privilege
-- Storage uses for object.list / object.list_v2 as for public URL fetch
-- (storage.object.get_public), which triggers `public_bucket_allows_listing`.
--
-- Helper `storage.allow_any_operation(...)` scopes SELECT to fetch-style ops only.
-- Buckets stay `public = true`; assets are not made private; signed URLs unchanged.
--
-- Requires Storage helper functions (hosted Supabase). If apply fails, confirm
-- extensions/schema version; extend the operation array if a client path uses an
-- additional read op (see supabase/storage operations.ts).
-- ============================================================================

-- Legacy permissive reads (001 + 008) — replaced by operation-scoped policies.
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
drop policy if exists "Public read access for avatars" on storage.objects;

drop policy if exists "Post media is publicly accessible" on storage.objects;
drop policy if exists "Public read access for post media" on storage.objects;

drop policy if exists "Community banners are publicly accessible" on storage.objects;
drop policy if exists "Employer logos are publicly accessible" on storage.objects;

-- Avatars
drop policy if exists "Public avatars readable via fetch or render only" on storage.objects;
create policy "Public avatars readable via fetch or render only"
  on storage.objects
  for select
  to public
  using (
    bucket_id = 'avatars'
    and storage.allow_any_operation(ARRAY[
      'storage.object.get_public',
      'storage.object.info_public',
      'storage.render.image_public'
    ])
  );

-- Post media
drop policy if exists "Public post-media readable via fetch or render only" on storage.objects;
create policy "Public post-media readable via fetch or render only"
  on storage.objects
  for select
  to public
  using (
    bucket_id = 'post-media'
    and storage.allow_any_operation(ARRAY[
      'storage.object.get_public',
      'storage.object.info_public',
      'storage.render.image_public'
    ])
  );

-- Community banners
drop policy if exists "Public community-banners readable via fetch or render only" on storage.objects;
create policy "Public community-banners readable via fetch or render only"
  on storage.objects
  for select
  to public
  using (
    bucket_id = 'community-banners'
    and storage.allow_any_operation(ARRAY[
      'storage.object.get_public',
      'storage.object.info_public',
      'storage.render.image_public'
    ])
  );

-- Employer logos
drop policy if exists "Public employer-logos readable via fetch or render only" on storage.objects;
create policy "Public employer-logos readable via fetch or render only"
  on storage.objects
  for select
  to public
  using (
    bucket_id = 'employer-logos'
    and storage.allow_any_operation(ARRAY[
      'storage.object.get_public',
      'storage.object.info_public',
      'storage.render.image_public'
    ])
  );
