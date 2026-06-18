-- Migration 259 · Pulse Board shoutouts (visitor public wall on My Pulse)
--
-- Visitors leave short text shoutouts on a creator's Pulse Page. Separate from
-- profile_updates (5-slot owner rail). Writes go through SECURITY DEFINER RPCs.

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------
create table if not exists public.profile_board_shoutouts (
  id uuid primary key default gen_random_uuid(),
  profile_owner_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  status text not null default 'active',
  pinned_at timestamptz null,
  hidden_at timestamptz null,
  deleted_at timestamptz null,
  reported_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_board_shoutouts_body_len check (
    char_length(trim(body)) >= 1 and char_length(body) <= 160
  ),
  constraint profile_board_shoutouts_status_check check (
    status in ('active', 'hidden', 'deleted', 'reported', 'pending')
  )
);

comment on table public.profile_board_shoutouts is
  'Public visitor shoutouts on a Pulse Page (Pulse Board). Not profile_updates.';

create index if not exists idx_profile_board_shoutouts_owner_active
  on public.profile_board_shoutouts (profile_owner_id, created_at desc)
  where status = 'active' and deleted_at is null and hidden_at is null;

create index if not exists idx_profile_board_shoutouts_author
  on public.profile_board_shoutouts (author_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. Profile toggles (V1: default on; posting mode reserved)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists pulse_board_enabled boolean not null default true,
  add column if not exists pulse_board_posting_mode text not null default 'everyone';

comment on column public.profiles.pulse_board_enabled is
  'When false, Pulse Board is hidden from visitors (owner may still moderate).';

-- ---------------------------------------------------------------------------
-- 3. updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.touch_profile_board_shoutout_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profile_board_shoutouts_updated_at on public.profile_board_shoutouts;
create trigger trg_profile_board_shoutouts_updated_at
  before update on public.profile_board_shoutouts
  for each row execute function public.touch_profile_board_shoutout_updated_at();

-- ---------------------------------------------------------------------------
-- 4. RLS — reads only; mutations via RPC
-- ---------------------------------------------------------------------------
alter table public.profile_board_shoutouts enable row level security;

revoke insert, update, delete on public.profile_board_shoutouts from authenticated, anon;

drop policy if exists "Pulse board shoutouts readable on visible profiles"
  on public.profile_board_shoutouts;
create policy "Pulse board shoutouts readable on visible profiles"
  on public.profile_board_shoutouts for select
  using (
    status = 'active'
    and deleted_at is null
    and hidden_at is null
    and public.viewer_can_read_profile_surface(profile_owner_id)
    and coalesce(
      (select pr.pulse_board_enabled from public.profiles pr where pr.id = profile_owner_id),
      true
    )
  );

drop policy if exists "Pulse board owner reads own board"
  on public.profile_board_shoutouts;
create policy "Pulse board owner reads own board"
  on public.profile_board_shoutouts for select
  using (
    (select auth.uid()) = profile_owner_id
    and status = 'active'
    and deleted_at is null
    and hidden_at is null
  );

drop policy if exists "Pulse board staff reads all"
  on public.profile_board_shoutouts;
create policy "Pulse board staff reads all"
  on public.profile_board_shoutouts for select
  using (public.viewer_is_staff());

grant select on public.profile_board_shoutouts to authenticated, anon;

-- ---------------------------------------------------------------------------
-- 5. post_profile_board_shoutout
-- ---------------------------------------------------------------------------
create or replace function public.post_profile_board_shoutout(
  p_profile_owner_id uuid,
  p_body text
)
returns public.profile_board_shoutouts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_trimmed text;
  v_row public.profile_board_shoutouts;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  v_trimmed := trim(coalesce(p_body, ''));
  if char_length(v_trimmed) < 1 then
    raise exception 'empty shoutout' using errcode = '22000';
  end if;
  if char_length(v_trimmed) > 160 then
    raise exception 'shoutout too long' using errcode = '22000';
  end if;
  if v_trimmed ~* '(https?://|www\.)' then
    raise exception 'links not allowed' using errcode = '22000';
  end if;

  if v_user = p_profile_owner_id then
    raise exception 'self shoutouts not allowed' using errcode = '22000';
  end if;

  if not public.viewer_can_read_profile_surface(p_profile_owner_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if not coalesce(
    (select pr.pulse_board_enabled from public.profiles pr where pr.id = p_profile_owner_id),
    true
  ) then
    raise exception 'board disabled' using errcode = '22000';
  end if;

  insert into public.profile_board_shoutouts (profile_owner_id, author_id, body)
       values (p_profile_owner_id, v_user, v_trimmed)
    returning * into v_row;

  return v_row;
end;
$$;

comment on function public.post_profile_board_shoutout(uuid, text) is
  'Insert a visitor shoutout on a Pulse Board. Blocks self-posts, links, private/blocked viewers.';

grant execute on function public.post_profile_board_shoutout(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. moderate_profile_board_shoutout
-- ---------------------------------------------------------------------------
create or replace function public.moderate_profile_board_shoutout(
  p_shoutout_id uuid,
  p_action text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.profile_board_shoutouts;
  v_action text := lower(trim(coalesce(p_action, '')));
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_row
    from public.profile_board_shoutouts
   where id = p_shoutout_id;

  if v_row.id is null then
    raise exception 'shoutout not found' using errcode = '22000';
  end if;

  if v_action = 'author_delete' then
    if v_row.author_id <> v_user then
      raise exception 'not allowed' using errcode = '42501';
    end if;
    update public.profile_board_shoutouts
       set status = 'deleted', deleted_at = now(), hidden_at = null
     where id = p_shoutout_id;
    return;
  end if;

  if v_row.profile_owner_id <> v_user and not public.viewer_is_staff() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if v_action = 'hide' then
    update public.profile_board_shoutouts
       set status = 'hidden', hidden_at = now()
     where id = p_shoutout_id;
  elsif v_action = 'delete' then
    update public.profile_board_shoutouts
       set status = 'deleted', deleted_at = now()
     where id = p_shoutout_id;
  elsif v_action = 'report' then
    update public.profile_board_shoutouts
       set status = 'reported', reported_at = now()
     where id = p_shoutout_id;
  else
    raise exception 'invalid action' using errcode = '22000';
  end if;
end;
$$;

comment on function public.moderate_profile_board_shoutout(uuid, text) is
  'Owner/staff hide|delete|report; author may author_delete own shoutout.';

grant execute on function public.moderate_profile_board_shoutout(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Re-apply profiles column grants (new pulse_board_* columns)
-- ---------------------------------------------------------------------------
do $$
declare
  col_list text;
begin
  select string_agg(quote_ident(column_name), ', ')
    into col_list
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'profiles'
    and column_name <> 'role_admin';

  execute 'revoke select on public.profiles from authenticated';
  execute format('grant select (%s) on public.profiles to authenticated', col_list);

  execute 'revoke select on public.profiles from anon';
  execute format('grant select (%s) on public.profiles to anon', col_list);
end $$;
