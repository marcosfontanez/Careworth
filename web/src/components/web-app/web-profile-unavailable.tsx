import Link from "next/link";
import { ArrowRight, UserX } from "lucide-react";

export function WebProfileUnavailable({
  title,
  body,
  goToFeedLabel,
}: {
  title: string;
  body: string;
  goToFeedLabel: string;
}) {
  return (
    <div className="grid min-h-full place-items-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.86)] p-8 text-center shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9),0_0_0_1px_rgba(20,184,166,0.08)] backdrop-blur-md">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-muted-foreground">
          <UserX className="size-6" aria-hidden />
        </span>
        <h1 className="mt-4 font-heading text-xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mx-auto mt-2.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{body}</p>
        <Link
          href="/web-app/feed"
          className="mt-6 inline-flex items-center justify-center gap-1.5 rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-foreground/90 transition hover:border-white/30"
        >
          {goToFeedLabel}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
