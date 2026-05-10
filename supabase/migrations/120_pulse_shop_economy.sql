-- ============================================================================
-- SUPERSEDED by 121_pulseverse_economy_and_shop.sql + 122_pulseverse_economy_rpcs_rls_seed.sql
-- Do not apply this migration on databases that already ran 121 (121 drops these objects).
-- ============================================================================
-- ============================================================================
-- 120: Pulse Shop economy — catalog, inventory, Sparks/Diamonds wallets,
--      ledger (wallet_transactions), border gifts, creator gifts, purchases,
--      economy settings, analytics views, SECURITY DEFINER RPCs.
--
-- Model:
--   • Borders: IAP only (no Sparks on item); inventory in user_inventory.
--   • Sparks: IAP packs; ledger + cache; spent on gifts (not P2P).
--   • Diamonds: creators earn from gift Sparks only; ratio in economy_settings.
-- ============================================================================

-- ─── Helpers ────────────────────────────────────────────────────────────────
create or replace function public._shop_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and coalesce(p.role_admin, false) = true
  );
$$;

-- ─── 1. economy_settings ─────────────────────────────────────────────────────
create table if not exists public.economy_settings (
  setting_key text primary key,
  setting_value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.economy_settings (setting_key, setting_value)
values (
  'sparks_to_diamonds',
  jsonb_build_object('sparks', 100, 'diamonds', 45)
)
on conflict (setting_key) do nothing;

-- ─── 2. shop_items ───────────────────────────────────────────────────────────
create table if not exists public.shop_items (
  id uuid primary key default gen_random_uuid(),
  type text not null
    check (type in (
      'border', 'spark_pack', 'gift', 'bundle',
      'seasonal_drop', 'sponsored_drop'
    )),
  category text not null default 'general',
  name text not null,
  description text not null default '',
  image_url text,
  animation_url text,
  is_active boolean not null default true,
  is_giftable boolean not null default true,
  is_limited boolean not null default false,
  rarity text,
  release_at timestamptz,
  expires_at timestamptz,
  sort_order integer not null default 0,
  store_product_id_ios text,
  store_product_id_android text,
  spark_amount integer,
  real_money_display_price text,
  price_sparks integer,
  supported_contexts text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shop_items_border_no_sparks_price
    check (type <> 'border' OR price_sparks is null),
  constraint shop_items_spark_pack_amount
    check (type <> 'spark_pack' OR (spark_amount is not null and spark_amount > 0)),
  constraint shop_items_gift_pricing
    check (
      type <> 'gift'
      OR (
        price_sparks is not null
        and price_sparks > 0
        and supported_contexts is not null
        and cardinality(supported_contexts) > 0
      )
    ),
  constraint shop_items_supported_contexts_values
    check (
      supported_contexts is null
      or supported_contexts <@ array['live', 'post', 'profile']::text[]
    )
);

create index if not exists idx_shop_items_active_type_sort
  on public.shop_items (is_active, type, sort_order, id);

-- ─── 3. Wallet caches ──────────────────────────────────────────────────────────
create table if not exists public.spark_wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  promo_balance bigint not null default 0 check (promo_balance >= 0),
  purchased_balance bigint not null default 0 check (purchased_balance >= 0),
  updated_at timestamptz not null default now(),
  constraint spark_wallets_split_sum check (balance = promo_balance + purchased_balance)
);

create table if not exists public.diamond_wallets (
  creator_id uuid primary key references auth.users (id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

-- ─── 4. wallet_transactions (ledger) ─────────────────────────────────────────
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  creator_id uuid references auth.users (id) on delete set null,
  wallet_type text not null
    constraint wallet_transactions_wallet_type_check
    check (wallet_type in ('sparks', 'diamonds', 'border')),
  transaction_type text not null
    check (transaction_type in (
      'spark_purchase',
      'promo_spark_credit',
      'border_purchase_self',
      'border_purchase_gift',
      'gift_send_live',
      'gift_send_post',
      'gift_send_profile',
      'diamond_earn',
      'refund',
      'admin_adjustment'
    )),
  amount bigint not null check (amount > 0),
  direction text not null check (direction in ('credit', 'debit')),
  source_type text,
  source_id text,
  status text not null default 'posted'
    check (status in ('pending', 'posted', 'void', 'reversed')),
  idempotency_key text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint wallet_tx_sparks_has_user
    check (wallet_type <> 'sparks' OR user_id is not null),
  constraint wallet_tx_border_has_user
    check (wallet_type <> 'border' OR user_id is not null),
  constraint wallet_tx_diamonds_has_creator
    check (wallet_type <> 'diamonds' OR creator_id is not null)
);

create unique index if not exists wallet_transactions_idempotency_uq
  on public.wallet_transactions (idempotency_key)
  where idempotency_key is not null;

create index if not exists wallet_transactions_user_created
  on public.wallet_transactions (user_id, created_at desc)
  where user_id is not null;

create index if not exists wallet_transactions_creator_created
  on public.wallet_transactions (creator_id, created_at desc)
  where creator_id is not null;

-- ─── 5. user_inventory ─────────────────────────────────────────────────────
create table if not exists public.user_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  shop_item_id uuid not null references public.shop_items (id) on delete restrict,
  item_type text not null default 'border' check (item_type in ('border')),
  acquisition_source text not null
    check (acquisition_source in ('purchased', 'gifted', 'earned', 'promotional')),
  equipped boolean not null default false,
  gifted_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, shop_item_id)
);

create index if not exists user_inventory_user_equipped
  on public.user_inventory (user_id, equipped)
  where equipped = true;

-- ─── 6. border_gifts ─────────────────────────────────────────────────────────
create table if not exists public.border_gifts (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  shop_item_id uuid not null references public.shop_items (id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed', 'cancelled')),
  idempotency_key text not null unique,
  store_transaction_ref text,
  error_code text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint border_gifts_no_self check (sender_id <> recipient_id)
);

create index if not exists border_gifts_recipient_status
  on public.border_gifts (recipient_id, status, created_at desc);

-- ─── 7. creator_gifts (Sparks → Diamonds) ────────────────────────────────────
create table if not exists public.creator_gifts (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  creator_id uuid not null references auth.users (id) on delete cascade,
  shop_item_id uuid not null references public.shop_items (id) on delete restrict,
  gift_context text not null
    check (gift_context in ('live', 'post', 'profile')),
  sparks_spent integer not null check (sparks_spent > 0),
  diamonds_credited integer not null check (diamonds_credited >= 0),
  idempotency_key text not null unique,
  live_stream_id uuid references public.live_streams (id) on delete set null,
  post_id uuid references public.posts (id) on delete set null,
  profile_user_id uuid references auth.users (id) on delete set null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint creator_gifts_no_self check (sender_id <> creator_id)
);

create index if not exists creator_gifts_creator_created
  on public.creator_gifts (creator_id, created_at desc);

create index if not exists creator_gifts_sender_created
  on public.creator_gifts (sender_id, created_at desc);

-- ─── 8. purchase_history ─────────────────────────────────────────────────────
create table if not exists public.purchase_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  shop_item_id uuid references public.shop_items (id) on delete set null,
  record_type text not null
    check (record_type in (
      'border_self',
      'border_gift_outbound',
      'spark_pack',
      'refund',
      'admin'
    )),
  platform text
    check (platform in ('ios', 'android', 'web', 'unknown')),
  store_transaction_id text,
  amount_currency text,
  amount_money_minor integer,
  sparks_granted integer,
  metadata jsonb not null default '{}',
  idempotency_key text,
  created_at timestamptz not null default now(),
  constraint purchase_history_idempotency_uq unique (idempotency_key)
);

create index if not exists purchase_history_user_created
  on public.purchase_history (user_id, created_at desc);

create index if not exists purchase_history_item
  on public.purchase_history (shop_item_id, created_at desc);

-- ============================================================================
-- Ledger → wallet cache (posted rows only). Trigger MUST return trigger.
-- Sparks debits consume promo_balance first, then purchased_balance.
-- Invariant: balance = promo_balance + purchased_balance (table constraint).
-- ============================================================================
create or replace function public.shop_apply_wallet_transaction_cache()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_promo bigint;
  v_rem bigint;
begin
  if new.status is distinct from 'posted' then
    return new;
  end if;

  -- Border rows are audit-only; inventory is user_inventory (no balance cache).
  if new.wallet_type = 'border' then
    return new;
  end if;

  if new.wallet_type = 'sparks' then
    insert into public.spark_wallets (user_id, balance, promo_balance, purchased_balance, updated_at)
    values (new.user_id, 0, 0, 0, now())
    on conflict (user_id) do nothing;

    if new.direction = 'credit' then
      update public.spark_wallets
      set
        balance = balance + new.amount,
        promo_balance = promo_balance
          + case when new.transaction_type = 'promo_spark_credit' then new.amount else 0 end,
        purchased_balance = purchased_balance
          + case
              when new.transaction_type in ('spark_purchase', 'admin_adjustment') then new.amount
              else 0
            end,
        updated_at = now()
      where user_id = new.user_id;
    else
      select coalesce(promo_balance, 0) into v_from_promo
      from public.spark_wallets
      where user_id = new.user_id
      for update;

      if not found then
        raise exception 'spark_wallets row missing for user %', new.user_id;
      end if;

      v_from_promo := least(v_from_promo, new.amount);
      v_rem := new.amount - v_from_promo;

      update public.spark_wallets
      set
        balance = balance - new.amount,
        promo_balance = promo_balance - v_from_promo,
        purchased_balance = purchased_balance - v_rem,
        updated_at = now()
      where user_id = new.user_id;

      if exists (
        select 1 from public.spark_wallets
        where user_id = new.user_id
          and (balance < 0 or promo_balance < 0 or purchased_balance < 0)
      ) then
        raise exception 'Insufficient Sparks balance or wallet inconsistency';
      end if;
    end if;

  elsif new.wallet_type = 'diamonds' then
    insert into public.diamond_wallets (creator_id, balance, updated_at)
    values (new.creator_id, 0, now())
    on conflict (creator_id) do nothing;

    update public.diamond_wallets
    set
      balance = balance + case when new.direction = 'credit' then new.amount else -new.amount end,
      updated_at = now()
    where creator_id = new.creator_id;

    if exists (
      select 1 from public.diamond_wallets
      where creator_id = new.creator_id and balance < 0
    ) then
      raise exception 'Insufficient Diamonds balance';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_shop_wallet_tx_cache on public.wallet_transactions;
create trigger trg_shop_wallet_tx_cache
  after insert on public.wallet_transactions
  for each row
  execute function public.shop_apply_wallet_transaction_cache();

comment on function public.shop_apply_wallet_transaction_cache() is
  'Keeps spark_wallets / diamond_wallets in sync with posted ledger rows. Debits consume promo_balance first.';

-- ============================================================================
-- Economy helpers
-- ============================================================================
create or replace function public.shop_diamonds_for_sparks(p_sparks integer)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
  v_base int;
  v_diamonds int;
begin
  if p_sparks <= 0 then
    return 0;
  end if;
  select setting_value into v
  from public.economy_settings
  where setting_key = 'sparks_to_diamonds';
  if v is null then
    return floor(p_sparks * 0.45)::int;
  end if;
  v_base := coalesce((v->>'sparks')::int, 100);
  v_diamonds := coalesce((v->>'diamonds')::int, 45);
  if v_base <= 0 then
    return 0;
  end if;
  return floor(p_sparks::numeric * v_diamonds::numeric / v_base::numeric)::int;
end;
$$;

-- ============================================================================
-- Idempotent Sparks credit (IAP or promo) — server-side
-- ============================================================================
create or replace function public.shop_credit_sparks(
  p_user_id uuid,
  p_amount integer,
  p_idempotency_key text,
  p_transaction_type text,
  p_source_id text default null,
  p_metadata jsonb default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_type text;
begin
  if auth.uid() is distinct from p_user_id and not public._shop_is_admin() then
    raise exception 'not allowed';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key required';
  end if;
  v_type := p_transaction_type;
  if v_type not in ('spark_purchase', 'promo_spark_credit', 'admin_adjustment') then
    raise exception 'invalid transaction_type for credit';
  end if;

  insert into public.wallet_transactions (
    user_id,
    creator_id,
    wallet_type,
    transaction_type,
    amount,
    direction,
    source_type,
    source_id,
    status,
    idempotency_key,
    metadata
  )
  values (
    p_user_id,
    null,
    'sparks',
    v_type,
    p_amount::bigint,
    'credit',
    'shop',
    p_source_id,
    'posted',
    p_idempotency_key,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    select wt.id into v_id
    from public.wallet_transactions wt
    where wt.idempotency_key = p_idempotency_key
    limit 1;
    if v_id is null then
      raise;
    end if;
    return v_id;
end;
$$;

comment on function public.shop_credit_sparks(uuid, integer, text, text, text, jsonb) is
  'Idempotent Sparks credit (IAP pack, promo, or admin). Caller must be user or admin.';

-- ============================================================================
-- Border self-grant (after verified IAP on device / edge — validate receipts in production)
-- ============================================================================
create or replace function public.shop_grant_border_self_after_iap(
  p_user_id uuid,
  p_shop_item_id uuid,
  p_idempotency_key text,
  p_platform text default 'unknown',
  p_store_transaction_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx uuid;
  v_item public.shop_items%rowtype;
begin
  if auth.uid() is distinct from p_user_id and not public._shop_is_admin() then
    raise exception 'not allowed';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key required';
  end if;

  perform pg_advisory_xact_lock(
    hashtext('shop:border_self:' || p_user_id::text || ':' || p_shop_item_id::text)
  );

  select * into v_item
  from public.shop_items si
  where si.id = p_shop_item_id and si.type = 'border';
  if not found then
    raise exception 'border_not_found';
  end if;
  if not coalesce(v_item.is_active, false) and not public._shop_is_admin() then
    raise exception 'item not available';
  end if;

  select wt.id into v_tx
  from public.wallet_transactions wt
  where wt.idempotency_key = p_idempotency_key
  limit 1;

  if v_tx is not null then
    if not exists (
      select 1 from public.user_inventory ui
      where ui.user_id = p_user_id and ui.shop_item_id = p_shop_item_id
    ) then
      insert into public.user_inventory (
        user_id, shop_item_id, item_type, acquisition_source, equipped, gifted_by_user_id
      )
      values (p_user_id, p_shop_item_id, 'border', 'purchased', false, null);
    end if;
    return v_tx;
  end if;

  if exists (
    select 1 from public.user_inventory ui
    where ui.user_id = p_user_id and ui.shop_item_id = p_shop_item_id
  ) then
    raise exception 'border_already_owned';
  end if;

  insert into public.wallet_transactions (
    user_id, creator_id, wallet_type, transaction_type, amount, direction,
    source_type, source_id, status, idempotency_key, metadata
  )
  values (
    p_user_id,
    null,
    'border',
    'border_purchase_self',
    1,
    'credit',
    'iap',
    p_store_transaction_id,
    'posted',
    p_idempotency_key,
    jsonb_strip_nulls(jsonb_build_object(
      'shop_item_id', p_shop_item_id,
      'platform', p_platform,
      'detail', coalesce(p_metadata, '{}'::jsonb)
    ))
  )
  returning id into v_tx;

  insert into public.user_inventory (
    user_id, shop_item_id, item_type, acquisition_source, equipped, gifted_by_user_id
  )
  values (p_user_id, p_shop_item_id, 'border', 'purchased', false, null);

  insert into public.purchase_history (
    user_id, shop_item_id, record_type, platform, store_transaction_id, metadata, idempotency_key
  )
  values (
    p_user_id,
    p_shop_item_id,
    'border_self',
    p_platform,
    p_store_transaction_id,
    jsonb_strip_nulls(jsonb_build_object('wallet_tx_id', v_tx) || coalesce(p_metadata, '{}'::jsonb)),
    p_idempotency_key || ':ph'
  );

  return v_tx;
end;
$$;

-- ============================================================================
-- Border gift (IAP on sender). Recipient must not already own the border.
-- ============================================================================
create or replace function public.shop_grant_border_gift_after_iap(
  p_sender_id uuid,
  p_recipient_id uuid,
  p_shop_item_id uuid,
  p_idempotency_key text,
  p_platform text default 'unknown',
  p_store_transaction_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx uuid;
  v_gift_id uuid;
  v_item public.shop_items%rowtype;
begin
  if auth.uid() is distinct from p_sender_id and not public._shop_is_admin() then
    raise exception 'not allowed';
  end if;
  if p_sender_id = p_recipient_id then
    raise exception 'cannot_gift_self';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key required';
  end if;

  perform pg_advisory_xact_lock(
    hashtext('shop:border_gift:' || p_recipient_id::text || ':' || p_shop_item_id::text)
  );

  select * into v_item
  from public.shop_items si
  where si.id = p_shop_item_id and si.type = 'border';
  if not found then
    raise exception 'border_not_found';
  end if;
  if not coalesce(v_item.is_active, false) and not public._shop_is_admin() then
    raise exception 'item not available';
  end if;
  if not coalesce(v_item.is_giftable, true) then
    raise exception 'item not giftable';
  end if;

  select bg.id into v_gift_id
  from public.border_gifts bg
  where bg.idempotency_key = p_idempotency_key
  limit 1;

  if v_gift_id is not null then
    select wt.id into v_tx
    from public.wallet_transactions wt
    where wt.idempotency_key = p_idempotency_key || ':ledger'
    limit 1;
    if v_tx is null then
      raise exception 'border_gift_inconsistent_state';
    end if;
    return v_tx;
  end if;

  if exists (
    select 1 from public.user_inventory ui
    where ui.user_id = p_recipient_id and ui.shop_item_id = p_shop_item_id
  ) then
    raise exception 'recipient_already_owns_border';
  end if;

  insert into public.border_gifts (
    sender_id, recipient_id, shop_item_id, status, idempotency_key,
    store_transaction_ref, metadata
  )
  values (
    p_sender_id, p_recipient_id, p_shop_item_id, 'completed', p_idempotency_key,
    p_store_transaction_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_gift_id;

  insert into public.wallet_transactions (
    user_id, creator_id, wallet_type, transaction_type, amount, direction,
    source_type, source_id, status, idempotency_key, metadata
  )
  values (
    p_recipient_id,
    null,
    'border',
    'border_purchase_gift',
    1,
    'credit',
    'iap_gift',
    p_store_transaction_id,
    'posted',
    p_idempotency_key || ':ledger',
    jsonb_strip_nulls(jsonb_build_object(
      'shop_item_id', p_shop_item_id,
      'sender_id', p_sender_id,
      'platform', p_platform,
      'border_gift_id', v_gift_id,
      'detail', coalesce(p_metadata, '{}'::jsonb)
    ))
  )
  returning id into v_tx;

  insert into public.user_inventory (
    user_id, shop_item_id, item_type, acquisition_source, equipped, gifted_by_user_id
  )
  values (p_recipient_id, p_shop_item_id, 'border', 'gifted', false, p_sender_id);

  insert into public.purchase_history (
    user_id, shop_item_id, record_type, platform, store_transaction_id, metadata, idempotency_key
  )
  values (
    p_sender_id,
    p_shop_item_id,
    'border_gift_outbound',
    p_platform,
    p_store_transaction_id,
    jsonb_strip_nulls(jsonb_build_object(
      'recipient_id', p_recipient_id, 'wallet_tx_id', v_tx, 'border_gift_id', v_gift_id
    ) || coalesce(p_metadata, '{}'::jsonb)),
    p_idempotency_key || ':ph'
  );

  insert into public.notifications (user_id, type, actor_id, message, target_id)
  values (
    p_recipient_id,
    'shop_border_gift',
    p_sender_id,
    'Sent you a Pulse border gift',
    p_shop_item_id::text
  );

  return v_tx;
end;
$$;

-- ============================================================================
-- Spend Sparks on a gift; credit creator Diamonds (ratio from economy_settings).
-- ============================================================================
create or replace function public.shop_send_creator_gift(
  p_creator_id uuid,
  p_shop_item_id uuid,
  p_context text,
  p_idempotency_key text,
  p_live_stream_id uuid default null,
  p_post_id uuid default null,
  p_profile_user_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_item public.shop_items%rowtype;
  v_price int;
  v_diamonds int;
  v_kind text;
  v_row_id uuid;
begin
  if v_sender is null then
    raise exception 'not authenticated';
  end if;
  if v_sender = p_creator_id then
    raise exception 'cannot_gift_self';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key required';
  end if;
  if p_context is null or p_context not in ('live', 'post', 'profile') then
    raise exception 'invalid context';
  end if;

  select * into v_item
  from public.shop_items si
  where si.id = p_shop_item_id and si.type = 'gift';
  if not found then
    raise exception 'gift_not_found';
  end if;
  if not coalesce(v_item.is_active, false) then
    raise exception 'item not available';
  end if;
  if not (p_context = any (coalesce(v_item.supported_contexts, array[]::text[]))) then
    raise exception 'gift not allowed in this context';
  end if;

  v_price := v_item.price_sparks;
  if v_price is null or v_price <= 0 then
    raise exception 'invalid gift price';
  end if;

  v_diamonds := public.shop_diamonds_for_sparks(v_price);

  v_kind := case p_context
    when 'live' then 'gift_send_live'
    when 'post' then 'gift_send_post'
    else 'gift_send_profile'
  end;

  select cg.id into v_row_id from public.creator_gifts cg
  where cg.idempotency_key = p_idempotency_key;
  if v_row_id is not null then
    return v_row_id;
  end if;

  insert into public.wallet_transactions (
    user_id, creator_id, wallet_type, transaction_type, amount, direction,
    source_type, source_id, status, idempotency_key, metadata
  )
  values (
    v_sender,
    null,
    'sparks',
    v_kind,
    v_price::bigint,
    'debit',
    'creator_gift',
    p_shop_item_id::text,
    'posted',
    p_idempotency_key || ':sparks_debit',
    coalesce(p_metadata, '{}'::jsonb)
  );

  insert into public.wallet_transactions (
    user_id, creator_id, wallet_type, transaction_type, amount, direction,
    source_type, source_id, status, idempotency_key, metadata
  )
  values (
    null,
    p_creator_id,
    'diamonds',
    'diamond_earn',
    greatest(v_diamonds, 0)::bigint,
    'credit',
    'creator_gift',
    p_shop_item_id::text,
    'posted',
    p_idempotency_key || ':diamond_credit',
    jsonb_strip_nulls(jsonb_build_object(
      'sender_id', v_sender,
      'sparks_spent', v_price,
      'context', p_context
    ) || coalesce(p_metadata, '{}'::jsonb))
  );

  insert into public.creator_gifts (
    sender_id, creator_id, shop_item_id, gift_context,
    sparks_spent, diamonds_credited, idempotency_key,
    live_stream_id, post_id, profile_user_id, metadata
  )
  values (
    v_sender, p_creator_id, p_shop_item_id, p_context::text,
    v_price, greatest(v_diamonds, 0), p_idempotency_key,
    p_live_stream_id, p_post_id, p_profile_user_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_row_id;

  insert into public.notifications (user_id, type, actor_id, message, target_id)
  values (
    p_creator_id,
    'shop_spark_gift',
    v_sender,
    'Sent you a gift',
    p_shop_item_id::text
  );

  return v_row_id;
exception
  when unique_violation then
    select cg.id into v_row_id from public.creator_gifts cg
    where cg.idempotency_key = p_idempotency_key;
    if v_row_id is null then
      raise;
    end if;
    return v_row_id;
end;
$$;

-- ============================================================================
-- Admin: aggregates for analytics dashboards
-- ============================================================================
create or replace function public.shop_admin_economy_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  if not public._shop_is_admin() then
    raise exception 'admin only';
  end if;

  select jsonb_build_object(
    'sparks_to_diamonds', (select setting_value from public.economy_settings where setting_key = 'sparks_to_diamonds'),
    'spark_purchase_count', (select count(*) from public.wallet_transactions where wallet_type = 'sparks' and transaction_type = 'spark_purchase'),
    'promo_spark_count', (select count(*) from public.wallet_transactions where wallet_type = 'sparks' and transaction_type = 'promo_spark_credit'),
    'gift_sends_live', (select count(*) from public.creator_gifts where gift_context = 'live'),
    'gift_sends_post', (select count(*) from public.creator_gifts where gift_context = 'post'),
    'gift_sends_profile', (select count(*) from public.creator_gifts where gift_context = 'profile'),
    'diamond_credits', (select count(*) from public.wallet_transactions where wallet_type = 'diamonds' and transaction_type = 'diamond_earn'),
    'border_self_purchases', (select count(*) from public.purchase_history where record_type = 'border_self'),
    'border_outbound_gifts', (select count(*) from public.purchase_history where record_type = 'border_gift_outbound'),
    'top_border_purchases', (
      select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
      from (
        select ph.shop_item_id, count(*)::int as purchases
        from public.purchase_history ph
        where ph.record_type = 'border_self' and ph.shop_item_id is not null
        group by ph.shop_item_id
        order by purchases desc
        limit 10
      ) s
    ),
    'top_border_gifts', (
      select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
      from (
        select ph.shop_item_id, count(*)::int as gifts
        from public.purchase_history ph
        where ph.record_type = 'border_gift_outbound' and ph.shop_item_id is not null
        group by ph.shop_item_id
        order by gifts desc
        limit 10
      ) s
    ),
    'top_gifts_sent', (
      select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
      from (
        select cg.shop_item_id, count(*)::int as sends
        from public.creator_gifts cg
        group by cg.shop_item_id
        order by sends desc
        limit 10
      ) s
    ),
    'top_diamond_earners', (
      select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
      from (
        select wt.creator_id, sum(wt.amount)::bigint as diamonds_ledger_sum
        from public.wallet_transactions wt
        where wt.wallet_type = 'diamonds' and wt.transaction_type = 'diamond_earn' and wt.direction = 'credit'
        group by wt.creator_id
        order by diamonds_ledger_sum desc
        limit 10
      ) s
    )
  ) into v;

  return v;
end;
$$;

-- ============================================================================
-- Row level security
-- ============================================================================
alter table public.economy_settings enable row level security;
alter table public.shop_items enable row level security;
alter table public.spark_wallets enable row level security;
alter table public.diamond_wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.user_inventory enable row level security;
alter table public.border_gifts enable row level security;
alter table public.creator_gifts enable row level security;
alter table public.purchase_history enable row level security;

drop policy if exists economy_settings_select on public.economy_settings;
create policy economy_settings_select
  on public.economy_settings for select
  to authenticated
  using (true);

drop policy if exists economy_settings_admin on public.economy_settings;
create policy economy_settings_admin
  on public.economy_settings for all
  to authenticated
  using (public._shop_is_admin())
  with check (public._shop_is_admin());

drop policy if exists shop_items_read on public.shop_items;
create policy shop_items_read
  on public.shop_items for select
  to authenticated
  using (is_active = true or public._shop_is_admin());

drop policy if exists shop_items_admin on public.shop_items;
create policy shop_items_admin
  on public.shop_items for all
  to authenticated
  using (public._shop_is_admin())
  with check (public._shop_is_admin());

drop policy if exists spark_wallets_select on public.spark_wallets;
create policy spark_wallets_select
  on public.spark_wallets for select
  to authenticated
  using (auth.uid() = user_id or public._shop_is_admin());

drop policy if exists diamond_wallets_select on public.diamond_wallets;
create policy diamond_wallets_select
  on public.diamond_wallets for select
  to authenticated
  using (auth.uid() = creator_id or public._shop_is_admin());

drop policy if exists wallet_tx_select on public.wallet_transactions;
create policy wallet_tx_select
  on public.wallet_transactions for select
  to authenticated
  using (
    auth.uid() = user_id
    or auth.uid() = creator_id
    or public._shop_is_admin()
  );

drop policy if exists user_inventory_select on public.user_inventory;
create policy user_inventory_select
  on public.user_inventory for select
  to authenticated
  using (auth.uid() = user_id or public._shop_is_admin());

drop policy if exists border_gifts_select on public.border_gifts;
create policy border_gifts_select
  on public.border_gifts for select
  to authenticated
  using (
    auth.uid() in (sender_id, recipient_id)
    or public._shop_is_admin()
  );

drop policy if exists creator_gifts_select on public.creator_gifts;
create policy creator_gifts_select
  on public.creator_gifts for select
  to authenticated
  using (
    auth.uid() in (sender_id, creator_id)
    or public._shop_is_admin()
  );

drop policy if exists purchase_history_select on public.purchase_history;
create policy purchase_history_select
  on public.purchase_history for select
  to authenticated
  using (auth.uid() = user_id or public._shop_is_admin());

-- ============================================================================
-- Grants (writes through SECURITY DEFINER RPCs)
-- ============================================================================
grant usage on schema public to authenticated;

grant select on public.economy_settings to authenticated;
grant select on public.shop_items to authenticated;
grant select on public.spark_wallets to authenticated;
grant select on public.diamond_wallets to authenticated;
grant select on public.wallet_transactions to authenticated;
grant select on public.user_inventory to authenticated;
grant select on public.border_gifts to authenticated;
grant select on public.creator_gifts to authenticated;
grant select on public.purchase_history to authenticated;

grant execute on function public.shop_diamonds_for_sparks(integer) to authenticated;
grant execute on function public.shop_credit_sparks(uuid, integer, text, text, text, jsonb) to authenticated;
grant execute on function public.shop_grant_border_self_after_iap(uuid, uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.shop_grant_border_gift_after_iap(uuid, uuid, uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.shop_send_creator_gift(uuid, uuid, text, text, uuid, uuid, uuid, jsonb) to authenticated;
grant execute on function public.shop_admin_economy_summary() to authenticated;

grant all on table public.economy_settings to service_role;
grant all on table public.shop_items to service_role;
grant all on table public.spark_wallets to service_role;
grant all on table public.diamond_wallets to service_role;
grant all on table public.wallet_transactions to service_role;
grant all on table public.user_inventory to service_role;
grant all on table public.border_gifts to service_role;
grant all on table public.creator_gifts to service_role;
grant all on table public.purchase_history to service_role;

grant execute on function public._shop_is_admin() to service_role;
grant execute on function public.shop_apply_wallet_transaction_cache() to service_role;
grant execute on function public.shop_diamonds_for_sparks(integer) to service_role;
grant execute on function public.shop_credit_sparks(uuid, integer, text, text, text, jsonb) to service_role;
grant execute on function public.shop_grant_border_self_after_iap(uuid, uuid, text, text, text, jsonb) to service_role;
grant execute on function public.shop_grant_border_gift_after_iap(uuid, uuid, uuid, text, text, text, jsonb) to service_role;
grant execute on function public.shop_send_creator_gift(uuid, uuid, text, text, uuid, uuid, uuid, jsonb) to service_role;
grant execute on function public.shop_admin_economy_summary() to service_role;