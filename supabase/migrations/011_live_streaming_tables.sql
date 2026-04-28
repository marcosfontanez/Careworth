-- ============================================================
-- 011: Live Streaming — Gifts, Coins, Polls, Raids, Pins
-- ============================================================

-- ─── User Coins Balance ─────────────────────────────────────
create table if not exists public.user_coins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade unique,
  balance integer not null default 0 check (balance >= 0),
  total_purchased integer not null default 0,
  total_spent integer not null default 0,
  updated_at timestamptz default now()
);

alter table public.user_coins enable row level security;

create policy "Users can read own coins"
  on public.user_coins for select using (auth.uid() = user_id);

create policy "Users can update own coins"
  on public.user_coins for update using (auth.uid() = user_id);

-- ─── Stream Gifts ───────────────────────────────────────────
create table if not exists public.stream_gifts (
  id uuid default gen_random_uuid() primary key,
  stream_id text not null,
  sender_id uuid not null references auth.users(id) on delete cascade,
  gift_id text not null,
  gift_name text not null,
  gift_emoji text not null,
  coin_cost integer not null default 0,
  quantity integer not null default 1,
  created_at timestamptz default now()
);

alter table public.stream_gifts enable row level security;

create policy "Anyone can send gifts"
  on public.stream_gifts for insert
  with check (auth.uid() = sender_id);

create policy "Anyone can view gifts"
  on public.stream_gifts for select
  using (true);

create index idx_stream_gifts_stream on public.stream_gifts(stream_id);
create index idx_stream_gifts_sender on public.stream_gifts(sender_id);

-- Transfer coins from sender to host earnings
create or replace function public.transfer_gift_coins(
  sender_uid uuid,
  stream_uid text,
  amount integer
) returns void as $$
begin
  update public.user_coins
    set balance = balance - amount,
        total_spent = total_spent + amount,
        updated_at = now()
    where user_id = sender_uid and balance >= amount;

  if not found then
    raise exception 'Insufficient coin balance';
  end if;
end;
$$ language plpgsql security definer;

-- ─── Stream Polls ───────────────────────────────────────────
create table if not exists public.stream_polls (
  id uuid default gen_random_uuid() primary key,
  stream_id text not null,
  question text not null,
  options jsonb not null default '[]',
  total_votes integer not null default 0,
  ends_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.stream_poll_votes (
  id uuid default gen_random_uuid() primary key,
  poll_id uuid not null references public.stream_polls(id) on delete cascade,
  option_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(poll_id, user_id)
);

create or replace function public.increment_poll_vote(p_poll_id uuid, p_option_id text)
returns void as $$
begin
  update public.stream_polls
    set total_votes = total_votes + 1,
        options = (
          select jsonb_agg(
            case when opt->>'id' = p_option_id
              then jsonb_set(opt, '{votes}', to_jsonb((opt->>'votes')::int + 1))
              else opt
            end
          )
          from jsonb_array_elements(options) opt
        )
    where id = p_poll_id;
end;
$$ language plpgsql security definer;

-- ─── Stream Raids (Code Blue) ───────────────────────────────
create table if not exists public.stream_raids (
  id uuid default gen_random_uuid() primary key,
  from_stream_id text not null,
  to_stream_id text not null,
  from_host_name text not null,
  viewer_count integer not null default 0,
  created_at timestamptz default now()
);

-- ─── Pinned Messages ────────────────────────────────────────
create table if not exists public.stream_pinned_messages (
  id uuid default gen_random_uuid() primary key,
  stream_id text not null,
  content text not null,
  pinned_by uuid not null references auth.users(id) on delete cascade,
  pinned_by_name text not null,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create index idx_stream_pins_active on public.stream_pinned_messages(stream_id) where is_active;
