-- Any post tagged to the "confessions" community must be anonymous so clients can mask
-- author identity everywhere (post detail, comments, share) without relying on query params.

create or replace function public.force_anonymous_for_confessions_posts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  confessions_id uuid;
begin
  select id into confessions_id
  from public.communities
  where slug = 'confessions'
  limit 1;

  if confessions_id is null then
    return new;
  end if;

  if new.communities is not null
     and cardinality(new.communities) > 0
     and confessions_id::text = any(new.communities)
  then
    new.is_anonymous := true;
  end if;

  return new;
end;
$$;

comment on function public.force_anonymous_for_confessions_posts() is
  'Sets posts.is_anonymous when communities includes the confessions circle id (server-side guarantee).';

drop trigger if exists tr_posts_anonymous_confessions on public.posts;
create trigger tr_posts_anonymous_confessions
  before insert or update on public.posts
  for each row
  execute function public.force_anonymous_for_confessions_posts();

-- Backfill existing rows that were tagged to confessions but not flagged anonymous
update public.posts p
set is_anonymous = true
where exists (
  select 1
  from public.communities c
  where c.slug = 'confessions'
    and c.id::text = any(p.communities)
)
and coalesce(p.is_anonymous, false) = false;
