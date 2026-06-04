import {
  BadgeCheck,
  ChevronRight,
  ExternalLink,
  Heart,
  Lock,
  MessageCircle,
  Moon,
  Pencil,
  Pin,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { WebAppEngagementCopy, WebAppProfileCopy } from "@/lib/marketing-copy/web-app";
import type {
  WebProfileFrame,
  WebProfileHeader,
  WebProfileLockReason,
  WebProfileMedia,
  WebPulseUpdate,
} from "@/lib/web-app/profile-data";
import { cn } from "@/lib/utils";
import { formatCount, relativeTime } from "@/lib/web-app/format";

import { FollowButton } from "./follow-button";
import { WebMediaHub } from "./web-media-hub";

/* ── Shared glass shell (mirrors native MyPulseGlassPanel) ───────────── */
function GlassPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-[rgba(148,163,184,0.22)] bg-[rgba(11,18,32,0.62)] shadow-[0_24px_70px_-44px_rgba(0,0,0,0.95)] backdrop-blur-md",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,rgba(20,184,166,0.08),transparent_60%)]"
      />
      {children}
    </section>
  );
}

/* ── Neon gradient identity pills (mirrors native ProfileNeonPills) ──── */
const NEON_PRESETS: ReadonlyArray<readonly [string, string]> = [
  ["#14B8A6", "#EC4899"],
  ["#A855F7", "#14B8A6"],
  ["#38BDF8", "#EC4899"],
  ["#F472B6", "#22D3EE"],
];

function NeonPill({ label, index }: { label: string; index: number }) {
  const [a, b] = NEON_PRESETS[index % NEON_PRESETS.length];
  return (
    <span
      className="inline-flex shrink rounded-full p-[1.5px]"
      style={{ backgroundImage: `linear-gradient(135deg, ${a}, ${b})` }}
    >
      <span className="truncate rounded-full bg-[rgba(6,14,26,0.92)] px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-white/95 [text-shadow:0_0_8px_rgba(20,184,166,0.35)]">
        {label}
      </span>
    </span>
  );
}

/* ── Avatar with frame ring ──────────────────────────────────────────── */
function ringStyle(frame: WebProfileFrame | null): React.CSSProperties {
  const ring = frame?.ringColor ?? "#2DD4BF";
  const glow = frame?.glowColor ?? ring;
  return {
    borderColor: ring,
    boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 0 30px -4px ${glow}, inset 0 0 14px -5px ${glow}`,
  };
}

function ProfileAvatar({ profile }: { profile: WebProfileHeader }) {
  return (
    <div className="relative shrink-0">
      <span
        className="grid size-24 place-items-center overflow-hidden rounded-full border-[3px] bg-secondary/60 ring-4 ring-[#0b1220] sm:size-28"
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

/* ── Stat cards (mirrors native PulseStatsRow) ──────────────────────── */
function StatCard({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <div className="flex min-h-[112px] flex-1 flex-col items-center justify-center rounded-2xl border border-white/10 bg-[rgba(13,21,36,0.92)] px-3 py-4 shadow-[0_18px_50px_-40px_rgba(0,0,0,0.9)]">
      <span className="mb-2 grid size-9 place-items-center rounded-full bg-teal-400/14 text-teal-300">
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <p className="text-lg font-extrabold tracking-tight text-foreground">{formatCount(value)}</p>
      <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function tierAccent(tier: string | null): { accent: string; glow: string } {
  const t = (tier ?? "").toLowerCase();
  if (t.includes("diamond") || t.includes("platinum")) return { accent: "#22D3EE", glow: "rgba(34,211,238,0.42)" };
  if (t.includes("gold")) return { accent: "#FACC15", glow: "rgba(250,204,21,0.42)" };
  if (t.includes("silver")) return { accent: "#CBD5E1", glow: "rgba(203,213,225,0.38)" };
  if (t.includes("bronze")) return { accent: "#FB923C", glow: "rgba(251,146,60,0.4)" };
  return { accent: "#2DD4BF", glow: "rgba(45,212,191,0.4)" };
}

function PulseScoreCard({ score, tier, label }: { score: number; tier: string | null; label: string }) {
  const { accent, glow } = tierAccent(tier);
  return (
    <div
      className="relative flex min-h-[112px] flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl border-[1.5px] px-3 py-4"
      style={{ borderColor: `${accent}88`, backgroundColor: "rgba(10,16,28,0.97)" }}
    >
      <span aria-hidden className="absolute inset-0" style={{ backgroundColor: glow, opacity: 0.16 }} />
      <span
        aria-hidden
        className="pointer-events-none absolute -top-8 left-1/2 size-24 -translate-x-1/2 rounded-full blur-2xl"
        style={{ backgroundColor: glow }}
      />
      <div className="relative flex items-end gap-0.5">
        <span className="text-2xl [filter:drop-shadow(0_0_8px_rgba(20,184,166,0.6))]" aria-hidden>
          👑
        </span>
      </div>
      <p className="relative mt-0.5 text-2xl font-extrabold tabular-nums tracking-tight text-foreground">
        {formatCount(score)}
      </p>
      <p className="relative mt-0.5 text-[9px] font-extrabold uppercase tracking-[0.06em]" style={{ color: accent }}>
        {tier ? `${tier} · ${label}` : label}
      </p>
    </div>
  );
}

/* ── Pulse updates ──────────────────────────────────────────────────── */
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
    <li className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3.5 transition hover:border-white/15 hover:bg-white/[0.05]">
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
    <GlassPanel className="p-8 text-center">
      <span className="mx-auto grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-teal-300">
        <Lock className="size-5" aria-hidden />
      </span>
      <p className="mt-3 text-base font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{body}</p>
    </GlassPanel>
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
  media,
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
  media: WebProfileMedia;
  copy: WebAppProfileCopy;
  engagement: WebAppEngagementCopy;
  openAppHref: string;
  isExternalApp: boolean;
}) {
  const externalProps = isExternalApp ? { target: "_blank", rel: "noreferrer" } : {};
  const lockTitle = lockReason === "blocked" ? copy.blockedTitle : copy.privateTitle;
  const lockBody = lockReason === "blocked" ? copy.blockedBody : copy.privateBody;

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4 px-3 py-5 sm:gap-5 sm:px-6 sm:py-7">
      {/* ── Profile header: banner + overlapping avatar ───────────── */}
      <GlassPanel className="p-0">
        {/* Banner */}
        <div className="relative h-32 w-full overflow-hidden sm:h-40">
          {profile.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.bannerUrl} alt="" className="size-full object-cover" />
          ) : (
            <div className="size-full bg-[linear-gradient(120deg,#0a1a33_0%,#0a2e36_45%,#13294d_100%)]" />
          )}
          <span
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_60%_120%_at_20%_0%,rgba(20,184,166,0.28),transparent_60%),linear-gradient(to_top,rgba(6,12,24,0.92),transparent_70%)]"
          />
          {/* Action button floats top-right on the banner */}
          <div className="absolute right-3 top-3 flex items-center gap-2">
            {isOwner ? (
              <a
                href={openAppHref}
                {...externalProps}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition hover:border-white/35"
              >
                <Pencil className="size-3.5" aria-hidden />
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
                    size="sm"
                  />
                ) : null}
                <a
                  href={openAppHref}
                  {...externalProps}
                  aria-label={copy.openInApp}
                  className="grid size-8 place-items-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-md transition hover:border-white/35"
                >
                  <ExternalLink className="size-4" aria-hidden />
                </a>
              </>
            )}
          </div>
        </div>

        {/* Avatar (overlapping) + identity */}
        <div className="relative px-4 pb-5 sm:px-6">
          <div className="flex items-end gap-4 sm:gap-5">
            <div className="-mt-12 sm:-mt-14">
              <ProfileAvatar profile={profile} />
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate font-heading text-xl font-black tracking-tight text-foreground sm:text-2xl">
                  {profile.displayName}
                </h1>
                {profile.isVerified ? (
                  <BadgeCheck className="size-5 shrink-0 text-sky-400" aria-label={copy.verifiedLabel} />
                ) : null}
              </div>
              {profile.username ? (
                <p className="truncate text-[13px] font-bold tracking-wide text-teal-300">@{profile.username}</p>
              ) : null}
            </div>
          </div>

          {profile.identityTags.length > 0 ? (
            <ul className="mt-3 flex flex-wrap items-center gap-1.5">
              {profile.identityTags.map((tag, i) => (
                <NeonPill key={tag} label={tag} index={i} />
              ))}
            </ul>
          ) : null}

          {profile.bio?.trim() ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/85 wrap-anywhere">{profile.bio}</p>
          ) : null}
        </div>
      </GlassPanel>

      {/* ── Stat cards ────────────────────────────────────────────── */}
      <div className="flex items-stretch gap-3">
        <StatCard icon={Users} value={profile.stats.followers} label={copy.statFollowers} />
        <StatCard icon={UserRound} value={profile.stats.following} label={copy.statFollowing} />
        <PulseScoreCard
          score={profile.stats.pulseScore}
          tier={profile.stats.pulseTier}
          label={copy.pulseScoreLabel}
        />
      </div>

      {/* ── Body (single vertical flow, mirrors phone) ────────────── */}
      {!contentVisible ? (
        <LockedCard title={lockTitle} body={lockBody} />
      ) : (
        <>
          {/* My Pulse — latest 5 rolling feed */}
          <GlassPanel className="p-4 sm:p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-teal-300/80">
                  {copy.myPulseKicker}
                </span>
                <div className="mt-0.5 flex items-center gap-2">
                  <Sparkles className="size-4 text-[var(--accent)]" aria-hidden />
                  <h2 className="font-heading text-base font-bold tracking-tight text-foreground">
                    {copy.pulseUpdatesTitle}
                  </h2>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {isOwner ? copy.myPulseSubtitleOwner : copy.myPulseSubtitleVisitor}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-baseline gap-0.5 rounded-full border border-teal-400/35 bg-teal-400/12 px-2.5 py-1">
                <span className="text-sm font-extrabold tabular-nums text-teal-300">
                  {Math.min(pulseUpdates.length, 5)}
                </span>
                <span className="text-[11px] font-bold tabular-nums text-teal-300/65">/5</span>
              </span>
            </div>
            {pulseUpdates.length === 0 ? (
              <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 text-center text-sm text-muted-foreground">
                {copy.pulseUpdatesEmpty}
              </p>
            ) : (
              <>
                <ul className="grid gap-2.5 sm:grid-cols-2">
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
          </GlassPanel>

          {/* Media Hub — videos / favorites / photos library */}
          <GlassPanel className="p-4 sm:p-5">
            <WebMediaHub media={media} copy={copy} isOwner={isOwner} />
          </GlassPanel>
        </>
      )}
    </div>
  );
}
