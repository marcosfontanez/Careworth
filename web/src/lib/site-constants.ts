import { site } from "@/lib/design-tokens";

/** Public contact addresses (override via env for production). */
export function getSupportEmail(): string {
  return process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@pulseverse.app";
}

export function getPrivacyEmail(): string {
  return process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim() || "privacy@pulseverse.app";
}

/** Responsible disclosure / security.txt contact (defaults to security@ if env unset). */
export function getSecurityEmail(): string {
  return process.env.NEXT_PUBLIC_SECURITY_EMAIL?.trim() || "security@pulseverse.app";
}

export function getLegalNotice(): string {
  return `${site.name} is not a substitute for professional medical advice, diagnosis, or treatment.`;
}

/** Shown on legal/community docs (Trust & “last updated” alignment). */
export const legalDocumentsLastUpdatedDisplay = "April 27, 2026";
