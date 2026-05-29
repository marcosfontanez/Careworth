-- Mask anonymous post creator_id at the DB read layer so REST clients cannot
-- bypass app-side redaction. Authors and staff still see the real creator_id.

create or replace function public.viewer_safe_creator_id(
  p_creator_id uuid,
  p_is_anonymous boolean
)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case
    when coalesce(p_is_anonymous, false) = false then p_creator_id
    when (select auth.uid()) is not distinct from p_creator_id then p_creator_id
    when exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and coalesce(p.role_admin, false) = true
    ) then p_creator_id
    else '00000000-0000-0000-0000-000000000001'::uuid
  end;
$$;

comment on function public.viewer_safe_creator_id(uuid, boolean) is
  'Returns masked creator_id for anonymous posts unless viewer is author or staff.';

drop view if exists public.posts_viewer_safe;

create view public.posts_viewer_safe
with (security_invoker = true) as
select
  p.id,
  public.viewer_safe_creator_id(p.creator_id, p.is_anonymous) as creator_id,
  p.type,
  p.caption,
  p.created_at,
  p.edited_at,
  p.media_url,
  p.thumbnail_url,
  p.additional_media,
  p.hashtags,
  p.communities,
  p.feed_type_eligible,
  p.role_context,
  p.specialty_context,
  p.location_context,
  p.is_anonymous,
  p.privacy_mode,
  p.like_count,
  p.comment_count,
  p.share_count,
  p.view_count,
  p.save_count,
  p.reaction_heart_count,
  p.reaction_haha_count,
  p.reaction_wow_count,
  p.reaction_sad_count,
  p.reaction_angry_count,
  p.reaction_clap_count,
  p.ranking_score,
  p.sound_title,
  p.sound_source_post_id,
  p.sound_source_media_url,
  p.stitch_source_post_id,
  p.source_live_stream_id,
  p.source_post_id,
  p.source_creator_id,
  p.duet_parent_id,
  p.duet_layout_mode,
  p.video_look_id,
  p.video_overlay_text,
  p.mood_preset,
  p.cover_alt_url,
  p.clip_start_seconds,
  p.clip_end_seconds,
  p.allow_viewer_clips,
  p.allow_remix,
  p.allow_clip_downloads,
  p.comments_disabled,
  p.is_education,
  p.evidence_label,
  p.evidence_url,
  p.education_citations,
  p.shift_context,
  p.scheduled_status,
  p.scheduled_at,
  p.series_id,
  p.series_part,
  p.series_total,
  p.media_processing_status,
  p.media_processing_error,
  p.media_processing_job_id
from public.posts p;

comment on view public.posts_viewer_safe is
  'Circle/viewer reads: masks creator_id on anonymous posts for non-authors.';

grant select on public.posts_viewer_safe to anon, authenticated, service_role;
