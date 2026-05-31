import {
  Award,
  BadgeCheck,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  Heart,
  HeartPulse,
  Hexagon,
  Lock,
  MessageCircle,
  Moon,
  Pencil,
  Pin,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trophy,
  UserRound,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { WebAppEngagementCopy, WebAppProfileCopy } from "@/lib/marketing-copy/web-app";
import type {
  WebProfileFrame,
  WebProfileHeader,
  WebProfileLockReason,
  WebProfilePost,
  WebPulseUpdate,
} from "@/lib/web-app/profile-data";
import { formatCount, relativeTime } from "@/lib/web-app/format";

import { FollowButton } from "./follow-button";
import { WebProfilePosts } from "./web-profile-posts";

function ringStyle(frame: WebProfileFrame | null): React.CSSProperties {
  if (!frame) return { borderColor: "rgba(250,204,21,0.55)", boxShadow: "0 0 26px -4px rgba(250,204,21,0.45)" };
  const ring = frame.ringColor ?? "#FACC15";
  const glow = frame.glowColor ?? ring;
  return {
    borderColor: ring,
    boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 0 28px -2px ${glow}, inset 0 0 14px -4px ${glow}`,
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
        <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-300/40 bg-[rgba(20,16,8,0.92)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200 shadow-[0_0_14px_-4px_rgba(251,191,36,0.7)]">
          {profile.frame.ringCaption}
        </span>
      ) : null}
    </div>
  );
}

const TAG_ICONS: LucideIcon[] = [Stethoscope, HeartPulse, GraduationCap, ShieldCheck, Award];

function IdentityChip({ tag, index }: { tag: string; index: number }) {
  const Icon = TAG_ICONS[index % TAG_ICONS.length];
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary/95">
      <Icon className="size-3" aria-hidden />
      {tag}
    </li>
  );
}

function Stat({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-muted-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <div>
        <p className="text-lg font-bold leading-none text-foreground">{formatCount(value)}</p>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function PulseScoreBlock({
  score,
  tier,
  label,
}: {
  score: number;
  tier: string | null;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-amber-300/25 bg-[rgba(28,22,8,0.45)] px-4 py-2.5 shadow-[0_0_30px_-14px_rgba(251,191,36,0.7)]">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/80">{label}</p>
        <p className="mt-0.5 flex items-center gap-1.5">
          <span className="text-xl font-black leading-none text-foreground">{formatCount(score)}</span>
          <Zap className="size-4 fill-amber-300 text-amber-300" aria-hidden />
          {tier ? <span className="text-sm font-bold text-amber-200">{tier}</span> : null}
        </p>
      </div>
      <span className="relative grid size-9 shrink-0 place-items-center">
        <Hexagon className="size-9 fill-amber-400/20 text-amber-300/70" aria-hidden />
        <Award className="absolute size-4 text-amber-200" aria-hidden />
      </span>
    </div>
  );
}

function updateVisual(type: string): { Icon: LucideIcon; tile: string } {
  const t = type.toLowerCase();
  if (/(milestone|achiev|badge|reward|level)/.test(t))
    return { Icon: Trophy, tile: "border-amber-300/30 bg-amber-400/10 text-amber-300" };
  if (/(streak|consist|daily)/.test(t))
    return { Icon: ShieldCheck, tile: "border-teal-300/30 bg-teal-400/10 text-teal-300" };
  if (/(reflect|mood|journal|shift)/.test(t))
    return { Icon: Moon, tile: "border-violet-300/30 bg-violet-400/10 text-violet-300" };
  if (/(question|community|answer|reply)/.test(t))
    return { Icon: Users, tile: "border-sky-300/30 bg-sky-400/10 text-sky-300" };
  return { Icon: Sparkles, tile: "border-primary/30 bg-primary/10 text-primary" };
}

function PulseUpdateRow({ update }: { update: WebPulseUpdate }) {
  const { Icon, tile } = updateVisual(update.type);
  const title = update.type.replace(/_/g, " ");
  const body = update.content?.trim() || update.previewText?.trim() || "";
  const time = relativeTime(update.createdAt);
  return (
    <li className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3.5 transition hover:border-white/15">
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl border ${tile}`}>
        {update.isPinned ? <Pin className="size-4" aria-hidden /> : <Icon className="size-4" aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold capitalize leading-snug text-foreground wrap-anywhere">
            {title}
            {update.mood ? <span className="font-normal text-muted-foreground"> · {update.mood}</span> : null}
          </p>
          {time ? <span className="shrink-0 text-[11px] text-muted-foreground">{time}</span> : null}
        </div>
        {body ? (
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground wrap-anywhere">{body}</p>
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
      </div>
    </li>
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
    <div className="mx-auto w-full max-w-[960px] px-4 py-6 sm:px-6 sm:py-8">
      {/* ── Premium header card ─────────────────────────────────── */}
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-[rgba(10,16,30,0.9)] p-5 shadow-[0_30px_90px_-50px_rgba(0,0,0,0.95),0_0_0_1px_rgba(20,184,166,0.05)] backdrop-blur-sm sm:p-6">
        {/* Banner / cinematic glow */}
        {profile.bannerUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profile.bannerUrl} alt="" className="absolute inset-0 size-full object-cover opacity-30" />
            <span aria-hidden className="absolute inset-0 bg-[rgba(8,13,26,0.7)]" />
          </>
        ) : null}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_120%_at_18%_0%,rgba(20,184,166,0.22),transparent_60%),radial-gradient(ellipse_60%_120%_at_85%_30%,rgba(45,127,249,0.16),transparent_55%)]"
        />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="pt-1">
            <ProfileAvatar profile={profile} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate font-heading text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                {profile.displayName}
              </h1>
              {profile.isVerified ? (
                <BadgeCheck className="size-6 shrink-0 text-sky-400" aria-label={copy.verifiedLabel} />
              ) : null}
            </div>
            {profile.username ? (
              <p className="truncate text-sm text-muted-foreground">@{profile.username}</p>
            ) : null}

            {profile.identityTags.length > 0 ? (
              <ul className="mt-2.5 flex flex-wrap gap-1.5">
                {profile.identityTags.map((tag, i) => (
                  <IdentityChip key={tag} tag={tag} index={i} />
                ))}
              </ul>
            ) : null}

            {profile.bio?.trim() ? (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/85 wrap-anywhere">{profile.bio}</p>
            ) : null}
          </div>

          {/* Edit / follow */}
          <div className="flex shrink-0 items-center gap-2 sm:ml-2">
            {isOwner ? (
              <a
                href={openAppHref}
                {...externalProps}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-foreground/90 transition hover:border-white/30 hover:text-foreground"
              >
                <Pencil className="size-4" aria-hidden />
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

        {/* Stats strip */}
        <div className="relative mt-5 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-white/8 pt-4">
          <Stat icon={Users} value={profile.stats.followers} label={copy.statFollowers} />
          <Stat icon={UserRound} value={profile.stats.following} label={copy.statFollowing} />
          <div className="sm:ml-auto">
            <PulseScoreBlock
              score={profile.stats.pulseScore}
              tier={profile.stats.pulseTier}
              label={copy.pulseScoreLabel}
            />
          </div>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────── */}
      {!contentVisible ? (
        <div className="mt-6">
          <LockedCard title={lockTitle} body={lockBody} />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_330px]">
          {/* Posts (client: grid/list toggle) */}
          <div className="order-2 lg:order-1">
            <WebProfilePosts posts={posts} copy={copy} engagement={engagement} isOwner={isOwner} />
          </div>

          {/* Pulse updates */}
          <section className="order-1 lg:order-2">
            <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-bold tracking-tight text-foreground">
              <Sparkles className="size-4 text-[var(--accent)]" aria-hidden />
              {copy.pulseUpdatesTitle}
            </h2>
            {pulseUpdates.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-5 text-center text-sm text-muted-foreground backdrop-blur-sm">
                {copy.pulseUpdatesEmpty}
              </div>
            ) : (
              <>
                <ul className="flex flex-col gap-2.5">
                  {pulseUpdates.map((update) => (
                    <PulseUpdateRow key={update.id} update={update} />
                  ))}
                </ul>
                <a
                  href={openAppHref}
                  {...externalProps}
                  className="mt-3 flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-foreground/90 transition hover:border-primary/40 hover:text-foreground"
                >
                  {copy.viewAllUpdates}
                  <ChevronRight className="size-4" aria-hidden />
                </a>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
