-- Adds support for the new "pics" My Pulse type: a photo-first update
-- with 1..N image URLs. Other legacy types remain writable for back-compat
-- (existing rows keep rendering), but the client only writes the four
-- surfaced types now: thought, link_post (Clip), media_note (Link), pics.

-- 1) Extend the type check constraint to allow 'pics'.
alter table public.profile_updates
  drop constraint if exists profile_updates_type_check;

alter table public.profile_updates
  add constraint profile_updates_type_check
  check (type in (
    'thought',
    'status',
    'link_post',
    'link_circle',
    'link_live',
    'media_note',
    'pics'
  ));

-- 2) Multi-image array for the Pics card. Nullable for every other type.
alter table public.profile_updates
  add column if not exists pics_urls text[];

comment on column public.profile_updates.pics_urls is
  'Ordered photo URLs used when type = ''pics''. First entry is the hero thumb.';

-- 3) Guard rail: pics rows must carry at least one image URL OR a legacy
--    media_thumb. This keeps the feed from ever rendering an empty pics card.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profile_updates_pics_requires_media'
      and conrelid = 'public.profile_updates'::regclass
  ) then
    alter table public.profile_updates
      add constraint profile_updates_pics_requires_media
      check (
        type <> 'pics'
        or coalesce(array_length(pics_urls, 1), 0) > 0
        or media_thumb is not null
      );
  end if;
end $$;
