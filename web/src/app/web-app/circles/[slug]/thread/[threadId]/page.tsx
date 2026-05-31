import type { Metadata } from "next";

import { WebCircleThreadView } from "@/components/web-app/web-circle-thread";
import { WebCircleUnavailable } from "@/components/web-app/web-circle-unavailable";
import { getWebAppPageCopy } from "@/lib/marketing-copy/web-app";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { requireWebAppAccount } from "@/lib/web-app/account";
import { loadCircleThread } from "@/lib/web-app/circles-data";
import { resolveOpenInAppHref, usableExternalAppOrigin } from "@/lib/web-app-embed-policy";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingLocale();
  const c = getWebAppPageCopy(locale);
  return {
    title: `${c.circles.indexTitle} · ${c.metaTitle}`,
    robots: { index: false, follow: false },
  };
}

export default async function WebAppCircleThreadPage({
  params,
}: {
  params: Promise<{ slug: string; threadId: string }>;
}) {
  const { slug, threadId } = await params;
  const account = await requireWebAppAccount(`/web-app/circles/${slug}/thread/${threadId}`);
  const locale = await getMarketingLocale();
  const c = getWebAppPageCopy(locale);

  if (!SLUG_RE.test(slug) || !UUID_RE.test(threadId)) {
    return (
      <WebCircleUnavailable
        title={c.circles.unavailableTitle}
        body={c.circles.unavailableBody}
        backLabel={c.circles.backToCircles}
      />
    );
  }

  const result = await loadCircleThread(slug, threadId, account.id);

  if (result.state !== "ok") {
    return (
      <WebCircleUnavailable
        title={result.state === "error" ? c.circles.errorTitle : c.circles.unavailableTitle}
        body={result.state === "error" ? c.circles.errorBody : c.circles.unavailableBody}
        backLabel={c.circles.backToCircles}
      />
    );
  }

  const openAppHref = resolveOpenInAppHref(
    `/communities/${result.circle.slug}/thread/${result.thread.id}`,
  );
  const isExternalApp = usableExternalAppOrigin() !== null;

  return (
    <WebCircleThreadView
      circle={result.circle}
      isConfession={result.isConfession}
      thread={result.thread}
      replies={result.replies}
      canReply={result.canReply}
      copy={c.circles}
      openAppHref={openAppHref}
      isExternalApp={isExternalApp}
    />
  );
}
