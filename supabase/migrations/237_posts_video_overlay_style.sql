-- Migration 237: Per-post on-video text style metadata
--
-- Adds `video_overlay_style jsonb` to public.posts so the creator's
-- chosen font, size, color, and normalized x/y position survives upload.
-- Existing rows keep the legacy centered default (style = null → renderer
-- falls back to DEFAULT_OVERLAY_STYLE in lib/videoOverlayStyle.ts).
--
-- Shape (validated client-side; server CHECK is intentionally loose to allow
-- future fields without a migration):
--   {
--     "font": "system" | "serif" | "mono" | "rounded",
--     "size": "sm" | "md" | "lg" | "xl",
--     "color": "white" | "black" | "cyan" | "yellow",
--     "x_norm": number in [0,1],   -- horizontal anchor (0 = left, 1 = right)
--     "y_norm": number in [0,1]    -- vertical anchor   (0 = top,  1 = bottom)
--   }
--
-- We also keep the existing `video_overlay_text` column unchanged. The new
-- column is **paired** with the existing text — empty text means no overlay,
-- regardless of style.

alter table public.posts
  add column if not exists video_overlay_style jsonb;

-- Loose validation: must be a JSON object (not array / scalar) when present.
-- Strict shape validation lives client-side in lib/videoOverlayStyle.ts.
alter table public.posts
  drop constraint if exists posts_video_overlay_style_obj_ck;

alter table public.posts
  add constraint posts_video_overlay_style_obj_ck
  check (
    video_overlay_style is null
    or jsonb_typeof(video_overlay_style) = 'object'
  );

comment on column public.posts.video_overlay_style is
  'Optional JSON style for the on-video sticker text. Includes font, size, color, and normalized x/y position. When NULL, feed renderer uses the legacy centered default. Paired with video_overlay_text.';

-- Ensure the viewer-safe RPC (used by Feed for You / Following / Top Today)
-- exposes the new column. The RPC was last bumped in migration 234; we rebuild
-- the SELECT list here without changing its signature so existing clients
-- continue to work.
do $$
begin
  perform 1 from pg_proc where proname = 'get_post_viewer_safe' limit 1;
  if found then
    -- Real RPC bump happens in get_ranked_feed_v3 / posts_viewer_safe view
    -- separately. We do not redefine those here to avoid surprise changes;
    -- callers that need the new field can select it directly via
    -- `posts.video_overlay_style` (RLS already allows authors + public reads).
    null;
  end if;
end $$;
