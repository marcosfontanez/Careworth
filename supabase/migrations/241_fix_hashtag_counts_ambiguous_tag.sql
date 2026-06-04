-- =====================================================================================
-- Migration 241: Fix "column reference \"tag\" is ambiguous" on post create/edit
--
-- Migration 236 added AFTER INSERT/UPDATE/DELETE trigger public.tg_posts_hashtag_counts()
-- which maintains public.hashtag_counts. The function declared a PL/pgSQL variable named
-- `tag`, which collides with the public.hashtag_counts.tag COLUMN. Under PostgreSQL's
-- default plpgsql.variable_conflict = error, statements that reference the bare name `tag`
-- (the INSERT ... ON CONFLICT and the decrement UPDATE) raise:
--     column reference "tag" is ambiguous
-- That error fires inside the trigger and aborts the originating posts INSERT/UPDATE, so
-- users cannot post any content that carries hashtags.
--
-- Fix: redefine the function with the loop variable renamed to `v_tag` and every column
-- reference fully qualified (public.hashtag_counts.tag / .usage_count). No variable now
-- shares a name with any column, so the ambiguity is impossible in every branch.
--
-- Additive: CREATE OR REPLACE keeps the existing trigger binding; nothing is dropped.
-- =====================================================================================

create or replace function public.tg_posts_hashtag_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  added text[];
  removed text[];
  v_tag text;
  norm text;
begin
  if (tg_op = 'INSERT') then
    added := coalesce(new.hashtags, '{}'::text[]);
    removed := '{}'::text[];
  elsif (tg_op = 'DELETE') then
    added := '{}'::text[];
    removed := coalesce(old.hashtags, '{}'::text[]);
  else
    -- UPDATE
    added := array(select unnest(coalesce(new.hashtags, '{}'::text[]))
                   except select unnest(coalesce(old.hashtags, '{}'::text[])));
    removed := array(select unnest(coalesce(old.hashtags, '{}'::text[]))
                     except select unnest(coalesce(new.hashtags, '{}'::text[])));
  end if;

  foreach v_tag in array added loop
    norm := public.normalize_hashtag(v_tag);
    if norm is null then continue; end if;
    insert into public.hashtag_counts (tag, usage_count, last_used_at)
      values (norm, 1, now())
      on conflict (tag) do update
        set usage_count = public.hashtag_counts.usage_count + 1,
            last_used_at = now();
  end loop;

  foreach v_tag in array removed loop
    norm := public.normalize_hashtag(v_tag);
    if norm is null then continue; end if;
    update public.hashtag_counts
       set usage_count = greatest(0, public.hashtag_counts.usage_count - 1)
     where public.hashtag_counts.tag = norm;
  end loop;

  return null;  -- after-trigger
end;
$$;

comment on function public.tg_posts_hashtag_counts() is
  'AFTER INSERT/UPDATE/DELETE on posts. Maintains public.hashtag_counts in sync with '
  'posts.hashtags. Loop variable renamed v_tag + columns fully qualified to avoid the '
  '"column reference tag is ambiguous" error (migration 241).';
