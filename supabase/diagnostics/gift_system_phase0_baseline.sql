-- Gift system — Phase 0 baseline checks (READ-ONLY)
--
-- Use after migrations are applied. Paste blocks one at a time into Supabase
-- **SQL Editor** → **New query** → **Run**.
--
-- Marco — steps:
--   1. Supabase dashboard → your PulseVerse project.
--   2. Left sidebar → **SQL Editor** → **New query**.
--   3. Copy a single block below (between the === lines), **Run**.
--   4. Compare results to the “Expected” note under each block.

-- ============================================================================
-- 1) Core RPCs & trigger functions exist (public schema)
--    Expected: 6 rows — economy_send_creator_gift, economy_send_live_stream_gift,
--    reward_deliveries_list_pending, _economy_sparks_to_diamonds,
--    reward_delivery_enqueue_on_creator_gift, reward_delivery_enqueue_on_stream_gift
-- ============================================================================
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'economy_send_creator_gift',
    'economy_send_live_stream_gift',
    'reward_deliveries_list_pending',
    '_economy_sparks_to_diamonds',
    'reward_delivery_enqueue_on_creator_gift',
    'reward_delivery_enqueue_on_stream_gift'
  )
order by p.proname;

-- ============================================================================
-- 2) Reward-delivery triggers on creator_gifts / stream_gifts
--    Expected: 2 rows — trg_creator_gifts_reward_delivery on creator_gifts,
--              trg_stream_gifts_reward_delivery on stream_gifts
-- ============================================================================
select t.tgname as trigger_name,
       c.relname as table_name
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and not t.tgisinternal
  and t.tgname in (
    'trg_creator_gifts_reward_delivery',
    'trg_stream_gifts_reward_delivery'
  )
order by c.relname, t.tgname;

-- ============================================================================
-- 3) Active shop gifts (Sparks creator catalog)
--    Expected: at least the seeded ladder (e.g. pulse, coffee-drop, halo, crown + high tiers).
--    Adjust threshold if you intentionally retire gifts.
-- ============================================================================
select slug,
       name,
       spark_price,
       gift_contexts,
       is_active
from public.shop_items
where type = 'gift'
order by coalesce(sort_order, 999), slug;

-- ============================================================================
-- 4) Live sticker catalog (server pricing source for GiftPicker RPC)
--    Expected: rows for ids used in services/live/gifts.ts (heart, clap, …).
-- ============================================================================
select gift_id,
       display_name,
       spark_unit_cost,
       emoji,
       is_active
from public.live_stream_gift_catalog
order by sort_order, gift_id;

-- ============================================================================
-- 5) Diamond conversion setting (optional — default formula applies if null)
--    Expected: either no row or json with sparks/diamonds ratio per migration 121.
-- ============================================================================
select key,
       value
from public.economy_settings
where key = 'sparks_to_diamonds_ratio';
