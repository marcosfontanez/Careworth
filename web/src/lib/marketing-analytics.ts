/** Consistent names for Vercel Web Analytics custom events (marketing site). */
export const MARKETING_EVENTS = {
  ctaClick: "marketing_cta_click",
  contactSuccess: "marketing_contact_submit",
  newsletterSignup: "newsletter_signup",
} as const;

export type CtaClickPropsDetailed = {
  /** Destination path or URL. */
  href: string;
  /** Where the click originated (e.g. hero_primary, nav_desktop). */
  source: string;
};
