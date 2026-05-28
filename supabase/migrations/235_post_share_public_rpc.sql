-- Migration 235: SECURITY DEFINER share-preview RPC for /post/<id> Open Graph
--
-- Why this exists
-- ---------------
-- Migration 220 hardened privacy by REVOKE SELECT ON public.posts FROM anon
-- and exposed reads through `posts_viewer_safe` with `security_invoker = false`.
-- In Supabase's Postgres, the planner still enforces caller-side SELECT on the
-- underlying base table when an anon JWT queries the view, so every call to
-- `posts_viewer_safe` from the marketing site (anonymous Supabase client)
-- failed with `42501 permission denied for table posts`. Result: shared
-- /post/<id> URLs returned `null` post data → generic "Open this clip" Open
-- Graph fallback → iMessage and other crawlers showed the marketing landing
-- card instead of the actual video thumbnail and caption.
--
-- Fix
-- ---
-- Expose a dedicated SECURITY DEFINER function the marketing site (and any
-- future crawler-facing surface) can invoke without granting `anon` any
-- direct SELECT on `posts` or `profiles`. The function only ever returns
-- rows that are:
--   - privacy_mode IN ('public', 'alias') or NULL (treated as public)
--   - scheduled_status = 'live'
-- Anonymous posts get NULL creator fields so we never leak the real author.
-- Idempotent: safe to re-run.

create or replace function public.get_post_share_public(p_id uuid)
returns table (
  caption text,
  thumbnail_url text,
  media_url text,
  type text,
  is_anonymous boolean,
  like_count int,
  comment_count int,
  creator_display_name text,
  creator_username text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.caption,
    p.thumbnail_url,
    p.media_url,
    p.type,
    coalesce(p.is_anonymous, false) as is_anonymous,
    coalesce(p.like_count, 0) as like_count,
    coalesce(p.comment_count, 0) as comment_count,
    case when coalesce(p.is_anonymous, false) then null else pr.display_name end as creator_display_name,
    case when coalesce(p.is_anonymous, false) then null else pr.username end as creator_username
  from public.posts p
  left join public.profiles pr on pr.id = p.creator_id
  where p.id = p_id
    and coalesce(p.privacy_mode, 'public') in ('public', 'alias')
    and coalesce(p.scheduled_status, 'live') = 'live'
  limit 1;
$$;

revoke all on function public.get_post_share_public(uuid) from public;
grant execute on function public.get_post_share_public(uuid) to anon, authenticated, service_role;

comment on function public.get_post_share_public(uuid) is
  'SECURITY DEFINER: returns minimal public post metadata for share-preview Open Graph cards. '
  'Marketing site (anon client) calls this without needing SELECT on posts/profiles. '
  'Only returns rows that are PUBLIC (or alias) and scheduled live. Anonymous posts get null creator fields.';
