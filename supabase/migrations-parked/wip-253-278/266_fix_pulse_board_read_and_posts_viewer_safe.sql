-- Migration 266 · Pulse Board read RPC + posts_viewer_safe refresh
--
-- 1. get_profile_board_shoutouts was STABLE but calls apply_pulse_board_auto_archive
--    (UPDATE) → "cannot execute UPDATE in a read-only transaction" on Supabase RPC.
-- 2. posts_viewer_safe missing video_overlay_style (added in 237) — refresh view.

-- ---------------------------------------------------------------------------
-- 1. Pulse Board list RPC — must be VOLATILE (lazy auto-archive writes)
-- ---------------------------------------------------------------------------
create or replace function public.get_profile_board_shoutouts(p_profile_owner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer uuid := auth.uid();
  v_is_owner boolean := v_viewer is not null and v_viewer = p_profile_owner_id;
  v_is_staff boolean := public.viewer_is_staff();
  v_board_enabled boolean := true;
  v_pinned jsonb;
  v_items jsonb;
  v_limit integer;
begin
  if p_profile_owner_id is null then
    raise exception 'profile required' using errcode = '22000';
  end if;

  if not v_is_owner and not v_is_staff then
    if not public.viewer_can_view_pulse_board(p_profile_owner_id) then
      raise exception 'not allowed' using errcode = '42501';
    end if;

    select coalesce(pr.pulse_board_enabled, true)
      into v_board_enabled
    from public.profiles pr
    where pr.id = p_profile_owner_id;

    if not v_board_enabled then
      return jsonb_build_object(
        'pinned', null,
        'items', '[]'::jsonb,
        'is_owner_view', false
      );
    end if;
  end if;

  perform public.apply_pulse_board_auto_archive(p_profile_owner_id);

  select to_jsonb(row)
    into v_pinned
  from (
    select
      s.id,
      s.profile_owner_id,
      s.author_id,
      s.body,
      s.status,
      s.pinned_at,
      s.archived_at,
      s.created_at
    from public.profile_board_shoutouts s
    where s.profile_owner_id = p_profile_owner_id
      and s.pinned_at is not null
      and s.status = 'active'
      and s.deleted_at is null
      and s.hidden_at is null
    order by s.pinned_at desc
    limit 1
  ) row;

  v_limit := case when v_is_owner or v_is_staff then 100 else 30 end;

  select coalesce(jsonb_agg(to_jsonb(row) order by row.created_at desc), '[]'::jsonb)
    into v_items
  from (
    select
      s.id,
      s.profile_owner_id,
      s.author_id,
      s.body,
      s.status,
      s.pinned_at,
      s.archived_at,
      s.created_at
    from public.profile_board_shoutouts s
    where s.profile_owner_id = p_profile_owner_id
      and s.pinned_at is null
      and s.status = 'active'
      and s.deleted_at is null
      and s.hidden_at is null
      and (
        v_is_owner
        or v_is_staff
        or s.archived_at is null
      )
    order by s.created_at desc
    limit v_limit
  ) row;

  return jsonb_build_object(
    'pinned', v_pinned,
    'items', coalesce(v_items, '[]'::jsonb),
    'is_owner_view', v_is_owner or v_is_staff
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. posts_viewer_safe — include video_overlay_style (migration 237)
-- ---------------------------------------------------------------------------
drop view if exists public.posts_viewer_safe;

create view public.posts_viewer_safe
with (security_invoker = false, security_barrier = true) as
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
  p.video_overlay_style,
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
from public.posts p
where public.viewer_can_read_post_row(p.creator_id, p.privacy_mode);

comment on view public.posts_viewer_safe is
  'SECURITY DEFINER (intentional): masks anonymous creator_id; filters private/hidden rows per viewer.';

grant select on public.posts_viewer_safe to anon, authenticated, service_role;
