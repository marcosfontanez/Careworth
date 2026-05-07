import Image from "next/image";

import { pulseverseLogoLockup } from "@/lib/design-tokens";
import type { PostSharePublic } from "@/lib/marketing/post-share-public";
import { marketingInlineLink } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

function previewImageSrc(post: PostSharePublic): string | null {
  if (post.is_anonymous) return null;
  const type = post.postType.toLowerCase();
  const thumb = (post.thumbnail_url ?? "").trim();
  const media = (post.media_url ?? "").trim();
  if (thumb) return thumb;
  if (type === "image" && media) return media;
  return null;
}

/**
 * Static, non-playable preview that mirrors the iMessage-style rich link (thumbnail + stats + caption).
 * Tap targets the Universal Link so the app opens to this post when installed.
 */
export function PostShareWebPreview({
  post,
  httpsOpenUrl,
  downloadUrl,
}: {
  post: PostSharePublic;
  httpsOpenUrl: string;
  downloadUrl: string;
}) {
  const src = previewImageSrc(post);
  const likes = Math.max(0, Math.floor(Number(post.like_count) || 0)).toLocaleString("en-US");
  const comments = Math.max(0, Math.floor(Number(post.comment_count) || 0)).toLocaleString("en-US");
  const cap = post.caption.trim();

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/4">
      <a
        href={httpsOpenUrl}
        className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="relative aspect-9/16 max-h-[min(52vh,560px)] w-full bg-black/80">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote Supabase host varies per project
            <img src={src} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <span className="text-sm font-semibold text-white/90">PulseVerse</span>
              <span className="text-xs text-white/60">
                {post.is_anonymous ? "Anonymous clip — open the app to watch." : "Open the app to watch this clip."}
              </span>
            </div>
          )}
          {src ? (
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25 opacity-90 transition group-hover:opacity-100"
              aria-hidden
            >
              <div className="flex size-17 items-center justify-center rounded-full border border-white/40 bg-black/55 shadow-lg backdrop-blur-sm">
                <span className="ml-1 text-4xl leading-none text-white">▶</span>
              </div>
            </div>
          ) : null}
        </div>
      </a>

      <div className="space-y-3 border-t border-white/10 bg-black/30 px-4 py-4 sm:px-5">
        <p className="text-sm text-white/90">
          <span className="font-medium">{likes} likes</span>
          <span className="text-white/50">, </span>
          <span className="font-medium">{comments} comments</span>
          <span className="text-white/50">.</span>
        </p>
        {!post.is_anonymous && cap ? (
          <p className="text-[15px] leading-snug text-white/95">&ldquo;{cap}&rdquo;</p>
        ) : null}

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex min-w-0 items-center gap-2">
            <Image
              src={pulseverseLogoLockup.src}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-lg object-contain"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white/95">
                {post.is_anonymous ? "PulseVerse" : (post.creatorLine ?? "PulseVerse")}
              </p>
              <p className="text-xs text-white/55">Watch in PulseVerse</p>
            </div>
          </div>
          <a
            href={httpsOpenUrl}
            className={cn(
              "shrink-0 rounded-full bg-[#007aff] px-5 py-2 text-sm font-semibold text-white",
              "hover:bg-[#0066d6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
            )}
          >
            View
          </a>
        </div>

        <p className="text-xs text-white/50">
          No app yet?{" "}
          <a href={downloadUrl} className={marketingInlineLink}>
            Get PulseVerse
          </a>
        </p>
      </div>
    </div>
  );
}
