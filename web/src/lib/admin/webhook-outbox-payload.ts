const SENSITIVE_KEY = /^(token|secret|password|authorization|api_key|apikey|signing_key|private_key|bearer|cookie)$/i;

export function redactWebhookPayload(payload: unknown, depth = 0): Record<string, unknown> {
  if (depth > 4) return { _truncated: true };
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (SENSITIVE_KEY.test(key)) {
      out[key] = "[redacted]";
    } else if (typeof value === "string" && value.length > 320) {
      out[key] = `${value.slice(0, 320)}…`;
    } else if (value && typeof value === "object") {
      out[key] = redactWebhookPayload(value, depth + 1);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function extractWebhookTarget(payload: Record<string, unknown>): {
  targetLabel: string;
  entityId: string | null;
  relatedHref: string | null;
  auditLogHref: string | null;
} {
  const reportId = typeof payload.reportId === "string" ? payload.reportId : null;
  if (reportId) {
    return {
      targetLabel: `Report ${reportId.slice(0, 8)}…`,
      entityId: reportId,
      relatedHref: "/admin/moderation",
      auditLogHref: `/admin/audit?q=${encodeURIComponent(reportId)}`,
    };
  }
  const streamId = typeof payload.streamId === "string" ? payload.streamId : null;
  if (streamId) {
    return {
      targetLabel: `Live ${streamId.slice(0, 8)}…`,
      entityId: streamId,
      relatedHref: "/admin/live",
      auditLogHref: `/admin/audit?q=${encodeURIComponent(streamId)}`,
    };
  }
  const topic = typeof payload.topic === "string" ? payload.topic : null;
  if (topic) {
    return { targetLabel: topic, entityId: null, relatedHref: null, auditLogHref: null };
  }
  const target = typeof payload.target === "string" ? payload.target : null;
  if (target) {
    return { targetLabel: target, entityId: null, relatedHref: null, auditLogHref: null };
  }
  return { targetLabel: "—", entityId: null, relatedHref: null, auditLogHref: null };
}
