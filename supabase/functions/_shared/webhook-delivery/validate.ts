/** Block SSRF-prone and non-production webhook target URLs. */
export function validateWebhookDestinationUrl(
  rawUrl: string,
  allowInsecureHttp = false,
): { ok: true; url: URL } | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { ok: false, error: "Invalid URL." };
  }

  if (parsed.protocol !== "https:" && !(allowInsecureHttp && parsed.protocol === "http:")) {
    return { ok: false, error: "Destination must use HTTPS." };
  }

  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0"
  ) {
    return { ok: false, error: "Localhost destinations are not allowed." };
  }

  if (/^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) {
    return { ok: false, error: "Private network destinations are not allowed." };
  }

  const parts = host.split(".").map(Number);
  if (parts.length === 4 && parts[0] === 172 && parts[1]! >= 16 && parts[1]! <= 31) {
    return { ok: false, error: "Private network destinations are not allowed." };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: "URL must not embed credentials." };
  }

  return { ok: true, url: parsed };
}

export function destinationMatchesEventType(
  destination: { event_types: string[] },
  eventType: string,
): boolean {
  if (!destination.event_types?.length) return true;
  return destination.event_types.includes(eventType);
}

export function truncateError(message: string, max = 500): string {
  const t = message.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export function readAllowInsecureHttp(metadata: Record<string, unknown>): boolean {
  return metadata.allow_insecure_http === true;
}

export function readSigningSecretEnvKey(metadata: Record<string, unknown>): string | null {
  const key = metadata.signing_secret_env_key;
  return typeof key === "string" && key.trim() ? key.trim() : null;
}
