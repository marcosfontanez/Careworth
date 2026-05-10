-- ============================================================================
-- 121: PulseVerse economy + Pulse Shop (production schema)
--
-- Replaces migration 120 pulse shop draft with catalog, receipts, ledger,
-- Sparks/Diamond wallets, inventory, gifts, user_notifications, and RPCs.
--
-- Handle resolution: public "handle" = profiles.username (existing column).
-- ============================================================================

-- ─── 0) Remove prior economy draft (120) ────────────────────────────────────
do $drop_old_shop$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'wallet_transactions'
  ) then
    execute 'drop trigger if exists trg_shop_wallet_tx_cache on public.wallet_transactions';
  end if;
end;
$drop_old_shop$;

drop function if exists public.shop_credit_sparks(uuid, integer, text, text, text, jsonb);
drop function if exists public.shop_grant_border_self_after_iap(uuid, uuid, text, text, text, jsonb);
drop function if exists public.shop_grant_border_gift_after_iap(uuid, uuid, uuid, text, text, text, jsonb);
drop function if exists public.shop_send_creator_gift(uuid, uuid, text, text, uuid, uuid, uuid, jsonb);
drop function if exists public.shop_admin_economy_summary();
drop function if exists public.shop_diamonds_for_sparks(integer);
drop function if exists public.shop_apply_wallet_transaction_cache();
-- _shop_is_admin() is referenced by RLS policies from migration 120 — drop after tables (below).

drop table if exists public.purchase_history cascade;
drop table if exists public.creator_gifts cascade;
drop table if exists public.border_gifts cascade;
drop table if exists public.user_inventory cascade;
drop table if exists public.wallet_transactions cascade;
drop table if exists public.spark_wallets cascade;
drop table if exists public.diamond_wallets cascade;
drop table if exists public.shop_items cascade;
drop table if exists public.economy_settings cascade;

drop function if exists public._shop_is_admin();

-- ─── 1) Profile extensions ────────────────────────────────────────────────
alter table public.profiles add column if not exists is_creator boolean not null default false;

comment on column public.profiles.is_creator is
  'Economy: eligible for diamond_wallets and creator gift receipts.';
comment on column public.profiles.username is
  'Public @handle (without @). Used to resolve border gift recipients.';

create index if not exists idx_profiles_username_lower
  on public.profiles (lower(trim(username)));

-- ─── Shared: updated_at touch ─────────────────────────────────────────────
create or replace function public._economy_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public._economy_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and coalesce(p.role_admin, false)
  );
$$;

-- -----------------------------------------------------------------------------
-- economy_settings (must exist before _economy_setting_json is created)
-- -----------------------------------------------------------------------------
create table public.economy_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

create trigger trg_economy_settings_updated_at
  before update on public.economy_settings
  for each row execute function public._economy_touch_updated_at();

insert into public.economy_settings (key, value, description) values
  (
    'sparks_to_diamonds_ratio',
    jsonb_build_object('sparks', 100, 'diamonds', 45),
    'Sparks spent on gifts convert to creator diamonds (floor ratio).'
  ),
  (
    'min_cashout_threshold',
    jsonb_build_object('diamonds', 1000),
    'Future: minimum diamonds for payout request.'
  ),
  (
    'diamond_hold_days',
    jsonb_build_object('days', 0),
    'Days gifts sit in diamonds_pending before reserve_release to available. 0 = immediate available.'
  ),
  (
    'gift_spend_source_order',
    jsonb_build_object('order', jsonb_build_array('promo', 'paid')),
    'Debit order for gifts: promo bucket first, then paid.'
  ),
  (
    'border_gift_accept_mode',
    jsonb_build_object('mode', 'instant_delivery'),
    'Future: manual accept vs instant inventory.'
  )
on conflict (key) do nothing;

create or replace function public._economy_setting_json(p_key text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select es.value from public.economy_settings es where es.key = p_key limit 1;
$$;

create or replace function public._economy_diamond_hold_days()
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
  d int;
begin
  v := public._economy_setting_json('diamond_hold_days');
  if v is null then
    return 0;
  end if;
  d := coalesce((v->>'days')::int, (v->>'hold_days')::int, 0);
  return greatest(d, 0);
end;
$$;

create or replace function public._economy_sparks_to_diamonds(p_sparks integer)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
  base int;
  diam int;
begin
  if p_sparks <= 0 then
    return 0;
  end if;
  v := public._economy_setting_json('sparks_to_diamonds_ratio');
  if v is null then
    return floor(p_sparks * 45.0 / 100.0)::int;
  end if;
  base := coalesce((v->>'sparks')::int, 100);
  diam := coalesce((v->>'diamonds')::int, 45);
  if base <= 0 then
    return 0;
  end if;
  return floor(p_sparks::numeric * diam::numeric / base::numeric)::int;
end;
$$;

create or replace function public._economy_gift_spend_order()
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
  ord jsonb;
  arr text[];
begin
  v := public._economy_setting_json('gift_spend_source_order');
  if v is null then
    return array['promo', 'paid']::text[];
  end if;
  ord := v->'order';
  if ord is null or jsonb_typeof(ord) <> 'array' then
    return array['promo', 'paid']::text[];
  end if;
  select coalesce(array_agg(value::text), array[]::text[])
  into arr
  from jsonb_array_elements_text(ord) as t(value);
  if arr is null or cardinality(arr) = 0 then
    return array['promo', 'paid']::text[];
  end if;
  return arr;
end;
$$;

-- -----------------------------------------------------------------------------
-- shop_items
-- -----------------------------------------------------------------------------
create table public.shop_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  type text not null
    check (type in (
      'border', 'spark_pack', 'gift', 'bundle',
      'seasonal_drop', 'sponsored_drop'
    )),
  category text,
  name text not null,
  description text not null default '',
  rarity text
    check (
      rarity is null
      or rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary', 'exclusive')
    ),
  image_url text,
  animation_url text,
  spark_price integer,
  spark_amount integer,
  real_money_display_price text,
  store_product_id_ios text,
  store_product_id_android text,
  is_active boolean not null default true,
  is_giftable boolean not null default false,
  is_limited boolean not null default false,
  inventory_count integer,
  release_at timestamptz,
  expires_at timestamptz,
  sort_order integer not null default 0,
  gift_contexts text[]
    check (
      gift_contexts is null
      or gift_contexts <@ array['live', 'post', 'profile']::text[]
    ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shop_items_border_rules check (
    type <> 'border'
    or (
      spark_price is null
      and store_product_id_ios is not null
      and length(trim(store_product_id_ios)) > 0
      and store_product_id_android is not null
      and length(trim(store_product_id_android)) > 0
    )
  ),
  constraint shop_items_spark_pack_rules check (
    type <> 'spark_pack'
    or (
      spark_amount is not null
      and spark_amount > 0
      and store_product_id_ios is not null
      and store_product_id_android is not null
    )
  ),
  constraint shop_items_gift_rules check (
    type <> 'gift'
    or (
      spark_price is not null
      and spark_price > 0
      and gift_contexts is not null
      and cardinality(gift_contexts) > 0
    )
  )
);

create index idx_shop_items_type on public.shop_items (type);
create index idx_shop_items_category on public.shop_items (category);
create index idx_shop_items_is_active on public.shop_items (is_active);
create index idx_shop_items_sort on public.shop_items (sort_order);
create index idx_shop_items_active_type_sort on public.shop_items (is_active, type, sort_order);

create trigger trg_shop_items_updated_at
  before update on public.shop_items
  for each row execute function public._economy_touch_updated_at();

-- -----------------------------------------------------------------------------
-- spark_wallets
-- -----------------------------------------------------------------------------
create table public.spark_wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  paid_sparks_balance bigint not null default 0 check (paid_sparks_balance >= 0),
  promo_sparks_balance bigint not null default 0 check (promo_sparks_balance >= 0),
  total_sparks_spent bigint not null default 0 check (total_sparks_spent >= 0),
  total_sparks_purchased bigint not null default 0 check (total_sparks_purchased >= 0),
  updated_at timestamptz not null default now()
);

create trigger trg_spark_wallets_updated_at
  before update on public.spark_wallets
  for each row execute function public._economy_touch_updated_at();

comment on table public.spark_wallets is
  'Spend order: debit promo first, then paid (gift_spend_source_order).';

-- -----------------------------------------------------------------------------
-- diamond_wallets
-- -----------------------------------------------------------------------------
create table public.diamond_wallets (
  creator_id uuid primary key references public.profiles (id) on delete cascade,
  diamonds_pending bigint not null default 0 check (diamonds_pending >= 0),
  diamonds_available bigint not null default 0 check (diamonds_available >= 0),
  diamonds_paid_out bigint not null default 0 check (diamonds_paid_out >= 0),
  total_diamonds_earned bigint not null default 0 check (total_diamonds_earned >= 0),
  updated_at timestamptz not null default now()
);

create trigger trg_diamond_wallets_updated_at
  before update on public.diamond_wallets
  for each row execute function public._economy_touch_updated_at();

-- -----------------------------------------------------------------------------
-- wallet_transactions (immutable ledger; never DELETE)
-- -----------------------------------------------------------------------------
create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  creator_id uuid references public.profiles (id) on delete set null,
  wallet_type text not null
    check (wallet_type in ('sparks', 'diamonds', 'border')),
  transaction_type text not null,
  direction text not null check (direction in ('credit', 'debit')),
  amount bigint not null check (amount >= 0),
  status text not null default 'posted'
    check (status in ('pending', 'posted', 'reversed', 'failed')),
  source_type text
    check (
      source_type is null
      or source_type in (
        'shop_item', 'live_session', 'post', 'profile',
        'gift_event', 'purchase_receipt', 'admin', 'system'
      )
    ),
  source_id uuid,
  reserve_release_at timestamptz,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint wallet_tx_type_check check (
    (wallet_type = 'sparks' and transaction_type in (
      'spark_purchase', 'promo_spark_credit',
      'spark_debit_gift_live', 'spark_debit_gift_post', 'spark_debit_gift_profile',
      'admin_adjustment', 'refund', 'reversal'
    ))
    or (wallet_type = 'diamonds' and transaction_type in (
      'diamond_earn_live', 'diamond_earn_post', 'diamond_earn_profile',
      'reserve_release', 'admin_adjustment', 'refund', 'reversal'
    ))
    or (wallet_type = 'border' and transaction_type in (
      'border_purchase_self', 'border_purchase_gift', 'admin_adjustment', 'refund', 'reversal'
    ))
  ),
  constraint wallet_tx_sparks_user check (wallet_type <> 'sparks' or user_id is not null),
  constraint wallet_tx_border_user check (wallet_type <> 'border' or user_id is not null),
  constraint wallet_tx_diamonds_creator check (wallet_type <> 'diamonds' or creator_id is not null)
);

comment on table public.wallet_transactions is
  'Source of truth. border wallet_type rows are audit-only (no balance mutation). '
  'Amount may be 0 only for rare admin rows; gifts use positive debit/credit amounts.';

create unique index wallet_transactions_idempotency_uq
  on public.wallet_transactions (idempotency_key)
  where idempotency_key is not null;

create index idx_wallet_tx_user on public.wallet_transactions (user_id, created_at desc);
create index idx_wallet_tx_creator on public.wallet_transactions (creator_id, created_at desc);
create index idx_wallet_tx_wallet_type on public.wallet_transactions (wallet_type);
create index idx_wallet_tx_txn_type on public.wallet_transactions (transaction_type);
create index idx_wallet_tx_created on public.wallet_transactions (created_at desc);
create index idx_wallet_tx_reserve on public.wallet_transactions (reserve_release_at)
  where reserve_release_at is not null;

-- Positive amount requirement for product flows (reversals may use metadata-only rows later).
alter table public.wallet_transactions add constraint wallet_tx_amount_positive
  check (amount > 0 or transaction_type = 'reversal');

-- -----------------------------------------------------------------------------
-- Ledger → wallet balances (posted rows). SECURITY DEFINER; must return trigger.
-- -----------------------------------------------------------------------------
create or replace function public.economy_apply_wallet_transaction_balances()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ord text[];
  src text;
  remaining bigint;
  take bigint;
  u_promo bigint;
  u_paid bigint;
  hold_days int;
begin
  if new.status is distinct from 'posted' then
    return new;
  end if;

  if new.wallet_type = 'border' then
    return new;
  end if;

  if new.wallet_type = 'sparks' then
    insert into public.spark_wallets (user_id)
    values (new.user_id)
    on conflict (user_id) do nothing;

    if new.direction = 'credit' then
      if new.transaction_type = 'spark_purchase' then
        update public.spark_wallets
        set
          paid_sparks_balance = paid_sparks_balance + new.amount,
          total_sparks_purchased = total_sparks_purchased + new.amount,
          updated_at = now()
        where user_id = new.user_id;
      elsif new.transaction_type = 'promo_spark_credit' then
        update public.spark_wallets
        set promo_sparks_balance = promo_sparks_balance + new.amount, updated_at = now()
        where user_id = new.user_id;
      elsif new.transaction_type in ('admin_adjustment', 'refund') then
        if coalesce(new.metadata->>'bucket', 'paid') = 'promo' then
          update public.spark_wallets
          set promo_sparks_balance = promo_sparks_balance + new.amount, updated_at = now()
          where user_id = new.user_id;
        else
          update public.spark_wallets
          set paid_sparks_balance = paid_sparks_balance + new.amount, updated_at = now()
          where user_id = new.user_id;
        end if;
      end if;

    elsif new.direction = 'debit' and new.transaction_type in (
      'spark_debit_gift_live', 'spark_debit_gift_post', 'spark_debit_gift_profile'
    ) then
      select promo_sparks_balance, paid_sparks_balance
      into u_promo, u_paid
      from public.spark_wallets
      where user_id = new.user_id
      for update;

      if not found then
        raise exception 'insufficient_sparks';
      end if;

      remaining := new.amount;
      ord := public._economy_gift_spend_order();

      foreach src in array ord loop
        exit when remaining <= 0;
        if src = 'promo' then
          take := least(u_promo, remaining);
          u_promo := u_promo - take;
          remaining := remaining - take;
        elsif src = 'paid' then
          take := least(u_paid, remaining);
          u_paid := u_paid - take;
          remaining := remaining - take;
        end if;
      end loop;

      if remaining > 0 then
        raise exception 'insufficient_sparks';
      end if;

      update public.spark_wallets
      set
        promo_sparks_balance = u_promo,
        paid_sparks_balance = u_paid,
        total_sparks_spent = total_sparks_spent + new.amount,
        updated_at = now()
      where user_id = new.user_id;
    end if;
  end if;

  if new.wallet_type = 'diamonds' then
    insert into public.diamond_wallets (creator_id)
    values (new.creator_id)
    on conflict (creator_id) do nothing;

    if new.transaction_type in ('diamond_earn_live', 'diamond_earn_post', 'diamond_earn_profile')
       and new.direction = 'credit' then
      hold_days := public._economy_diamond_hold_days();
      if hold_days <= 0 then
        update public.diamond_wallets
        set
          diamonds_available = diamonds_available + new.amount,
          total_diamonds_earned = total_diamonds_earned + new.amount,
          updated_at = now()
        where creator_id = new.creator_id;
      else
        update public.diamond_wallets
        set
          diamonds_pending = diamonds_pending + new.amount,
          total_diamonds_earned = total_diamonds_earned + new.amount,
          updated_at = now()
        where creator_id = new.creator_id;
      end if;

    elsif new.transaction_type = 'reserve_release' and new.direction = 'credit' then
      update public.diamond_wallets
      set
        diamonds_pending = diamonds_pending - new.amount,
        diamonds_available = diamonds_available + new.amount,
        updated_at = now()
      where creator_id = new.creator_id;

      if (select diamonds_pending from public.diamond_wallets where creator_id = new.creator_id) < 0 then
        raise exception 'diamond_hold_release_exceeds_pending';
      end if;
    elsif new.transaction_type in ('admin_adjustment', 'refund') then
      if new.direction = 'credit' then
        update public.diamond_wallets
        set diamonds_available = diamonds_available + new.amount, updated_at = now()
        where creator_id = new.creator_id;
      else
        update public.diamond_wallets
        set diamonds_available = greatest(0, diamonds_available - new.amount), updated_at = now()
        where creator_id = new.creator_id;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_economy_wallet_apply on public.wallet_transactions;
create trigger trg_economy_wallet_apply
  after insert on public.wallet_transactions
  for each row
  execute function public.economy_apply_wallet_transaction_balances();

-- -----------------------------------------------------------------------------
-- user_inventory
-- -----------------------------------------------------------------------------
create table public.user_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  shop_item_id uuid not null references public.shop_items (id) on delete cascade,
  item_kind text not null default 'border' check (item_kind = 'border'),
  acquisition_source text not null
    check (acquisition_source in ('purchased', 'gifted', 'earned', 'promotional', 'admin_grant')),
  acquisition_txn_id uuid references public.wallet_transactions (id) on delete set null,
  gifted_by_user_id uuid references public.profiles (id) on delete set null,
  gifted_to_user_id uuid references public.profiles (id) on delete set null,
  is_equipped boolean not null default false,
  is_transferable boolean not null default false,
  acquired_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, shop_item_id)
);

create index idx_user_inventory_user on public.user_inventory (user_id);
create index idx_user_inventory_shop_item on public.user_inventory (shop_item_id);
create index idx_user_inventory_user_equipped on public.user_inventory (user_id, is_equipped)
  where is_equipped;

create unique index user_inventory_one_equipped_border
  on public.user_inventory (user_id)
  where is_equipped and item_kind = 'border';

-- -----------------------------------------------------------------------------
-- border_gifts
-- -----------------------------------------------------------------------------
create table public.border_gifts (
  id uuid primary key default gen_random_uuid(),
  shop_item_id uuid not null references public.shop_items (id) on delete restrict,
  sender_user_id uuid not null references public.profiles (id) on delete cascade,
  recipient_user_id uuid not null references public.profiles (id) on delete cascade,
  wallet_transaction_id uuid references public.wallet_transactions (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'delivered', 'accepted', 'failed', 'blocked_duplicate')),
  note text,
  delivered_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint border_gifts_no_self check (sender_user_id <> recipient_user_id)
);

create index idx_border_gifts_sender on public.border_gifts (sender_user_id);
create index idx_border_gifts_recipient on public.border_gifts (recipient_user_id);
create index idx_border_gifts_status on public.border_gifts (status);

-- -----------------------------------------------------------------------------
-- creator_gifts
-- -----------------------------------------------------------------------------
create table public.creator_gifts (
  id uuid primary key default gen_random_uuid(),
  gift_item_id uuid not null references public.shop_items (id) on delete restrict,
  sender_user_id uuid not null references public.profiles (id) on delete cascade,
  creator_user_id uuid not null references public.profiles (id) on delete cascade,
  context_type text not null check (context_type in ('live', 'post', 'profile')),
  context_id uuid,
  sparks_spent integer not null check (sparks_spent > 0),
  diamonds_earned integer not null check (diamonds_earned >= 0),
  sender_wallet_txn_id uuid references public.wallet_transactions (id) on delete set null,
  creator_wallet_txn_id uuid references public.wallet_transactions (id) on delete set null,
  status text not null default 'posted' check (status in ('pending', 'posted', 'reversed', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  constraint creator_gifts_no_self check (sender_user_id <> creator_user_id)
);

create index idx_creator_gifts_sender on public.creator_gifts (sender_user_id, created_at desc);
create index idx_creator_gifts_creator on public.creator_gifts (creator_user_id, created_at desc);
create index idx_creator_gifts_ctx on public.creator_gifts (context_type);

-- -----------------------------------------------------------------------------
-- purchase_receipts
-- -----------------------------------------------------------------------------
create table public.purchase_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  store_product_id text not null,
  external_transaction_id text not null,
  shop_item_id uuid references public.shop_items (id) on delete set null,
  receipt_payload jsonb not null default '{}'::jsonb,
  validation_status text not null default 'pending'
    check (validation_status in ('pending', 'valid', 'invalid', 'refunded')),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (platform, external_transaction_id)
);

create index idx_purchase_receipts_user on public.purchase_receipts (user_id, created_at desc);
create index idx_purchase_receipts_validation on public.purchase_receipts (validation_status);

-- -----------------------------------------------------------------------------
-- user_notifications (economy feed — separate from legacy public.notifications)
-- -----------------------------------------------------------------------------
create table public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null
    check (type in (
      'border_gift_received', 'border_gift_sent', 'border_purchase_success',
      'sparks_purchase_success', 'gift_sent', 'diamonds_earned', 'low_balance'
    )),
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_user_notifications_user on public.user_notifications (user_id, created_at desc);
create index idx_user_notifications_unread on public.user_notifications (user_id, is_read);

-- -----------------------------------------------------------------------------
-- Auto-create spark wallet on new profile
-- -----------------------------------------------------------------------------
create or replace function public.economy_profile_init_wallets()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.spark_wallets (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  if coalesce(new.is_creator, false) then
    insert into public.diamond_wallets (creator_id)
    values (new.id)
    on conflict (creator_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_economy_wallets on public.profiles;
create trigger trg_profiles_economy_wallets
  after insert on public.profiles
  for each row
  execute function public.economy_profile_init_wallets();
