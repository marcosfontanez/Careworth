-- Migration 050 · My Pulse pinning
--
-- Lets a user pin exactly ONE of their profile_updates to the top of their
-- My Pulse. Requirements distilled from product:
--   1. Pinned item sits above everything else on My Pulse, permanently,
--      until the owner unpins (or deletes) it.
--   2. At most one row per user may be pinned at a time. We enforce this
--      at the database layer with a partial unique index so there's no way
--      to slip a second pin through a race between client calls.
--   3. The existing "show the latest 5" rule keeps applying to the OTHER
--      four slots — we don't carve pinned rows out of that budget. The
--      client simply orders `is_pinned desc, created_at desc` and slices
--      the top 5, which means the pinned row is always visible and the
--      remaining slots roll forward as new updates come in.
--   4. Only the owner may pin/unpin their own rows. Existing RLS on
--      `profile_updates` already restricts UPDATE to `auth.uid() = user_id`
--      so no new policy is needed for the column; the RPC below is
--      SECURITY DEFINER but still checks the caller's identity.

-- ─── Column ──────────────────────────────────────────────────────────
alter table public.profile_updates
  add column if not exists is_pinned boolean not null default false;

-- ─── "At most one pin per user" guarantee ────────────────────────────
-- Partial unique index: only rows where is_pinned is true participate,
-- so free rows don't collide with each other. This is the canonical
-- Postgres pattern for "only one active X per user" and is race-safe.
create unique index if not exists profile_updates_one_pin_per_user
  on public.profile_updates(user_id)
  where is_pinned;

-- Helpful covering index for the new ORDER BY on the listing query.
create index if not exists profile_updates_user_pin_created
  on public.profile_updates(user_id, is_pinned desc, created_at desc);

-- ─── RPC: pin_profile_update ─────────────────────────────────────────
-- Atomically unpins any currently pinned row for the caller and pins the
-- target row. Wrapping both steps in a single function is important:
--   - If we did it from two separate client calls, a crash between them
--     could leave the user with zero pins even though they wanted one.
--   - It also sidesteps the partial unique index — if we tried to INSERT
--     the new pin before clearing the old one, the index would raise a
--     violation. Doing the clear-first/set-second inside a function on
--     the server guarantees the order.
create or replace function public.pin_profile_update(p_update_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  -- Confirm the caller owns the row they're trying to pin. We fetch the
  -- owner from the row itself rather than trusting any parameter.
  select user_id into v_user
    from public.profile_updates
   where id = p_update_id;

  if v_user is null then
    raise exception 'profile update not found';
  end if;

  if v_user <> auth.uid() then
    raise exception 'cannot pin another user''s profile update';
  end if;

  -- Clear any existing pin for this user first. The unique partial index
  -- means there can be at most one row to update, but we scope by user
  -- defensively so the query plan is identical whether 0 or 1 rows match.
  update public.profile_updates
     set is_pinned = false
   where user_id = v_user
     and is_pinned = true
     and id <> p_update_id;

  -- Promote the chosen row. Done last so we never violate the partial
  -- unique index mid-transaction.
  update public.profile_updates
     set is_pinned = true
   where id = p_update_id;
end;
$$;

-- ─── RPC: unpin_profile_update ───────────────────────────────────────
-- Small convenience so the client can unpin with the same security
-- envelope (identity check + definer context) it used to pin.
create or replace function public.unpin_profile_update(p_update_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select user_id into v_user
    from public.profile_updates
   where id = p_update_id;

  if v_user is null then
    raise exception 'profile update not found';
  end if;

  if v_user <> auth.uid() then
    raise exception 'cannot unpin another user''s profile update';
  end if;

  update public.profile_updates
     set is_pinned = false
   where id = p_update_id;
end;
$$;

-- Grant execute to authenticated users — both functions still verify
-- ownership internally, so this is safe.
grant execute on function public.pin_profile_update(uuid) to authenticated;
grant execute on function public.unpin_profile_update(uuid) to authenticated;
