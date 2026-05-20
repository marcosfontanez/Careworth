-- LiveKit room metadata, honest broadcast lifecycle, reminders, viewer attendance (MVP counts).

-- ─── live_streams: provider + room + broadcast ─────────────────────────────
alter table public.live_streams
  add column if not exists video_provider text not null default 'livekit',
  add column if not exists livekit_room_name text,
  add column if not exists broadcast_started_at timestamptz,
  add column if not exists recording_enabled boolean not null default false;

comment on column public.live_streams.video_provider is 'Video stack identifier (livekit, mock, etc.).';
comment on column public.live_streams.livekit_room_name is 'Stable LiveKit room name for this stream row.';
comment on column public.live_streams.broadcast_started_at is 'Host publishing to LiveKit; hub hides instant streams until set.';
comment on column public.live_streams.recording_enabled is 'Reserved for future LiveKit egress / replay; not auto-enabled.';

-- Backfill deterministic room names.
update public.live_streams
set livekit_room_name = 'pv_live_' || replace(id::text, '-', '')
where livekit_room_name is null;

create unique index if not exists live_streams_livekit_room_name_key
  on public.live_streams (livekit_room_name)
  where livekit_room_name is not null;

-- Existing rows already marked live should remain discoverable after rollout.
update public.live_streams
set broadcast_started_at = coalesce(broadcast_started_at, started_at, created_at)
where status = 'live' and broadcast_started_at is null;

-- Assign room name on insert (id is available before insert completes).
create or replace function public.live_streams_assign_livekit_room()
returns trigger
language plpgsql
as $$
begin
  if new.livekit_room_name is null or length(trim(new.livekit_room_name)) = 0 then
    new.livekit_room_name := 'pv_live_' || replace(new.id::text, '-', '');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_live_streams_assign_livekit_room on public.live_streams;
create trigger trg_live_streams_assign_livekit_room
  before insert on public.live_streams
  for each row
  execute function public.live_streams_assign_livekit_room();

-- Viewer ended-state: allow SELECT on ended rows (still gated by stream visibility elsewhere).
drop policy if exists "Anyone can view live/scheduled streams" on public.live_streams;
drop policy if exists "Anyone can view discoverable streams" on public.live_streams;
create policy "Anyone can view discoverable streams"
  on public.live_streams for select
  using (status in ('live', 'scheduled', 'ended'));

-- ─── Reminders (persistence; push scheduling is separate — app UX stays truthful). ───
create table if not exists public.live_stream_reminders (
  user_id uuid not null references auth.users (id) on delete cascade,
  stream_id uuid not null references public.live_streams (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, stream_id)
);

create index if not exists idx_live_stream_reminders_stream on public.live_stream_reminders (stream_id);

alter table public.live_stream_reminders enable row level security;

drop policy if exists "Users manage own live reminders select" on public.live_stream_reminders;
create policy "Users manage own live reminders select"
  on public.live_stream_reminders for select
  using (auth.uid() = user_id);

drop policy if exists "Users manage own live reminders insert" on public.live_stream_reminders;
create policy "Users manage own live reminders insert"
  on public.live_stream_reminders for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own live reminders delete" on public.live_stream_reminders;
create policy "Users manage own live reminders delete"
  on public.live_stream_reminders for delete
  using (auth.uid() = user_id);

-- ─── Attendance (written only via SECURITY DEFINER RPC — no direct client policies). ───
create table if not exists public.live_stream_attendance (
  stream_id uuid not null references public.live_streams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  primary key (stream_id, user_id)
);

create index if not exists idx_live_stream_attendance_stream on public.live_stream_attendance (stream_id);

alter table public.live_stream_attendance enable row level security;

-- Deny-by-default: clients must use RPC.

create or replace function public.live_touch_stream_attendance(p_stream_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  host_id uuid;
  cnt int;
begin
  if uid is null then
    return 0;
  end if;

  select ls.host_id into host_id from public.live_streams ls where ls.id = p_stream_id;
  if host_id is null then
    return 0;
  end if;

  if not exists (
    select 1
    from public.live_streams ls
    where ls.id = p_stream_id
      and ls.status = 'live'
      and ls.broadcast_started_at is not null
  ) then
    return coalesce(
      (select ls.viewer_count from public.live_streams ls where ls.id = p_stream_id),
      0
    );
  end if;

  if uid <> host_id then
    insert into public.live_stream_attendance (stream_id, user_id, last_seen_at)
    values (p_stream_id, uid, now())
    on conflict (stream_id, user_id) do update
      set last_seen_at = excluded.last_seen_at;
  end if;

  select count(*)::int into cnt
  from public.live_stream_attendance
  where stream_id = p_stream_id;

  update public.live_streams
  set viewer_count = cnt,
      peak_viewer_count = greatest(coalesce(peak_viewer_count, 0), cnt)
  where id = p_stream_id;

  return cnt;
end;
$$;

grant execute on function public.live_touch_stream_attendance(uuid) to authenticated;
