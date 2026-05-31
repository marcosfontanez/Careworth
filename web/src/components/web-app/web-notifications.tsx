"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import {
  AtSign,
  Bell,
  CheckCheck,
  Gift,
  Heart,
  MessageCircle,
  Radio,
  Sparkles,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/web-app/actions";
import type { WebAppNotificationsCopy } from "@/lib/marketing-copy/web-app";
import type { WebNotification, WebNotificationsResult } from "@/lib/web-app/notifications-data";
import { relativeTime } from "@/lib/web-app/format";

const TYPE_ICON: Record<string, { icon: LucideIcon; tone: string }> = {
  new_follower: { icon: UserPlus, tone: "bg-sky-500/85" },
  like: { icon: Heart, tone: "bg-rose-500/85" },
  save: { icon: Heart, tone: "bg-amber-500/85" },
  share: { icon: Sparkles, tone: "bg-sky-500/85" },
  comment: { icon: MessageCircle, tone: "bg-teal-500/85" },
  reply: { icon: MessageCircle, tone: "bg-teal-500/85" },
  circle_thread_reply: { icon: MessageCircle, tone: "bg-teal-500/85" },
  circle_new_post: { icon: Users, tone: "bg-teal-500/85" },
  circle_post_digest: { icon: Users, tone: "bg-teal-500/85" },
  community_invite: { icon: Users, tone: "bg-indigo-500/85" },
  creator_new_post: { icon: Bell, tone: "bg-teal-500/85" },
  mention: { icon: AtSign, tone: "bg-teal-500/85" },
  tier_up: { icon: Sparkles, tone: "bg-amber-500/85" },
  gift_sent: { icon: Gift, tone: "bg-amber-500/85" },
  live_go_live: { icon: Radio, tone: "bg-rose-500/85" },
  live_stream_live: { icon: Radio, tone: "bg-rose-500/85" },
};

function Avatar({ notification }: { notification: WebNotification }) {
  const { actor } = notification;
  const cfg = TYPE_ICON[notification.type] ?? { icon: Bell, tone: "bg-white/15" };
  const Icon = cfg.icon;
  return (
    <span className="relative inline-block size-11 shrink-0">
      {actor.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={actor.avatarUrl}
          alt=""
          loading="lazy"
          className="size-11 rounded-full border border-white/10 object-cover"
        />
      ) : (
        <span className="grid size-11 place-items-center rounded-full border border-white/10 bg-gradient-to-br from-[#1a2440] to-[#0c1322] text-sm font-bold text-foreground/70">
          {actor.displayName.charAt(0).toUpperCase()}
        </span>
      )}
      <span
        className={[
          "absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full border-2 border-[#0a0f1c] text-white",
          cfg.tone,
        ].join(" ")}
      >
        <Icon className="size-2.5" aria-hidden />
      </span>
    </span>
  );
}

function Row({
  notification,
  copy,
  onOpen,
}: {
  notification: WebNotification;
  copy: WebAppNotificationsCopy;
  onOpen: (n: WebNotification) => void;
}) {
  const time = relativeTime(notification.createdAt);
  const inner = (
    <div
      className={[
        "flex items-start gap-3 rounded-2xl border px-4 py-3 transition",
        notification.read
          ? "border-white/8 bg-[rgba(12,18,32,0.55)]"
          : "border-primary/25 bg-[rgba(20,32,58,0.7)]",
        notification.href ? "hover:border-white/20 hover:bg-[rgba(18,26,44,0.85)]" : "",
      ].join(" ")}
    >
      <Avatar notification={notification} />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-foreground [overflow-wrap:anywhere]">{notification.message}</p>
        <div className="mt-1 flex items-center gap-2">
          {time ? <span className="text-[11px] text-muted-foreground">{time}</span> : null}
          {!notification.read ? (
            <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
              {copy.newBadge}
            </span>
          ) : null}
        </div>
      </div>
      {!notification.read ? <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-hidden /> : null}
    </div>
  );

  if (!notification.href) {
    return <div className="block">{inner}</div>;
  }
  return (
    <Link
      href={notification.href}
      onClick={() => onOpen(notification)}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      {inner}
    </Link>
  );
}

export function WebNotifications({
  result,
  copy,
}: {
  result: WebNotificationsResult;
  copy: WebAppNotificationsCopy;
}) {
  const router = useRouter();
  const [items, setItems] = useState<WebNotification[]>(
    result.state === "ok" ? result.notifications : [],
  );
  const [pending, startTransition] = useTransition();

  const unread = items.filter((n) => !n.read).length;

  const handleOpen = useCallback((n: WebNotification) => {
    if (n.read) return;
    setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, read: true } : it)));
    void markNotificationReadAction(n.id);
  }, []);

  const handleMarkAll = useCallback(() => {
    if (unread === 0 || pending) return;
    setItems((prev) => prev.map((it) => ({ ...it, read: true })));
    startTransition(async () => {
      const res = await markAllNotificationsReadAction();
      if (!res.ok && res.reason === "auth") {
        router.push(`/login?next=${encodeURIComponent("/web-app/notifications")}`);
      }
    });
  }, [unread, pending, router]);

  if (result.state === "error") {
    return (
      <div className="mx-auto w-full max-w-[680px] px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">{copy.title}</h1>
        </header>
        <div className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-8 text-center backdrop-blur-sm">
          <p className="text-sm font-bold text-foreground">{copy.errorTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{copy.errorBody}</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-foreground/90 transition hover:border-white/25"
          >
            {copy.retry}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[680px] px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">{copy.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
        {unread > 0 ? (
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={pending}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 px-3.5 py-1.5 text-xs font-semibold text-foreground/90 transition hover:border-white/25 disabled:opacity-50"
          >
            <CheckCheck className="size-3.5" aria-hidden />
            {copy.markAllRead}
          </button>
        ) : null}
      </header>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-10 text-center backdrop-blur-sm">
          <span className="mx-auto grid size-12 place-items-center rounded-full border border-white/10 bg-white/5 text-[var(--accent)]">
            <Bell className="size-6" aria-hidden />
          </span>
          <p className="mt-3 text-sm font-bold text-foreground">{copy.emptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{copy.emptyBody}</p>
          <Link
            href="/web-app/feed"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-foreground/90 transition hover:border-white/25"
          >
            {copy.goToFeed}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((n) => (
            <Row key={n.id} notification={n} copy={copy} onOpen={handleOpen} />
          ))}
        </div>
      )}
    </div>
  );
}
