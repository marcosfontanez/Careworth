import Link from "next/link";
import {
  BadgeCheck,
  ExternalLink,
  Heart,
  ImageOff,
  Lock,
  MessageCircle,
  Pin,
  Play,
  Sparkles,
  UserRound,
} from "lucide-react";

import type { WebAppEngagementCopy, WebAppProfileCopy } from "@/lib/marketing-copy/web-app";
import type {
  WebProfileFrame,
  WebProfileHeader,
  WebProfilePost,
  WebProfileLockReason,
  WebPulseUpdate,
} from "@/lib/web-app/profile-data";
import { formatCount, relativeTime } from "@/lib/web-app/format";

import { FollowButton } from "./follow-button";
import { LikeButton } from "./like-button";

function ringStyle(frame: WebProfileFrame | null): React.CSSProperties {
  if (!frame) return { borderColor: "rgba(255,255,255,0.12)" };
  const ring = frame.ringColor ?? "#5EEAD4";
  const glow = frame.glowColor ?? ring;
  return {
    borderColor: ring,
    boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 0 22px -2px ${glow}, inset 0 0 12px -4px ${glow}`,
  };
}

function ProfileAvatar({ profile }: { profile: WebProfileHeader }) {
  return (
    <div className="relative shrink-0">
      <span
        className="grid size-24 place-items-center overflow-hidden rounded-full border-[3px] bg-secondary/60 sm:size-28"
        style={ringStyle(profile.frame)}
      >
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          <UserRound className="size-10 text-muted-foreground" aria-hidden />
        )}
      </span>
      {profile.frame?.ringCaption ? (
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-300/40 bg-[rgba(20,16,8,0.9)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200 shadow-[0_0_14px_-4px_rgba(251,191,36,0.7)]">
          {profile.frame.ringCaption}
        </span>
      ) : null}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold text-foreground">{formatCount(value)}</p>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function PulseUpdateRow({ update }: { update: WebPulseUpdate }) {
  const text = update.content?.trim() || update.previewText?.trim() || "";
  const time = relativeTime(update.createdAt);
  return (
    <li className="rounded-2xl border border-white/8 bg-white/[0.03] p-3.5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
        {update.isPinned ? <Pin className="size-3" aria-hidden /> : <Sparkles className="size-3" aria-hidden />}
        <span>{update.type.replace(/_/g, " ")}</span>
        {update.mood ? <span className="text-muted-foreground">· {update.mood}</span> : null}
        {time ? <span className="ml-auto font-normal normal-case text-muted-foreground">{time}</span> : null}
      </div>
      {text ? (
        <p className="mt-1.5 text-sm leading-relaxed text-foreground/90 [overflow-wrap:anywhere]">
          {text.length > 240 ? `${text.slice(0, 240)}…` : text}
        </p>
      ) : null}
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Heart className="size-3.5" aria-hidden />
          {formatCount(update.likeCount)}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="size-3.5" aria-hidden />
          {formatCount(update.commentCount)}
        </span>
      </div>
    </li>
  );
}

function PostTile({
  post,
  copy,
  engagement,
}: {
  post: WebProfilePost;
  copy: WebAppProfileCopy;
  engagement: WebAppEngagementCopy;
}) {
  const media = post.thumbnailUrl ?? post.mediaUrl;
  return (
    <div className="group relative aspect-[9/16] overflow-hidden rounded-2xl border border-white/10 bg-[#05080f] shadow-[0_18px_50px_-34px_rgba(0,0,0,0.95)]">
      {media ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={media}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-[1.05]"
          />
          {post.isVideo ? (
            <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
              <Play className="size-2.5 fill-current" aria-hidden />
              {copy.videoBadge}
            </span>
          ) : null}
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-br from-[#101a35] to-[#0a1020] p-3">
          <ImageOff className="size-4 text-muted-foreground/60" aria-hidden />
          <p className="text-xs leading-snug text-foreground/85 [overflow-wrap:anywhere]">
            {post.caption?.trim() ? (post.caption.length > 140 ? `${post.caption.slice(0, 140)}…` : post.caption) : "—"}
          </p>
        </div>
      )}

      {/* Whole-tile navigation sits beneath interactive controls. */}
      <Link href={`/post/${post.id}`} className="absolute inset-0 z-10" aria-label={copy.openPost} />

      {/* Interactive like — above the navigation overlay. */}
      <span className="absolute right-2 top-2 z-20 inline-flex rounded-full bg-black/55 px-2 py-1 text-white backdrop-blur-sm">
        <LikeButton
          postId={post.id}
          initialLiked={post.likedByViewer}
          initialCount={post.likeCount}
          labels={{ like: engagement.like, liked: engagement.liked, error: engagement.likeError }}
          size="sm"
        />
      </span>

      {/* Caption + counts overlay (always visible on media tiles) */}
      {media ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/25 to-transparent px-2.5 pb-2 pt-6">
          {post.caption?.trim() ? (
            <p className="line-clamp-2 text-[11px] font-medium leading-snug text-white/90 [overflow-wrap:anywhere]">
              {post.caption}
            </p>
          ) : null}
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-white/85">
            <MessageCircle className="size-3" aria-hidden />
            {formatCount(post.commentCount)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function LockedCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-8 text-center backdrop-blur-sm">
      <span className="mx-auto grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-muted-foreground">
        <Lock className="size-5" aria-hidden />
      </span>
      <p className="mt-3 text-base font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

export function WebProfile({
  profile,
  isOwner,
  contentVisible,
  lockReason,
  canFollow,
  isFollowing,
  pulseUpdates,
  posts,
  copy,
  engagement,
  openAppHref,
  isExternalApp,
}: {
  profile: WebProfileHeader;
  isOwner: boolean;
  contentVisible: boolean;
  lockReason: WebProfileLockReason;
  canFollow: boolean;
  isFollowing: boolean;
  pulseUpdates: WebPulseUpdate[];
  posts: WebProfilePost[];
  copy: WebAppProfileCopy;
  engagement: WebAppEngagementCopy;
  openAppHref: string;
  isExternalApp: boolean;
}) {
  const externalProps = isExternalApp ? { target: "_blank", rel: "noreferrer" } : {};
  const lockTitle = lockReason === "blocked" ? copy.blockedTitle : copy.privateTitle;
  const lockBody = lockReason === "blocked" ? copy.blockedBody : copy.privateBody;

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 py-6 sm:px-6 sm:py-8">
      {/* Banner */}
      <div className="relative mb-[-48px] h-32 overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-primary/25 via-[#0b1424] to-accent/20 sm:h-40">
        {profile.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.bannerUrl} alt="" className="size-full object-cover" />
        ) : null}
      </div>

      {/* Header card */}
      <header className="relative rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.86)] p-5 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="-mt-16 sm:-mt-20">
            <ProfileAvatar profile={profile} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {profile.displayName}
              </h1>
              {profile.isVerified ? (
                <BadgeCheck className="size-5 shrink-0 text-sky-400" aria-label={copy.verifiedLabel} />
              ) : null}
            </div>
            {profile.username ? (
              <p className="truncate text-sm text-muted-foreground">@{profile.username}</p>
            ) : null}
            {profile.identityTags.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {profile.identityTags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isOwner ? (
              <a
                href={openAppHref}
                {...externalProps}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-sm font-medium text-foreground/90 transition hover:border-white/25"
              >
                <ExternalLink className="size-4" aria-hidden />
                {copy.editProfile}
              </a>
            ) : (
              <>
                {canFollow ? (
                  <FollowButton
                    targetUserId={profile.id}
                    initialFollowing={isFollowing}
                    labels={{
                      follow: engagement.follow,
                      following: engagement.following,
                      error: engagement.followError,
                    }}
                  />
                ) : null}
                <a
                  href={openAppHref}
                  {...externalProps}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-sm font-medium text-foreground/90 transition hover:border-white/25"
                >
                  <ExternalLink className="size-4" aria-hidden />
                  {copy.openInApp}
                </a>
              </>
            )}
          </div>
        </div>

        {profile.bio?.trim() ? (
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground/85 [overflow-wrap:anywhere]">
            {profile.bio}
          </p>
        ) : null}

        <div className="mt-5 flex items-center gap-7 border-t border-white/8 pt-4">
          <Stat value={profile.stats.followers} label={copy.statFollowers} />
          <Stat value={profile.stats.following} label={copy.statFollowing} />
          <Stat value={profile.stats.pulseScore} label={profile.stats.pulseTier ?? copy.statPulse} />
        </div>
      </header>

      {/* Body */}
      {!contentVisible ? (
        <div className="mt-6">
          <LockedCard title={lockTitle} body={lockBody} />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Posts & media */}
          <section className="order-2 lg:order-1">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {copy.postsTitle}
            </h2>
            {posts.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-8 text-center text-sm text-muted-foreground backdrop-blur-sm">
                {isOwner ? copy.postsEmptyOwner : copy.postsEmptyVisitor}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                {posts.map((post) => (
                  <PostTile key={post.id} post={post} copy={copy} engagement={engagement} />
                ))}
              </div>
            )}
          </section>

          {/* Pulse updates */}
          <section className="order-1 lg:order-2">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {copy.pulseUpdatesTitle}
            </h2>
            {pulseUpdates.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-5 text-center text-sm text-muted-foreground backdrop-blur-sm">
                {copy.pulseUpdatesEmpty}
              </div>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {pulseUpdates.map((update) => (
                  <PulseUpdateRow key={update.id} update={update} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
