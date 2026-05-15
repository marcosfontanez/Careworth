-- Border inventory health check (READ-ONLY)
--
-- What this is:
--   A set of small SELECT queries you can paste into the Supabase SQL editor
--   to verify that the border-inventory data is clean. None of these statements
--   write to the database.
--
-- When to run:
--   Any time someone reports "I see duplicates in my border collection" — this
--   tells you whether the duplicates are real (two `user_inventory` rows for
--   the same shop item) or a UI representation issue (one shop row + one
--   mirrored `user_pulse_avatar_frames` row, which the client now dedupes).
--
-- How to run it (Marco — step-by-step):
--   1. In your browser, open Supabase dashboard for the PulseVerse project.
--   2. In the left sidebar, click **SQL Editor**.
--   3. Click **New query** (top right).
--   4. Copy ONE of the numbered blocks below into the editor and click **Run**.
--      Run them one at a time — they're independent.
--   5. The result table appears below the editor. Each block tells you what a
--      good ("clean") result looks like.

-- ============================================================================
-- 1. Schema sanity — is the unique constraint that prevents true duplicates
--    actually present in production?
--    Expected: returns exactly TWO rows (`user_inventory_user_id_shop_item_id_key`
--    and `user_inventory_one_equipped_border`).
--    If it returns 0 or 1 rows, the constraint was dropped somewhere — stop and
--    let the engineer know before continuing.
-- ============================================================================
select
  c.conname as constraint_name,
  pg_get_constraintdef(c.oid) as definition
from pg_constraint c
join pg_class t on t.oid = c.conrelid
where t.relname = 'user_inventory'
  and c.contype = 'u'
union all
select
  i.indexname as constraint_name,
  i.indexdef as definition
from pg_indexes i
where i.tablename = 'user_inventory'
  and i.indexname = 'user_inventory_one_equipped_border';

-- ============================================================================
-- 2. Are there any TRUE duplicate inventory rows for the same user + shop_item?
--    Expected: ZERO rows. If anything comes back, those rows shouldn't exist
--    (the unique constraint should have blocked them) — flag the engineer.
-- ============================================================================
select
  user_id,
  shop_item_id,
  count(*) as row_count
from public.user_inventory
where item_kind = 'border'
group by user_id, shop_item_id
having count(*) > 1
order by row_count desc;

-- ============================================================================
-- 3. Does any user have more than one shop border marked `is_equipped = true`?
--    Expected: ZERO rows. The partial unique index should prevent this.
--    If any row appears, the user will see two "Equipped" pills — fix by
--    setting the older `is_equipped` to false (the engineer should do this
--    in a quick admin script, not by hand).
-- ============================================================================
select
  user_id,
  count(*) as equipped_count
from public.user_inventory
where item_kind = 'border'
  and is_equipped = true
group by user_id
having count(*) > 1
order by equipped_count desc;

-- ============================================================================
-- 4. Find borders that are mirrored into both tables for a given user.
--    This is NOT a bug — it's how the system is designed. The client now
--    deduplicates these rows in the Border Vault. Use this query to confirm
--    a particular user's "duplicate" sightings line up with the mirroring
--    pattern (which means the new client dedupe will fix what they're seeing).
--
--    Replace `<USER_ID>` with the user's auth.users.id (UUID).
-- ============================================================================
with shop_borders as (
  select
    ui.shop_item_id,
    si.name as shop_name,
    si.slug as shop_slug,
    coalesce(
      nullif(trim(si.metadata ->> 'pulse_frame_slug'), ''),
      case lower(si.slug)
        when 'border-pride-month-2026' then 'pride-month-2026-border'
        when 'border_pride_month_2026' then 'pride-month-2026-border'
        when 'border_beta_pioneer'     then 'beta-tester-border'
        when 'beta-pioneer'            then 'beta-tester-border'
        when 'border-mothers-day-2026' then 'mothers-day-2026-border'
        when 'border_mothers_day_2026' then 'mothers-day-2026-border'
        else null
      end
    ) as resolved_frame_slug
  from public.user_inventory ui
  join public.shop_items si on si.id = ui.shop_item_id
  where ui.user_id = '<USER_ID>'::uuid
    and ui.item_kind = 'border'
)
select
  sb.shop_name,
  sb.shop_slug,
  paf.label    as pulse_frame_label,
  paf.slug     as pulse_frame_slug,
  upaf.grant_source
from shop_borders sb
join public.pulse_avatar_frames paf on paf.slug = sb.resolved_frame_slug
join public.user_pulse_avatar_frames upaf
  on upaf.frame_id = paf.id
  and upaf.user_id = '<USER_ID>'::uuid
order by sb.shop_name;

-- ============================================================================
-- 5. Optional cleanup: list any pulse-frame unlocks for the user that are
--    *not* mirrored from a shop border. These should always be true earned
--    prizes (leaderboard rank, campaign reward, etc.).
--
--    Replace `<USER_ID>`.
-- ============================================================================
select
  paf.label,
  paf.slug,
  upaf.grant_source,
  upaf.granted_at,
  upaf.leaderboard_rank
from public.user_pulse_avatar_frames upaf
join public.pulse_avatar_frames paf on paf.id = upaf.frame_id
where upaf.user_id = '<USER_ID>'::uuid
  and upaf.grant_source <> 'shop'
order by upaf.granted_at desc;
