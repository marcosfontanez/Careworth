-- Search helpers: hashtags, reusable video sounds, weekly viral sounds (TikTok-style remix velocity).

-- Distinct hashtag tokens matching a substring (case-insensitive).
create or replace function public.search_hashtags(p_term text, p_limit int default 40)
returns table (tag text)
language sql
stable
as $$
  select distinct u.tag::text
  from public.posts p,
  lateral unnest(coalesce(p.hashtags, '{}'::text[])) as u(tag)
  where length(trim(coalesce(p_term, ''))) >= 1
    and strpos(lower(u.tag::text), lower(trim(p_term))) > 0
  order by 1
  limit greatest(1, least(coalesce(nullif(p_limit, 0), 40), 100));
$$;

-- Original video posts whose audio can be reused (no borrowed track on the source post).
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
        lower(coalesce(p.sound_title, '') || ' ' || coalesce(p.caption, '')),
        lower(q.t)
      ) > 0
    )
  order by remix_count desc, p.created_at desc
  limit greatest(1, least(coalesce(nullif(p_limit, 0), 25), 50));
$$;

-- Weekly chart: source posts ranked by how many new clips attributed that sound in the last 7 days.
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
    coalesce(nullif(trim(p.sound_title), ''), nullif(left(trim(p.caption), 80), ''), 'Original sound') as sound_title,
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
  group by p.id, p.sound_title, p.caption, p.media_url, p.thumbnail_url, p.creator_id, pr.display_name, pr.avatar_url
  having (
    p_title_filter is null
    or length(trim(p_title_filter)) < 2
    or strpos(
      lower(coalesce(nullif(trim(p.sound_title), ''), p.caption, '')),
      lower(trim(p_title_filter))
    ) > 0
  )
  order by remix_count_7d desc, last_remix_at desc
  limit greatest(1, least(coalesce(nullif(p_limit, 0), 10), 50));
$$;

grant execute on function public.search_hashtags(text, int) to anon, authenticated;
grant execute on function public.search_sound_library(text, int) to anon, authenticated;
grant execute on function public.get_viral_sounds_this_week(int, text) to anon, authenticated;
