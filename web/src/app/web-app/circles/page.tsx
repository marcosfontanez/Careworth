import type { Metadata } from "next";

import { WebCirclesIndex } from "@/components/web-app/web-circles-index";
import { getWebAppPageCopy } from "@/lib/marketing-copy/web-app";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { requireWebAppAccount } from "@/lib/web-app/account";
import { loadCirclesIndex, loadMyCircles, loadRecentCircleActivity, loadUnansweredQuestions } from "@/lib/web-app/circles-data";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingLocale();
  const c = getWebAppPageCopy(locale);
  return {
    title: `${c.circles.indexTitle} · ${c.metaTitle}`,
    robots: { index: false, follow: false },
  };
}

export default async function WebAppCirclesPage() {
  const account = await requireWebAppAccount("/web-app/circles");
  const [locale, result, myCircles] = await Promise.all([
    getMarketingLocale(),
    loadCirclesIndex(),
    loadMyCircles(account.id),
  ]);
  const [recentActivity, unanswered] = await Promise.all([
    loadRecentCircleActivity(account.id),
    loadUnansweredQuestions(account.id),
  ]);
  const c = getWebAppPageCopy(locale);
  return (
    <WebCirclesIndex
      result={result}
      myCircles={myCircles}
      recentActivity={recentActivity}
      unanswered={unanswered}
      copy={c.circles}
    />
  );
}
