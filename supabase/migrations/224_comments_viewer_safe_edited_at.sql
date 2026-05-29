-- Migration 220 recreated comments_viewer_safe without edited_at; the app selects
-- edited_at on every comment fetch (PostCommentThread, post detail, feed sheet).
-- PostgREST errors on the missing column → React Query falls back to [] → empty threads.

drop view if exists public.comments_viewer_safe;

create view public.comments_viewer_safe
with (security_invoker = false, security_barrier = true) as
select
  c.id,
  c.post_id,
  public.viewer_safe_creator_id(c.author_id, coalesce(p.is_anonymous, false)) as author_id,
  c.parent_id,
  c.content,
  c.created_at,
  c.edited_at,
  c.like_count,
  c.reaction_heart_count,
  c.reaction_haha_count,
  c.reaction_wow_count,
  c.reaction_sad_count,
  c.reaction_angry_count,
  c.reaction_clap_count,
  c.media_url,
  c.deleted_at
from public.comments c
join public.posts p on p.id = c.post_id
where c.deleted_at is null
  and public.viewer_can_read_post_row(p.creator_id, p.privacy_mode);

comment on view public.comments_viewer_safe is
  'SECURITY DEFINER (intentional): masks anonymous comment author_id; includes edited_at for clients; filters private/hidden posts per viewer.';

grant select on public.comments_viewer_safe to anon, authenticated, service_role;

-- Confessions / alias posts are pseudonymous but readable in-app — treat like public for reads.
create or replace function public.viewer_can_read_post_row(
  p_creator_id uuid,
  p_privacy_mode text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(p_privacy_mode, 'public') in ('public', 'alias')
    or (select auth.uid()) is not distinct from p_creator_id
    or public.viewer_is_staff();
$$;
