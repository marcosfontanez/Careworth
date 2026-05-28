-- =====================================================================================
-- Migration 236: Hashtag autocomplete + usage counts
-- Creator Hub audit (issue #8): build a shared hashtag input across upload/create tools
-- that suggests existing tags ranked by usage. The mobile client needs a fast, anonymous
-- RPC that takes a typed prefix and returns matching tags with their usage_count, sorted
-- by exact-prefix match, then count desc, then recency.
--
-- Storage shape: posts.hashtags is text[] on the posts table (since migration 001).
-- Aggregating across the whole posts table per keystroke would be slow once we have
-- non-trivial volume, so this migration introduces a denormalized counter table and
-- maintains it via insert/update/delete triggers. The migration also backfills the
-- counter from existing posts in a single pass.
--
-- All names are additive — no existing object is changed or dropped.
-- =====================================================================================

create table if not exists public.hashtag_counts (
  tag text primary key,
  usage_count integer not null default 0,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.hashtag_counts is
  'Denormalized usage counter for posts.hashtags. Maintained by triggers on public.posts. '
  'Read by public.search_hashtags(prefix, limit) for autocomplete in create flows.';

comment on column public.hashtag_counts.tag is 'Lowercase, # stripped, alphanumeric + underscore only.';
comment on column public.hashtag_counts.usage_count is 'Number of live posts that currently include this tag.';
comment on column public.hashtag_counts.last_used_at is 'Most recent post insert/update that included this tag.';

-- Prefix lookup index (text_pattern_ops makes LIKE 'prefix%' use the index).
create index if not exists idx_hashtag_counts_tag_prefix
  on public.hashtag_counts (tag text_pattern_ops);

-- Secondary index for ranked browse by popularity.
create index if not exists idx_hashtag_counts_usage_desc
  on public.hashtag_counts (usage_count desc, last_used_at desc)
  where usage_count > 0;

-- Recency tiebreaker so trending fresh tags rank ahead of dormant ones with equal usage.
create index if not exists idx_hashtag_counts_recent
  on public.hashtag_counts (last_used_at desc)
  where usage_count > 0;

-- ---------------------------------------------------------------------------
-- Normalizer: lowercase, strip leading #, replace whitespace with nothing,
-- and keep only [a-z0-9_]. Returns null for empty/garbage input.
-- ---------------------------------------------------------------------------
create or replace function public.normalize_hashtag(p_tag text)
returns text
language sql
immutable
as $$
  select case
    when p_tag is null then null
    when length(trim(p_tag)) = 0 then null
    else nullif(
      regexp_replace(
        lower(regexp_replace(trim(p_tag), '^#+', '')),
        '[^a-z0-9_]',
        '',
        'g'
      ),
      ''
    )
  end;
$$;

comment on function public.normalize_hashtag(text) is
  'Lowercase, strip leading #, keep [a-z0-9_]. Returns null if nothing valid remains.';

-- ---------------------------------------------------------------------------
-- Trigger: maintain hashtag_counts on posts insert / update / delete.
-- - INSERT/UPDATE: for each tag in NEW.hashtags, upsert +1 and stamp last_used_at.
-- - DELETE: for each tag in OLD.hashtags, decrement; clamp at 0 (no negatives).
-- - UPDATE: for tags removed from the array, decrement; for tags added, increment.
-- ---------------------------------------------------------------------------
create or replace function public.tg_posts_hashtag_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  added text[];
  removed text[];
  tag text;
  norm text;
begin
  if (tg_op = 'INSERT') then
    added := coalesce(new.hashtags, '{}'::text[]);
    removed := '{}'::text[];
  elsif (tg_op = 'DELETE') then
    added := '{}'::text[];
    removed := coalesce(old.hashtags, '{}'::text[]);
  else
    -- UPDATE
    added := array(select unnest(coalesce(new.hashtags, '{}'::text[]))
                   except select unnest(coalesce(old.hashtags, '{}'::text[])));
    removed := array(select unnest(coalesce(old.hashtags, '{}'::text[]))
                     except select unnest(coalesce(new.hashtags, '{}'::text[])));
  end if;

  foreach tag in array added loop
    norm := public.normalize_hashtag(tag);
    if norm is null then continue; end if;
    insert into public.hashtag_counts (tag, usage_count, last_used_at)
      values (norm, 1, now())
      on conflict (tag) do update
        set usage_count = public.hashtag_counts.usage_count + 1,
            last_used_at = now();
  end loop;

  foreach tag in array removed loop
    norm := public.normalize_hashtag(tag);
    if norm is null then continue; end if;
    update public.hashtag_counts
       set usage_count = greatest(0, usage_count - 1)
     where tag = norm;
  end loop;

  return null;  -- after-trigger
end;
$$;

comment on function public.tg_posts_hashtag_counts() is
  'AFTER INSERT/UPDATE/DELETE on posts. Maintains public.hashtag_counts in sync with posts.hashtags.';

drop trigger if exists posts_hashtag_counts on public.posts;
create trigger posts_hashtag_counts
  after insert or update of hashtags or delete on public.posts
  for each row
  execute function public.tg_posts_hashtag_counts();

-- ---------------------------------------------------------------------------
-- Backfill: populate hashtag_counts from existing posts.hashtags in one pass.
-- - Skips empty arrays / null arrays.
-- - Normalizes every tag.
-- - Uses last post.created_at for last_used_at as a reasonable approximation.
-- - Safe to re-run: on conflict updates the count.
-- ---------------------------------------------------------------------------
do $$
declare
  rows_seen int;
begin
  -- Truncate first only if the table is empty (avoid wiping live data on re-run).
  if not exists (select 1 from public.hashtag_counts limit 1) then
    insert into public.hashtag_counts (tag, usage_count, last_used_at)
    select
      public.normalize_hashtag(tag) as norm_tag,
      count(*)::int as usage_count,
      max(p.created_at) as last_used_at
    from public.posts p
    cross join lateral unnest(coalesce(p.hashtags, '{}'::text[])) as tag
    where tag is not null
      and length(trim(tag)) > 0
    group by 1
    having public.normalize_hashtag(tag) is not null
    on conflict (tag) do update
      set usage_count = excluded.usage_count,
          last_used_at = greatest(public.hashtag_counts.last_used_at, excluded.last_used_at);

    get diagnostics rows_seen = row_count;
    raise notice 'hashtag_counts: backfilled % rows', rows_seen;
  else
    raise notice 'hashtag_counts: skipping backfill (table is non-empty)';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- search_hashtags(prefix, limit) — ranked autocomplete RPC.
-- Returns: tag, usage_count.
-- Ranking:
--   1. exact-prefix match (tag like 'prefix%')  → always first
--   2. higher usage_count                         → trending bias
--   3. more recently used (last_used_at desc)    → freshness tiebreaker
--
-- Anonymous-callable for guest discovery. SECURITY DEFINER so the function can
-- read hashtag_counts even if future RLS locks the table.
--
-- Drop any prior signature first — Postgres will not let CREATE OR REPLACE
-- change the return-table shape if an older version of the function exists
-- (error 42P13). Drop is `if exists` so the migration is idempotent on a
-- clean project.
-- ---------------------------------------------------------------------------
drop function if exists public.search_hashtags(text, int);
drop function if exists public.search_hashtags(text, integer);
drop function if exists public.search_hashtags(text);

create or replace function public.search_hashtags(p_prefix text, p_limit int default 10)
returns table (
  tag text,
  usage_count int
)
language sql
stable
security definer
set search_path = public
as $$
  with norm as (
    select coalesce(public.normalize_hashtag(p_prefix), '') as p
  )
  select hc.tag, hc.usage_count
  from public.hashtag_counts hc, norm
  where hc.usage_count > 0
    and (
      norm.p = '' or hc.tag like norm.p || '%'
    )
  order by
    case when norm.p = '' or hc.tag like norm.p || '%' then 0 else 1 end,
    hc.usage_count desc,
    hc.last_used_at desc,
    hc.tag asc
  limit greatest(1, least(coalesce(p_limit, 10), 25));
$$;

comment on function public.search_hashtags(text, int) is
  'Ranked hashtag autocomplete. Prefix-matched on lowercased normalized tag. '
  'Returns (tag, usage_count) sorted by exact-prefix match → usage_count desc → recency.';

-- Grants: anyone (anon, authenticated, service_role) can read suggestions.
revoke all on function public.search_hashtags(text, int) from public;
grant execute on function public.search_hashtags(text, int) to anon, authenticated, service_role;

-- hashtag_counts is read-only for client roles (writes happen via the trigger as definer).
revoke all on table public.hashtag_counts from public;
grant select on table public.hashtag_counts to anon, authenticated, service_role;

-- RLS: open SELECT for everyone; writes only happen via the trigger which runs as table owner.
alter table public.hashtag_counts enable row level security;

drop policy if exists "hashtag_counts_public_read" on public.hashtag_counts;
create policy "hashtag_counts_public_read" on public.hashtag_counts
  for select using (true);
