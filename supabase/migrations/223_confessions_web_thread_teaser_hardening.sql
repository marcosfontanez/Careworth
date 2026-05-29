-- Public web share: anonymous viewers must not read Confessions thread title/body via viewer_safe.

drop view if exists public.circle_threads_viewer_safe;

create view public.circle_threads_viewer_safe
with (security_invoker = false, security_barrier = true) as
select
  t.id,
  t.community_id,
  public.viewer_safe_circle_author_id(t.author_id, t.community_id) as author_id,
  t.kind,
  case
    when public.community_is_confessions(t.community_id)
      and (select auth.uid()) is null
      and not public.viewer_is_staff()
    then null::text
    else t.title
  end as title,
  case
    when public.community_is_confessions(t.community_id)
      and (select auth.uid()) is null
      and not public.viewer_is_staff()
    then null::text
    else t.body
  end as body,
  t.media_thumb_url,
  t.linked_post_id,
  t.created_at,
  t.updated_at,
  t.reply_count,
  t.reaction_count,
  t.share_count,
  t.deleted_at,
  t.deleted_by,
  t.moderation_status,
  t.moderated_by,
  t.moderated_at,
  t.moderation_reason
from public.circle_threads t
where public.viewer_can_read_circle_thread_row(
  t.community_id,
  t.author_id,
  t.moderation_status,
  t.deleted_at
);

comment on view public.circle_threads_viewer_safe is
  'SECURITY DEFINER (intentional): masks Confessions author_id; hides title/body for anonymous web; filters moderated/deleted unless staff/mod/author.';

grant select on public.circle_threads_viewer_safe to anon, authenticated, service_role;
