-- Migration 053 · Hard-cap My Pulse at 5 rows per user
--
-- The client has always shown at most 5 updates on a user's My Pulse page
-- (`profile_updates_db.listForUser(5)`), but the DB kept every row ever
-- posted. That produced a confusing bug:
--
--   1. User has 8 updates in the table; the newest 5 render on My Pulse.
--   2. User deletes one of the visible 5.
--   3. The "top 5" query now includes what WAS the 6th-newest row — so a
--      months-old post suddenly reappears and the user can't actually
--      remove it permanently.
--
-- Product rule (confirmed with product):
--   - A user's profile_updates table stores at most 5 rows total.
--   - Inserting a 6th row evicts the OLDEST UNPINNED row, permanently.
--   - The pinned row (enforced by migration 050's partial unique index) is
--     never evicted; it counts toward the 5 and sits at the top.
--   - Deleting a visible row leaves a gap that is NOT filled by
--     resurrecting some older row — because no older rows exist anymore.
--
-- Implementation: an AFTER INSERT trigger trims to 5. We do this on the
-- server (not the client) so every write path is covered — composer,
-- ShareToMyPulseButton, "also share to my pulse" from the community
-- composer, and any future share source — without each call site having
-- to remember to prune.

-- ─── Trim helper + trigger ───────────────────────────────────────────
create or replace function public.trim_profile_updates_to_five()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_keep_ids uuid[];
begin
  -- Compute the IDs the user gets to keep: pinned row first (there can
  -- only ever be one, enforced by migration 050's partial unique index),
  -- then the newest unpinned rows, capped at 5 total. Doing this as a
  -- subquery means we select the keep-set using the SAME ordering the
  -- client uses in `profileUpdatesDb.listForUser`, so "visible on My
  -- Pulse" and "still in the table" stay in lockstep.
  select coalesce(array_agg(id), array[]::uuid[])
    into v_keep_ids
    from (
      select id
        from public.profile_updates
       where user_id = NEW.user_id
       order by is_pinned desc, created_at desc
       limit 5
    ) keep;

  -- Evict everything outside the keep-set for this user. We also guard
  -- with `is_pinned = false` as a belt-and-suspenders check in case a
  -- pinned row ever slips out of the top-5 ordering due to a clock
  -- anomaly — we'd rather keep an extra pinned row than delete one.
  delete from public.profile_updates
   where user_id = NEW.user_id
     and is_pinned = false
     and id <> all(v_keep_ids);

  return NEW;
end;
$$;

-- Drop+recreate so re-running the migration is idempotent (Postgres has
-- no `create or replace trigger` until PG14 and we target broader
-- compatibility with Supabase's managed versions).
drop trigger if exists profile_updates_trim_to_five on public.profile_updates;

create trigger profile_updates_trim_to_five
  after insert on public.profile_updates
  for each row
  execute function public.trim_profile_updates_to_five();

-- ─── Backfill: evict existing overflow for every user ────────────────
-- Before this migration it was possible to accumulate any number of
-- profile_updates per user. Run the same keep-5 rule once so the table
-- reflects the new invariant immediately; otherwise the "resurrecting
-- old posts" bug would persist for existing users until they each
-- happened to insert a new row.
with ranked as (
  select
    id,
    is_pinned,
    row_number() over (
      partition by user_id
      order by is_pinned desc, created_at desc
    ) as rn
  from public.profile_updates
)
delete from public.profile_updates pu
 using ranked
 where pu.id = ranked.id
   and ranked.rn > 5
   and ranked.is_pinned = false;
