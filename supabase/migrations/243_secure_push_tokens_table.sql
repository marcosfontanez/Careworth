-- ============================================================
-- PulseVerse: Move Expo push tokens off public profiles
-- ------------------------------------------------------------
-- WHY: public.profiles has a SELECT policy `using (true)` and profile reads
-- across the app use `select('*')`, so `profiles.push_token` was readable by
-- any client. Expo push tokens are an account-takeover / targeted-harassment
-- vector. We relocate tokens to a private, owner-scoped table and DROP the
-- leaky columns (dropping is safer than column-level REVOKE because the app
-- relies on `select('*')` for profiles, which a column REVOKE would break).
-- ============================================================

create table if not exists public.user_push_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token text not null,
  platform text,
  updated_at timestamptz not null default now()
);

alter table public.user_push_tokens enable row level security;

-- Owner-only access. Service role (Edge Functions) bypasses RLS and can read
-- any row for fan-out in notify-expo-push.
drop policy if exists "Users manage own push token" on public.user_push_tokens;
create policy "Users manage own push token"
  on public.user_push_tokens for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.user_push_tokens to authenticated;

-- Backfill existing tokens before removing the columns.
insert into public.user_push_tokens (user_id, token, updated_at)
select id, push_token, coalesce(push_token_updated_at, now())
from public.profiles
where push_token is not null and length(trim(push_token)) > 0
on conflict (user_id) do nothing;

drop index if exists public.idx_profiles_push_token;
alter table public.profiles drop column if exists push_token;
alter table public.profiles drop column if exists push_token_updated_at;
