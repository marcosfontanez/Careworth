-- Curated sound library: boost and enrich specific video posts in search.
-- Each row points at an existing `posts` row (type video, original audio) so
-- `/sound/[postId`, `create/video?soundPostId=`, and `sound_source_post_id`
-- keep working without app changes.
--
-- To add a clip: publish the video as a normal post (or via admin), then:
--   insert into public.sound_catalog (post_id, artist, keywords, sort_boost)
--   values ('<post_uuid>', 'Optional artist', 'extra search tokens', 5000);

create table if not exists public.sound_catalog (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  artist text,
  keywords text,
  sort_boost integer not null default 1000,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (post_id)
);

create index if not exists idx_sound_catalog_post on public.sound_catalog (post_id) where is_active = true;

comment on table public.sound_catalog is 'Curated clips surfaced in sound search; each post_id is a real video with reusable audio.';
comment on column public.sound_catalog.sort_boost is 'Higher values rank earlier in search_sound_library (before remix_count).';

alter table public.sound_catalog enable row level security;

drop policy if exists "Anyone can read active sound_catalog" on public.sound_catalog;
create policy "Anyone can read active sound_catalog"
  on public.sound_catalog for select
  using (is_active = true);

-- No INSERT/UPDATE/DELETE for authenticated clients — manage via service role or SQL editor.

create or replace function public.search_sound_library(p_query text, p_limit int default 25)
returns table (
  post_id uuid,
  sound_title text,
  media_url text,
  thumbnail_url text,
  creator_id uuid,
  creator_display_name text,
  creator_avatar_url text,
  remix_count bigint
)
language sql
stable
as $$
  with q as (select trim(coalesce(p_query, '')) as t),
  base as (
    select
      p.id as post_id,
      coalesce(
        nullif(trim(p.sound_title), ''),
        nullif(left(trim(p.caption), 120), ''),
        'Original sound'
      ) as sound_title,
      p.media_url,
      p.thumbnail_url,
      p.creator_id,
      pr.display_name as creator_display_name,
      pr.avatar_url as creator_avatar_url,
      (
        select count(*)::bigint
        from public.posts c
        where c.sound_source_post_id = p.id
      ) as remix_count,
      coalesce(sc.sort_boost, 0) as cat_boost,
      p.created_at as created_at
    from public.posts p
    inner join public.profiles pr on pr.id = p.creator_id
    left join public.sound_catalog sc on sc.post_id = p.id and sc.is_active = true
    cross join q
    where p.type = 'video'
      and coalesce(trim(p.media_url), '') <> ''
      and coalesce(p.is_anonymous, false) = false
      and p.sound_source_post_id is null
      and (
        length(q.t) < 2
        or strpos(
          lower(
            coalesce(p.sound_title, '') || ' ' || coalesce(p.caption, '')
            || case
              when sc.id is not null then ' ' || coalesce(sc.artist, '') || ' ' || coalesce(sc.keywords, '')
              else ''
            end
          ),
          lower(q.t)
        ) > 0
      )
  )
  select
    b.post_id,
    b.sound_title,
    b.media_url,
    b.thumbnail_url,
    b.creator_id,
    b.creator_display_name,
    b.creator_avatar_url,
    b.remix_count
  from base b
  order by b.cat_boost desc, b.remix_count desc, b.created_at desc
  limit greatest(1, least(coalesce(nullif(p_limit, 0), 25), 50));
$$;

grant execute on function public.search_sound_library(text, int) to anon, authenticated;
