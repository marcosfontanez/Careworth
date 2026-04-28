-- Stop labelling every uncategorised sound "Original sound" in search results.
--
-- Today both search_sound_library and get_viral_sounds_this_week fall back to
-- the literal string "Original sound" when posts.sound_title is null and the
-- caption is empty -- which is true for every brand-new upload where the
-- creator didn't set anything. Result: the Sounds tab is a wall of identical
-- rows.
--
-- New precedence (used by both RPCs):
--   1. posts.sound_title (when the creator -- or the upload screen -- set one)
--   2. first 80-120 chars of the caption
--   3. "Sound by @<username>" when we have a handle
--   4. "Sound by <display_name>" when we don't
--   5. "Original sound" as a final, never-actually-hit fallback
--
-- Re-running this migration is safe; both functions are CREATE OR REPLACE.

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
  with q as (select trim(coalesce(p_query, '')) as t)
  select
    p.id as post_id,
    coalesce(
      nullif(trim(p.sound_title), ''),
      nullif(left(trim(p.caption), 120), ''),
      case
        when nullif(trim(pr.username), '') is not null
          then 'Sound by @' || trim(pr.username)
        when nullif(trim(pr.display_name), '') is not null
          then 'Sound by ' || trim(pr.display_name)
        else 'Original sound'
      end
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
    ) as remix_count
  from public.posts p
  inner join public.profiles pr on pr.id = p.creator_id
  cross join q
  where p.type = 'video'
    and coalesce(trim(p.media_url), '') <> ''
    and coalesce(p.is_anonymous, false) = false
    and p.sound_source_post_id is null
    and (
      length(q.t) < 2
      or strpos(
        lower(
          coalesce(p.sound_title, '') || ' ' ||
          coalesce(p.caption, '') || ' ' ||
          coalesce(pr.username, '') || ' ' ||
          coalesce(pr.display_name, '')
        ),
        lower(q.t)
      ) > 0
    )
  order by remix_count desc, p.created_at desc
  limit greatest(1, least(coalesce(nullif(p_limit, 0), 25), 50));
$$;

create or replace function public.get_viral_sounds_this_week(
  p_limit int default 10,
  p_title_filter text default null
)
returns table (
  source_post_id uuid,
  remix_count_7d bigint,
  sound_title text,
  media_url text,
  thumbnail_url text,
  creator_id uuid,
  creator_display_name text,
  creator_avatar_url text,
  last_remix_at timestamptz
)
language sql
stable
as $$
  select
    p.id as source_post_id,
    count(c.id)::bigint as remix_count_7d,
    coalesce(
      nullif(trim(p.sound_title), ''),
      nullif(left(trim(p.caption), 80), ''),
      case
        when nullif(trim(pr.username), '') is not null
          then 'Sound by @' || trim(pr.username)
        when nullif(trim(pr.display_name), '') is not null
          then 'Sound by ' || trim(pr.display_name)
        else 'Original sound'
      end
    ) as sound_title,
    p.media_url,
    p.thumbnail_url,
    p.creator_id,
    pr.display_name as creator_display_name,
    pr.avatar_url as creator_avatar_url,
    max(c.created_at) as last_remix_at
  from public.posts p
  inner join public.posts c on c.sound_source_post_id = p.id
  inner join public.profiles pr on pr.id = p.creator_id
  where c.created_at >= (now() - interval '7 days')
    and p.type = 'video'
    and coalesce(trim(p.media_url), '') <> ''
    and coalesce(p.is_anonymous, false) = false
  group by p.id, p.sound_title, p.caption, p.media_url, p.thumbnail_url,
           p.creator_id, pr.display_name, pr.username, pr.avatar_url
  having (
    p_title_filter is null
    or length(trim(p_title_filter)) < 2
    or strpos(
      lower(
        coalesce(nullif(trim(p.sound_title), ''), '') || ' ' ||
        coalesce(p.caption, '') || ' ' ||
        coalesce(pr.username, '') || ' ' ||
        coalesce(pr.display_name, '')
      ),
      lower(trim(p_title_filter))
    ) > 0
  )
  order by remix_count_7d desc, last_remix_at desc
  limit greatest(1, least(coalesce(nullif(p_limit, 0), 10), 50));
$$;

grant execute on function public.search_sound_library(text, int) to anon, authenticated;
grant execute on function public.get_viral_sounds_this_week(int, text) to anon, authenticated;
