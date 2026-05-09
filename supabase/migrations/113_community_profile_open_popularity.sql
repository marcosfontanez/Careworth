-- Track Circle detail opens for popularity ranking on Circles home featured strip.

alter table public.communities
  add column if not exists profile_open_count int not null default 0;

comment on column public.communities.profile_open_count is
  'Incremented when a signed-in user opens the Circle room; powers popularity ordering for the top-10 featured strip.';

create or replace function public.bump_community_profile_open(p_community_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_community_id is null then
    return;
  end if;
  update public.communities
  set profile_open_count = profile_open_count + 1
  where id = p_community_id;
end;
$$;

grant execute on function public.bump_community_profile_open(uuid) to authenticated;
