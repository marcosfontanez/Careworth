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

/** Child-safety compliance / CSAE inquiries (Google Play and similar disclosures). */
export function getChildSafetyComplianceEmail(): string {
  return process.env.NEXT_PUBLIC_CHILD_SAFETY_EMAIL?.trim() || "safety@pulseverse.app";
}

export function getLegalNotice(): string {
  return `${site.name} is not a substitute for professional medical advice, diagnosis, or treatment.`;
}

/** Shown on legal/community docs (Trust & “last updated” alignment). */
export const legalDocumentsLastUpdatedDisplay = "April 27, 2026";

/** Public TestFlight join link for PulseVerse (same URL Apple shows on the invite page). */
export const DEFAULT_IOS_TESTFLIGHT_JOIN_URL = "https://testflight.apple.com/join/BcGqKNCj" as const;

/**
 * TestFlight public invite URL for /download and other CTAs.
 * Override with `NEXT_PUBLIC_IOS_TESTFLIGHT_URL` when the join link changes.
 */
export function getIosTestflightUrl(): string {
  const v = process.env.NEXT_PUBLIC_IOS_TESTFLIGHT_URL?.trim();
  return v || DEFAULT_IOS_TESTFLIGHT_JOIN_URL;
}

/** Google Play open testing / internal testing opt-in URL — optional companion to TestFlight. */
export function getAndroidOpenTestingUrl(): string | undefined {
  const v = process.env.NEXT_PUBLIC_ANDROID_OPEN_TESTING_URL?.trim();
  return v ? v : undefined;
}
