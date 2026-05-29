-- ============================================================================
-- 214: Clip gift attribution + configurable revenue split tracking.
-- Records lineage when gifting a clipped post; does NOT split diamond payout
-- until payout_mode = split_diamonds (default track_only).
-- ============================================================================

insert into public.economy_settings (key, value, description)
values (
  'clip_gift_split',
  jsonb_build_object(
    'publisher_bps', 7000,
    'original_creator_bps', 3000,
    'payout_mode', 'track_only'
  ),
  'Feed clip gift split: basis points (10000 = 100%). track_only = ledger only; split_diamonds = future payout.'
)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- clip_gift_attributions — one row per creator_gift on a clipped post
-- ---------------------------------------------------------------------------
create table if not exists public.clip_gift_attributions (
  id uuid primary key default gen_random_uuid(),
  creator_gift_id uuid not null unique references public.creator_gifts (id) on delete cascade,
  clipped_post_id uuid references public.posts (id) on delete set null,
  clip_publisher_id uuid not null references public.profiles (id) on delete set null,
  source_post_id uuid references public.posts (id) on delete set null,
  original_creator_id uuid references public.profiles (id) on delete set null,
  source_live_stream_id uuid references public.live_streams (id) on delete set null,
  sparks_spent integer not null check (sparks_spent > 0),
  diamonds_earned_total integer not null check (diamonds_earned_total >= 0),
  publisher_share_bps integer not null check (publisher_share_bps >= 0 and publisher_share_bps <= 10000),
  original_creator_share_bps integer not null check (
    original_creator_share_bps >= 0 and original_creator_share_bps <= 10000
  ),
  publisher_diamonds_attributed integer not null check (publisher_diamonds_attributed >= 0),
  original_creator_diamonds_attributed integer not null check (original_creator_diamonds_attributed >= 0),
  split_status text not null default 'tracked'
    check (split_status in ('tracked', 'pending_payout', 'paid', 'skipped_no_original', 'skipped_own_clip')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists clip_gift_attr_publisher_idx
  on public.clip_gift_attributions (clip_publisher_id, created_at desc);

create index if not exists clip_gift_attr_original_idx
  on public.clip_gift_attributions (original_creator_id, created_at desc)
  where original_creator_id is not null;

create index if not exists clip_gift_attr_source_post_idx
  on public.clip_gift_attributions (source_post_id)
  where source_post_id is not null;

comment on table public.clip_gift_attributions is
  'Tracks clip lineage + attributed diamond split when a gift is sent on a clipped feed post.';

alter table public.clip_gift_attributions enable row level security;

drop policy if exists clip_gift_attr_read_publisher on public.clip_gift_attributions;
create policy clip_gift_attr_read_publisher
  on public.clip_gift_attributions for select
  using (auth.uid() = clip_publisher_id);

drop policy if exists clip_gift_attr_read_original on public.clip_gift_attributions;
create policy clip_gift_attr_read_original
  on public.clip_gift_attributions for select
  using (auth.uid() = original_creator_id);

-- ---------------------------------------------------------------------------
-- Config + attribution recorder (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
create or replace function public._economy_clip_gift_split_config()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
  v_pub int;
  v_orig int;
begin
  v := public._economy_setting_json('clip_gift_split');
  if v is null then
    return jsonb_build_object(
      'publisher_bps', 7000,
      'original_creator_bps', 3000,
      'payout_mode', 'track_only'
    );
  end if;
  v_pub := coalesce((v->>'publisher_bps')::int, 7000);
  v_orig := coalesce((v->>'original_creator_bps')::int, 3000);
  return jsonb_build_object(
    'publisher_bps', greatest(0, least(10000, v_pub)),
    'original_creator_bps', greatest(0, least(10000, v_orig)),
    'payout_mode', coalesce(nullif(trim(v->>'payout_mode'), ''), 'track_only')
  );
end;
$$;

create or replace function public._record_clip_gift_attribution(
  p_creator_gift_id uuid,
  p_context_type text,
  p_context_id uuid,
  p_clip_publisher_id uuid,
  p_sparks_spent integer,
  p_diamonds_earned integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_post_id uuid;
  v_source_creator_id uuid;
  v_source_live_stream_id uuid;
  v_original_creator_id uuid;
  v_cfg jsonb;
  v_pub_bps int;
  v_orig_bps int;
  v_mode text;
  v_pub_diamonds int;
  v_orig_diamonds int;
  v_status text;
begin
  if p_context_type is distinct from 'post' or p_context_id is null then
    return;
  end if;

  select
    p.source_post_id,
    p.source_creator_id,
    p.source_live_stream_id
  into v_source_post_id, v_source_creator_id, v_source_live_stream_id
  from public.posts p
  where p.id = p_context_id;

  if v_source_post_id is null
     and v_source_creator_id is null
     and v_source_live_stream_id is null then
    return;
  end if;

  v_original_creator_id := v_source_creator_id;
  if v_original_creator_id is null and v_source_post_id is not null then
    select sp.creator_id into v_original_creator_id
    from public.posts sp
    where sp.id = v_source_post_id;
  end if;

  v_cfg := public._economy_clip_gift_split_config();
  v_pub_bps := coalesce((v_cfg->>'publisher_bps')::int, 7000);
  v_orig_bps := coalesce((v_cfg->>'original_creator_bps')::int, 3000);
  v_mode := coalesce(v_cfg->>'payout_mode', 'track_only');

  v_pub_diamonds := floor(greatest(p_diamonds_earned, 0) * v_pub_bps / 10000.0);
  v_orig_diamonds := floor(greatest(p_diamonds_earned, 0) * v_orig_bps / 10000.0);

  if v_original_creator_id is null then
    v_status := 'skipped_no_original';
    v_pub_diamonds := greatest(p_diamonds_earned, 0);
    v_orig_diamonds := 0;
  elsif v_original_creator_id = p_clip_publisher_id then
    v_status := 'skipped_own_clip';
    v_pub_diamonds := greatest(p_diamonds_earned, 0);
    v_orig_diamonds := 0;
  elsif v_mode = 'split_diamonds' then
    v_status := 'pending_payout';
  else
    v_status := 'tracked';
  end if;

  insert into public.clip_gift_attributions (
    creator_gift_id,
    clipped_post_id,
    clip_publisher_id,
    source_post_id,
    original_creator_id,
    source_live_stream_id,
    sparks_spent,
    diamonds_earned_total,
    publisher_share_bps,
    original_creator_share_bps,
    publisher_diamonds_attributed,
    original_creator_diamonds_attributed,
    split_status,
    metadata
  )
  values (
    p_creator_gift_id,
    p_context_id,
    p_clip_publisher_id,
    v_source_post_id,
    v_original_creator_id,
    v_source_live_stream_id,
    p_sparks_spent,
    greatest(p_diamonds_earned, 0),
    v_pub_bps,
    v_orig_bps,
    v_pub_diamonds,
    v_orig_diamonds,
    v_status,
    jsonb_build_object('payout_mode', v_mode)
  )
  on conflict (creator_gift_id) do nothing;
end;
$$;

-- Creator-facing rollup for future earnings UI (MVP: query-only RPC).
create or replace function public.get_clip_gift_earnings_snapshot(p_creator_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from p_creator_id and not public._economy_is_admin() then
    raise exception 'not_allowed';
  end if;

  return jsonb_build_object(
    'as_clip_publisher', jsonb_build_object(
      'gift_count', coalesce((
        select count(*)::int from public.clip_gift_attributions c
        where c.clip_publisher_id = p_creator_id
      ), 0),
      'diamonds_attributed', coalesce((
        select sum(c.publisher_diamonds_attributed)::bigint from public.clip_gift_attributions c
        where c.clip_publisher_id = p_creator_id
      ), 0)
    ),
    'as_original_creator', jsonb_build_object(
      'gift_count', coalesce((
        select count(*)::int from public.clip_gift_attributions c
        where c.original_creator_id = p_creator_id
      ), 0),
      'diamonds_attributed', coalesce((
        select sum(c.original_creator_diamonds_attributed)::bigint from public.clip_gift_attributions c
        where c.original_creator_id = p_creator_id
      ), 0)
    )
  );
end;
$$;

grant execute on function public.get_clip_gift_earnings_snapshot(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- economy_send_creator_gift — record clip attribution after gift insert
-- ---------------------------------------------------------------------------
create or replace function public.economy_send_creator_gift(
  p_creator_user_id uuid,
  p_gift_item_id uuid,
  p_context_type text,
  p_context_id uuid,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  it public.shop_items%rowtype;
  v_price int;
  v_diamonds int;
  v_spark_txn text;
  v_dia_txn text;
  v_sid uuid;
  v_cid uuid;
  v_hold int;
  v_release timestamptz;
  v_spark_type text;
  v_dia_type text;
  v_row_id uuid;
  v_owner uuid;
  v_live_status text;
begin
  if v_sender is null then
    raise exception 'not_allowed';
  end if;

  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'not_allowed';
  end if;

  if v_sender = p_creator_user_id then
    raise exception 'self_gift_not_allowed';
  end if;

  if p_context_type is null
     or p_context_type not in ('live', 'post', 'profile') then
    raise exception 'invalid_gift_context'
      using message = 'Unsupported gift context type.';
  end if;

  if not exists (
    select 1 from public.profiles p where p.id = p_creator_user_id
  ) then
    raise exception 'invalid_recipient'
      using message = 'Creator profile not found.';
  end if;

  if p_context_type = 'profile' then
    if p_context_id is null or p_context_id <> p_creator_user_id then
      raise exception 'invalid_gift_context'
        using message = 'Profile gifts must reference the creator profile.';
    end if;
  elsif p_context_type = 'post' then
    if p_context_id is null then
      raise exception 'invalid_gift_context'
        using message = 'Post gifts require a valid post id.';
    end if;
    select p.creator_id into v_owner
    from public.posts p
    where p.id = p_context_id;
    if not found then
      raise exception 'invalid_gift_context'
        using message = 'Gift post was not found.';
    end if;
    if v_owner is distinct from p_creator_user_id then
      raise exception 'invalid_gift_context'
        using message = 'Gift post does not belong to this creator.';
    end if;
  elsif p_context_type = 'live' then
    if p_context_id is null then
      raise exception 'invalid_gift_context'
        using message = 'Live gifts require a valid stream id.';
    end if;
    select ls.host_id, ls.status into v_owner, v_live_status
    from public.live_streams ls
    where ls.id = p_context_id;
    if not found then
      raise exception 'invalid_gift_context'
        using message = 'Gift live stream was not found.';
    end if;
    if v_owner is distinct from p_creator_user_id then
      raise exception 'invalid_gift_context'
        using message = 'Gift live stream does not belong to this creator.';
    end if;
    if coalesce(v_live_status, '') = 'ended' then
      raise exception 'invalid_gift_context'
        using message = 'Cannot gift on an ended live stream.';
    end if;
  end if;

  select id into v_row_id
  from public.creator_gifts cg
  where cg.idempotency_key = p_idempotency_key;
  if v_row_id is not null then
    return v_row_id;
  end if;

  select * into it from public.shop_items si where si.id = p_gift_item_id;
  if not found or it.type is distinct from 'gift' then
    raise exception 'item_not_active';
  end if;

  if not it.is_active then
    raise exception 'item_not_active';
  end if;

  if not (p_context_type::text = any (coalesce(it.gift_contexts, array[]::text[]))) then
    raise exception 'item_not_active';
  end if;

  v_price := it.spark_price;
  if v_price is null or v_price <= 0 then
    raise exception 'item_not_active';
  end if;

  v_diamonds := public._economy_sparks_to_diamonds(v_price);
  v_hold := public._economy_diamond_hold_days();
  v_release := case
    when v_hold > 0 then now() + make_interval(days => v_hold)
    else null
  end;

  v_spark_type := case p_context_type
    when 'live' then 'spark_debit_gift_live'
    when 'post' then 'spark_debit_gift_post'
    else 'spark_debit_gift_profile'
  end;

  v_dia_type := case p_context_type
    when 'live' then 'diamond_earn_live'
    when 'post' then 'diamond_earn_post'
    else 'diamond_earn_profile'
  end;

  v_spark_txn := p_idempotency_key || ':spark';
  v_dia_txn := p_idempotency_key || ':diamond';

  insert into public.wallet_transactions (
    user_id, wallet_type, transaction_type, direction, amount, status,
    source_type, source_id, idempotency_key,
    metadata
  )
  values (
    v_sender,
    'sparks',
    v_spark_type,
    'debit',
    v_price::bigint,
    'posted',
    'shop_item',
    p_gift_item_id,
    v_spark_txn,
    jsonb_build_object(
      'creator_user_id', p_creator_user_id,
      'context_type', p_context_type,
      'context_id', p_context_id
    )
  )
  returning id into v_sid;

  insert into public.wallet_transactions (
    creator_id, wallet_type, transaction_type, direction, amount, status,
    source_type, source_id, reserve_release_at, idempotency_key,
    metadata
  )
  values (
    p_creator_user_id,
    'diamonds',
    v_dia_type,
    'credit',
    greatest(v_diamonds, 0)::bigint,
    'posted',
    'shop_item',
    p_gift_item_id,
    v_release,
    v_dia_txn,
    jsonb_build_object(
      'sender_user_id', v_sender,
      'sparks_spent', v_price,
      'context_type', p_context_type,
      'context_id', p_context_id
    )
  )
  returning id into v_cid;

  insert into public.creator_gifts (
    gift_item_id, sender_user_id, creator_user_id, context_type, context_id,
    sparks_spent, diamonds_earned, sender_wallet_txn_id, creator_wallet_txn_id,
    status, idempotency_key
  )
  values (
    p_gift_item_id, v_sender, p_creator_user_id, p_context_type, p_context_id,
    v_price, greatest(v_diamonds, 0), v_sid, v_cid,
    'posted', p_idempotency_key
  )
  returning id into v_row_id;

  perform public._record_clip_gift_attribution(
    v_row_id,
    p_context_type,
    p_context_id,
    p_creator_user_id,
    v_price,
    greatest(v_diamonds, 0)
  );

  perform public._economy_user_notify(
    p_creator_user_id,
    'diamonds_earned',
    'You earned Diamonds',
    format('+%s Diamonds from a gift', greatest(v_diamonds, 0)),
    jsonb_build_object('creator_gift_id', v_row_id, 'spark_tx', v_sid)
  );

  return v_row_id;
exception
  when unique_violation then
    select cg.id into v_row_id from public.creator_gifts cg where cg.idempotency_key = p_idempotency_key;
    if v_row_id is null then
      raise;
    end if;
    return v_row_id;
end;
$$;

comment on function public.economy_send_creator_gift(uuid, uuid, text, uuid, text) is
  'Atomic creator gift: validates context, debits Sparks, credits clip publisher Diamonds, records clip split attribution when applicable.';
