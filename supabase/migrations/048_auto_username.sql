-- 048 — Auto-generate a unique @handle for every account.
--
-- Background: before this migration, `profiles.username` was optional and only
-- populated if the user manually claimed one under Edit Profile. The UI
-- fell back to a client-side "first.last" string for display, which meant
-- @mentions, notifications, and /profile/u/<handle> deep links silently did
-- not work for the vast majority of accounts.
--
-- This migration:
--   1. Adds deterministic helpers for slugifying seed text into a valid
--      username (lowercase, a-z0-9._ only, 3–30 chars, no leading/trailing
--      dots, no consecutive dots) and for producing a unique handle by
--      appending numeric suffixes until the collision space is exhausted.
--   2. Rewires `handle_new_user()` so every NEW signup gets `username`
--      populated automatically (first_name.last_name → email local-part →
--      user.<shortid>).
--   3. Backfills every EXISTING row where username is null/empty using the
--      same preference order. No one is ever left without a real handle.
--   4. Adds a CHECK constraint matching the client-side validator so the
--      DB is the single source of truth on the grammar of a handle.
--   5. Exposes `check_username_available(candidate text)` as a lightweight
--      RPC the Edit Profile screen can debounce against.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Collapse raw text to a handle candidate: lowercase, strip accents to the
-- best of the built-in ability, keep only [a-z0-9._], collapse runs of dots,
-- trim edge dots, and clamp to 30 chars. Returns NULL when the candidate
-- could not be made valid (<3 chars after cleaning).
create or replace function public.slugify_username(seed text)
returns text
language plpgsql
immutable
as $$
declare
  s text;
begin
  if seed is null then return null; end if;
  s := lower(trim(seed));
  -- Replace whitespace runs with a dot; we treat "Marco Fontanez" → "marco.fontanez".
  s := regexp_replace(s, '\s+', '.', 'g');
  -- Drop anything outside a-z 0-9 dot underscore.
  s := regexp_replace(s, '[^a-z0-9._]+', '', 'g');
  -- Collapse consecutive dots.
  s := regexp_replace(s, '\.{2,}', '.', 'g');
  -- Strip edge dots/underscores.
  s := regexp_replace(s, '^[._]+', '');
  s := regexp_replace(s, '[._]+$', '');
  if s is null or length(s) < 3 then return null; end if;
  return substring(s from 1 for 30);
end;
$$;

comment on function public.slugify_username(text) is
  'Normalizes raw text into a valid @handle candidate. Returns NULL when the seed cannot produce a 3+ char handle.';

-- Check if a fully-formed handle is structurally valid.
create or replace function public.is_valid_username(s text)
returns boolean
language plpgsql
immutable
as $$
begin
  if s is null then return false; end if;
  if length(s) < 3 or length(s) > 30 then return false; end if;
  if s ~ '\.\.' then return false; end if;
  if s !~ '^[a-z0-9]([a-z0-9._]*[a-z0-9])?$' then return false; end if;
  return true;
end;
$$;

comment on function public.is_valid_username(text) is
  '3–30 chars, lowercase, a-z 0-9 . _ only, cannot start/end with dot/underscore, no consecutive dots.';

-- Return a handle that is guaranteed unique right now. Strategy:
--   1. Slugify the preferred seed.
--   2. If empty → fallback seed "user.<6 chars of uuid>".
--   3. If base is available, return it.
--   4. Otherwise append 2, 3, 4… up to a cap. On exhaustion, return a random
--      6-char suffix. We bias toward short human-friendly suffixes first.
create or replace function public.generate_unique_username(
  preferred_seed text,
  fallback_seed  text default null
)
returns text
language plpgsql
as $$
declare
  base      text;
  candidate text;
  attempt   int := 1;
  max_base  int;
  rand_suf  text;
begin
  base := public.slugify_username(preferred_seed);
  if base is null then
    base := public.slugify_username(fallback_seed);
  end if;
  if base is null then
    base := 'user.' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  end if;

  -- Ensure we leave room for up to a 4-digit numeric suffix when the base is long.
  max_base := 30 - 4;
  if length(base) > max_base then
    base := substring(base from 1 for max_base);
    -- Ensure no trailing dot/underscore after trim.
    base := regexp_replace(base, '[._]+$', '');
    if length(base) < 3 then
      base := 'user' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);
    end if;
  end if;

  candidate := base;
  loop
    if not exists (select 1 from public.profiles where username = candidate) then
      return candidate;
    end if;
    attempt := attempt + 1;
    if attempt > 9999 then
      exit;
    end if;
    candidate := base || attempt::text;
  end loop;

  -- Ludicrously unlikely fallback: append a 6-char random suffix.
  loop
    rand_suf := substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
    candidate := base || rand_suf;
    exit when not exists (select 1 from public.profiles where username = candidate);
  end loop;

  return candidate;
end;
$$;

comment on function public.generate_unique_username(text, text) is
  'Returns a structurally valid, DB-unique @handle by slugifying the preferred seed and appending numeric suffixes on collision.';

-- Lightweight RPC for the Edit Profile availability check. Not security
-- definer — clients are already allowed to SELECT from profiles via RLS.
create or replace function public.check_username_available(candidate text)
returns boolean
language plpgsql
stable
as $$
declare
  c text;
begin
  c := lower(trim(coalesce(candidate, '')));
  if not public.is_valid_username(c) then
    return false;
  end if;
  return not exists (select 1 from public.profiles where username = c);
end;
$$;

grant execute on function public.check_username_available(text) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Backfill existing profiles
-- ---------------------------------------------------------------------------
-- For every profile whose username is null/empty, generate one from:
--   preferred = first_name.last_name
--   fallback  = display_name
do $$
declare
  r record;
  seed text;
  fb   text;
  new_handle text;
begin
  for r in
    select id, first_name, last_name, display_name
      from public.profiles
     where username is null or length(trim(username)) = 0
     order by created_at asc
  loop
    seed := trim(coalesce(r.first_name, '') || ' ' || coalesce(r.last_name, ''));
    fb   := r.display_name;
    new_handle := public.generate_unique_username(seed, fb);
    update public.profiles
       set username = new_handle,
           updated_at = now()
     where id = r.id;
  end loop;
end$$;

-- ---------------------------------------------------------------------------
-- Tighten the column — enforce shape at the DB boundary.
-- Done AFTER the backfill so existing rows never violate the check.
-- ---------------------------------------------------------------------------
alter table public.profiles
  drop constraint if exists profiles_username_shape_chk;

alter table public.profiles
  add constraint profiles_username_shape_chk
    check (username is null or public.is_valid_username(username));

-- ---------------------------------------------------------------------------
-- Replace handle_new_user() so future signups always get a unique username.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full   text;
  v_first  text;
  v_last   text;
  v_email  text;
  v_seed   text;
  v_fb     text;
  v_handle text;
begin
  v_full  := coalesce(new.raw_user_meta_data->>'full_name', new.email);
  v_first := coalesce(
    new.raw_user_meta_data->>'first_name',
    split_part(coalesce(new.raw_user_meta_data->>'full_name', new.email), ' ', 1)
  );
  v_last  := new.raw_user_meta_data->>'last_name';
  v_email := new.email;

  v_seed := trim(coalesce(v_first, '') || ' ' || coalesce(v_last, ''));
  -- Email local-part is a nice secondary seed because it's user-chosen-ish.
  v_fb   := nullif(split_part(coalesce(v_email, ''), '@', 1), '');

  begin
    v_handle := public.generate_unique_username(v_seed, v_fb);
  exception when others then
    perform public.log_trigger_error(
      'handle_new_user_generate', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('user_id', new.id)
    );
    v_handle := null;
  end;

  insert into public.profiles (id, display_name, first_name, last_name, avatar_url, username)
  values (
    new.id,
    v_full,
    v_first,
    v_last,
    new.raw_user_meta_data->>'avatar_url',
    v_handle
  );
  return new;
end;
$$;

-- Trigger was already wired in migration 001; no need to re-create it.

-- ---------------------------------------------------------------------------
-- Documentation update
-- ---------------------------------------------------------------------------
comment on column public.profiles.username is
  'Public @handle without @; lowercase; 3–30 chars; DB-unique; auto-generated on signup and backfilled for legacy rows in migration 048.';
