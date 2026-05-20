/**
 * Public contact addresses for in-app legal screens and Settings mailto links.
 * Override per build via EAS `EXPO_PUBLIC_*` env (see docs/OPERATIONAL_EMAIL_ADDRESSES.md).
 */
function fromEnv(key: string, fallback: string): string {
  const v = process.env[key]?.trim();
  return v || fallback;
}

export const CONTACT_EMAILS = {
  support: fromEnv('EXPO_PUBLIC_SUPPORT_EMAIL', 'support@pulseverse.app'),
  privacy: fromEnv('EXPO_PUBLIC_PRIVACY_EMAIL', 'privacy@pulseverse.app'),
  legal: fromEnv('EXPO_PUBLIC_LEGAL_EMAIL', 'legal@pulseverse.app'),
  security: fromEnv('EXPO_PUBLIC_SECURITY_EMAIL', 'security@pulseverse.app'),
  childSafety: fromEnv('EXPO_PUBLIC_CHILD_SAFETY_EMAIL', 'safety@pulseverse.app'),
} as const;
