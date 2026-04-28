import { site } from "@/lib/design-tokens";

/** Public contact addresses (override via env for production). */
export function getSupportEmail(): string {
  return process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@pulseverse.app";
}

export function getPrivacyEmail(): string {
  return process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim() || "privacy@pulseverse.app";
}

export function getLegalNotice(): string {
  return `${site.name} is not a substitute for professional medical advice, diagnosis, or treatment.`;
}
