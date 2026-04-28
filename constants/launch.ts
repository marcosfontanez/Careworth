/**
 * Store / marketing URLs and support contact.
 *
 * Set via EAS env for production if store review needs public web URLs.
 * When `termsOfServiceUrl` / `privacyPolicyUrl` are non-empty, Settings
 * can open the browser; otherwise we use in-app `/legal/*` screens.
 */
export const LAUNCH_LINKS = {
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() || 'support@pulseverse.app',
  marketingBaseUrl: process.env.EXPO_PUBLIC_MARKETING_SITE?.trim() || 'https://pulseverse.app',
  termsOfServiceUrl: process.env.EXPO_PUBLIC_TERMS_URL?.trim() || '',
  privacyPolicyUrl: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim() || '',
} as const;
