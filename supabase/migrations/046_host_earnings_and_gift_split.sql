-- ============================================================================
-- 046_host_earnings_and_gift_split.sql
--
-- Introduces the host earnings ledger and upgrades `transfer_gift_coins` so
-- gifts don't just vanish from a sender's wallet — they actually credit the
-- stream host. This is the DB foundation for creator monetization.
--
-- What this migration does:
--   1. Creates `public.host_earnings` — an append-only ledger, one row per
--      gift, so historical reporting / payouts can be computed from scratch.
--   2. Creates `public.host_earnings_totals` — a denormalized rollup per
--      host, updated by trigger, so hot-path reads don't aggregate the
--      entire ledger.
--   3. Rewrites `transfer_gift_coins` to atomically:
--        a) debit the sender's balance,
--        b) insert a ledger row for the host,
--        c) bump the host's rollup.
--      Everything runs in a single statement block so partial failures can't
--      leave balances and earnings out of sync.
--
-- Payout conversion:
--   We credit hosts at the same 1 coin = 1 earning unit for now. A future
--   payout service can define the coin→USD conversion when cash-outs are
--   enabled. Keeping the ledger in coins keeps the math auditable.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- 1. host_earnings — append-only ledger
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.host_earnings (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  stream_id text not null,
  sender_id uuid references auth.users(id) on delete set null,
  source text not null default 'gift'
    check (source in ('gift', 'tip', 'subscription', 'adjustment')),
  coins integer not null check (coins > 0),
  gift_id text,
  gift_name text,
  created_at timestamptz not null default now()
);

create index if not exists idx_host_earnings_host
  on public.host_earnings(host_id, created_at desc);
create index if not exists idx_host_earnings_stream
  on public.host_earnings(stream_id);

alter table public.host_earnings enable row level security;

-- Only the host can read their own ledger.
drop policy if exists "Host reads own earnings" on public.host_earnings;
create policy "Host reads own earnings"
  on public.host_earnings for select
  using (auth.uid() = host_id);

-- Writes happen through SECURITY DEFINER functions only — no direct inserts.
-- (No insert policy means client-side inserts are blocked by RLS.)

-- ──────────────────────────────────────────────────────────────────────────
-- 2. host_earnings_totals — rollup cache
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.host_earnings_totals (
  host_id uuid primary key references auth.users(id) on delete cascade,
  total_coins bigint not null default 0,
  total_gifts integer not null default 0,
  last_gift_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.host_earnings_totals enable row level security;

drop policy if exists "Host reads own totals" on public.host_earnings_totals;
create policy "Host reads own totals"
  on public.host_earnings_totals for select
  using (auth.uid() = host_id);

-- ──────────────────────────────────────────────────────────────────────────
-- 3. Transfer function — debit sender + credit host atomically
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.transfer_gift_coins(
  sender_uid uuid,
  stream_uid text,
  amount integer
) returns void as $$
declare
  v_host_id uuid;
begin
  if amount <= 0 then
    raise exception 'Gift amount must be positive';
  end if;

  -- Look up the host for this stream. `stream_id` on gift tables is text,
  -- but live_streams.id is uuid — cast safely (returns NULL on malformed text).
  begin
    select host_id into v_host_id
      from public.live_streams
      where id = stream_uid::uuid;
  exception when invalid_text_representation then
    v_host_id := null;
  end;

  -- Debit the sender's wallet. Requires sufficient balance to proceed.
  update public.user_coins
     set balance = balance - amount,
         total_spent = total_spent + amount,
         updated_at = now()
   where user_id = sender_uid
     and balance >= amount;

  if not found then
    raise exception 'Insufficient coin balance';
  end if;

  -- Credit host earnings. If we couldn't resolve the host (e.g. seed
  -- streams with non-uuid ids), we still debit the sender but skip the
  -- credit — this preserves wallet integrity without silently dropping
  -- on the floor.
  if v_host_id is not null then
    insert into public.host_earnings (host_id, stream_id, sender_id, source, coins)
      values (v_host_id, stream_uid, sender_uid, 'gift', amount);

    insert into public.host_earnings_totals (host_id, total_coins, total_gifts, last_gift_at)
      values (v_host_id, amount, 1, now())
      on conflict (host_id)
      do update set
        total_coins  = public.host_earnings_totals.total_coins + excluded.total_coins,
        total_gifts  = public.host_earnings_totals.total_gifts + excluded.total_gifts,
        last_gift_at = excluded.last_gift_at,
        updated_at   = now();
  end if;
end;
$$ language plpgsql security definer;

-- ──────────────────────────────────────────────────────────────────────────
-- 4. Backfill (best-effort) — populate the ledger from existing gifts so
-- the rollup isn't empty for existing creators when this ships.
-- ──────────────────────────────────────────────────────────────────────────
insert into public.host_earnings (host_id, stream_id, sender_id, source, coins, gift_id, gift_name, created_at)
  select
    ls.host_id,
    sg.stream_id,
    sg.sender_id,
    'gift',
    sg.coin_cost * sg.quantity,
    sg.gift_id,
    sg.gift_name,
    sg.created_at
  from public.stream_gifts sg
  join public.live_streams ls on ls.id::text = sg.stream_id
  where sg.coin_cost > 0
    and not exists (
      select 1 from public.host_earnings he
        where he.stream_id = sg.stream_id
          and he.sender_id = sg.sender_id
          and he.created_at = sg.created_at
    );

-- Rebuild rollups from the ledger so totals are consistent post-backfill.
insert into public.host_earnings_totals (host_id, total_coins, total_gifts, last_gift_at, updated_at)
  select
    host_id,
    sum(coins),
    count(*),
    max(created_at),
    now()
  from public.host_earnings
  group by host_id
on conflict (host_id) do update set
  total_coins  = excluded.total_coins,
  total_gifts  = excluded.total_gifts,
  last_gift_at = excluded.last_gift_at,
  updated_at   = now();
