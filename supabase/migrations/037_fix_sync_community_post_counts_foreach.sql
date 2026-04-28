-- Fix sync_community_post_counts_for_post(): the UPDATE branch used
--   foreach cid in array (select distinct unnest(...))
-- which evaluates the subquery as a SCALAR and yields NULL whenever both
-- old.communities and new.communities are empty/null. PL/pgSQL then raised
-- "FOREACH expression must not be null", aborting the entire transaction.
--
-- Because this trigger fires on EVERY update to public.posts (including the
-- denormalised counter bumps from like_count / comment_count / save_count
-- triggers), every like / comment / save against a post with no communities
-- failed silently from the client's perspective.
--
-- Fix: wrap the subquery in array(...) so we always have an array
-- expression, defaulting to '{}' when no rows are produced.

create or replace function public.sync_community_post_counts_for_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cids text[];
  cid text;
begin
  if tg_op = 'INSERT' then
    cids := coalesce(new.communities, '{}'::text[]);
  elsif tg_op = 'DELETE' then
    cids := coalesce(old.communities, '{}'::text[]);
  elsif tg_op = 'UPDATE' then
    cids := coalesce(
      array(
        select distinct unnest(
          coalesce(old.communities, '{}'::text[])
          || coalesce(new.communities, '{}'::text[])
        )
      ),
      '{}'::text[]
    );
  else
    cids := '{}'::text[];
  end if;

  if cids is not null and array_length(cids, 1) is not null then
    foreach cid in array cids loop
      perform public.recount_community_posts(cid);
    end loop;
  end if;

  return coalesce(new, old);
end;
$$;
