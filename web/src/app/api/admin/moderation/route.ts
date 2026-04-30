import { NextRequest, NextResponse } from "next/server";

import { serverLog } from "@/lib/server/logger";
import { checkRateLimitDistributed } from "@/lib/server/rate-limit-distributed";
import { getClientIpFromHeaders } from "@/lib/server/rate-limit";
import {
  approveReportDismiss,
  markReportActionTaken,
  markReportInReview,
  removeReportedContent,
  suspendSubjectFromReport,
  warnOnReport,
} from "@/lib/admin/moderation-mutations";

type ModerationBody = {
  action?: string;
  reportId?: string;
  note?: string;
  banReason?: string;
};

/**
 * Same mutations as server actions, invoked via fetch so the admin UI works even when
 * the Next.js server-action RPC layer fails in dev (bundler / cookie edge cases).
 */
export async function POST(req: NextRequest) {
  const ip = getClientIpFromHeaders((n) => req.headers.get(n));
  const rl = await checkRateLimitDistributed(`api:moderation:${ip}`, 90, 60_000);
  if (!rl.ok) {
    serverLog.warn("moderation rate limited", { ip });
    return NextResponse.json({ ok: false, error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  let body: ModerationBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const reportId = typeof body.reportId === "string" ? body.reportId.trim() : "";
  if (!reportId) {
    return NextResponse.json({ ok: false, error: "reportId is required" }, { status: 400 });
  }

  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : undefined;
  const banReason =
    typeof body.banReason === "string" && body.banReason.trim() ? body.banReason.trim() : undefined;

  let result: { ok: boolean; error?: string };

  switch (body.action) {
    case "dismiss":
      result = await approveReportDismiss(reportId, note);
      break;
    case "uphold":
      result = await markReportActionTaken(reportId, note);
      break;
    case "review":
      result = await markReportInReview(reportId, note);
      break;
    case "warn":
      result = await warnOnReport(reportId, note);
      break;
    case "remove":
      result = await removeReportedContent(reportId, note);
      break;
    case "suspend":
      result = await suspendSubjectFromReport(
        reportId,
        banReason ?? `Suspended from moderation · report ${reportId.slice(0, 8)}`,
        note,
      );
      break;
    default:
      return NextResponse.json({ ok: false, error: "Unknown or missing action" }, { status: 400 });
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
