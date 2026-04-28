-- Persist post shares so posts.share_count actually tallies on the feed and
-- on the user's "My Pulse" total. Until now the client opened the native
-- share sheet but never told the database, so share_count stayed at 0
-- forever and creators saw 0 shares on their profile.
--
-- Schema mirrors public.post_likes (one row per share, no uniqueness -- a
-- user can share the same post multiple times). RLS lets users insert their
-- own shares; everyone can read aggregate share rows.

create table if not exists public.post_shares (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references public.profiles(id) on delete set null,
  post_id    uuid not null references public.posts(id) on delete cascade,
  channel    text,
  created_at timestamptz not null default now()
);

create index if not exists ix_post_shares_post_time
  on public.post_shares (post_id, created_at desc);

create index if not exists ix_post_shares_user_time
  on public.post_shares (user_id, created_at desc);

alter table public.post_shares enable row level security;

drop policy if exists "post_shares_select_all" on public.post_shares;
create policy "post_shares_select_all" on public.post_shares
  for select using (true);

drop policy if exists "post_shares_insert_self" on public.post_shares;
create policy "post_shares_insert_self" on public.post_shares
  for insert with check (auth.uid() = user_id or user_id is null);

-- ---------------------------------------------------------------------------
-- Bump posts.share_count on insert/delete (safety-wrapped per the 039 pattern)
-- ---------------------------------------------------------------------------
create or replace function public.sync_post_share_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    if tg_op = 'INSERT' then
      update public.posts set share_count = share_count + 1 where id = new.post_id;
    elsif tg_op = 'DELETE' then
      update public.posts set share_count = greatest(0, share_count - 1) where id = old.post_id;
    end if;
  exception when others then
    perform public.log_trigger_error(
      'sync_post_share_count', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('post_id', coalesce(new.post_id, old.post_id))
    );
  end;
  return coalesce(new, old);
end;
$$;

drop trigger if exists tr_post_shares_sync_count on public.post_shares;
create trigger tr_post_shares_sync_count
  after insert or delete on public.post_shares
  for each row execute function public.sync_post_share_count();

-- ---------------------------------------------------------------------------
-- Engagement events: allow 'share' as an event_type, then log shares.
-- The check constraint in 038 was anonymous, so rebuild it with the new value.
-- ---------------------------------------------------------------------------
do $$
declare cn text;
begin
  for cn in (
    select conname from pg_constraint
    where conrelid = 'public.engagement_events'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%event_type%'
  ) loop
    execute format('alter table public.engagement_events drop constraint %I', cn);
  end loop;
end $$;

alter table public.engagement_events
  add constraint engagement_events_event_type_check
  check (event_type in (
    'like','unlike',
    'save','unsave',
    'follow','unfollow',
    'comment','comment_delete',
    'share'
  ));

create or replace function public.log_post_share_event() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.user_id is not null then
    perform public.append_engagement_event(
      new.user_id, 'share', new.post_id, 'post',
      jsonb_build_object('channel', new.channel)
    );
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists tr_log_post_share_event on public.post_shares;
create trigger tr_log_post_share_event
  after insert on public.post_shares
  for each row execute function public.log_post_share_event();

-- ---------------------------------------------------------------------------
-- Backfill: align posts.share_count with whatever's already in post_shares
-- (handles re-runs / manual inserts; safe to apply more than once).
-- ---------------------------------------------------------------------------
update public.posts p
set share_count = coalesce(
  (select count(*)::int from public.post_shares ps where ps.post_id = p.id),
  0
);
