import type { Metadata } from "next";

import { WebPostDetail } from "@/components/web-app/web-post-detail";
import { WebProfileUnavailable } from "@/components/web-app/web-profile-unavailable";
import { getWebAppPageCopy } from "@/lib/marketing-copy/web-app";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { requireWebAppAccount } from "@/lib/web-app/account";
import { loadWebPost } from "@/lib/web-app/feed-data";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingLocale();
  const c = getWebAppPageCopy(locale);
  return {
    title: `${c.feed.title} · ${c.metaTitle}`,
    robots: { index: false, follow: false },
  };
}

export default async function WebAppPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await requireWebAppAccount(`/web-app/post/${id}`);
  const locale = await getMarketingLocale();
  const c = getWebAppPageCopy(locale);

  const unavailable = (
    <WebProfileUnavailable
      title={c.profile.errorTitle}
      body={c.profile.errorBody}
      goToFeedLabel={c.profile.goToFeed}
    />
  );

  if (!UUID_RE.test(id)) return unavailable;

  const result = await loadWebPost(id, account.id);
  if (result.state !== "ok") return unavailable;

  return (
    <WebPostDetail
      post={result.post}
      feedCopy={c.feed}
      engagement={c.engagement}
      currentUserId={account.id}
      backHref="/web-app/feed"
      backLabel={c.profile.goToFeed}
    />
  );
}
