-- ═══════════════════════════════════════════════════════════════════════════
-- Exclusive profile photo borders for monthly Pulse top 5 (global).
-- Catalog rows are themed per month; rollover grants unlocks + users pick
-- an equipped frame in Customize My Pulse (default = classic teal ring only).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Catalog (one row per tier per award month; add new rows each month) ───
create table if not exists public.pulse_avatar_frames (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  subtitle text,
  prize_tier text not null,
  month_start date not null,
  ring_color text not null,
  glow_color text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint pulse_avatar_frames_prize_tier_chk
    check (prize_tier in ('gold', 'silver', 'bronze')),
  constraint pulse_avatar_frames_month_floor_chk
    check (month_start = date_trunc('month', month_start)::date)
);

create index if not exists idx_pulse_avatar_frames_month
  on public.pulse_avatar_frames (month_start, prize_tier);

-- ─── Unlocks (granted when finalize_current_month runs for that month) ───
create table if not exists public.user_pulse_avatar_frames (
  user_id uuid not null references public.profiles (id) on delete cascade,
  frame_id uuid not null references public.pulse_avatar_frames (id) on delete restrict,
  leaderboard_rank int not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, frame_id),
  constraint user_pulse_avatar_frames_rank_chk
    check (leaderboard_rank >= 1 and leaderboard_rank <= 5)
);

create index if not exists idx_user_pulse_avatar_frames_user
  on public.user_pulse_avatar_frames (user_id, granted_at desc);

-- ─── Equipped frame (null = classic teal default in the app) ───
alter table public.profiles
  add column if not exists selected_pulse_avatar_frame_id uuid
    references public.pulse_avatar_frames (id) on delete set null;

-- ─── Enforce: may only equip frames the user has unlocked ───
create or replace function public.trg_profiles_enforce_pulse_avatar_frame()
returns trigger
language plpgsql
as $$
begin
  if new.selected_pulse_avatar_frame_id is not distinct from old.selected_pulse_avatar_frame_id then
    return new;
  end if;
  if new.selected_pulse_avatar_frame_id is null then
    return new;
  end if;
  if not exists (
    select 1
    from public.user_pulse_avatar_frames u
    where u.user_id = new.id
      and u.frame_id = new.selected_pulse_avatar_frame_id
  ) then
    raise exception 'pulse_avatar_frame_not_owned'
      using errcode = 'check_violation',
            hint = 'User must unlock the frame before selecting it.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_pulse_avatar_frame on public.profiles;
create trigger trg_profiles_pulse_avatar_frame
  before update of selected_pulse_avatar_frame_id on public.profiles
  for each row
  execute function public.trg_profiles_enforce_pulse_avatar_frame();

-- ─── RLS ───
alter table public.pulse_avatar_frames enable row level security;
alter table public.user_pulse_avatar_frames enable row level security;

drop policy if exists pulse_avatar_frames_select_all on public.pulse_avatar_frames;
create policy pulse_avatar_frames_select_all
  on public.pulse_avatar_frames for select
  using (true);

drop policy if exists user_pulse_avatar_frames_select_own on public.user_pulse_avatar_frames;
create policy user_pulse_avatar_frames_select_own
  on public.user_pulse_avatar_frames for select
  using (auth.uid() = user_id);

-- ─── Grant top-5 frame unlocks for a finalized month (idempotent) ───
create or replace function public.grant_pulse_top5_frames_for_month(p_month date)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month  date := date_trunc('month', p_month)::date;
  v_gold   uuid;
  v_silver uuid;
  v_bronze uuid;
  v_n      int;
begin
  select id into v_gold
    from public.pulse_avatar_frames
    where month_start = v_month and prize_tier = 'gold'
    order by sort_order, id
    limit 1;
  select id into v_silver
    from public.pulse_avatar_frames
    where month_start = v_month and prize_tier = 'silver'
    order by sort_order, id
    limit 1;
  select id into v_bronze
    from public.pulse_avatar_frames
    where month_start = v_month and prize_tier = 'bronze'
    order by sort_order, id
    limit 1;

  if v_gold is null or v_silver is null or v_bronze is null then
    raise notice 'grant_pulse_top5_frames_for_month: missing gold/silver/bronze catalog for %', v_month;
    return 0;
  end if;

  insert into public.user_pulse_avatar_frames (user_id, frame_id, leaderboard_rank)
  select r.user_id,
         case
           when r.rk = 1 then v_gold
           when r.rk in (2, 3) then v_silver
           else v_bronze
         end,
         r.rk::int
  from (
    select m.user_id,
           row_number() over (
             order by m.overall desc, p.username asc nulls last, m.user_id asc
           ) as rk
    from public.user_monthly_pulse_scores m
    join public.profiles p on p.id = m.user_id
    where m.month_start = v_month
      and m.finalized = true
      and m.overall > 0
  ) r
  where r.rk <= 5
  on conflict (user_id, frame_id) do nothing;

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Prefer internal calls from finalize; still callable for manual repair.
grant execute on function public.grant_pulse_top5_frames_for_month(date)
  to service_role;

-- ─── RPC: equip a frame (null = default teal ring) ───
create or replace function public.set_selected_pulse_avatar_frame(p_frame_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_frame_id is not null and not exists (
    select 1
    from public.user_pulse_avatar_frames u
    where u.user_id = v_uid
      and u.frame_id = p_frame_id
  ) then
    raise exception 'pulse_avatar_frame_not_owned';
  end if;

  update public.profiles
  set selected_pulse_avatar_frame_id = p_frame_id,
      updated_at = now()
  where id = v_uid;
end;
$$;

grant execute on function public.set_selected_pulse_avatar_frame(uuid)
  to authenticated;

-- ─── Hook monthly rollover: after finalizing scores, grant frame unlocks ───
create or replace function public.finalize_current_month()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev_month date := public.pulse_month_floor(now() - interval '1 day');
  v_processed  int  := 0;
  r            record;
  s            record;
begin
  insert into public.user_monthly_pulse_scores (user_id, month_start, finalized)
  select distinct p.creator_id, v_prev_month, false
    from public.posts p
    where p.created_at >= v_prev_month::timestamptz
      and p.created_at <  (v_prev_month + interval '1 month')::timestamptz
      and p.creator_id is not null
  on conflict (user_id, month_start) do nothing;

  insert into public.user_monthly_pulse_scores (user_id, month_start, finalized)
  select distinct pu.user_id, v_prev_month, false
    from public.profile_updates pu
    where pu.created_at >= v_prev_month::timestamptz
      and pu.created_at <  (v_prev_month + interval '1 month')::timestamptz
      and pu.user_id is not null
  on conflict (user_id, month_start) do nothing;

  for r in
    select user_id
    from public.user_monthly_pulse_scores
    where month_start = v_prev_month
      and finalized = false
  loop
    select * into s from public.compute_pulse_subscores(r.user_id, v_prev_month);

    update public.user_monthly_pulse_scores
      set reach       = s.reach,
          resonance   = s.resonance,
          rhythm      = s.rhythm,
          range_      = s.range_,
          reciprocity = s.reciprocity,
          overall     = s.overall,
          tier        = s.tier,
          finalized   = true,
          computed_at = now()
      where user_id = r.user_id and month_start = v_prev_month;

    insert into public.user_pulse_lifetime (
      user_id, lifetime_total, best_month_score, best_month_start,
      best_tier, months_active, anthem_months, last_finalized_at, updated_at
    ) values (
      r.user_id,
      s.overall::bigint,
      s.overall,
      v_prev_month,
      s.tier,
      case when s.overall > 0 then 1 else 0 end,
      case when s.tier = 'anthem' then 1 else 0 end,
      now(),
      now()
    )
    on conflict (user_id) do update
      set lifetime_total     = public.user_pulse_lifetime.lifetime_total + s.overall::bigint,
          best_month_score   = greatest(public.user_pulse_lifetime.best_month_score, s.overall),
          best_month_start   = case
                                 when s.overall > public.user_pulse_lifetime.best_month_score
                                   then v_prev_month
                                 else public.user_pulse_lifetime.best_month_start
                               end,
          best_tier          = case
                                 when s.overall > public.user_pulse_lifetime.best_month_score
                                   then s.tier
                                 else public.user_pulse_lifetime.best_tier
                               end,
          months_active      = public.user_pulse_lifetime.months_active
                                + case when s.overall > 0 then 1 else 0 end,
          anthem_months      = public.user_pulse_lifetime.anthem_months
                                + case when s.tier = 'anthem' then 1 else 0 end,
          last_finalized_at  = now(),
          updated_at         = now();

    v_processed := v_processed + 1;
  end loop;

  perform public.grant_pulse_top5_frames_for_month(v_prev_month);

  return v_processed;
end;
$$;

grant execute on function public.finalize_current_month()
  to authenticated, anon, service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed: April 2026 “neon podium” trio (adjust colors / copy per monthly theme).
-- Before each new month’s rollover, insert three rows for that month_start.
-- ═══════════════════════════════════════════════════════════════════════════
insert into public.pulse_avatar_frames (
  slug, label, subtitle, prize_tier, month_start, ring_color, glow_color, sort_order
) values
  (
    '2026-04-neon-gold',
    'Neon Gold',
    'Beta Leaderboard · 1st · April 2026',
    'gold',
    '2026-04-01',
    '#FFF4A3',
    '#FFB020',
    1
  ),
  (
    '2026-04-neon-silver',
    'Neon Silver',
    'Beta Leaderboard · 2nd & 3rd · April 2026',
    'silver',
    '2026-04-01',
    '#E8EEFF',
    '#7EB6FF',
    2
  ),
  (
    '2026-04-neon-bronze',
    'Neon Bronze',
    'Beta Leaderboard · 4th & 5th · April 2026',
    'bronze',
    '2026-04-01',
    '#A86232',
    '#3D1E0A',
    3
  )
on conflict (slug) do nothing;
