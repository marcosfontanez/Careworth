/** Consistent names for Vercel Web Analytics custom events (marketing site). */
export const MARKETING_EVENTS = {
  ctaClick: "marketing_cta_click",
  contactSuccess: "marketing_contact_submit",
  newsletterSignup: "newsletter_signup",
  homepageDownloadClick: "homepage_download_click",
  homepageIosBetaClick: "homepage_ios_beta_click",
  homepageAndroidBetaClick: "homepage_android_beta_click",
  homepageWebBetaClick: "homepage_web_beta_click",
  homepageWatchDemoClick: "homepage_watch_demo_click",
  demoVideoModalOpen: "demo_video_modal_open",
  demoVideoStarted: "demo_video_started",
  demoVideoCompleted: "demo_video_completed",
  homepageFeatureCtaClick: "homepage_feature_cta_click",
  advertiserCtaClick: "advertiser_cta_click",
  supportCtaClick: "support_cta_click",
} as const;

export type CtaClickPropsDetailed = {
  /** Destination path or URL. */
  href: string;
  /** Where the click originated (e.g. hero_primary, nav_desktop). */
  source: string;
};

/** Safe metadata for public marketing conversion events — no PII. */
export type HomepageConversionProps = {
  page?: string;
  section?: string;
  cta_label?: string;
  destination?: string;
  device_type?: string;
};
