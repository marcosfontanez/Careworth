-- Reward Delivery Engine: persisted celebration queue (ownership is always server-side first).

create table public.reward_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  delivery_type text not null,
  item_type text not null,
  item_id uuid null,
  quantity integer null,
  source_user_id uuid null,
  source_display_name text null,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  toast_shown_at timestamptz null,
  opened_at timestamptz null,
  acknowledged_at timestamptz null,
  constraint reward_deliveries_delivery_type_chk check (
    delivery_type in ('purchase', 'gift', 'system_award', 'monthly_claim', 'leaderboard_reward')
  ),
  constraint reward_deliveries_item_type_chk check (
    item_type in ('border', 'sparks', 'diamonds', 'future_item')
  ),
  constraint reward_deliveries_status_chk check (
    status in ('pending', 'toast_shown', 'opened', 'acknowledged', 'dismissed')
  ),
  constraint reward_deliveries_user_idempotency unique (user_id, idempotency_key)
);

create index reward_deliveries_user_active_created_idx
  on public.reward_deliveries (user_id, created_at asc)
  where status in ('pending', 'toast_shown', 'opened');

comment on table public.reward_deliveries is
  'Queued reward celebration UX. Grants live in economy/inventory first; this table only drives disclosure.';

alter table public.reward_deliveries enable row level security;

create policy reward_deliveries_select_own
  on public.reward_deliveries
  for select
  to authenticated
  using (user_id = auth.uid());

revoke all on public.reward_deliveries from public;
grant select on public.reward_deliveries to authenticated;

-- ---------------------------------------------------------------------------
-- List FIFO queue for client (pending → toast → modal → acknowledge/dismiss).
-- ---------------------------------------------------------------------------
create or replace function public.reward_deliveries_list_pending()
returns setof public.reward_deliveries
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.reward_deliveries r
  where r.user_id = auth.uid()
    and r.status in ('pending', 'toast_shown', 'opened')
  order by r.created_at asc;
$$;

grant execute on function public.reward_deliveries_list_pending() to authenticated;

-- ---------------------------------------------------------------------------
-- Status transitions + timestamps (SECURITY DEFINER; clients do not UPDATE directly).
-- ---------------------------------------------------------------------------
create or replace function public.reward_delivery_set_status(p_id uuid, p_next text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if p_next not in ('pending', 'toast_shown', 'opened', 'acknowledged', 'dismissed') then
    raise exception 'invalid reward_delivery status';
  end if;

  update public.reward_deliveries r
  set
    status = p_next,
    toast_shown_at = case
      when p_next in ('toast_shown', 'opened', 'acknowledged') and r.toast_shown_at is null then now()
      else r.toast_shown_at
    end,
    opened_at = case
      when p_next in ('opened', 'acknowledged') and r.opened_at is null then now()
      else r.opened_at
    end,
    acknowledged_at = case
      when p_next = 'acknowledged' and r.acknowledged_at is null then now()
      else r.acknowledged_at
    end
  where r.id = p_id
    and r.user_id = auth.uid();

  get diagnostics n = row_count;
  return n > 0;
end;
$$;

grant execute on function public.reward_delivery_set_status(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Shop border self-purchase: validates inventory row before enqueue (anti-spoof).
-- ---------------------------------------------------------------------------
create or replace function public.reward_delivery_enqueue_border_self(
  p_inventory_item_id uuid,
  p_shop_item_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_key text;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1
    from public.user_inventory ui
    where ui.id = p_inventory_item_id
      and ui.user_id = v_uid
      and ui.shop_item_id = p_shop_item_id
  ) then
    raise exception 'inventory not found';
  end if;

  v_key := 'border_self:' || p_inventory_item_id::text;

  insert into public.reward_deliveries (
    user_id,
    delivery_type,
    item_type,
    item_id,
    quantity,
    metadata,
    status,
    idempotency_key
  )
  values (
    v_uid,
    'purchase',
    'border',
    p_shop_item_id,
    null,
    coalesce(p_metadata, '{}'::jsonb),
    'pending',
    v_key
  )
  on conflict (user_id, idempotency_key) do nothing
  returning id into v_id;

  if v_id is null then
    select r.id into v_id
    from public.reward_deliveries r
    where r.user_id = v_uid
      and r.idempotency_key = v_key
    limit 1;
  end if;

  return v_id;
end;
$$;

grant execute on function public.reward_delivery_enqueue_border_self(uuid, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Spark pack credit: idempotent on purchase_receipts row (validated).
-- ---------------------------------------------------------------------------
create or replace function public.reward_delivery_enqueue_sparks_pack(
  p_purchase_receipt_id uuid,
  p_shop_item_id uuid,
  p_quantity integer,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_key text;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1
    from public.purchase_receipts pr
    where pr.id = p_purchase_receipt_id
      and pr.user_id = v_uid
      and coalesce(pr.shop_item_id, p_shop_item_id) = p_shop_item_id
  ) then
    raise exception 'receipt not found';
  end if;

  v_key := 'sparks_pack:' || p_purchase_receipt_id::text;

  insert into public.reward_deliveries (
    user_id,
    delivery_type,
    item_type,
    item_id,
    quantity,
    metadata,
    status,
    idempotency_key
  )
  values (
    v_uid,
    'purchase',
    'sparks',
    p_shop_item_id,
    p_quantity,
    coalesce(p_metadata, '{}'::jsonb),
    'pending',
    v_key
  )
  on conflict (user_id, idempotency_key) do nothing
  returning id into v_id;

  if v_id is null then
    select r.id into v_id
    from public.reward_deliveries r
    where r.user_id = v_uid
      and r.idempotency_key = v_key
    limit 1;
  end if;

  return v_id;
end;
$$;

grant execute on function public.reward_delivery_enqueue_sparks_pack(uuid, uuid, integer, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Generic system/monthly/leaderboard enqueue — caller MUST run only after server grant RPC succeeds.
-- ---------------------------------------------------------------------------
create or replace function public.reward_delivery_enqueue_client(
  p_delivery_type text,
  p_item_type text,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb,
  p_quantity integer default null,
  p_item_id uuid default null,
  p_source_user_id uuid default null,
  p_source_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if p_delivery_type not in ('purchase', 'gift', 'system_award', 'monthly_claim', 'leaderboard_reward') then
    raise exception 'invalid delivery_type';
  end if;

  if p_item_type not in ('border', 'sparks', 'diamonds', 'future_item') then
    raise exception 'invalid item_type';
  end if;

  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 6 or length(p_idempotency_key) > 220 then
    raise exception 'invalid idempotency_key';
  end if;

  insert into public.reward_deliveries (
    user_id,
    delivery_type,
    item_type,
    item_id,
    quantity,
    source_user_id,
    source_display_name,
    metadata,
    status,
    idempotency_key
  )
  values (
    v_uid,
    p_delivery_type,
    p_item_type,
    p_item_id,
    p_quantity,
    p_source_user_id,
    nullif(trim(coalesce(p_source_display_name, '')), ''),
    coalesce(p_metadata, '{}'::jsonb),
    'pending',
    trim(p_idempotency_key)
  )
  on conflict (user_id, idempotency_key) do nothing
  returning id into v_id;

  if v_id is null then
    select r.id into v_id
    from public.reward_deliveries r
    where r.user_id = v_uid
      and r.idempotency_key = trim(p_idempotency_key)
    limit 1;
  end if;

  return v_id;
end;
$$;

grant execute on function public.reward_delivery_enqueue_client(
  text,
  text,
  text,
  jsonb,
  integer,
  uuid,
  uuid,
  text
) to authenticated;
